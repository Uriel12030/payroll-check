/**
 * Workbench analyzer — generates the AI Workbench analysis for a lead.
 * Identifies relevant playbooks, recommends questions, flags risks/strengths.
 */
import { createServiceClient } from '@/lib/supabase/server'
import { getAiModel } from './openai'
import { buildWorkbenchSystemPrompt, buildWorkbenchAnalysisPrompt, formatPlaybooksSection } from './promptTemplates'
import { loadPromptTemplate, interpolatePrompt } from './promptLoader'
import { z } from 'zod'
import {
  workbenchAnalysisOutputSchema,
  type WorkbenchAnalysisOutput,
  PROMPT_VERSION,
} from './schemas'
import { computeMissingFields, mergeKnownFacts } from './missingFieldsEngine'
import { checkAiRateLimit, logUsageWarnings } from './rateLimiter'
import {
  loadLeadContext,
  fetchAllConversationThreads,
  truncateThreadToFit,
  callOpenAIWithSchema,
  loadPlaybooks,
  SchemaValidationError,
} from './shared'
import type { DocumentRequest } from '@/types'

export interface WorkbenchResult {
  success: boolean
  actionId?: string
  error?: string
}

export async function analyzeForWorkbench(params: {
  leadId: string
  adminId?: string
}): Promise<WorkbenchResult> {
  const { leadId, adminId } = params
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

    const { lead, caseType, requiredFields, knownFacts, summary } = context

    // 3. Load ALL conversation threads for this lead
    const allThreads = await fetchAllConversationThreads(serviceClient, leadId)

    // 4. Load playbooks
    const playbooks = await loadPlaybooks(serviceClient)

    // 5. Build prompts (try DB first, fall back to hardcoded)
    const playbooksSection = formatPlaybooksSection(playbooks)
    const dbSystemPrompt = await loadPromptTemplate({ slug: 'workbench_system' })
    const systemPrompt = dbSystemPrompt
      ? interpolatePrompt(dbSystemPrompt.content, { playbooksSection })
      : buildWorkbenchSystemPrompt(playbooks)

    const missingFields = computeMissingFields(requiredFields, knownFacts)
    const factsStr = Object.entries(knownFacts)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => `  ${k}: ${v}`)
      .join('\n')
    const missingStr = missingFields
      .map((f) => `  - ${f.label} (${f.key}): "${f.question}"`)
      .join('\n')
    const playbookSlugs = playbooks.map((p) => `"${p.slug}"`).join(', ')

    const dbUserPrompt = await loadPromptTemplate({ slug: 'workbench_analysis' })

    // Build user prompt — try DB, fall back to hardcoded
    const buildUserPromptStr = (thread: typeof allThreads) => {
      if (dbUserPrompt) {
        const threadStr = thread
          .map((m) => `[${m.direction === 'inbound' ? 'פונה' : 'מערכת'}] (${m.occurred_at}):\n${m.text}`)
          .join('\n\n---\n\n')
        return interpolatePrompt(dbUserPrompt.content, {
          leadName: lead.full_name,
          caseType,
          currentSummary: summary || '(אין סיכום עדיין — זהו ניתוח ראשון)',
          factsStr: factsStr || '(אין עובדות עדיין)',
          missingStr: missingStr || '(אין מידע חסר)',
          threadStr: threadStr || '(אין שיחות עדיין)',
          playbookSlugs,
        })
      }
      return buildWorkbenchAnalysisPrompt({
        leadName: lead.full_name,
        caseType,
        currentSummary: summary,
        knownFacts,
        missingFields,
        conversationThread: thread,
        playbooks,
      })
    }

    const promptWithoutThread = buildUserPromptStr([])
    const fittedThread = truncateThreadToFit(allThreads, promptWithoutThread)
    const userPrompt = buildUserPromptStr(fittedThread)

    const promptVersion = dbSystemPrompt
      ? `3.0.0-managed-v${dbSystemPrompt.version}`
      : PROMPT_VERSION

    const inputSnapshot = {
      leadId,
      caseType,
      threadLength: allThreads.length,
      playbookSlugs: playbooks.map((p) => p.slug),
      trigger: 'workbench_analysis',
    }

    // 6. Call OpenAI
    const model = getAiModel()
    let aiOutput: WorkbenchAnalysisOutput
    let tokenUsage: { prompt_tokens?: number; completion_tokens?: number } | null = null

    try {
      const result = await callOpenAIWithSchema(
        systemPrompt,
        userPrompt,
        workbenchAnalysisOutputSchema,
        { model, maxTokens: 3000 }
      )
      aiOutput = result.output
      tokenUsage = result.tokenUsage

      if (!aiOutput.workbench_summary?.trim()) {
        console.warn('[workbenchAnalyzer] workbench_summary is empty after parsing — AI may have returned wrong type or truncated response', {
          leadId,
          model,
          outputKeys: Object.keys(aiOutput),
        })
      }
    } catch (aiErr) {
      const isValidationError = aiErr instanceof SchemaValidationError
      const errorDetails = isValidationError
        ? (aiErr.cause instanceof z.ZodError
            ? aiErr.cause.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
            : aiErr.message)
        : aiErr instanceof Error ? aiErr.message : 'Unknown AI error'

      console.error('[workbenchAnalyzer] Analysis failed', {
        leadId,
        isValidationError,
        errorDetails,
      })

      // Persist raw AI output so we can investigate what the model returned
      const rawOutput = isValidationError ? aiErr.rawOutput : {}

      await serviceClient.from('case_ai_actions').insert({
        lead_id: leadId,
        trigger: 'workbench_analysis',
        input_snapshot: inputSnapshot,
        output: rawOutput,
        status: 'failed',
        model,
        tokens: tokenUsage,
        error_message: errorDetails,
        created_by_admin_id: adminId ?? null,
        prompt_version: promptVersion,
      })

      const userMessage = isValidationError
        ? 'תשובת ה-AI לא הכילה את כל השדות הנדרשים — נסו שנית'
        : aiErr instanceof Error ? aiErr.message : 'Workbench analysis failed'

      return { success: false, error: userMessage }
    }

    // 7. Merge facts and compute missing fields
    const updatedFacts = mergeKnownFacts(knownFacts, aiOutput.extracted_facts)
    const updatedMissing = computeMissingFields(requiredFields, updatedFacts)

    // 8. Audit log
    const { data: action } = await serviceClient
      .from('case_ai_actions')
      .insert({
        lead_id: leadId,
        trigger: 'workbench_analysis',
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

    // 9. Build documents_requested with initial "pending" status
    const documentsRequested: DocumentRequest[] = aiOutput.documents_to_request.map((d) => ({
      key: d.key,
      label_he: d.label_he,
      priority: d.priority ?? 'medium',
      status: 'pending' as const,
    }))

    // 10. Update case_ai_state with workbench fields
    await serviceClient
      .from('case_ai_state')
      .update({
        summary: aiOutput.case_summary,
        known_facts: updatedFacts,
        missing_fields: updatedMissing,
        last_analyzed_at: new Date().toISOString(),
        confidence_score: Math.max(
          0,
          Math.min(100, Math.round(
            (Object.keys(updatedFacts).filter((k) => updatedFacts[k] != null && updatedFacts[k] !== '').length /
              Math.max(requiredFields.length, 1)) *
              100
          ))
        ),
        // Workbench fields
        active_playbooks: aiOutput.active_playbooks,
        workbench_summary: aiOutput.workbench_summary,
        missing_info_he: aiOutput.missing_info_he,
        risk_notes_internal_he: aiOutput.risk_notes_internal_he,
        recommended_questions: aiOutput.recommended_questions,
        risk_flags: aiOutput.risk_flags,
        strength_flags: aiOutput.strength_flags,
        documents_requested: documentsRequested,
        updated_at: new Date().toISOString(),
      })
      .eq('lead_id', leadId)

    // 11. Log usage warnings
    logUsageWarnings(rateLimit.usage, leadId)

    return { success: true, actionId: action?.id ?? undefined }
  } catch (err) {
    console.error('[workbenchAnalyzer] Unexpected error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}
