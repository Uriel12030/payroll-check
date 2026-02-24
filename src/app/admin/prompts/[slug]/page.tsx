import { createServiceClient } from '@/lib/supabase/server'
import { PromptEditorClient } from '@/components/admin/prompts/PromptEditorClient'
import { notFound } from 'next/navigation'
import type { PromptTemplate } from '@/types'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { slug: string }
  searchParams: { scope?: string; language?: string }
}

export default async function PromptEditorPage({ params, searchParams }: PageProps) {
  const serviceClient = createServiceClient()

  const scope = searchParams.scope ?? 'global'
  const language = searchParams.language ?? 'he'

  // Fetch all versions for this slug (across all scopes and languages)
  const { data: rawVersions } = await serviceClient
    .from('ai_prompt_templates')
    .select('*')
    .eq('slug', params.slug)
    .order('version', { ascending: false })

  const allVersions = rawVersions ?? []

  if (allVersions.length === 0) {
    notFound()
  }

  // Find the active version for the current scope/language
  const activeVersion = allVersions.find(
    (t) => t.scope === scope && t.language === language && t.is_active
  ) ?? allVersions.find(
    (t) => t.scope === 'global' && t.language === language && t.is_active
  ) ?? allVersions.find(
    (t) => t.is_active
  )

  // Get unique scopes and languages
  const scopes = Array.from(new Set(allVersions.map((t: { scope: string }) => t.scope)))
  const languages = Array.from(new Set(allVersions.map((t: { language: string }) => t.language)))

  // Filter versions for current scope/language
  const scopeLanguageVersions = allVersions.filter(
    (t) => t.scope === scope && t.language === language
  )

  return (
    <PromptEditorClient
      activeTemplate={(activeVersion as PromptTemplate) ?? null}
      allVersions={(scopeLanguageVersions as PromptTemplate[]) ?? []}
      availableScopes={scopes}
      availableLanguages={languages}
      currentScope={scope}
      currentLanguage={language}
      slug={params.slug}
    />
  )
}
