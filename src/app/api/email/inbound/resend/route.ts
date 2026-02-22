import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyResendWebhook } from '@/lib/email/webhook'
import { extractReplyToken } from '@/lib/email/resend'
import { sanitizeEmailHtml, stripQuotedContent } from '@/lib/email/sanitize'
import { analyzeInboundEmail } from '@/lib/ai/aiAnalyzer'

interface ResendInboundPayload {
      type: string
      data: {
        email_id?: string
        from: string
        to: string[]
        subject: string
        text?: string
        html?: string
        headers?: Array<{ name: string; value: string }>
        message_id?: string
        reply_to?: string
      }
}

interface ResendEmailDetail {
      text?: string
      html?: string
}

async function fetchReceivedEmailBody(emailId: string): Promise<ResendEmailDetail | null> {
      const apiKey = process.env.RESEND_API_KEY
      if (!apiKey || !emailId) return null
      try {
              // Use the Received Emails API — NOT /emails/ which is for sent emails
              const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
                        headers: { Authorization: `Bearer ${apiKey}` },
              })
              if (!res.ok) {
                        console.error('[inbound/resend] Failed to fetch received email body:', res.status, res.statusText)
                        return null
              }
              return await res.json()
      } catch (err) {
              console.error('[inbound/resend] Error fetching received email body:', err)
              return null
      }
}

