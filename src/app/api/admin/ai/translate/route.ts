import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/isAdmin'
import { translateToHebrew } from '@/lib/ai/translator'

const translateSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  messageId: z.string().uuid().optional(),
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

  const parsed = translateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const result = await translateToHebrew({
    text: parsed.data.text,
    messageId: parsed.data.messageId,
    adminId: user.id,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({
    hebrew_translation: result.hebrew_translation,
    actionId: result.actionId,
  })
}
