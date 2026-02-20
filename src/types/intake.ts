export interface IntakeFormData {
  // Step 1: Contact
  full_name: string
  phone: string
  email: string
  city: string
  // Step 2: Employment basics
  employer_name: string
  role_title: string
  employment_type: string
  start_date: string
  end_date?: string
  still_employed: boolean
  avg_monthly_salary: number
  // Step 3: Work hours & overtime
  paid_overtime: string
  overtime_hours_estimate?: string
  attendance_tracking: string
  // Step 4: Benefits
  pension_provided: string
  pension_rate_known?: string
  travel_reimbursement: string
  vacation_balance_issue: string
  sick_days_issue: string
  // Step 5: Termination
  termination_type?: string
  termination_date?: string
  reason_for_check: string
  // Step 6: Files
  files: File[]
  // Step 7: Consent
  consent: boolean
  marketing_source?: string
}
