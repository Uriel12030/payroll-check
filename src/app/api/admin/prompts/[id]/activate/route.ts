import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/isAdmin'
import { clearPromptCache } from '@/lib/ai/promptLoader'

// ---------- POST: Activate a specific version (rollback) ----------

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const serviceClient = createServiceClient()

  // Fetch the target template
  const { data: template, error: fetchError } = await serviceClient
    .from('ai_prompt_templates')
    .select('*')
    .eq('id', params.id)
    .single()

  if (fetchError || !template) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Deactivate current active version
  await serviceClient
    .from('ai_prompt_templates')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('slug', template.slug)
    .eq('scope', template.scope)
    .eq('language', template.language)
    .eq('is_active', true)

  // Activate the target version
  const { data: activated, error: activateError } = await serviceClient
    .from('ai_prompt_templates')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single()

  if (activateError) {
    return NextResponse.json({ error: activateError.message }, { status: 500 })
  }

  // Clear prompt cache
  clearPromptCache()

  return NextResponse.json({ template: activated })
}
