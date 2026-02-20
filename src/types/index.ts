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

// ============================================================
// AI Assistant
// ============================================================

export interface RequiredField {
  key: string
  label: string
  question: string
  priority?: number
}

export interface CaseAiRules {
  id: string
  case_type: string
  required_fields: RequiredField[]
  optional_fields: RequiredField[]
  risk_rules: Array<{ condition: string; label: string; severity: string }>
  created_at: string
}

export interface CaseAiState {
  id: string
  lead_id: string
  case_type: string
  summary: string
  missing_fields: RequiredField[]
  known_facts: Record<string, string | number | boolean | null>
  last_analyzed_message_id: string | null
  last_analyzed_at: string | null
  confidence_score: number
  created_at: string
  updated_at: string
}

export type AiDraftStatus = 'proposed' | 'approved' | 'sent' | 'discarded'

export interface CaseAiDraft {
  id: string
  lead_id: string
  conversation_id: string
  suggested_subject: string
  suggested_text: string
  suggested_html: string | null
  questions: string[]
  status: AiDraftStatus
  source_action_id: string | null
  created_at: string
  updated_at: string
}

export interface CaseAiAction {
  id: string
  lead_id: string
  trigger: string
  input_snapshot: Record<string, unknown>
  output: Record<string, unknown>
  status: 'success' | 'failed'
  model: string | null
  tokens: { prompt_tokens?: number; completion_tokens?: number } | null
  error_message: string | null
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
