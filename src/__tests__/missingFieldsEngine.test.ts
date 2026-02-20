import { describe, it, expect } from 'vitest'
import {
  extractFactsFromLead,
  inferCaseType,
  computeMissingFields,
  mergeKnownFacts,
} from '@/lib/ai/missingFieldsEngine'
import type { Lead, RequiredField } from '@/types'

const baseLead: Lead = {
  id: '1',
  created_at: '2024-01-01',
  status: 'new',
  full_name: 'Test User',
  phone: '0501234567',
  email: 'test@test.com',
  city: 'Tel Aviv',
  employer_name: 'Acme Corp',
  role_title: 'Developer',
  employment_type: 'full_time',
  start_date: '2020-01-01',
  end_date: null,
  still_employed: true,
  avg_monthly_salary: 15000,
  paid_overtime: 'no',
  overtime_hours_estimate: '20',
  attendance_tracking: 'yes',
  pension_provided: 'no',
  pension_rate_known: null,
  travel_reimbursement: 'no',
  vacation_balance_issue: 'yes',
  sick_days_issue: 'no',
  termination_type: null,
  termination_date: null,
  reason_for_check: 'בדיקת זכויות כלליות',
  consent: true,
  marketing_source: null,
  lead_score: null,
  lead_flags: null,
  admin_notes: null,
  preferred_language: null,
  years_with_employer_bucket: null,
  employment_type_quick: null,
  main_issues: null,
}

describe('extractFactsFromLead', () => {
  it('extracts known facts from lead', () => {
    const facts = extractFactsFromLead(baseLead)
    expect(facts['employer_name']).toBe('Acme Corp')
    expect(facts['employment_start_date']).toBe('2020-01-01')
    expect(facts['last_salary']).toBe(15000)
    expect(facts['still_employed']).toBe(true)
    expect(facts['pension_status']).toBe('no')
    expect(facts['overtime_paid']).toBe('no')
    expect(facts['overtime_hours_monthly']).toBe('20')
  })

  it('does not include null/undefined values', () => {
    const minimalLead: Lead = {
      ...baseLead,
      employer_name: '',
      avg_monthly_salary: 0,
      termination_type: null,
    }
    const facts = extractFactsFromLead(minimalLead)
    expect(facts['termination_reason']).toBeUndefined()
  })
})

describe('inferCaseType', () => {
  it('returns פיטורים for fired termination', () => {
    expect(inferCaseType({ ...baseLead, termination_type: 'fired' })).toBe('פיטורים')
  })

  it('returns פיטורים for laid_off termination', () => {
    expect(inferCaseType({ ...baseLead, termination_type: 'laid_off' })).toBe('פיטורים')
  })

  it('returns התפטרות for resigned', () => {
    expect(inferCaseType({ ...baseLead, termination_type: 'resigned' })).toBe('התפטרות')
  })

  it('returns פיטורים when reason mentions פיטור', () => {
    expect(inferCaseType({ ...baseLead, reason_for_check: 'פוטרתי מהעבודה, פיטורים' })).toBe('פיטורים')
  })

  it('returns שעות_נוספות for unpaid overtime', () => {
    expect(
      inferCaseType({ ...baseLead, termination_type: null, reason_for_check: 'בדיקה כללית', paid_overtime: 'no' })
    ).toBe('שעות_נוספות')
  })

  it('returns general for generic case', () => {
    expect(
      inferCaseType({ ...baseLead, termination_type: null, reason_for_check: 'בדיקה כללית', paid_overtime: 'yes' })
    ).toBe('general')
  })
})

describe('computeMissingFields', () => {
  const requiredFields: RequiredField[] = [
    { key: 'employer_name', label: 'שם מעסיק', question: 'מה שם המעסיק?', priority: 1 },
    { key: 'last_salary', label: 'שכר אחרון', question: 'מה השכר האחרון?', priority: 2 },
    { key: 'start_date', label: 'תאריך התחלה', question: 'מתי התחלת?', priority: 3 },
  ]

  it('returns all fields when nothing is known', () => {
    const missing = computeMissingFields(requiredFields, {})
    expect(missing).toHaveLength(3)
  })

  it('excludes fields with known values', () => {
    const missing = computeMissingFields(requiredFields, { employer_name: 'Acme', last_salary: 10000 })
    expect(missing).toHaveLength(1)
    expect(missing[0].key).toBe('start_date')
  })

  it('treats "unknown" and "לא ידוע" as not known', () => {
    const missing = computeMissingFields(requiredFields, { employer_name: 'unknown', last_salary: 'לא ידוע' })
    expect(missing).toHaveLength(3)
  })

  it('treats empty string as not known', () => {
    const missing = computeMissingFields(requiredFields, { employer_name: '' })
    expect(missing).toHaveLength(3)
  })

  it('treats null as not known', () => {
    const missing = computeMissingFields(requiredFields, { employer_name: null })
    expect(missing).toHaveLength(3)
  })

  it('sorts by priority', () => {
    const fields: RequiredField[] = [
      { key: 'c', label: 'C', question: '?', priority: 3 },
      { key: 'a', label: 'A', question: '?', priority: 1 },
      { key: 'b', label: 'B', question: '?', priority: 2 },
    ]
    const missing = computeMissingFields(fields, {})
    expect(missing.map((f) => f.key)).toEqual(['a', 'b', 'c'])
  })
})

describe('mergeKnownFacts', () => {
  it('adds new facts to empty existing', () => {
    const merged = mergeKnownFacts({}, { name: 'Test', salary: 5000 })
    expect(merged).toEqual({ name: 'Test', salary: 5000 })
  })

  it('does not overwrite existing non-empty values', () => {
    const merged = mergeKnownFacts({ name: 'Original' }, { name: 'New' })
    expect(merged.name).toBe('Original')
  })

  it('overwrites "unknown" existing values', () => {
    const merged = mergeKnownFacts({ name: 'unknown' }, { name: 'Real Name' })
    expect(merged.name).toBe('Real Name')
  })

  it('overwrites "לא ידוע" existing values', () => {
    const merged = mergeKnownFacts({ name: 'לא ידוע' }, { name: 'Real Name' })
    expect(merged.name).toBe('Real Name')
  })

  it('overwrites null existing values', () => {
    const merged = mergeKnownFacts({ name: null }, { name: 'Real Name' })
    expect(merged.name).toBe('Real Name')
  })

  it('overwrites empty string existing values', () => {
    const merged = mergeKnownFacts({ name: '' }, { name: 'Real Name' })
    expect(merged.name).toBe('Real Name')
  })

  it('ignores null/empty new values', () => {
    const merged = mergeKnownFacts({ name: 'Existing' }, { name: null, other: '' })
    expect(merged.name).toBe('Existing')
    expect(merged.other).toBeUndefined()
  })

  it('preserves all existing keys', () => {
    const merged = mergeKnownFacts({ a: 'val_a', b: 'val_b' }, { c: 'val_c' })
    expect(merged).toEqual({ a: 'val_a', b: 'val_b', c: 'val_c' })
  })
})
