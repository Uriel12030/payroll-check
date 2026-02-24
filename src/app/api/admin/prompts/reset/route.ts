import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/isAdmin'
import { clearPromptCache } from '@/lib/ai/promptLoader'

const resetSchema = z.object({
  slug: z.string().min(1),
  scope: z.string().min(1).default('global'),
  language: z.string().min(2).max(5).default('he'),
})

// ---------- POST: Reset to default (factory) version ----------

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = resetSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { slug, scope, language } = parsed.data
  const serviceClient = createServiceClient()

  // Find the default version
  const { data: defaultTemplate, error: findError } = await serviceClient
    .from('ai_prompt_templates')
    .select('*')
    .eq('slug', slug)
    .eq('scope', scope)
    .eq('language', language)
    .eq('is_default', true)
    .single()

  if (findError || !defaultTemplate) {
    return NextResponse.json({ error: 'No default version found' }, { status: 404 })
  }

  // Deactivate all versions for this (slug, scope, language)
  await serviceClient
    .from('ai_prompt_templates')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('slug', slug)
    .eq('scope', scope)
    .eq('language', language)
    .eq('is_active', true)

  // Activate the default version
  const { data: activated, error: activateError } = await serviceClient
    .from('ai_prompt_templates')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', defaultTemplate.id)
    .select()
    .single()

  if (activateError) {
    return NextResponse.json({ error: activateError.message }, { status: 500 })
  }

  // Clear prompt cache
  clearPromptCache()

  return NextResponse.json({ template: activated })
}
