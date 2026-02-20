import { describe, it, expect } from 'vitest'
import {
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
  step7Schema,
  fullIntakeSchema,
} from '@/lib/validations/intake'

describe('step1Schema (Contact)', () => {
  const valid = {
    full_name: 'ישראל ישראלי',
    phone: '0501234567',
    email: 'test@test.com',
    city: 'תל אביב',
  }

  it('accepts valid data', () => {
    expect(() => step1Schema.parse(valid)).not.toThrow()
  })

  it('rejects short name', () => {
    expect(() => step1Schema.parse({ ...valid, full_name: 'א' })).toThrow()
  })

  it('rejects invalid phone', () => {
    expect(() => step1Schema.parse({ ...valid, phone: '123' })).toThrow()
  })

  it('rejects invalid email', () => {
    expect(() => step1Schema.parse({ ...valid, email: 'not-an-email' })).toThrow()
  })

  it('rejects short city', () => {
    expect(() => step1Schema.parse({ ...valid, city: 'א' })).toThrow()
  })
})

describe('step2Schema (Employment)', () => {
  const valid = {
    employer_name: 'חברה בע"מ',
    role_title: 'מפתח',
    employment_type: 'full_time' as const,
    start_date: '2020-01-01',
    still_employed: true,
    avg_monthly_salary: 15000,
  }

  it('accepts valid data with still_employed=true', () => {
    expect(() => step2Schema.parse(valid)).not.toThrow()
  })

  it('accepts valid data with end_date when not still employed', () => {
    expect(() =>
      step2Schema.parse({ ...valid, still_employed: false, end_date: '2024-01-01' })
    ).not.toThrow()
  })

  it('rejects missing end_date when not still employed', () => {
    expect(() => step2Schema.parse({ ...valid, still_employed: false })).toThrow()
  })

  it('rejects salary below 1', () => {
    expect(() => step2Schema.parse({ ...valid, avg_monthly_salary: 0 })).toThrow()
  })

  it('rejects invalid employment type', () => {
    expect(() => step2Schema.parse({ ...valid, employment_type: 'invalid' })).toThrow()
  })
})

describe('step3Schema (Overtime)', () => {
  it('accepts valid data', () => {
    expect(() =>
      step3Schema.parse({ paid_overtime: 'no', attendance_tracking: 'yes' })
    ).not.toThrow()
  })

  it('accepts partial overtime', () => {
    expect(() =>
      step3Schema.parse({ paid_overtime: 'partial', attendance_tracking: 'partial' })
    ).not.toThrow()
  })

  it('rejects invalid enum value', () => {
    expect(() =>
      step3Schema.parse({ paid_overtime: 'maybe', attendance_tracking: 'yes' })
    ).toThrow()
  })
})

describe('step4Schema (Benefits)', () => {
  const valid = {
    pension_provided: 'yes' as const,
    travel_reimbursement: 'yes' as const,
    vacation_balance_issue: 'no' as const,
    sick_days_issue: 'no' as const,
  }

  it('accepts valid data', () => {
    expect(() => step4Schema.parse(valid)).not.toThrow()
  })

  it('accepts unknown pension', () => {
    expect(() => step4Schema.parse({ ...valid, pension_provided: 'unknown' })).not.toThrow()
  })
})

describe('step5Schema (Termination)', () => {
  it('accepts with short reason', () => {
    expect(() =>
      step5Schema.parse({ reason_for_check: 'בדיקת זכויות כלליות' })
    ).not.toThrow()
  })

  it('rejects reason shorter than 10 chars', () => {
    expect(() =>
      step5Schema.parse({ reason_for_check: 'קצר' })
    ).toThrow()
  })

  it('accepts optional termination fields', () => {
    expect(() =>
      step5Schema.parse({
        termination_type: 'fired',
        termination_date: '2024-01-01',
        reason_for_check: 'פוטרתי ורוצה לבדוק את הזכויות שלי',
      })
    ).not.toThrow()
  })
})

describe('step7Schema (Consent)', () => {
  it('accepts consent=true', () => {
    expect(() => step7Schema.parse({ consent: true })).not.toThrow()
  })

  it('rejects consent=false', () => {
    expect(() => step7Schema.parse({ consent: false })).toThrow()
  })
})

describe('fullIntakeSchema', () => {
  const validFull = {
    full_name: 'ישראל ישראלי',
    phone: '0501234567',
    email: 'test@test.com',
    city: 'תל אביב',
    employer_name: 'חברה בע"מ',
    role_title: 'מפתח',
    employment_type: 'full_time' as const,
    start_date: '2020-01-01',
    still_employed: true,
    avg_monthly_salary: 15000,
    paid_overtime: 'no' as const,
    attendance_tracking: 'yes' as const,
    pension_provided: 'no' as const,
    travel_reimbursement: 'no' as const,
    vacation_balance_issue: 'yes' as const,
    sick_days_issue: 'no' as const,
    reason_for_check: 'בדיקת זכויות כלליות לפי חוק',
    consent: true,
  }

  it('accepts valid full intake data', () => {
    expect(() => fullIntakeSchema.parse(validFull)).not.toThrow()
  })

  it('rejects when still_employed=false without end_date', () => {
    expect(() =>
      fullIntakeSchema.parse({ ...validFull, still_employed: false })
    ).toThrow()
  })
})
