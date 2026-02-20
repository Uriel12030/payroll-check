export type LeadStatus = 'new' | 'reviewing' | 'rejected' | 'accepted'

export interface Lead {
  id: string
  created_at: string
  status: LeadStatus
  full_name: string
  phone: string
  email: string
  city: string
  employer_name: string
  role_title: string
  employment_type: string
  start_date: string
  end_date: string | null
  still_employed: boolean
  avg_monthly_salary: number
  paid_overtime: string
  overtime_hours_estimate: string | null
  attendance_tracking: string
  pension_provided: string
  pension_rate_known: string | null
  travel_reimbursement: string
  vacation_balance_issue: string
  sick_days_issue: string
  termination_type: string | null
  termination_date: string | null
  reason_for_check: string
  consent: boolean
  marketing_source: string | null
  lead_score: number | null
  lead_flags: LeadFlags | null
  admin_notes: string | null
  // Quick-start fields
  preferred_language: string | null
  years_with_employer_bucket: string | null
  employment_type_quick: string | null
  main_issues: string[] | null
}

export interface LeadFlags {
  no_pension: boolean
  unpaid_overtime: boolean
  no_travel: boolean
  vacation_issue: boolean
  sick_days_issue: boolean
  termination_flag: boolean
  recent_employment: boolean
}

export interface LeadFile {
  id: string
  lead_id: string
  created_at: string
  file_type: string
  original_filename: string
  storage_path: string
  mime_type: string
  size_bytes: number
}
