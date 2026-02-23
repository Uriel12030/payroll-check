import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/isAdmin'
import { generateEmailDraft } from '@/lib/ai/emailDrafter'

const draftSchema = z.object({
  leadId: z.string().uuid(),
  conversationId: z.string().uuid().optional(),
  tone: z.enum(['friendly', 'formal', 'firm']),
  selectedQuestionIds: z.array(z.string()),
  selectedDocumentKeys: z.array(z.string()),
  adminNotes: z.string().optional(),
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

  const parsed = draftSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const result = await generateEmailDraft({
    leadId: parsed.data.leadId,
    conversationId: parsed.data.conversationId,
    tone: parsed.data.tone,
    selectedQuestionIds: parsed.data.selectedQuestionIds,
    selectedDocumentKeys: parsed.data.selectedDocumentKeys,
    adminNotes: parsed.data.adminNotes,
    adminId: user.id,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({
    draftId: result.draftId,
    actionId: result.actionId,
    draft: result.draft,
  })
}
