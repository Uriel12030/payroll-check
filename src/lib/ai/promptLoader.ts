/**
 * Loads prompt templates from DB with fallback to hardcoded defaults.
 * All AI consumers (workbenchAnalyzer, emailDrafter, translator, aiAnalyzer)
 * use this loader to fetch editable prompt templates.
 */
import { createServiceClient } from '@/lib/supabase/server'

// In-memory cache (short-lived per serverless invocation or TTL-based)
const cache = new Map<string, { content: string; version: number; fetchedAt: number }>()
const CACHE_TTL_MS = 60_000 // 1 minute

interface LoadPromptParams {
  slug: string
  scope?: string   // default: 'global'
  language?: string // default: 'he'
}

interface LoadPromptResult {
  content: string
  version: number
}

/**
 * Load an active prompt template from DB.
 * Fallback chain: scope-specific → global → null (caller uses hardcoded).
 */
export async function loadPromptTemplate(
  params: LoadPromptParams
): Promise<LoadPromptResult | null> {
  const { slug, scope = 'global', language = 'he' } = params
  const cacheKey = `${slug}:${scope}:${language}`

  // Check cache
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return { content: cached.content, version: cached.version }
  }

  try {
    const serviceClient = createServiceClient()
    const { data } = await serviceClient
      .from('ai_prompt_templates')
      .select('content, version')
      .eq('slug', slug)
      .eq('scope', scope)
      .eq('language', language)
      .eq('is_active', true)
      .single()

    if (data?.content) {
      cache.set(cacheKey, {
        content: data.content,
        version: data.version,
        fetchedAt: Date.now(),
      })
      return { content: data.content, version: data.version }
    }

    // Fallback: try global scope if a playbook-specific scope was requested
    if (scope !== 'global') {
      return loadPromptTemplate({ slug, scope: 'global', language })
    }
  } catch {
    // DB unavailable — caller will use hardcoded fallback
  }

  return null
}

/**
 * Replace ${variable} placeholders in a prompt template.
 */
export function interpolatePrompt(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\$\{(\w+)\}/g, (match, key) => {
    return key in vars ? vars[key] : match
  })
}

/**
 * Clear the prompt cache (useful after saving a new version).
 */
export function clearPromptCache(): void {
  cache.clear()
}
