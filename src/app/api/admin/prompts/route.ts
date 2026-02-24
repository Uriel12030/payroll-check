import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/isAdmin'
import { clearPromptCache } from '@/lib/ai/promptLoader'

// ---------- GET: List all prompt templates ----------

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const scope = searchParams.get('scope')
  const language = searchParams.get('language')
  const slug = searchParams.get('slug')

  const serviceClient = createServiceClient()

  let query = serviceClient
    .from('ai_prompt_templates')
    .select('*')
    .order('slug')
    .order('scope')
    .order('language')
    .order('version', { ascending: false })

  if (category) query = query.eq('category', category)
  if (scope) query = query.eq('scope', scope)
  if (language) query = query.eq('language', language)
  if (slug) query = query.eq('slug', slug)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ templates: data })
}

// ---------- POST: Save a new version of a prompt ----------

const saveSchema = z.object({
  slug: z.string().min(1),
  category: z.enum(['system', 'user', 'tone_instruction']),
  scope: z.string().min(1).default('global'),
  language: z.string().min(2).max(5).default('he'),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  content: z.string().min(1),
  variables: z
    .array(z.object({ name: z.string(), description: z.string() }))
    .default([]),
})

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

  const parsed = saveSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { slug, category, scope, language, title, description, content, variables } = parsed.data
  const serviceClient = createServiceClient()

  // Get the current max version for this (slug, scope, language)
  const { data: existing } = await serviceClient
    .from('ai_prompt_templates')
    .select('version')
    .eq('slug', slug)
    .eq('scope', scope)
    .eq('language', language)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextVersion = (existing?.version ?? 0) + 1

  // Deactivate current active version
  await serviceClient
    .from('ai_prompt_templates')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('slug', slug)
    .eq('scope', scope)
    .eq('language', language)
    .eq('is_active', true)

  // Insert new active version
  const { data: newTemplate, error } = await serviceClient
    .from('ai_prompt_templates')
    .insert({
      slug,
      category,
      scope,
      language,
      title,
      description: description ?? null,
      content,
      variables,
      version: nextVersion,
      is_active: true,
      is_default: false,
      created_by: user.email,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Clear prompt cache so changes take effect immediately
  clearPromptCache()

  return NextResponse.json({ template: newTemplate })
}
