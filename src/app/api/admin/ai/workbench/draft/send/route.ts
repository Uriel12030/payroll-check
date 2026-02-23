import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/isAdmin'
import { getResendClient, getEmailFrom, buildReplyToAddress } from '@/lib/email/resend'

const sendDraftSchema = z.object({
  draftId: z.string().uuid(),
  editedText: z.string().optional(),
  editedHtml: z.string().optional(),
  editedSubject: z.string().optional(),
})

export async function POST(request: NextRequest) {
  // Verify admin session
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = sendDraftSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { draftId, editedText, editedHtml, editedSubject } = parsed.data
  const serviceClient = createServiceClient()

  try {
    // 1. Load draft with lead info
    const { data: draft, error: draftError } = await serviceClient
      .from('case_ai_drafts')
      .select('*, leads:lead_id(id, email, full_name)')
      .eq('id', draftId)
      .single()

    if (draftError || !draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    if (draft.status !== 'proposed') {
      return NextResponse.json(
        { error: `Draft has already been ${draft.status}` },
        { status: 409 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lead = (draft as any).leads as { id: string; email: string; full_name: string }
    if (!lead?.email) {
      return NextResponse.json({ error: 'Lead email not found' }, { status: 404 })
    }

    // 2. Determine final content (edited values take priority)
    const finalSubject = editedSubject ?? draft.suggested_subject
    const finalText = editedText ?? draft.suggested_text
    const finalHtml = editedHtml ?? draft.suggested_html ?? undefined

    // 3. Get or create conversation
    let convId = draft.conversation_id
    let replyToken: string

    if (convId) {
      const { data: existingConv } = await serviceClient
        .from('email_conversations')
        .select('id, reply_token')
        .eq('id', convId)
        .single()

      if (!existingConv) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
      }
      replyToken = existingConv.reply_token
    } else {
      // Create new conversation
      const { data: newConv, error: convError } = await serviceClient
        .from('email_conversations')
        .insert({
          customer_id: lead.id,
          subject: finalSubject,
          status: 'open',
        })
        .select('id, reply_token')
        .single()

      if (convError || !newConv) {
        console.error('[draft/send] Failed to create conversation:', convError)
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
      }

      convId = newConv.id
      replyToken = newConv.reply_token
    }

    // 4. Send via Resend (with threading headers for replies)
    const fromAddress = getEmailFrom()
    const replyToAddress = buildReplyToAddress(replyToken)
    const resend = getResendClient()

    // Build In-Reply-To / References headers for threaded conversations
    const threadingHeaders: Record<string, string> = {}
    if (draft.conversation_id) {
      const { data: lastInbound } = await serviceClient
        .from('email_messages')
        .select('provider_message_id, headers')
        .eq('conversation_id', convId)
        .eq('direction', 'inbound')
        .order('occurred_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const lastMessageId = lastInbound?.provider_message_id
        ?? (lastInbound?.headers as Record<string, string> | null)?.['message-id']

      if (lastMessageId) {
        const formattedId = lastMessageId.startsWith('<') ? lastMessageId : `<${lastMessageId}>`
        threadingHeaders['In-Reply-To'] = formattedId
        threadingHeaders['References'] = formattedId
      }
    }

    const { data: sendResult, error: sendError } = await resend.emails.send({
      from: fromAddress,
      to: [lead.email],
      subject: finalSubject,
      text: finalText,
      html: finalHtml,
      replyTo: replyToAddress,
      headers: Object.keys(threadingHeaders).length > 0 ? threadingHeaders : undefined,
    })

    if (sendError) {
      console.error('[draft/send] Resend error:', sendError)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 502 })
    }

    console.log('[draft/send] Email sent', {
      to: lead.email,
      draftId,
      providerMessageId: sendResult?.id,
    })

    // 5. Store outbound message with workbench metadata
    const { data: message, error: msgError } = await serviceClient
      .from('email_messages')
      .insert({
        conversation_id: convId,
        direction: 'outbound',
        from_email: fromAddress,
        to_email: lead.email,
        subject: finalSubject,
        text_body: finalText,
        html_body: finalHtml ?? null,
        provider: 'resend',
        provider_message_id: sendResult?.id ?? null,
        created_by_admin_id: user.id,
        language: draft.language ?? null,
        hebrew_translation: draft.hebrew_translation ?? null,
        ai_metadata: draft.ai_metadata ?? null,
      })
      .select('id')
      .single()

    if (msgError) {
      console.error('[draft/send] Failed to store message:', msgError)
    }

    // 6. Mark draft as approved/sent
    await serviceClient
      .from('case_ai_drafts')
      .update({
        status: 'sent',
        approved_by_admin_id: user.id,
        edited_text: editedText ?? null,
        edited_html: editedHtml ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', draftId)

    // 7. Update conversation + lead timestamps
    await serviceClient
      .from('email_conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', convId)

    await serviceClient
      .from('leads')
      .update({ last_interaction_at: new Date().toISOString() })
      .eq('id', lead.id)

    return NextResponse.json({
      conversationId: convId,
      messageId: message?.id ?? null,
      providerMessageId: sendResult?.id ?? null,
      draftStatus: 'sent',
    })
  } catch (err) {
    console.error('[draft/send] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
