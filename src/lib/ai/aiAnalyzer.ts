import { createServiceClient } from '@/lib/supabase/server'
import { getOpenAIClient, getAiModel } from './openai'
import { buildSystemPrompt, buildAnalysisPrompt } from './promptTemplates'
import { aiAnalysisOutputSchema, type AiAnalysisOutput } from './schemas'
import {
  extractFactsFromLead,
  inferCaseType,
  computeMissingFields,
  mergeKnownFacts,
} from './missingFieldsEngine'
import type { Lead, EmailMessage, RequiredField } from '@/types'
import type { SupabaseClient } from '@supabase/supabase-js'

interface AnalyzeResult {
  success: boolean
  actionId?: string
  draftId?: string
  error?: string
}

interface LeadContext {
  lead: Lead
  caseType: string
  requiredFields: RequiredField[]
  knownFacts: Record<string, string | number | boolean | null>
  summary: string
  aiStateExists: boolean
}

interface ConversationThread {
  direction: string
  from: string
  occurred_at: string
  text: string
}

// ---------- Helper: load lead and AI context ----------

async function loadLeadContext(
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

// ---------- Helper: fetch conversation thread ----------

async function fetchConversationThread(
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

// ---------- Helper: estimate tokens and truncate thread ----------

const CHARS_PER_TOKEN = 3 // conservative for mixed Hebrew/English
const MAX_INPUT_TOKENS = 12000 // leave room for system prompt + response
const SYSTEM_PROMPT_BUDGET = 500

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

function truncateThreadToFit(
  thread: ConversationThread[],
  otherPromptText: string
): ConversationThread[] {
  const otherTokens = estimateTokens(otherPromptText) + SYSTEM_PROMPT_BUDGET
  const availableTokens = MAX_INPUT_TOKENS - otherTokens

  if (availableTokens <= 0) {
    // Return only the most recent message
    return thread.slice(-1)
  }

  // Start from most recent, add messages until budget is exhausted
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

// ---------- Helper: call OpenAI and validate ----------

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  model: string
): Promise<{
  output: AiAnalysisOutput
  tokenUsage: { prompt_tokens?: number; completion_tokens?: number } | null
}> {
  const openai = getOpenAIClient()
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 2000,
  })

  const raw = completion.choices[0]?.message?.content
  if (!raw) throw new Error('Empty AI response')

  const tokenUsage = completion.usage
    ? { prompt_tokens: completion.usage.prompt_tokens, completion_tokens: completion.usage.completion_tokens }
    : null

  const parsed = JSON.parse(raw)
  const output = aiAnalysisOutputSchema.parse(parsed)

  return { output, tokenUsage }
}

// ---------- Helper: persist analysis results ----------

