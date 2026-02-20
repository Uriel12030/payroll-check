import type { RequiredField, Lead } from '@/types'

/**
 * Map lead record fields to known_facts keys.
 * This bridges the existing lead data into the AI's known_facts structure.
 */
export function extractFactsFromLead(lead: Lead): Record<string, string | number | boolean | null> {
  const facts: Record<string, string | number | boolean | null> = {}

  if (lead.start_date) facts['employment_start_date'] = lead.start_date
  if (lead.end_date) facts['employment_end_date'] = lead.end_date
  if (lead.avg_monthly_salary) facts['last_salary'] = lead.avg_monthly_salary
  if (lead.avg_monthly_salary) facts['base_salary'] = lead.avg_monthly_salary
  if (lead.avg_monthly_salary) facts['agreed_salary'] = lead.avg_monthly_salary
  if (lead.employer_name) facts['employer_name'] = lead.employer_name
  if (lead.still_employed !== undefined) facts['still_employed'] = lead.still_employed
  if (lead.termination_type) facts['termination_reason'] = lead.termination_type
  if (lead.pension_provided) facts['pension_status'] = lead.pension_provided
  if (lead.vacation_balance_issue) facts['vacation_balance'] = lead.vacation_balance_issue
  if (lead.paid_overtime) facts['overtime_paid'] = lead.paid_overtime
  if (lead.overtime_hours_estimate) facts['overtime_hours_monthly'] = lead.overtime_hours_estimate
  if (lead.attendance_tracking) facts['attendance_records'] = lead.attendance_tracking
  if (lead.reason_for_check) facts['main_issue'] = lead.reason_for_check

  return facts
}

/**
 * Infer case type from lead data.
 */
export function inferCaseType(lead: Lead): string {
  const termType = lead.termination_type?.toLowerCase()
  const reason = lead.reason_for_check?.toLowerCase() ?? ''

  if (termType === 'fired' || termType === 'laid_off' || reason.includes('פיטור')) {
    return 'פיטורים'
  }
  if (termType === 'resigned' || reason.includes('התפטר')) {
    return 'התפטרות'
  }
  if (reason.includes('שכר') && (reason.includes('תשלום') || reason.includes('לא שולם'))) {
    return 'אי_תשלום_שכר'
  }
  if (reason.includes('שעות נוספות') || lead.paid_overtime === 'no') {
    return 'שעות_נוספות'
  }

  return 'general'
}

/**
 * DETERMINISTIC missing fields engine.
 * Computes which required fields are still missing based on known facts.
 * Does NOT use LLM — purely rule-based.
 */
export function computeMissingFields(
  requiredFields: RequiredField[],
  knownFacts: Record<string, string | number | boolean | null>
): RequiredField[] {
  const missing: RequiredField[] = []

  for (const field of requiredFields) {
    const value = knownFacts[field.key]

    // A field is "known" if it has a non-empty, non-null value
    const isKnown =
      value !== undefined &&
      value !== null &&
      value !== '' &&
      value !== 'unknown' &&
      value !== 'לא ידוע'

    if (!isKnown) {
      missing.push(field)
    }
  }

  // Sort by priority (lower number = higher priority), then by original order
  return missing.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
}

/**
 * Merge new extracted facts into existing known_facts.
 * Never overwrites a non-empty existing value unless the new value is more specific.
 */
export function mergeKnownFacts(
  existing: Record<string, string | number | boolean | null>,
  extracted: Record<string, string | number | boolean | null>
): Record<string, string | number | boolean | null> {
  const merged = { ...existing }

  for (const [key, newValue] of Object.entries(extracted)) {
    if (newValue === null || newValue === undefined || newValue === '') {
      continue // Don't overwrite with empty
    }

    const existingValue = merged[key]
    const existingEmpty =
      existingValue === undefined ||
      existingValue === null ||
      existingValue === '' ||
      existingValue === 'unknown' ||
      existingValue === 'לא ידוע'

    if (existingEmpty) {
      merged[key] = newValue
    }
    // If existing is non-empty, keep it (conservative merge)
  }

  return merged
}
