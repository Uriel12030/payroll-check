import { createServiceClient } from '@/lib/supabase/server'
import { PromptListClient } from '@/components/admin/prompts/PromptListClient'
import type { PromptTemplate } from '@/types'

export const dynamic = 'force-dynamic'

export default async function PromptsPage() {
  const serviceClient = createServiceClient()

  const { data: templates = [] } = await serviceClient
    .from('ai_prompt_templates')
    .select('*')
    .order('slug')
    .order('scope')
    .order('language')
    .order('version', { ascending: false })

  return <PromptListClient templates={(templates as PromptTemplate[]) ?? []} />
}
