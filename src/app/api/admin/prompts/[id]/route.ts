import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/isAdmin'
import { clearPromptCache } from '@/lib/ai/promptLoader'

// ---------- GET: Fetch a single prompt template ----------

export async function GET(
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

  const { data, error } = await serviceClient
    .from('ai_prompt_templates')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ template: data })
}

// ---------- PATCH: Toggle active state ----------

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const { is_active } = body as { is_active?: boolean }
  if (typeof is_active !== 'boolean') {
    return NextResponse.json({ error: 'is_active must be a boolean' }, { status: 400 })
  }

  const serviceClient = createServiceClient()

  const { data: template, error: fetchError } = await serviceClient
    .from('ai_prompt_templates')
    .select('*')
    .eq('id', params.id)
    .single()

  if (fetchError || !template) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // If activating, deactivate current active version first
  if (is_active) {
    await serviceClient
      .from('ai_prompt_templates')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('slug', template.slug)
      .eq('scope', template.scope)
      .eq('language', template.language)
      .eq('is_active', true)
  }

  const { data: updated, error: updateError } = await serviceClient
    .from('ai_prompt_templates')
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  clearPromptCache()

  return NextResponse.json({ template: updated })
}
