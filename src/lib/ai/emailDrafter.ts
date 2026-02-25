/**
 * Email drafter — generates dual-output email drafts.
 * Output A: Internal Hebrew preview (for lawyer)
 * Output B: External email in lead's preferred language
 */
import { createServiceClient } from '@/lib/supabase/server'
import { getAiModel } from './openai'
import { buildEmailDraftSystemPrompt, buildEmailDraftPrompt } from './promptTemplates'
import { loadPromptTemplate, interpolatePrompt } from './promptLoader'
import { z } from 'zod'
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
  SchemaValidationError,
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

    // 6. Build prompts (try DB first, fall back to hardcoded)
    const LANGUAGE_NAMES: Record<string, string> = { he: 'עברית', en: 'אנגלית', ru: 'רוסית', am: 'אמהרית' }
    const langName = LANGUAGE_NAMES[language] ?? language

    // System prompt: load tone from DB too
    const dbTone = await loadPromptTemplate({ slug: `tone_${tone}` })
    const toneInstruction = dbTone?.content ?? (tone === 'formal' ? 'רשמי ומקצועי. פנייה בגוף שלישי, שפה עניינית ומדויקת.' : tone === 'firm' ? 'תקיף אך מכבד. הדגש שהמידע חשוב ודחוף לטיפול.' : 'ידידותי, חם, אמפתי. פנייה בגוף שני, שפה פשוטה וברורה.')

    const dbSystemPrompt = await loadPromptTemplate({ slug: 'email_draft_system' })
    const systemPrompt = dbSystemPrompt
      ? interpolatePrompt(dbSystemPrompt.content, { toneInstruction, langName })
      : buildEmailDraftSystemPrompt(tone, language)

    const dbUserPrompt = await loadPromptTemplate({ slug: 'email_draft_user' })

    const buildUserPromptStr = (threadArr: typeof thread) => {
      if (dbUserPrompt) {
        const factsStr = Object.entries(knownFacts)
          .filter(([, v]) => v !== null && v !== undefined && v !== '')
          .map(([k, v]) => `  ${k}: ${v}`)
          .join('\n')
        const questionsStr = selectedQuestions
          .map((q) => `  - [${q.id}] ${q.text_he}${q.playbook_slug ? ` (${q.playbook_slug})` : ''}`)
          .join('\n')
        const docsStr = selectedDocuments
          .map((d) => `  - ${d.label_he} (${d.key})`)
          .join('\n')
        const threadStr = threadArr
          .map((m) => `[${m.direction === 'inbound' ? 'פונה' : 'מערכת'}] (${m.occurred_at}):\n${m.text}`)
          .join('\n\n---\n\n')
        const adminNotesSection = adminNotes ? `## הערות עו"ד\n${adminNotes}` : ''
        const hebrewTranslationExample = language === 'he' ? 'null' : '"תרגום עברי של האימייל"'

        return interpolatePrompt(dbUserPrompt.content, {
          leadName: lead.full_name,
          caseType,
          langName,
          factsStr: factsStr || '(אין עובדות עדיין)',
          questionsStr: questionsStr || '(אין שאלות נבחרות)',
          docsStr: docsStr || '(אין מסמכים לבקש)',
          threadStr: threadStr || '(אין שיחה קודמת — זהו מייל ראשון)',
          adminNotesSection,
          hebrewTranslationExample,
        })
      }
      return buildEmailDraftPrompt({
        leadName: lead.full_name,
        caseType,
        language,
        knownFacts,
        selectedQuestions,
        selectedDocuments,
        conversationThread: threadArr,
        adminNotes,
      })
    }

    const promptWithoutThread = buildUserPromptStr([])
    const fittedThread = truncateThreadToFit(thread, promptWithoutThread)
    const userPrompt = buildUserPromptStr(fittedThread)

    const promptVersion = dbSystemPrompt
      ? `3.0.0-managed-v${dbSystemPrompt.version}`
      : PROMPT_VERSION

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

      // Post-validation: ensure suggested_text is not empty (AI sometimes returns empty string)
      if (!aiOutput.suggested_text || aiOutput.suggested_text.trim() === '') {
        console.warn('[emailDrafter] suggested_text is empty, retrying with explicit instruction', { leadId })
        const retryResult = await callOpenAIWithSchema(
          systemPrompt,
          userPrompt + '\n\n⚠️ חשוב מאוד: השדה suggested_text חייב להכיל את גוף האימייל המלא. אל תשאיר אותו ריק בשום סיבה. כתוב אימייל מלא עם פנייה, גוף, שאלות רלוונטיות לסוג התיק, ובקשת מסמכים.',
          emailDraftOutputSchema,
          { model, maxTokens: 2500 }
        )
        aiOutput = retryResult.output
        if (retryResult.tokenUsage && tokenUsage) {
          tokenUsage = {
            prompt_tokens: (tokenUsage.prompt_tokens ?? 0) + (retryResult.tokenUsage.prompt_tokens ?? 0),
            completion_tokens: (tokenUsage.completion_tokens ?? 0) + (retryResult.tokenUsage.completion_tokens ?? 0),
          }
        }
      }
    } catch (aiErr) {
      const isValidationError = aiErr instanceof SchemaValidationError
      const errorDetails = isValidationError
        ? (aiErr.cause instanceof z.ZodError
            ? aiErr.cause.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
            : aiErr.message)
        : aiErr instanceof Error ? aiErr.message : 'Unknown AI error'

      console.error('[emailDrafter] Draft generation failed', {
        leadId,
        tone,
        isValidationError,
        errorDetails,
      })

      // Persist raw AI output so we can investigate what the model returned
      const rawOutput = isValidationError ? aiErr.rawOutput : {}

      await serviceClient.from('case_ai_actions').insert({
        lead_id: leadId,
        trigger: 'email_draft',
        input_snapshot: inputSnapshot,
        output: rawOutput,
        status: 'failed',
        model,
        tokens: tokenUsage,
        error_message: errorDetails,
        created_by_admin_id: adminId ?? null,
        prompt_version: promptVersion,
      })

      // Return a clean user-facing message instead of the raw Zod dump
      const userMessage = isValidationError
        ? 'תשובת ה-AI לא הכילה את כל השדות הנדרשים — נסו שנית'
        : aiErr instanceof Error ? aiErr.message : 'Email draft generation failed'

      return { success: false, error: userMessage }
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
        prompt_version: promptVersion,
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
          prompt_version: promptVersion,
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
