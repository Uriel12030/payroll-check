'use server'

import { createServiceClient } from '@/lib/supabase/server'

export interface QuickLeadInput {
  preferred_language: string
  years_with_employer_bucket: string
  employment_type: string
  main_issues: string[]
  first_name: string
  last_name: string
  email: string
  phone: string
}

export interface QuickLeadResult {
  success: boolean
  leadId?: string
  error?: string
}

export async function createQuickLead(input: QuickLeadInput): Promise<QuickLeadResult> {
  let supabase
  try {
    supabase = createServiceClient()
  } catch (err) {
    console.error('Supabase client init error:', err)
    return { success: false, error: 'Database configuration error.' }
  }

  const fullName = `${input.first_name} ${input.last_name}`.trim()

  const { data, error } = await supabase
    .from('leads')
    .insert({
      preferred_language: input.preferred_language,
      years_with_employer_bucket: input.years_with_employer_bucket,
      employment_type_quick: input.employment_type,
      main_issues: input.main_issues,
      full_name: fullName,
      email: input.email,
      phone: input.phone || null,
      status: 'new',
    })
    .select('id')
    .single()

  if (error) {
    console.error('Quick lead insert error:', error.code, error.message, error.details, error.hint)
    return {
      success: false,
      error: `DB: ${error.message} (${error.code})`,
    }
  }

  return { success: true, leadId: data.id }
}
