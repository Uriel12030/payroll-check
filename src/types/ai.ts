// ---------- Core AI types ----------

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
  // Workbench fields
  active_playbooks: string[]
  workbench_summary: string
  missing_info_he: string[]
  risk_notes_internal_he: string[]
  recommended_questions: WorkbenchQuestion[]
  risk_flags: WorkbenchRiskFlag[]
  strength_flags: WorkbenchStrength[]
  documents_requested: DocumentRequest[]
  created_at: string
  updated_at: string
}

export type AiDraftStatus = 'proposed' | 'approved' | 'sent' | 'discarded'
export type EmailTone = 'friendly' | 'formal' | 'firm'

export interface AiDraftMetadata {
  model: string
  prompt_version: string
  tokens: { prompt_tokens?: number; completion_tokens?: number }
  generated_at: string
}

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
  // Workbench fields
  internal_summary_he: string | null
  tone: EmailTone
  language: string
  hebrew_translation: string | null
  ai_metadata: AiDraftMetadata | null
  approved_by_admin_id: string | null
  edited_text: string | null
  edited_html: string | null
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
  prompt_version: string | null
  created_at: string
}

// ---------- Playbook types ----------

export interface PlaybookQuestion {
  key: string
  label_he: string
  label_en?: string
  priority: number
}

export interface PlaybookDocument {
  key: string
  label_he: string
  label_en?: string
}

export interface PlaybookFlag {
  condition: string
  label_he: string
  severity?: 'high' | 'medium' | 'low'
}

export interface AiPlaybook {
  id: string
  slug: string
  title_he: string
  title_en: string | null
  description_he: string | null
  questions: PlaybookQuestion[]
  documents: PlaybookDocument[]
  red_flags: PlaybookFlag[]
  strengths: PlaybookFlag[]
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

// ---------- Workbench types ----------

export interface WorkbenchQuestion {
  id: string
  text_he: string
  playbook_slug: string | null
  selected: boolean
  answered: boolean
}

export interface WorkbenchRiskFlag {
  label_he: string
  severity: 'high' | 'medium' | 'low'
  playbook_slug: string | null
  source: 'ai' | 'rule' | 'manual'
}

export interface WorkbenchStrength {
  label_he: string
  playbook_slug: string | null
  source: 'ai' | 'rule' | 'manual'
}

export interface DocumentRequest {
  key: string
  label_he: string
  priority: 'high' | 'medium' | 'low'
  status: 'pending' | 'received' | 'not_applicable'
}

// ---------- Prompt template types ----------

export type PromptCategory = 'system' | 'user' | 'tone_instruction'

export interface PromptVariable {
  name: string
  description: string
}

export interface PromptTemplate {
  id: string
  slug: string
  category: PromptCategory
  scope: string
  language: string
  title: string
  description: string | null
  content: string
  variables: PromptVariable[]
  version: number
  is_active: boolean
  is_default: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}
