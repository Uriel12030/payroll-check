export type ConversationStatus = 'open' | 'pending' | 'closed'
export type EmailDirection = 'inbound' | 'outbound'

export interface EmailConversation {
  id: string
  customer_id: string
  subject: string
  status: ConversationStatus
  reply_token: string
  last_message_at: string
  created_at: string
}

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
  created_at: string
}
