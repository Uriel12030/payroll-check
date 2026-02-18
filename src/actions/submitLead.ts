'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { fullIntakeSchema } from '@/lib/validations/intake'
import { computeScore } from '@/lib/scoring'
import type { IntakeFormData } from '@/types'

export interface SubmitLeadResult {
  success: boolean
  leadId?: string
  error?: string
}

export async function submitLead(
  formData: Omit<IntakeFormData, 'files'>,
  fileInfos: Array<{
    original_filename: string
    storage_path: string
    mime_type: string
    size_bytes: number
    file_type: string
  }>
): Promise<SubmitLeadResult> {
  // Validate
  const parsed = fullIntakeSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: 'Validation failed: ' + parsed.error.issues[0].message }
  }

  const data = parsed.data
  const { score, flags } = computeScore(data)

  const supabase = createServiceClient()

  // Insert lead
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      full_name: data.full_name,
      phone: data.phone,
      email: data.email,
      city: data.city,
      employer_name: data.employer_name,
      role_title: data.role_title,
      employment_type: data.employment_type,
      start_date: data.start_date,
      end_date: data.end_date || null,
      still_employed: data.still_employed,
      avg_monthly_salary: data.avg_monthly_salary,
      paid_overtime: data.paid_overtime,
      overtime_hours_estimate: data.overtime_hours_estimate || null,
      attendance_tracking: data.attendance_tracking,
      pension_provided: data.pension_provided,
      pension_rate_known: data.pension_rate_known || null,
      travel_reimbursement: data.travel_reimbursement,
      vacation_balance_issue: data.vacation_balance_issue,
      sick_days_issue: data.sick_days_issue,
      termination_type: data.termination_type || null,
      termination_date: data.termination_date || null,
      reason_for_check: data.reason_for_check,
      consent: data.consent,
      marketing_source: data.marketing_source || null,
      lead_score: score,
      lead_flags: flags,
      status: 'new',
    })
    .select('id')
    .single()

  if (leadError) {
    console.error('Lead insert error:', leadError.code, leadError.message, leadError.details)
    return { success: false, error: 'שגיאה בשמירת הפרטים. נסו שוב.' }
  }

  // Insert file records
  if (fileInfos.length > 0) {
    const { error: filesError } = await supabase.from('files').insert(
      fileInfos.map((f) => ({
        lead_id: lead.id,
        original_filename: f.original_filename,
        storage_path: f.storage_path,
        mime_type: f.mime_type,
        size_bytes: f.size_bytes,
        file_type: f.file_type,
      }))
    )

    if (filesError) {
      console.error('Files insert error:', filesError)
      // Non-fatal – lead was saved, files metadata failed
    }
  }

  return { success: true, leadId: lead.id }
}
