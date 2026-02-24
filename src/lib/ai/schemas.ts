import { z } from 'zod'

// ---------- Prompt versioning ----------

export const PROMPT_VERSION = '2.0.0-workbench'

// ---------- Helpers ----------

/**
 * Coerce any JSON value to a simple scalar (string | number | boolean | null).
 * AI models sometimes return nested objects/arrays in extracted_facts —
 * stringify them instead of failing validation.
 */
const extractedFactsSchema = z.record(z.string(), z.any())
  .default({})
  .transform((rec) => {
    const out: Record<string, string | number | boolean | null> = {}
    for (const [k, v] of Object.entries(rec)) {
      if (v === null || v === undefined) out[k] = null
      else if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') out[k] = v
      else out[k] = JSON.stringify(v) // stringify arrays/objects
    }
    return out
  })

// ---------- Existing analysis schema ----------

/**
 * Zod schema for validating structured AI model output.
 * Uses .catch() to be resilient against wrong types (not just missing fields).
 */
export const aiAnalysisOutputSchema = z.object({
  case_summary: z.string().catch('').describe('Updated case summary in Hebrew'),
  extracted_facts: extractedFactsSchema.describe('Extracted facts from the conversation'),
  risk_flags: z.array(z.string().catch('')).catch([]).describe('Risk flags identified'),
  suggested_subject: z.string().catch('המשך טיפול בפנייתך').describe('Suggested email subject in Hebrew'),
  suggested_reply_text: z.string().catch('').describe('Suggested email reply body in Hebrew (plain text)'),
  suggested_reply_html: z.string().nullable().catch(null).describe('Optional HTML version of the reply'),
  questions: z.array(z.string().catch('')).catch([]).describe('List of questions to ask the lead'),
})

export type AiAnalysisOutput = z.infer<typeof aiAnalysisOutputSchema>

// ---------- Workbench analysis schema ----------

export const workbenchQuestionSchema = z.object({
  id: z.string().catch(''),
  text_he: z.string().catch(''),
  playbook_slug: z.string().nullable().catch(null),
  selected: z.boolean().catch(true),
  answered: z.boolean().catch(false),
})

export const workbenchRiskFlagSchema = z.object({
  label_he: z.string().catch(''),
  severity: z.enum(['high', 'medium', 'low']).catch('medium'),
  playbook_slug: z.string().nullable().catch(null),
  source: z.enum(['ai', 'rule', 'manual']).catch('ai'),
})

export const workbenchStrengthSchema = z.object({
  label_he: z.string().catch(''),
  playbook_slug: z.string().nullable().catch(null),
  source: z.enum(['ai', 'rule', 'manual']).catch('ai'),
})

export const workbenchDocumentSchema = z.object({
  key: z.string().catch(''),
  label_he: z.string().catch(''),
  priority: z.enum(['high', 'medium', 'low']).catch('medium'),
})

export const workbenchAnalysisOutputSchema = z.object({
  workbench_summary: z.string().catch('').describe('Detailed bullet-point summary in Hebrew'),
  case_summary: z.string().catch('').describe('Short 1-2 sentence summary in Hebrew'),
  missing_info_he: z.array(z.string().catch('')).catch([]).describe('List of missing info items in Hebrew'),
  risk_notes_internal_he: z.array(z.string().catch('')).catch([]).describe('Internal-only risk notes in Hebrew for lawyer'),
  extracted_facts: extractedFactsSchema,
  active_playbooks: z.array(z.string().catch('')).catch([]).describe('Playbook slugs relevant to this case'),
  recommended_questions: z.array(workbenchQuestionSchema).catch([]).describe('Max 12 questions, grouped by topic'),
  risk_flags: z.array(workbenchRiskFlagSchema).catch([]),
  strength_flags: z.array(workbenchStrengthSchema).catch([]),
  documents_to_request: z.array(workbenchDocumentSchema).catch([]),
})

export type WorkbenchAnalysisOutput = z.infer<typeof workbenchAnalysisOutputSchema>

// ---------- Email draft schema (dual output) ----------

export const emailDraftOutputSchema = z.object({
  internal_summary_he: z.string().catch('').describe('Hebrew-only internal preview for lawyer'),
  suggested_subject: z.string().catch('המשך טיפול בפנייתך').describe('Email subject in the target language'),
  suggested_text: z.string().catch('').describe('Email body plain text in the target language'),
  suggested_html: z.string().nullable().catch(null).describe('Optional HTML version in the target language'),
  hebrew_translation: z.string().nullable().catch(null).describe('Hebrew translation of external email (null if target is Hebrew)'),
  questions_included: z.array(z.string().catch('')).catch([]).describe('Question IDs included in the email'),
})

export type EmailDraftOutput = z.infer<typeof emailDraftOutputSchema>

// ---------- Translation schema ----------

export const translationOutputSchema = z.object({
  hebrew_translation: z.string().catch('').describe('Hebrew translation of the provided text'),
})

export type TranslationOutput = z.infer<typeof translationOutputSchema>
