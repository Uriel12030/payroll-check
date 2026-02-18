import type { LeadFlags } from '@/types'
import type { FullIntakeData } from '@/lib/validations/intake'

export interface ScoringResult {
  score: number
  flags: LeadFlags
}

/**
 * Rule-based lead scoring (0–100).
 * Disclaimer: Automated screening only. Not legal advice.
 */
export function computeScore(data: Partial<FullIntakeData>): ScoringResult {
  let score = 0

  const flags: LeadFlags = {
    no_pension: false,
    unpaid_overtime: false,
    no_travel: false,
    vacation_issue: false,
    sick_days_issue: false,
    termination_flag: false,
    recent_employment: false,
  }

  // +25: No pension provided
  if (data.pension_provided === 'no') {
    score += 25
    flags.no_pension = true
  }

  // +25: Unpaid overtime with estimate
  if (data.paid_overtime === 'no' && data.overtime_hours_estimate) {
    score += 25
    flags.unpaid_overtime = true
  }

  // +10: No travel reimbursement
  if (data.travel_reimbursement === 'no') {
    score += 10
    flags.no_travel = true
  }

  // +10: Vacation balance issue
  if (data.vacation_balance_issue === 'yes') {
    score += 10
    flags.vacation_issue = true
  }

  // +10: Sick days issue
  if (data.sick_days_issue === 'yes') {
    score += 10
    flags.sick_days_issue = true
  }

  // +10: Fired or laid off
  if (data.termination_type === 'fired' || data.termination_type === 'laid_off') {
    score += 10
    flags.termination_flag = true
  }

  // +5: Still employed OR end_date within last 12 months
  if (data.still_employed) {
    score += 5
    flags.recent_employment = true
  } else if (data.end_date) {
    const endDate = new Date(data.end_date)
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1)
    if (endDate >= twelveMonthsAgo) {
      score += 5
      flags.recent_employment = true
    }
  }

  return {
    score: Math.min(score, 100),
    flags,
  }
}
