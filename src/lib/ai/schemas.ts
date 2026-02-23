import { z } from 'zod'

// ---------- Prompt versioning ----------

export const PROMPT_VERSION = '2.0.0-workbench'

// ---------- Existing analysis schema (unchanged) ----------

/**
 * Zod schema for validating structured AI model output.
 */
export const aiAnalysisOutputSchema = z.object({
  case_summary: z.string().describe('Updated case summary in Hebrew'),
  extracted_facts: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean(), z.null()])
  ).describe('Extracted facts from the conversation'),
  risk_flags: z.array(z.string()).describe('Risk flags identified'),
  suggested_subject: z.string().describe('Suggested email subject in Hebrew'),
  suggested_reply_text: z.string().describe('Suggested email reply body in Hebrew (plain text)'),
  suggested_reply_html: z.string().nullable().describe('Optional HTML version of the reply'),
  questions: z.array(z.string()).describe('List of questions to ask the lead'),
})

export type AiAnalysisOutput = z.infer<typeof aiAnalysisOutputSchema>

// ---------- Workbench analysis schema ----------

export const workbenchQuestionSchema = z.object({
  id: z.string(),
  text_he: z.string(),
  playbook_slug: z.string().nullable(),
  selected: z.boolean().default(true),
  answered: z.boolean().default(false),
})

export const workbenchRiskFlagSchema = z.object({
  label_he: z.string(),
  severity: z.enum(['high', 'medium', 'low']),
  playbook_slug: z.string().nullable(),
  source: z.literal('ai'),
})

export const workbenchStrengthSchema = z.object({
  label_he: z.string(),
  playbook_slug: z.string().nullable(),
  source: z.literal('ai'),
})

export const workbenchDocumentSchema = z.object({
  key: z.string(),
  label_he: z.string(),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
})

export const workbenchAnalysisOutputSchema = z.object({
  workbench_summary: z.string().describe('Detailed bullet-point summary in Hebrew'),
  case_summary: z.string().describe('Short 1-2 sentence summary in Hebrew'),
  missing_info_he: z.array(z.string()).describe('List of missing info items in Hebrew — what is still needed to properly assess'),
  risk_notes_internal_he: z.array(z.string()).describe('Internal-only risk notes in Hebrew for lawyer — never sent to lead'),
  extracted_facts: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean(), z.null()])
  ),
  active_playbooks: z.array(z.string()).describe('Playbook slugs relevant to this case'),
  recommended_questions: z.array(workbenchQuestionSchema).describe('Max 12 questions, grouped by topic'),
  risk_flags: z.array(workbenchRiskFlagSchema),
  strength_flags: z.array(workbenchStrengthSchema),
  documents_to_request: z.array(workbenchDocumentSchema),
})

export type WorkbenchAnalysisOutput = z.infer<typeof workbenchAnalysisOutputSchema>

// ---------- Email draft schema (dual output) ----------

export const emailDraftOutputSchema = z.object({
  internal_summary_he: z.string().describe('Hebrew-only internal preview for lawyer'),
  suggested_subject: z.string().describe('Email subject in the target language'),
  suggested_text: z.string().describe('Email body plain text in the target language'),
  suggested_html: z.string().nullable().describe('Optional HTML version in the target language'),
  hebrew_translation: z.string().nullable().describe('Hebrew translation of external email (null if target is Hebrew)'),
  questions_included: z.array(z.string()).describe('Question IDs included in the email'),
})

export type EmailDraftOutput = z.infer<typeof emailDraftOutputSchema>

// ---------- Translation schema ----------

export const translationOutputSchema = z.object({
  hebrew_translation: z.string().describe('Hebrew translation of the provided text'),
})

export type TranslationOutput = z.infer<typeof translationOutputSchema>
