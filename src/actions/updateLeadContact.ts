'use server'

import { createServiceClient } from '@/lib/supabase/server'

export interface UpdateLeadContactInput {
  leadId: string
  first_name: string
  last_name: string
  email: string
  phone: string
}

export interface UpdateLeadContactResult {
  success: boolean
  error?: string
}

export async function updateLeadContact(
  input: UpdateLeadContactInput
): Promise<UpdateLeadContactResult> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('leads')
    .update({
      full_name: `${input.first_name} ${input.last_name}`.trim(),
      email: input.email,
      phone: input.phone,
    })
    .eq('id', input.leadId)

  if (error) {
    console.error('Lead contact update error:', error.code, error.message, error.details)
    return { success: false, error: 'Failed to save contact details.' }
  }

  return { success: true }
}
