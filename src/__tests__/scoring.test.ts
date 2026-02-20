import { describe, it, expect } from 'vitest'
import { computeScore } from '@/lib/scoring'

describe('computeScore', () => {
  it('returns 0 with all flags false for empty data', () => {
    const result = computeScore({})
    expect(result.score).toBe(0)
    expect(result.flags).toEqual({
      no_pension: false,
      unpaid_overtime: false,
      no_travel: false,
      vacation_issue: false,
      sick_days_issue: false,
      termination_flag: false,
      recent_employment: false,
    })
  })

  it('adds 25 for no pension', () => {
    const result = computeScore({ pension_provided: 'no' })
    expect(result.score).toBe(25)
    expect(result.flags.no_pension).toBe(true)
  })

  it('adds 25 for unpaid overtime with estimate', () => {
    const result = computeScore({ paid_overtime: 'no', overtime_hours_estimate: '20' })
    expect(result.score).toBe(25)
    expect(result.flags.unpaid_overtime).toBe(true)
  })

  it('does NOT add 25 for unpaid overtime without estimate', () => {
    const result = computeScore({ paid_overtime: 'no' })
    expect(result.score).toBe(0)
    expect(result.flags.unpaid_overtime).toBe(false)
  })

  it('adds 10 for no travel reimbursement', () => {
    const result = computeScore({ travel_reimbursement: 'no' })
    expect(result.score).toBe(10)
    expect(result.flags.no_travel).toBe(true)
  })

  it('adds 10 for vacation issue', () => {
    const result = computeScore({ vacation_balance_issue: 'yes' })
    expect(result.score).toBe(10)
    expect(result.flags.vacation_issue).toBe(true)
  })

  it('adds 10 for sick days issue', () => {
    const result = computeScore({ sick_days_issue: 'yes' })
    expect(result.score).toBe(10)
    expect(result.flags.sick_days_issue).toBe(true)
  })

  it('adds 10 for fired termination', () => {
    const result = computeScore({ termination_type: 'fired' })
    expect(result.score).toBe(10)
    expect(result.flags.termination_flag).toBe(true)
  })

  it('adds 10 for laid_off termination', () => {
    const result = computeScore({ termination_type: 'laid_off' })
    expect(result.score).toBe(10)
    expect(result.flags.termination_flag).toBe(true)
  })

  it('does NOT add for resigned termination', () => {
    const result = computeScore({ termination_type: 'resigned' })
    expect(result.score).toBe(0)
    expect(result.flags.termination_flag).toBe(false)
  })

  it('adds 5 for still employed', () => {
    const result = computeScore({ still_employed: true })
    expect(result.score).toBe(5)
    expect(result.flags.recent_employment).toBe(true)
  })

  it('adds 5 for end_date within last 12 months', () => {
    const recentDate = new Date()
    recentDate.setMonth(recentDate.getMonth() - 6)
    const result = computeScore({ still_employed: false, end_date: recentDate.toISOString().split('T')[0] })
    expect(result.score).toBe(5)
    expect(result.flags.recent_employment).toBe(true)
  })

  it('does NOT add for end_date older than 12 months', () => {
    const oldDate = new Date()
    oldDate.setFullYear(oldDate.getFullYear() - 2)
    const result = computeScore({ still_employed: false, end_date: oldDate.toISOString().split('T')[0] })
    expect(result.score).toBe(0)
    expect(result.flags.recent_employment).toBe(false)
  })

  it('caps score at 100 when all issues present', () => {
    const result = computeScore({
      pension_provided: 'no',
      paid_overtime: 'no',
      overtime_hours_estimate: '20',
      travel_reimbursement: 'no',
      vacation_balance_issue: 'yes',
      sick_days_issue: 'yes',
      termination_type: 'fired',
      still_employed: true,
    })
    expect(result.score).toBe(95)
    expect(result.score).toBeLessThanOrEqual(100)
  })

  it('accumulates multiple flags correctly', () => {
    const result = computeScore({
      pension_provided: 'no',
      travel_reimbursement: 'no',
      vacation_balance_issue: 'yes',
    })
    expect(result.score).toBe(45) // 25 + 10 + 10
    expect(result.flags.no_pension).toBe(true)
    expect(result.flags.no_travel).toBe(true)
    expect(result.flags.vacation_issue).toBe(true)
    expect(result.flags.unpaid_overtime).toBe(false)
  })
})