async function persistResults(
  serviceClient: SupabaseClient,
  params: {
    leadId: string
    conversationId: string
    messageId?: string
    adminId?: string
    trigger: string
    inputSnapshot: Record<string, unknown>
    aiOutput: AiAnalysisOutput
    model: string
    tokenUsage: { prompt_tokens?: number; completion_tokens?: number } | null
    requiredFields: RequiredField[]
    currentKnownFacts: Record<string, string | number | boolean | null>
  }
): Promise<{ actionId?: string; draftId?: string }> {
  const {
    leadId, conversationId, messageId, adminId, trigger,
    inputSnapshot, aiOutput, model, tokenUsage, requiredFields, currentKnownFacts,
  } = params

  const updatedFacts = mergeKnownFacts(currentKnownFacts, aiOutput.extracted_facts)
  const updatedMissing = computeMissingFields(requiredFields, updatedFacts)

  // Store audit action
  const { data: action } = await serviceClient
    .from('case_ai_actions')
    .insert({
      lead_id: leadId,
      trigger,
      input_snapshot: inputSnapshot,
      output: aiOutput as unknown as Record<string, unknown>,
      status: 'success',
      model,
      tokens: tokenUsage,
      created_by_admin_id: adminId ?? null,
    })
    .select('id')
    .single()

  // Update AI state
  await serviceClient
    .from('case_ai_state')
    .update({
      summary: aiOutput.case_summary,
      known_facts: updatedFacts,
      missing_fields: updatedMissing,
      last_analyzed_message_id: messageId ?? null,
      last_analyzed_at: new Date().toISOString(),
      confidence_score: Math.max(
        0,
        Math.min(100, Math.round(
          (Object.keys(updatedFacts).filter((k) => updatedFacts[k] != null && updatedFacts[k] !== '').length /
            Math.max(requiredFields.length, 1)) *
            100
        ))
      ),
      updated_at: new Date().toISOString(),
    })
    .eq('lead_id', leadId)

  // Discard previous proposed drafts
  await serviceClient
    .from('case_ai_drafts')
    .update({ status: 'discarded', updated_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('status', 'proposed')

  // Insert new draft
  const { data: draft } = await serviceClient
    .from('case_ai_drafts')
    .insert({
      lead_id: leadId,
      conversation_id: conversationId,
      suggested_subject: aiOutput.suggested_subject,
      suggested_text: aiOutput.suggested_reply_text,
      suggested_html: aiOutput.suggested_reply_html,
      questions: aiOutput.questions,
      status: 'proposed',
      source_action_id: action?.id ?? null,
    })
    .select('id')
    .single()

  return {
    actionId: action?.id ?? undefined,
    draftId: draft?.id ?? undefined,
  }
}

// ---------- Main pipeline ----------

export async function analyzeInboundEmail(params: {
  leadId: string
  conversationId: string
  messageId?: string
  adminId?: string
  trigger: 'inbound_email' | 'manual_refresh'
}): Promise<AnalyzeResult> {
  const { leadId, conversationId, messageId, adminId, trigger } = params
  const serviceClient = createServiceClient()

  try {
    // 1. Load lead context
    const context = await loadLeadContext(serviceClient, leadId)
    if ('error' in context) {
      return { success: false, error: context.error }
    }

    const { lead, caseType, requiredFields, knownFacts, summary } = context

    // 2. Fetch conversation thread
    const thread = await fetchConversationThread(serviceClient, conversationId)
    if (thread.length === 0) {
      return { success: false, error: 'No messages in conversation' }
    }

    // 3. Compute missing fields and build prompts (with token budget guard)
    const missingFields = computeMissingFields(requiredFields, knownFacts)
    const systemPrompt = buildSystemPrompt()

    // Build a preliminary prompt without thread to measure non-thread size
    const promptWithoutThread = buildAnalysisPrompt({
      leadName: lead.full_name,
      caseType,
      currentSummary: summary,
      knownFacts,
      missingFields,
      conversationThread: [],
    })

    // Truncate thread to fit within token budget
    const fittedThread = truncateThreadToFit(thread, promptWithoutThread)

    const userPrompt = buildAnalysisPrompt({
      leadName: lead.full_name,
      caseType,
      currentSummary: summary,
      knownFacts,
      missingFields,
      conversationThread: fittedThread,
    })

    const inputSnapshot = {
      leadId,
      conversationId,
      messageId,
      caseType,
      missingFieldKeys: missingFields.map((f) => f.key),
      threadLength: thread.length,
      trigger,
    }

    // 4. Call OpenAI
    const model = getAiModel()
    let aiOutput: AiAnalysisOutput
    let tokenUsage: { prompt_tokens?: number; completion_tokens?: number } | null = null

    try {
      const result = await callOpenAI(systemPrompt, userPrompt, model)
      aiOutput = result.output
      tokenUsage = result.tokenUsage
    } catch (aiErr) {
      // Log failed action for auditability
      await serviceClient.from('case_ai_actions').insert({
        lead_id: leadId,
        trigger,
        input_snapshot: inputSnapshot,
        output: {},
        status: 'failed',
        model,
        tokens: tokenUsage,
        error_message: aiErr instanceof Error ? aiErr.message : 'Unknown AI error',
        created_by_admin_id: adminId ?? null,
      })

      return { success: false, error: aiErr instanceof Error ? aiErr.message : 'AI analysis failed' }
    }

    // 5. Persist results
    const { actionId, draftId } = await persistResults(serviceClient, {
      leadId,
      conversationId,
      messageId,
      adminId,
      trigger,
      inputSnapshot,
      aiOutput,
      model,
      tokenUsage,
      requiredFields,
      currentKnownFacts: knownFacts,
    })

    return { success: true, actionId, draftId }
  } catch (err) {
    console.error('[aiAnalyzer] Unexpected error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}
