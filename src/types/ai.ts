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