export async function POST(request: NextRequest) {
      let rawBody: string
      try {
              rawBody = await request.text()
      } catch {
              return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
      }

  // Verify webhook signature
  let payload: ResendInboundPayload
      try {
              payload = verifyResendWebhook(rawBody, {
                        'svix-id': request.headers.get('svix-id'),
                        'svix-timestamp': request.headers.get('svix-timestamp'),
                        'svix-signature': request.headers.get('svix-signature'),
              }) as ResendInboundPayload
      } catch (err) {
              console.error('[inbound/resend] Webhook signature verification failed:', err)
              return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }

  // Only process email.received events
  if (payload.type !== 'email.received') {
          return NextResponse.json({ ok: true, skipped: payload.type })
  }

  const { from, to, subject, text, html, headers, message_id, email_id } = payload.data

  // Resend webhooks do NOT include email body — always fetch from Received Emails API
  let resolvedText = text
      let resolvedHtml = html
      if (email_id) {
              const detail = await fetchReceivedEmailBody(email_id)
              if (detail) {
                        resolvedText = detail.text ?? resolvedText
                        resolvedHtml = detail.html ?? resolvedHtml
              }
      }

  const serviceClient = createServiceClient()

  // Sanitize HTML body, then strip quoted/forwarded thread content
  const sanitizedHtml = resolvedHtml ? sanitizeEmailHtml(resolvedHtml) : null
  const stripped = stripQuotedContent(sanitizedHtml, resolvedText ?? null)

  // Convert headers array to a case-insensitive lookup object (lowercase keys)
  const headersObj = headers
        ? Object.fromEntries(headers.map((h) => [h.name.toLowerCase(), h.value]))
          : null

  // Collect all conversation IDs to store the message in
  const conversationIds = new Set<string>()

  // 1. Match by reply token in recipient addresses
  for (const recipient of to) {
          const token = extractReplyToken(recipient)
          if (token) {
                    const { data: conv } = await serviceClient
                      .from('email_conversations')
                      .select('id')
                      .eq('reply_token', token)
                      .maybeSingle()
                    if (conv) conversationIds.add(conv.id)
          }
  }

  // 2. Match by In-Reply-To / References headers
  if (headersObj) {
          const inReplyTo = headersObj['in-reply-to']
          const references = headersObj['references']
          const messageIds: string[] = []
                  if (inReplyTo) messageIds.push(inReplyTo.replace(/[<>]/g, ''))
          if (references) {
                    references.split(/\s+/).forEach((ref: string) => {
                                messageIds.push(ref.replace(/[<>]/g, ''))
                    })
          }
          for (const mid of messageIds) {
                    const { data: msg } = await serviceClient
                      .from('email_messages')
                      .select('conversation_id')
                      .eq('provider_message_id', mid)
                      .limit(1)
                      .maybeSingle()
                    if (msg) conversationIds.add(msg.conversation_id)
          }
  }

  // 3. Match by sender email — find ALL conversations for this lead
  const senderEmail = from.replace(/.*<(.+)>.*/, '$1').trim().toLowerCase()
      const { data: lead } = await serviceClient
        .from('leads')
        .select('id')
        .eq('email', senderEmail)
        .limit(1)
        .maybeSingle()

  if (lead) {
          if (conversationIds.size === 0) {
                    // No existing conversation matched by token or headers —
                    // try to find the most recent open/pending conversation for this lead
            const { data: recentConv } = await serviceClient
                      .from('email_conversations')
                      .select('id')
                      .eq('customer_id', lead.id)
                      .in('status', ['open', 'pending'])
                      .order('last_message_at', { ascending: false })
                      .limit(1)
                      .maybeSingle()

                    if (recentConv) {
                      conversationIds.add(recentConv.id)
                    } else {
                      // No open conversation — create a new one
                      const { data: newConv } = await serviceClient
                        .from('email_conversations')
                        .insert({
                                      customer_id: lead.id,
                                      subject: subject || '(ללא נושא)',
                                      status: 'open',
                        })
                        .select('id')
                        .single()
                      if (newConv) conversationIds.add(newConv.id)
                    }
          }
          // If conversationIds already has matches from token/headers, use only those —
          // do NOT duplicate into other conversations
  }

  // If still no match, store unmatched
  if (conversationIds.size === 0) {
          await serviceClient.from('inbound_unmatched').insert({
                    from_email: from,
                    to_email: to.join(', '),
                    subject,
                    text_body: resolvedText ?? null,
                    html_body: sanitizedHtml,
                    headers: headersObj,
                    raw_payload: payload,
          })
          console.log('[inbound/resend] Stored unmatched inbound email from:', from)
          return NextResponse.json({ ok: true, matched: false })
  }

  // Store message in all matched conversations
  const storedConversationIds: string[] = []
        for (const conversationId of Array.from(conversationIds)) {
                const { error: msgError } = await serviceClient
                  .from('email_messages')
                  .insert({
                              conversation_id: conversationId,
                              direction: 'inbound',
                              from_email: from,
                              to_email: to.join(', '),
                              subject,
                              text_body: stripped.text ?? resolvedText ?? null,
                              html_body: stripped.html ?? sanitizedHtml,
                              provider: 'resend',
                              provider_message_id: message_id ?? null,
                              headers: headersObj,
                  })

        if (msgError) {
                  console.error('[inbound/resend] Failed to store message in conversation:', conversationId, msgError)
                  continue
        }

        // Update conversation status, timestamp, and mark as unread
        await serviceClient
                  .from('email_conversations')
                  .update({
                              last_message_at: new Date().toISOString(),
                              status: 'pending',
                              is_read: false,
                  })
                  .eq('id', conversationId)

        storedConversationIds.push(conversationId)
        }

  // Update lead's last_interaction_at
  if (storedConversationIds.length > 0) {
          const { data: convForLead } = await serviceClient
            .from('email_conversations')
            .select('customer_id')
            .eq('id', storedConversationIds[0])
            .single()

          if (convForLead?.customer_id) {
                    await serviceClient
                      .from('leads')
                      .update({ last_interaction_at: new Date().toISOString() })
                      .eq('id', convForLead.customer_id)
          }
  }

  // Trigger AI analysis for each conversation (non-blocking)
  for (const conversationId of storedConversationIds) {
          const { data: conv } = await serviceClient
            .from('email_conversations')
            .select('customer_id')
            .eq('id', conversationId)
            .single()

        if (conv?.customer_id) {
                  analyzeInboundEmail({
                              leadId: conv.customer_id,
                              conversationId,
                              messageId: undefined,
                              trigger: 'inbound_email',
                  }).catch((aiErr) => {
                              console.error('[inbound/resend] AI analysis failed (non-blocking):', aiErr)
                  })
        }
  }

  console.log('[inbound/resend] Stored inbound message in conversations:', storedConversationIds)
      return NextResponse.json({ ok: true, matched: true, conversationIds: storedConversationIds })
}
