import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/isAdmin'
import { getResendClient, getEmailFrom, buildReplyToAddress } from '@/lib/email/resend'

const sendEmailSchema = z.object({
  leadId: z.string().uuid(),
  conversationId: z.string().uuid().optional(),
  subject: z.string().min(1, 'Subject is required'),
  text: z.string().min(1, 'Message body is required'),
  html: z.string().optional(),
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

  // Parse & validate body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = sendEmailSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { leadId, conversationId, subject, text, html } = parsed.data
  const serviceClient = createServiceClient()

  // Load lead to get their email
  const { data: lead, error: leadError } = await serviceClient
    .from('leads')
    .select('id, email, full_name')
    .eq('id', leadId)
    .single()

  if (leadError || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  try {
    let convId = conversationId
    let replyToken: string

    if (convId) {
      // Verify conversation exists and belongs to this lead
      const { data: existingConv } = await serviceClient
        .from('email_conversations')
        .select('id, reply_token')
        .eq('id', convId)
        .eq('customer_id', leadId)
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
          customer_id: leadId,
          subject,
          status: 'open',
        })
        .select('id, reply_token')
        .single()

      if (convError || !newConv) {
        console.error('[email/send] Failed to create conversation:', convError)
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
      }

      convId = newConv.id
      replyToken = newConv.reply_token
    }

    const fromAddress = getEmailFrom()
    const replyToAddress = buildReplyToAddress(replyToken)

    // Send via Resend
    const resend = getResendClient()
    const { data: sendResult, error: sendError } = await resend.emails.send({
      from: fromAddress,
      to: [lead.email],
      subject,
      text,
      html: html ?? undefined,
      replyTo: replyToAddress,
    })

    if (sendError) {
      console.error('[email/send] Resend error:', sendError)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 502 })
    }

    // Store outbound message
    const { data: message, error: msgError } = await serviceClient
      .from('email_messages')
      .insert({
        conversation_id: convId,
        direction: 'outbound',
        from_email: fromAddress,
        to_email: lead.email,
        subject,
        text_body: text,
        html_body: html ?? null,
        provider: 'resend',
        provider_message_id: sendResult?.id ?? null,
        created_by_admin_id: user.id,
      })
      .select('id')
      .single()

    if (msgError) {
      console.error('[email/send] Failed to store message:', msgError)
    }

    // Update conversation timestamp
    await serviceClient
      .from('email_conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', convId)

    return NextResponse.json({
      conversationId: convId,
      messageId: message?.id ?? null,
      providerMessageId: sendResult?.id ?? null,
    })
  } catch (err) {
    console.error('[email/send] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
