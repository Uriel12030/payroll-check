/**
 * Email drafter — generates dual-output email drafts.
 * Output A: Internal Hebrew preview (for lawyer)
 * Output B: External email in lead's preferred language
 */
import { createServiceClient } from '@/lib/supabase/server'
import { getAiModel } from './openai'
import { buildEmailDraftSystemPrompt, buildEmailDraftPrompt } from './promptTemplates'
import {
  emailDraftOutputSchema,
  type EmailDraftOutput,
  PROMPT_VERSION,
} from './schemas'
import { checkAiRateLimit, logUsageWarnings } from './rateLimiter'
import {
  loadLeadContext,
  fetchConversationThread,
  truncateThreadToFit,
  callOpenAIWithSchema,
} from './shared'
import type { EmailTone, WorkbenchQuestion } from '@/types'

export interface EmailDraftResult {
  success: boolean
  draftId?: string
  actionId?: string
  draft?: EmailDraftOutput
  error?: string
}

export async function generateEmailDraft(params: {
  leadId: string
  conversationId?: string
  tone: EmailTone
  selectedQuestionIds: string[]
  selectedDocumentKeys: string[]
  adminNotes?: string
  adminId?: string
}): Promise<EmailDraftResult> {
  const { leadId, conversationId, tone, selectedQuestionIds, selectedDocumentKeys, adminNotes, adminId } = params
  const serviceClient = createServiceClient()

  try {
    // 1. Rate limit check
    const rateLimit = await checkAiRateLimit(serviceClient, leadId)
    if (!rateLimit.allowed) {
      return { success: false, error: rateLimit.reason }
    }

    // 2. Load lead context
    const context = await loadLeadContext(serviceClient, leadId)
    if ('error' in context) {
      return { success: false, error: context.error }
    }

    const { lead, caseType, knownFacts } = context

    // 3. Get lead's preferred language (default to Hebrew)
    const language = lead.preferred_language ?? 'he'

    // 4. Load workbench state to get selected questions/documents
    const { data: aiState } = await serviceClient
      .from('case_ai_state')
      .select('recommended_questions, documents_requested')
      .eq('lead_id', leadId)
      .single()

    const allQuestions: WorkbenchQuestion[] = (aiState?.recommended_questions as WorkbenchQuestion[]) ?? []
    const selectedQuestions = allQuestions
      .filter((q) => selectedQuestionIds.includes(q.id))
      .map((q) => ({ id: q.id, text_he: q.text_he, playbook_slug: q.playbook_slug }))

    const allDocuments = (aiState?.documents_requested as Array<{ key: string; label_he: string }>) ?? []
    const selectedDocuments = allDocuments.filter((d) => selectedDocumentKeys.includes(d.key))

    // 5. Fetch conversation thread (if conversationId provided)
    let thread: Array<{ direction: string; from: string; occurred_at: string; text: string }> = []
    if (conversationId) {
      thread = await fetchConversationThread(serviceClient, conversationId)
    }

    // 6. Build prompts
    const systemPrompt = buildEmailDraftSystemPrompt(tone, language)

    const promptWithoutThread = buildEmailDraftPrompt({
      leadName: lead.full_name,
      caseType,
      language,
      knownFacts,
      selectedQuestions,
      selectedDocuments,
      conversationThread: [],
      adminNotes,
    })

    const fittedThread = truncateThreadToFit(thread, promptWithoutThread)

    const userPrompt = buildEmailDraftPrompt({
      leadName: lead.full_name,
      caseType,
      language,
      knownFacts,
      selectedQuestions,
      selectedDocuments,
      conversationThread: fittedThread,
      adminNotes,
    })

    const inputSnapshot = {
      leadId,
      conversationId,
      caseType,
      tone,
      language,
      selectedQuestionIds,
      selectedDocumentKeys,
      trigger: 'email_draft',
    }

    // 7. Call OpenAI
    const model = getAiModel()
    let aiOutput: EmailDraftOutput
    let tokenUsage: { prompt_tokens?: number; completion_tokens?: number } | null = null

    try {
      const result = await callOpenAIWithSchema(
        systemPrompt,
        userPrompt,
        emailDraftOutputSchema,
        { model, maxTokens: 2500 }
      )
      aiOutput = result.output
      tokenUsage = result.tokenUsage
    } catch (aiErr) {
      await serviceClient.from('case_ai_actions').insert({
        lead_id: leadId,
        trigger: 'email_draft',
        input_snapshot: inputSnapshot,
        output: {},
        status: 'failed',
        model,
        tokens: tokenUsage,
        error_message: aiErr instanceof Error ? aiErr.message : 'Unknown AI error',
        created_by_admin_id: adminId ?? null,
        prompt_version: PROMPT_VERSION,
      })
      return { success: false, error: aiErr instanceof Error ? aiErr.message : 'Email draft generation failed' }
    }

    // 8. Audit log
    const { data: action } = await serviceClient
      .from('case_ai_actions')
      .insert({
        lead_id: leadId,
        trigger: 'email_draft',
        input_snapshot: inputSnapshot,
        output: aiOutput as unknown as Record<string, unknown>,
        status: 'success',
        model,
        tokens: tokenUsage,
        created_by_admin_id: adminId ?? null,
        prompt_version: PROMPT_VERSION,
      })
      .select('id')
      .single()

    // 9. Discard previous proposed drafts for this lead
    if (conversationId) {
      await serviceClient
        .from('case_ai_drafts')
        .update({ status: 'discarded', updated_at: new Date().toISOString() })
        .eq('lead_id', leadId)
        .eq('conversation_id', conversationId)
        .eq('status', 'proposed')
    }

    // 10. Insert new draft
    const { data: draft } = await serviceClient
      .from('case_ai_drafts')
      .insert({
        lead_id: leadId,
        conversation_id: conversationId ?? null,
        suggested_subject: aiOutput.suggested_subject,
        suggested_text: aiOutput.suggested_text,
        suggested_html: aiOutput.suggested_html,
        questions: aiOutput.questions_included,
        status: 'proposed',
        source_action_id: action?.id ?? null,
        // Workbench fields
        internal_summary_he: aiOutput.internal_summary_he,
        tone,
        language,
        hebrew_translation: aiOutput.hebrew_translation,
        ai_metadata: {
          model,
          prompt_version: PROMPT_VERSION,
          tokens: tokenUsage,
          generated_at: new Date().toISOString(),
        },
      })
      .select('id')
      .single()

    // 11. Log usage warnings
    logUsageWarnings(rateLimit.usage, leadId)

    return {
      success: true,
      draftId: draft?.id ?? undefined,
      actionId: action?.id ?? undefined,
      draft: aiOutput,
    }
  } catch (err) {
    console.error('[emailDrafter] Unexpected error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}
