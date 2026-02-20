'use server'

import { createServiceClient } from '@/lib/supabase/server'

export interface QuickLeadInput {
  preferred_language: string
  years_with_employer_bucket: string
  employment_type: string
  main_issues: string[]
}

export interface QuickLeadResult {
  success: boolean
  leadId?: string
  error?: string
}

export async function createQuickLead(input: QuickLeadInput): Promise<QuickLeadResult> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('leads')
    .insert({
      preferred_language: input.preferred_language,
      years_with_employer_bucket: input.years_with_employer_bucket,
      employment_type_quick: input.employment_type,
      main_issues: input.main_issues,
      // Placeholder required fields — will be filled in full intake
      full_name: '',
      phone: '',
      email: '',
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
      status: 'new',
    })
    .select('id')
    .single()

  if (error) {
    console.error('Quick lead insert error:', error.code, error.message, error.details)
    return { success: false, error: 'Failed to save quick start data.' }
  }

  return { success: true, leadId: data.id }
}
