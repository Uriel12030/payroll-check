export type LeadStatus = 'new' | 'reviewing' | 'rejected' | 'accepted'

export interface Lead {
  id: string
  created_at: string
  status: LeadStatus
  full_name: string
  phone: string
  email: string
  city: string
  employer_name: string
  role_title: string
  employment_type: string
  start_date: string
  end_date: string | null
  still_employed: boolean
  avg_monthly_salary: number
  paid_overtime: string
  overtime_hours_estimate: string | null
  attendance_tracking: string
  pension_provided: string
  pension_rate_known: string | null
  travel_reimbursement: string
  vacation_balance_issue: string
  sick_days_issue: string
  termination_type: string | null
  termination_date: string | null
  reason_for_check: string
  consent: boolean
  marketing_source: string | null
  lead_score: number | null
  lead_flags: LeadFlags | null
  admin_notes: string | null
}

export interface LeadFlags {
  no_pension: boolean
  unpaid_overtime: boolean
  no_travel: boolean
  vacation_issue: boolean
  sick_days_issue: boolean
  termination_flag: boolean
  recent_employment: boolean
}

export interface LeadFile {
  id: string
  lead_id: string
  created_at: string
  file_type: string
  original_filename: string
  storage_path: string
  mime_type: string
  size_bytes: number
}

// ============================================================
// Email conversations
// ============================================================

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

export interface IntakeFormData {
  // Step 1: Contact
  full_name: string
  phone: string
  email: string
  city: string
  // Step 2: Employment basics
  employer_name: string
  role_title: string
  employment_type: string
  start_date: string
  end_date?: string
  still_employed: boolean
  avg_monthly_salary: number
  // Step 3: Work hours & overtime
  paid_overtime: string
  overtime_hours_estimate?: string
  attendance_tracking: string
  // Step 4: Benefits
  pension_provided: string
  pension_rate_known?: string
  travel_reimbursement: string
  vacation_balance_issue: string
  sick_days_issue: string
  // Step 5: Termination
  termination_type?: string
  termination_date?: string
  reason_for_check: string
  // Step 6: Files
  files: File[]
  // Step 7: Consent
  consent: boolean
  marketing_source?: string
}
