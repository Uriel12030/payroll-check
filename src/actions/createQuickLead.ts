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

  // Base payload — satisfies ALL NOT NULL columns from migration 001.
  // Quick-start data is also stored in lead_flags (jsonb, always exists).
  const basePayload = {
    full_name: fullName,
    email: input.email,
    phone: input.phone || '',
    city: '',
    employer_name: '',
    role_title: '',
    employment_type: '',
    start_date: '1900-01-01',
    still_employed: false,
    avg_monthly_salary: 0,
    paid_overtime: 'no',
    attendance_tracking: 'no',
    pension_provided: 'unknown',
    travel_reimbursement: 'no',
    vacation_balance_issue: 'unknown',
    sick_days_issue: 'unknown',
    reason_for_check: '',
    consent: false,
    status: 'new' as const,
    lead_flags: {
      preferred_language: input.preferred_language,
      years_with_employer_bucket: input.years_with_employer_bucket,
      employment_type_quick: input.employment_type,
      main_issues: input.main_issues,
    },
  }

  // First attempt: include quick-start columns (added by migration 006)
  let { data, error } = await supabase
    .from('leads')
    .insert({
      ...basePayload,
      preferred_language: input.preferred_language,
      years_with_employer_bucket: input.years_with_employer_bucket,
      employment_type_quick: input.employment_type,
      main_issues: input.main_issues,
    })
    .select('id')
    .single()

  // 42703 = undefined_column → migration 006 not applied yet.
  // Retry with base schema only (quick-start data is in lead_flags).
  if (error?.code === '42703') {
    console.warn('Quick-start columns missing, retrying with base schema')
    ;({ data, error } = await supabase
      .from('leads')
      .insert(basePayload)
      .select('id')
      .single())
  }

  if (error) {
    console.error('Quick lead insert error:', error.code, error.message, error.details, error.hint)
    return {
      success: false,
      error: `DB: ${error.message} (${error.code})`,
    }
  }

  return { success: true, leadId: data!.id }
}
