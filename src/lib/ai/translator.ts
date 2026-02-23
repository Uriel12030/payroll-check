/**
 * Translator — translates text to Hebrew for internal review.
 * Used for non-Hebrew emails displayed in the admin UI.
 */
import { createServiceClient } from '@/lib/supabase/server'
import { getAiModel } from './openai'
import { buildTranslationPrompt } from './promptTemplates'
import { translationOutputSchema, PROMPT_VERSION } from './schemas'
import { callOpenAIWithSchema } from './shared'

export interface TranslationResult {
  success: boolean
  hebrew_translation?: string
  actionId?: string
  error?: string
}

export async function translateToHebrew(params: {
  text: string
  messageId?: string
  adminId?: string
}): Promise<TranslationResult> {
  const { text, messageId, adminId } = params
  const serviceClient = createServiceClient()

  try {
    const model = getAiModel()

    const systemPrompt = 'אתה מתרגם מקצועי. תרגם את הטקסט לעברית. שמור על משמעות, טון, ומבנה. פלט: JSON בלבד.'
    const userPrompt = buildTranslationPrompt(text)

    const { output, tokenUsage } = await callOpenAIWithSchema(
      systemPrompt,
      userPrompt,
      translationOutputSchema,
      { model, maxTokens: 1500, temperature: 0.1 }
    )

    // Audit log
    const { data: action } = await serviceClient
      .from('case_ai_actions')
      .insert({
        lead_id: null,
        trigger: 'translation',
        input_snapshot: { messageId, textLength: text.length },
        output: output as unknown as Record<string, unknown>,
        status: 'success',
        model,
        tokens: tokenUsage,
        created_by_admin_id: adminId ?? null,
        prompt_version: PROMPT_VERSION,
      })
      .select('id')
      .single()

    // If messageId provided, update the email_messages record
    if (messageId) {
      await serviceClient
        .from('email_messages')
        .update({
          hebrew_translation: output.hebrew_translation,
        })
        .eq('id', messageId)
    }

    return {
      success: true,
      hebrew_translation: output.hebrew_translation,
      actionId: action?.id ?? undefined,
    }
  } catch (err) {
    console.error('[translator] Error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Translation failed',
    }
  }
}
