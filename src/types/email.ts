export type ConversationStatus = 'open' | 'pending' | 'closed'
export type EmailDirection = 'inbound' | 'outbound'

export interface EmailConversation {
  id: string
  customer_id: string
  subject: string
  status: ConversationStatus
  reply_token: string
  last_message_at: string
  is_read: boolean
  created_at: string
}

export type EmailMessageStatus = 'draft' | 'sent' | 'failed'

export interface EmailMessage {
  id: string
  conversation_id: string
  direction: EmailDirection
  from_email: string
  to_email: string
  subject: string | null
  text_body: string | null
  html_body: string | null
  provider: string
  provider_message_id: string | null
  headers: Record<string, unknown> | null
  occurred_at: string
  created_by_admin_id: string | null
  // Workbench fields
  status: EmailMessageStatus
  hebrew_translation: string | null
  language: string | null
  ai_metadata: Record<string, unknown> | null
  sent_at: string | null
  created_at: string
  updated_at: string
}
