import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/isAdmin'
import { generateEmailDraft } from '@/lib/ai/emailDrafter'

export const maxDuration = 60

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

  const { leadId, conversationId, tone, selectedQuestionIds, selectedDocumentKeys, adminNotes } = parsed.data

  console.log('[draft] Generating email draft', {
    leadId,
    tone,
    questionCount: selectedQuestionIds.length,
    documentCount: selectedDocumentKeys.length,
  })

  const result = await generateEmailDraft({
    leadId,
    conversationId,
    tone,
    selectedQuestionIds,
    selectedDocumentKeys,
    adminNotes,
    adminId: user.id,
  })

  if (!result.success) {
    console.error('[draft] Draft generation failed', { leadId, error: result.error })
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  console.log('[draft] Draft generated successfully', { leadId, draftId: result.draftId })

  return NextResponse.json({
    draftId: result.draftId,
    actionId: result.actionId,
    draft: result.draft,
  })
}
