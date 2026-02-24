import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/isAdmin'
import { analyzeForWorkbench } from '@/lib/ai/workbenchAnalyzer'

const analyzeSchema = z.object({
  leadId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  // Verify admin session
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

  const parsed = analyzeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { leadId } = parsed.data

  console.log('[analyze] Starting workbench analysis', { leadId })

  const result = await analyzeForWorkbench({
    leadId,
    adminId: user.id,
  })

  if (!result.success) {
    console.error('[analyze] Workbench analysis failed', { leadId, error: result.error })
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  console.log('[analyze] Workbench analysis completed', { leadId, actionId: result.actionId })

  return NextResponse.json({ actionId: result.actionId })
}
