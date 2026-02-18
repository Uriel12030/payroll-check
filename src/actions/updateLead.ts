'use server'

import { createClient } from '@/lib/supabase/server'
import type { LeadStatus } from '@/types'

export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus
): Promise<{ success: boolean; error?: string }> {
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
  const supabase = createClient()

  const { error } = await supabase
    .from('leads')
    .update({ admin_notes })
    .eq('id', leadId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
