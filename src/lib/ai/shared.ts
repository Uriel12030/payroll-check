/**
 * Shared AI helpers used by both the legacy aiAnalyzer and the new workbench modules.
 * Extracted from aiAnalyzer.ts to avoid code duplication.
 */
import { getOpenAIClient, getAiModel } from './openai'
import {
  extractFactsFromLead,
  inferCaseType,
  computeMissingFields,
} from './missingFieldsEngine'
import type { Lead, EmailMessage, RequiredField, AiPlaybook } from '@/types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

// ---------- Types ----------

export interface LeadContext {
  lead: Lead
  caseType: string
  requiredFields: RequiredField[]
  knownFacts: Record<string, string | number | boolean | null>
  summary: string
  aiStateExists: boolean
}

export interface ConversationThread {
  direction: string
  from: string
  occurred_at: string
  text: string
}

// ---------- Token estimation ----------

const CHARS_PER_TOKEN = 3 // conservative for mixed Hebrew/English
const MAX_INPUT_TOKENS = 12000
const SYSTEM_PROMPT_BUDGET = 500

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

// ---------- Load lead context ----------

export async function loadLeadContext(
  serviceClient: SupabaseClient,
  leadId: string
): Promise<LeadContext | { error: string }> {
  const { data: lead, error: leadErr } = await serviceClient
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single()

  if (leadErr || !lead) {
    return { error: 'Lead not found' }
  }

  const typedLead = lead as Lead
  const caseType = inferCaseType(typedLead)

  // Load rules (fallback to 'general')
  let { data: rules } = await serviceClient
    .from('case_ai_rules')
    .select('*')
    .eq('case_type', caseType)
    .single()

  if (!rules) {
    const { data: fallback } = await serviceClient
      .from('case_ai_rules')
      .select('*')
      .eq('case_type', 'general')
      .single()
    rules = fallback
  }

  const requiredFields: RequiredField[] = rules?.required_fields ?? []

  // Load or create AI state
  let { data: aiState } = await serviceClient
    .from('case_ai_state')
    .select('*')
    .eq('lead_id', leadId)
    .single()

  let aiStateExists = true

  if (!aiState) {
    aiStateExists = false
    const leadFacts = extractFactsFromLead(typedLead)
    const { data: newState } = await serviceClient
      .from('case_ai_state')
      .insert({
        lead_id: leadId,
        case_type: caseType,
        known_facts: leadFacts,
        missing_fields: computeMissingFields(requiredFields, leadFacts),
      })
      .select('*')
      .single()
    aiState = newState
  }

  return {
    lead: typedLead,
    caseType,
    requiredFields,
    knownFacts: (aiState?.known_facts as Record<string, string | number | boolean | null>) ?? {},
    summary: aiState?.summary ?? '',
    aiStateExists,
  }
}

// ---------- Fetch conversation threads ----------

