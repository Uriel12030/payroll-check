import { createServiceClient } from '@/lib/supabase/server'
import { getAiModel } from './openai'
import { buildSystemPrompt, buildAnalysisPrompt } from './promptTemplates'
import { loadPromptTemplate, interpolatePrompt } from './promptLoader'
import { z } from 'zod'
import { aiAnalysisOutputSchema, type AiAnalysisOutput } from './schemas'
import {
  computeMissingFields,
  mergeKnownFacts,
} from './missingFieldsEngine'
import { checkAiRateLimit, logUsageWarnings } from './rateLimiter'
import {
  loadLeadContext,
  fetchConversationThread,
  truncateThreadToFit,
  callOpenAIWithSchema,
  SchemaValidationError,
} from './shared'
import type { RequiredField } from '@/types'
import type { SupabaseClient } from '@supabase/supabase-js'

interface AnalyzeResult {
  success: boolean
  actionId?: string
  draftId?: string
  error?: string
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

// ---------- Helper: deduplication check ----------

async function isAlreadyAnalyzed(
  serviceClient: SupabaseClient,
  leadId: string,
  conversationId: string
): Promise<boolean> {
  const { data: latestMsg } = await serviceClient
    .from('email_messages')
    .select('id, occurred_at')
    .eq('conversation_id', conversationId)
    .order('occurred_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!latestMsg) return false

  const { data: aiState } = await serviceClient
    .from('case_ai_state')
    .select('last_analyzed_message_id, last_analyzed_at')
    .eq('lead_id', leadId)
    .maybeSingle()

  if (!aiState?.last_analyzed_at) return false

  if (new Date(latestMsg.occurred_at) <= new Date(aiState.last_analyzed_at)) {
    return true
  }

  return false
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
    // 0a. Rate limit check
    const rateLimit = await checkAiRateLimit(serviceClient, leadId)
    if (!rateLimit.allowed) {
      console.warn(`[aiAnalyzer] Rate limited: ${rateLimit.reason}`)
      return { success: false, error: rateLimit.reason }
    }

    // 0b. Deduplication: skip if no new messages since last analysis (auto-trigger only)
    if (trigger === 'inbound_email') {
      const alreadyDone = await isAlreadyAnalyzed(serviceClient, leadId, conversationId)
      if (alreadyDone) {
        console.log(`[aiAnalyzer] Skipping duplicate analysis for lead ${leadId}, conversation ${conversationId}`)
        return { success: true }
      }
    }

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

    // Try DB prompts, fall back to hardcoded
    const dbSystemPrompt = await loadPromptTemplate({ slug: 'legacy_system' })
    const systemPrompt = dbSystemPrompt?.content ?? buildSystemPrompt()

    const dbUserPrompt = await loadPromptTemplate({ slug: 'legacy_analysis' })

    const buildUserPromptStr = (threadArr: typeof thread) => {
      if (dbUserPrompt) {
        const factsStr = Object.entries(knownFacts)
          .filter(([, v]) => v !== null && v !== undefined && v !== '')
          .map(([k, v]) => `  ${k}: ${v}`)
          .join('\n')
        const missingStr = missingFields
          .map((f) => `  - ${f.label} (${f.key}): "${f.question}"`)
          .join('\n')
        const threadStr = threadArr
          .map((m) => `[${m.direction === 'inbound' ? 'פונה' : 'מערכת'}] (${m.occurred_at}):\n${m.text}`)
          .join('\n\n---\n\n')
        return interpolatePrompt(dbUserPrompt.content, {
          leadName: lead.full_name,
          caseType,
          currentSummary: summary || '(אין סיכום עדיין)',
          factsStr: factsStr || '(אין עובדות עדיין)',
          missingStr: missingStr || '(אין מידע חסר)',
          threadStr,
        })
      }
      return buildAnalysisPrompt({
        leadName: lead.full_name,
        caseType,
        currentSummary: summary,
        knownFacts,
        missingFields,
        conversationThread: threadArr,
      })
    }

    // Build a preliminary prompt without thread to measure non-thread size
    const promptWithoutThread = buildUserPromptStr([])

    // Truncate thread to fit within token budget
    const fittedThread = truncateThreadToFit(thread, promptWithoutThread)

    const userPrompt = buildUserPromptStr(fittedThread)

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
      const result = await callOpenAIWithSchema(
        systemPrompt,
        userPrompt,
        aiAnalysisOutputSchema,
        { model }
      )
      aiOutput = result.output
      tokenUsage = result.tokenUsage
    } catch (aiErr) {
      const isValidationError = aiErr instanceof SchemaValidationError
      const errorDetails = isValidationError
        ? (aiErr.cause instanceof z.ZodError
            ? aiErr.cause.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
            : aiErr.message)
        : aiErr instanceof Error ? aiErr.message : 'Unknown AI error'

      console.error('[aiAnalyzer] Analysis failed', {
        leadId,
        conversationId,
        trigger,
        isValidationError,
        errorDetails,
      })

      // Persist raw AI output so we can investigate what the model returned
      const rawOutput = isValidationError ? aiErr.rawOutput : {}

      await serviceClient.from('case_ai_actions').insert({
        lead_id: leadId,
        trigger,
        input_snapshot: inputSnapshot,
        output: rawOutput,
        status: 'failed',
        model,
        tokens: tokenUsage,
        error_message: errorDetails,
        created_by_admin_id: adminId ?? null,
      })

      const userMessage = isValidationError
        ? 'תשובת ה-AI לא הכילה את כל השדות הנדרשים — נסו שנית'
        : aiErr instanceof Error ? aiErr.message : 'AI analysis failed'

      return { success: false, error: userMessage }
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

    // 6. Log usage warnings if approaching limits
    logUsageWarnings(rateLimit.usage, leadId)

    return { success: true, actionId, draftId }
  } catch (err) {
    console.error('[aiAnalyzer] Unexpected error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}
