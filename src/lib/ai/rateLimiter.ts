import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * AI usage guardrails to prevent token drain.
 *
 * Limits:
 * - Per-lead: max N analyses per 24h (prevents runaway loops on a single lead)
 * - Global:   max N total analyses per 24h (prevents account-wide drain)
 * - Global:   max N total tokens per 24h (hard budget cap)
 *
 * All limits are configurable via environment variables with safe defaults.
 */

// ── Configurable limits (env vars with safe defaults) ──

/** Max AI calls per lead per 24h window */
const PER_LEAD_DAILY_LIMIT = parseInt(process.env.AI_PER_LEAD_DAILY_LIMIT ?? '10', 10)

/** Max total AI calls across all leads per 24h window */
const GLOBAL_DAILY_CALL_LIMIT = parseInt(process.env.AI_GLOBAL_DAILY_CALL_LIMIT ?? '200', 10)

/** Max total tokens (prompt + completion) across all calls per 24h window */
const GLOBAL_DAILY_TOKEN_LIMIT = parseInt(process.env.AI_GLOBAL_DAILY_TOKEN_LIMIT ?? '500000', 10)

// ── Public API ──

export interface RateLimitResult {
  allowed: boolean
  reason?: string
  usage?: {
    leadCallsToday: number
    globalCallsToday: number
    globalTokensToday: number
  }
}

/**
 * Check whether an AI analysis call is allowed under current rate limits.
 * Queries the case_ai_actions table (which already logs every call).
 */
export async function checkAiRateLimit(
  serviceClient: SupabaseClient,
  leadId: string
): Promise<RateLimitResult> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Run both queries in parallel
  const [leadCountResult, globalResult] = await Promise.all([
    // Per-lead call count in last 24h
    serviceClient
      .from('case_ai_actions')
      .select('id', { count: 'exact', head: true })
      .eq('lead_id', leadId)
      .gte('created_at', twentyFourHoursAgo),

    // Global call count + token sum in last 24h
    serviceClient
      .from('case_ai_actions')
      .select('id, tokens')
      .gte('created_at', twentyFourHoursAgo),
  ])

  const leadCallsToday = leadCountResult.count ?? 0

  const globalActions = globalResult.data ?? []
  const globalCallsToday = globalActions.length

  let globalTokensToday = 0
  for (const action of globalActions) {
    const tokens = action.tokens as { prompt_tokens?: number; completion_tokens?: number } | null
    if (tokens) {
      globalTokensToday += (tokens.prompt_tokens ?? 0) + (tokens.completion_tokens ?? 0)
    }
  }

  const usage = { leadCallsToday, globalCallsToday, globalTokensToday }

  // Check per-lead limit
  if (leadCallsToday >= PER_LEAD_DAILY_LIMIT) {
    console.warn(
      `[AI Rate Limit] Lead ${leadId} hit daily limit: ${leadCallsToday}/${PER_LEAD_DAILY_LIMIT} calls`
    )
    return {
      allowed: false,
      reason: `חריגה ממכסת ניתוחים יומית לפנייה זו (${PER_LEAD_DAILY_LIMIT}). נסה שוב מחר.`,
      usage,
    }
  }

  // Check global call limit
  if (globalCallsToday >= GLOBAL_DAILY_CALL_LIMIT) {
    console.warn(
      `[AI Rate Limit] Global daily call limit hit: ${globalCallsToday}/${GLOBAL_DAILY_CALL_LIMIT}`
    )
    return {
      allowed: false,
      reason: `חריגה ממכסת ניתוחי AI יומית כוללת (${GLOBAL_DAILY_CALL_LIMIT}). נסה שוב מחר.`,
      usage,
    }
  }

  // Check global token budget
  if (globalTokensToday >= GLOBAL_DAILY_TOKEN_LIMIT) {
    console.warn(
      `[AI Rate Limit] Global daily token limit hit: ${globalTokensToday}/${GLOBAL_DAILY_TOKEN_LIMIT}`
    )
    return {
      allowed: false,
      reason: `חריגה מתקציב טוקנים יומי (${GLOBAL_DAILY_TOKEN_LIMIT.toLocaleString()} tokens). נסה שוב מחר.`,
      usage,
    }
  }

  return { allowed: true, usage }
}

/**
 * Log a warning if usage is approaching limits (>80% of any limit).
 * Call this after a successful analysis for observability.
 */
export function logUsageWarnings(usage: RateLimitResult['usage'], leadId: string): void {
  if (!usage) return

  const warnThreshold = 0.8

  if (usage.leadCallsToday >= PER_LEAD_DAILY_LIMIT * warnThreshold) {
    console.warn(
      `[AI Usage Warning] Lead ${leadId}: ${usage.leadCallsToday}/${PER_LEAD_DAILY_LIMIT} daily calls (${Math.round((usage.leadCallsToday / PER_LEAD_DAILY_LIMIT) * 100)}%)`
    )
  }

  if (usage.globalCallsToday >= GLOBAL_DAILY_CALL_LIMIT * warnThreshold) {
    console.warn(
      `[AI Usage Warning] Global: ${usage.globalCallsToday}/${GLOBAL_DAILY_CALL_LIMIT} daily calls (${Math.round((usage.globalCallsToday / GLOBAL_DAILY_CALL_LIMIT) * 100)}%)`
    )
  }

  if (usage.globalTokensToday >= GLOBAL_DAILY_TOKEN_LIMIT * warnThreshold) {
    console.warn(
      `[AI Usage Warning] Global tokens: ${usage.globalTokensToday.toLocaleString()}/${GLOBAL_DAILY_TOKEN_LIMIT.toLocaleString()} (${Math.round((usage.globalTokensToday / GLOBAL_DAILY_TOKEN_LIMIT) * 100)}%)`
    )
  }
}