export async function fetchConversationThread(
  serviceClient: SupabaseClient,
  conversationId: string
): Promise<ConversationThread[]> {
  const { data: messages } = await serviceClient
    .from('email_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('occurred_at', { ascending: true })
    .limit(10)

  return (messages ?? []).map((m: EmailMessage) => ({
    direction: m.direction,
    from: m.from_email,
    occurred_at: m.occurred_at,
    text: m.text_body ?? '(אין טקסט)',
  }))
}

/**
 * Fetch messages across ALL conversations for a lead.
 * Used by the workbench to consider the full case, not just one conversation.
 */
export async function fetchAllConversationThreads(
  serviceClient: SupabaseClient,
  leadId: string,
  limit = 30
): Promise<ConversationThread[]> {
  // Get conversation IDs for this lead
  const { data: conversations } = await serviceClient
    .from('email_conversations')
    .select('id')
    .eq('customer_id', leadId)
    .order('last_message_at', { ascending: false })
    .limit(5) // max 5 most recent conversations

  if (!conversations || conversations.length === 0) return []

  const convIds = conversations.map((c: { id: string }) => c.id)

  const { data: messages } = await serviceClient
    .from('email_messages')
    .select('*')
    .in('conversation_id', convIds)
    .order('occurred_at', { ascending: true })
    .limit(limit)

  return (messages ?? []).map((m: EmailMessage) => ({
    direction: m.direction,
    from: m.from_email,
    occurred_at: m.occurred_at,
    text: m.text_body ?? '(אין טקסט)',
  }))
}

// ---------- Thread truncation ----------

export function truncateThreadToFit(
  thread: ConversationThread[],
  otherPromptText: string
): ConversationThread[] {
  const otherTokens = estimateTokens(otherPromptText) + SYSTEM_PROMPT_BUDGET
  const availableTokens = MAX_INPUT_TOKENS - otherTokens

  if (availableTokens <= 0) {
    return thread.slice(-1)
  }

  const result: ConversationThread[] = []
  let usedTokens = 0

  for (let i = thread.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(thread[i].text + thread[i].from + thread[i].occurred_at)
    if (usedTokens + msgTokens > availableTokens && result.length > 0) {
      break
    }
    result.unshift(thread[i])
    usedTokens += msgTokens
  }

  return result
}

// ---------- Schema validation error (carries raw AI response for DB logging) ----------

export class SchemaValidationError extends Error {
  public readonly rawOutput: Record<string, unknown>

  constructor(message: string, rawOutput: Record<string, unknown>, public readonly cause?: unknown) {
    super(message)
    this.name = 'SchemaValidationError'
    this.rawOutput = rawOutput
  }
}

// ---------- Generic OpenAI call with Zod validation ----------

export async function callOpenAIWithSchema<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: z.ZodType<T>,
  options?: { model?: string; maxTokens?: number; temperature?: number }
): Promise<{
  output: T
  tokenUsage: { prompt_tokens?: number; completion_tokens?: number } | null
}> {
  const openai = getOpenAIClient()
  const model = options?.model ?? getAiModel()
  const maxTokens = options?.maxTokens ?? parseInt(process.env.AI_MAX_COMPLETION_TOKENS ?? '1500', 10)
  const temperature = options?.temperature ?? 0.2

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]

  let totalTokenUsage: { prompt_tokens: number; completion_tokens: number } = {
    prompt_tokens: 0,
    completion_tokens: 0,
  }

  // Attempt up to 2 times: first try, then one retry with "fix JSON" instruction
  for (let attempt = 0; attempt < 2; attempt++) {
    const completion = await openai.chat.completions.create({
      model,
      messages,
      response_format: { type: 'json_object' },
      temperature,
      max_tokens: maxTokens,
    })

    const raw = completion.choices[0]?.message?.content
    if (!raw) throw new Error('Empty AI response')

    if (completion.usage) {
      totalTokenUsage.prompt_tokens += completion.usage.prompt_tokens ?? 0
      totalTokenUsage.completion_tokens += completion.usage.completion_tokens ?? 0
    }

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(raw)
    } catch (jsonErr) {
      // JSON parse failure — retry with fix instruction
      if (attempt === 0) {
        console.warn('[callOpenAIWithSchema] JSON parse failed, retrying with fix instruction')
        messages.push({ role: 'assistant', content: raw })
        messages.push({
          role: 'user',
          content: 'התשובה הקודמת לא הייתה JSON תקין. אנא החזר JSON תקין בלבד, ללא טקסט נוסף.',
        })
        continue
      }
      throw new SchemaValidationError(
        jsonErr instanceof Error ? jsonErr.message : 'Invalid JSON',
        {},
        jsonErr
      )
    }

    try {
      const output = schema.parse(parsed)
      return { output, tokenUsage: totalTokenUsage }
    } catch (validationErr) {
      if (attempt === 0) {
        // First attempt failed validation — retry with the raw output + fix instruction
        const missingInfo = validationErr instanceof z.ZodError
          ? validationErr.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n')
          : 'Schema validation failed'

        console.warn('[callOpenAIWithSchema] Schema validation failed, retrying', {
          model,
          rawKeys: Object.keys(parsed),
          issues: missingInfo,
        })

        messages.push({ role: 'assistant', content: raw })
        messages.push({
          role: 'user',
          content: `ה-JSON שהחזרת חסרים בו שדות או שיש בו שגיאות:\n${missingInfo}\n\nאנא החזר JSON מתוקן עם כל השדות הנדרשים. JSON בלבד, ללא טקסט נוסף.`,
        })
        continue
      }

      // Second attempt also failed — throw
      console.error('[callOpenAIWithSchema] Schema validation failed after retry', {
        model,
        rawKeys: Object.keys(parsed),
        rawResponse: raw.length > 2000 ? raw.slice(0, 2000) + '…' : raw,
        error: validationErr instanceof Error ? validationErr.message : String(validationErr),
      })
      throw new SchemaValidationError(
        validationErr instanceof Error ? validationErr.message : String(validationErr),
        parsed,
        validationErr
      )
    }
  }

  // Should not reach here, but TypeScript needs it
  throw new Error('Unexpected: retry loop exhausted')
}

// ---------- Load playbooks ----------

export async function loadPlaybooks(
  serviceClient: SupabaseClient
): Promise<AiPlaybook[]> {
  const { data } = await serviceClient
    .from('ai_playbooks')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  return (data ?? []) as AiPlaybook[]
}
