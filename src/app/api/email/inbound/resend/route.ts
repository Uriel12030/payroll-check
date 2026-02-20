import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyResendWebhook } from '@/lib/email/webhook'
import { extractReplyToken } from '@/lib/email/resend'
import { sanitizeEmailHtml } from '@/lib/email/sanitize'

interface ResendInboundPayload {
  type: string
  data: {
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

  const { from, to, subject, text, html, headers, message_id } = payload.data
  const serviceClient = createServiceClient()

  // Sanitize HTML body
  const sanitizedHtml = html ? sanitizeEmailHtml(html) : null

  // Convert headers array to object
  const headersObj = headers
    ? Object.fromEntries(headers.map((h) => [h.name, h.value]))
    : null

  // Try to find conversation by reply token from recipient address
  let conversationId: string | null = null

  for (const recipient of to) {
    const token = extractReplyToken(recipient)
    if (token) {
      const { data: conv } = await serviceClient
        .from('email_conversations')
        .select('id')
        .eq('reply_token', token)
        .single()

      if (conv) {
        conversationId = conv.id
        break
      }
    }
  }

  // Fallback: try to match by In-Reply-To / References headers
  if (!conversationId && headersObj) {
    const inReplyTo = headersObj['In-Reply-To'] || headersObj['in-reply-to']
    const references = headersObj['References'] || headersObj['references']

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
        .single()

      if (msg) {
        conversationId = msg.conversation_id
        break
      }
    }
  }

  // If still no match, try to find lead by sender email
  if (!conversationId) {
    const senderEmail = from.replace(/.*<(.+)>.*/, '$1').trim().toLowerCase()

    const { data: lead } = await serviceClient
      .from('leads')
      .select('id')
      .eq('email', senderEmail)
      .limit(1)
      .single()

    if (lead) {
      // Create a new conversation for this lead
      const { data: newConv } = await serviceClient
        .from('email_conversations')
        .insert({
          customer_id: lead.id,
          subject: subject || '(ללא נושא)',
          status: 'open',
        })
        .select('id')
        .single()

      if (newConv) {
        conversationId = newConv.id
      }
    }
  }

  // If we still can't match, store in unmatched
  if (!conversationId) {
    await serviceClient.from('inbound_unmatched').insert({
      from_email: from,
      to_email: to.join(', '),
      subject,
      text_body: text ?? null,
      html_body: sanitizedHtml,
      headers: headersObj,
      raw_payload: payload,
    })

    console.log('[inbound/resend] Stored unmatched inbound email from:', from)
    return NextResponse.json({ ok: true, matched: false })
  }

  // Store inbound message
  const { error: msgError } = await serviceClient
    .from('email_messages')
    .insert({
      conversation_id: conversationId,
      direction: 'inbound',
      from_email: from,
      to_email: to.join(', '),
      subject,
      text_body: text ?? null,
      html_body: sanitizedHtml,
      provider: 'resend',
      provider_message_id: message_id ?? null,
      headers: headersObj,
    })

  if (msgError) {
    console.error('[inbound/resend] Failed to store message:', msgError)
    return NextResponse.json({ error: 'Failed to store message' }, { status: 500 })
  }

  // Update conversation: mark as pending and update timestamp
  await serviceClient
    .from('email_conversations')
    .update({
      last_message_at: new Date().toISOString(),
      status: 'pending',
    })
    .eq('id', conversationId)

  console.log('[inbound/resend] Stored inbound message for conversation:', conversationId)
  return NextResponse.json({ ok: true, matched: true, conversationId })
}
