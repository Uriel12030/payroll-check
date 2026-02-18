'use server'

import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/isAdmin'
import type { LeadStatus } from '@/types'

async function requireAdmin(): Promise<{ error: string } | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) {
    return { error: 'Unauthorized' }
  }
  return null
}

export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus
): Promise<{ success: boolean; error?: string }> {
  const authError = await requireAdmin()
  if (authError) return { success: false, error: authError.error }

  const supabase = createClient()
  const { error } = await supabase
    .from('leads')
    .update({ status })
    .eq('id', leadId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function updateLeadNotes(
  leadId: string,
  admin_notes: string
): Promise<{ success: boolean; error?: string }> {
  const authError = await requireAdmin()
  if (authError) return { success: false, error: authError.error }

  const supabase = createClient()
  const { error } = await supabase
    .from('leads')
    .update({ admin_notes })
    .eq('id', leadId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
