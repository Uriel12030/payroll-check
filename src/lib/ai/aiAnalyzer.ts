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

interface AnalyzeResult {
  success: boolean
  actionId?: string
  draftId?: string
  error?: string
}

/**
 * Main AI analysis pipeline.
 * Called on inbound emails or manual trigger.
 */
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
    // 1. Fetch lead data
    const { data: lead, error: leadErr } = await serviceClient
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadErr || !lead) {
      return { success: false, error: 'Lead not found' }
    }

    const typedLead = lead as Lead

    // 2. Determine case type
    const caseType = inferCaseType(typedLead)

    // 3. Load rules for this case type (fallback to 'general')
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

    // 4. Load or create AI state for this lead
    let { data: aiState } = await serviceClient
      .from('case_ai_state')
      .select('*')
      .eq('lead_id', leadId)
      .single()

    if (!aiState) {
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

    const currentKnownFacts = (aiState?.known_facts as Record<string, string | number | boolean | null>) ?? {}
    const currentSummary = aiState?.summary ?? ''

    // 5. Fetch conversation thread (last 10 messages)
    const { data: messages } = await serviceClient
      .from('email_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('occurred_at', { ascending: true })
      .limit(10)

    const thread = (messages ?? []).map((m: EmailMessage) => ({
      direction: m.direction,
      from: m.from_email,
      occurred_at: m.occurred_at,
      text: m.text_body ?? '(אין טקסט)',
    }))

    if (thread.length === 0) {
      return { success: false, error: 'No messages in conversation' }
    }

    // 6. Compute missing fields DETERMINISTICALLY
    const missingFields = computeMissingFields(requiredFields, currentKnownFacts)

    // 7. Build prompt
    const systemPrompt = buildSystemPrompt()
    const userPrompt = buildAnalysisPrompt({
      leadName: typedLead.full_name,
      caseType,
      currentSummary,
      knownFacts: currentKnownFacts,
      missingFields,
      conversationThread: thread,
    })

    // 8. Prepare sanitized input snapshot for audit
    const inputSnapshot = {
      leadId,
      conversationId,
      messageId,
      caseType,
      missingFieldKeys: missingFields.map((f) => f.key),
      threadLength: thread.length,
      trigger,
    }

    // 9. Call OpenAI
    const model = getAiModel()
    let aiOutput: AiAnalysisOutput
    let tokenUsage: { prompt_tokens?: number; completion_tokens?: number } | null = null

    try {
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

      tokenUsage = completion.usage
        ? { prompt_tokens: completion.usage.prompt_tokens, completion_tokens: completion.usage.completion_tokens }
        : null

      // 10. Validate output with zod
      const parsed = JSON.parse(raw)
      aiOutput = aiAnalysisOutputSchema.parse(parsed)
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

    // 11. Merge extracted facts and recompute missing fields
    const updatedFacts = mergeKnownFacts(currentKnownFacts, aiOutput.extracted_facts)
    const updatedMissing = computeMissingFields(requiredFields, updatedFacts)

    // 12. Store audit action
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

    // 13. Update AI state
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

    // 14. Discard previous proposed drafts for this conversation
    await serviceClient
      .from('case_ai_drafts')
      .update({ status: 'discarded', updated_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('status', 'proposed')

    // 15. Insert new draft
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
      success: true,
      actionId: action?.id ?? undefined,
      draftId: draft?.id ?? undefined,
    }
  } catch (err) {
    console.error('[aiAnalyzer] Unexpected error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}
