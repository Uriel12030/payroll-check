import { describe, it, expect } from 'vitest'
import {
  aiAnalysisOutputSchema,
  workbenchAnalysisOutputSchema,
  emailDraftOutputSchema,
  translationOutputSchema,
} from '@/lib/ai/schemas'
import { SchemaValidationError } from '@/lib/ai/shared'

describe('aiAnalysisOutputSchema', () => {
  const validOutput = {
    case_summary: 'סיכום התיק',
    extracted_facts: { employer_name: 'Acme', salary: 15000 },
    risk_flags: ['חוסר פנסיה'],
    suggested_subject: 'מענה לפנייתך',
    suggested_reply_text: 'שלום רב, תודה על פנייתך',
    suggested_reply_html: null,
    questions: ['מה שכרך האחרון?'],
  }

  it('accepts valid output', () => {
    expect(() => aiAnalysisOutputSchema.parse(validOutput)).not.toThrow()
  })

  it('defaults missing case_summary to empty string', () => {
    const without = { ...validOutput } as Record<string, unknown>
    delete without.case_summary
    const result = aiAnalysisOutputSchema.parse(without)
    expect(result.case_summary).toBe('')
  })

  it('defaults missing suggested_reply_text to empty string', () => {
    const without = { ...validOutput } as Record<string, unknown>
    delete without.suggested_reply_text
    const result = aiAnalysisOutputSchema.parse(without)
    expect(result.suggested_reply_text).toBe('')
  })

  it('defaults missing arrays and records', () => {
    const result = aiAnalysisOutputSchema.parse({})
    expect(result.risk_flags).toEqual([])
    expect(result.questions).toEqual([])
    expect(result.extracted_facts).toEqual({})
    expect(result.suggested_reply_html).toBeNull()
  })

  it('accepts empty arrays for risk_flags and questions', () => {
    expect(() =>
      aiAnalysisOutputSchema.parse({ ...validOutput, risk_flags: [], questions: [] })
    ).not.toThrow()
  })

  it('accepts suggested_reply_html as string', () => {
    expect(() =>
      aiAnalysisOutputSchema.parse({ ...validOutput, suggested_reply_html: '<p>Hello</p>' })
    ).not.toThrow()
  })

  it('accepts boolean/number/null in extracted_facts', () => {
    expect(() =>
      aiAnalysisOutputSchema.parse({
        ...validOutput,
        extracted_facts: { employed: true, salary: 10000, notes: null },
      })
    ).not.toThrow()
  })

  it('falls back to default on wrong type (number instead of string)', () => {
    const result = aiAnalysisOutputSchema.parse({ ...validOutput, case_summary: 123 })
    expect(result.case_summary).toBe('')
  })

  it('stringifies nested objects in extracted_facts', () => {
    const result = aiAnalysisOutputSchema.parse({
      ...validOutput,
      extracted_facts: { nested: { a: 1 }, arr: [1, 2, 3], normal: 'hello' },
    })
    expect(result.extracted_facts.normal).toBe('hello')
    expect(result.extracted_facts.nested).toBe('{"a":1}')
    expect(result.extracted_facts.arr).toBe('[1,2,3]')
  })

  it('falls back to empty array when risk_flags is wrong type', () => {
    const result = aiAnalysisOutputSchema.parse({ ...validOutput, risk_flags: 'not_array' })
    expect(result.risk_flags).toEqual([])
  })
})

// ---------- Workbench Analysis Schema ----------

describe('workbenchAnalysisOutputSchema', () => {
  const validWorkbenchOutput = {
    workbench_summary: '• נקודה ראשונה\n• נקודה שנייה',
    case_summary: 'סיכום קצר של התיק',
    missing_info_he: ['חסר תאריך פיטורים', 'חסר מידע על שימוע'],
    risk_notes_internal_he: ['הטענה נראית חלשה ללא תיעוד', 'סיכוי טוב לתביעת פנסיה'],
    extracted_facts: { employer_name: 'חברת בדיקה', salary: 12000 },
    active_playbooks: ['overtime', 'pension'],
    recommended_questions: [
      {
        id: 'q1',
        text_he: 'כמה שעות עבדת?',
        playbook_slug: 'overtime',
        selected: true,
        answered: false,
      },
    ],
    risk_flags: [
      {
        label_he: 'חוסר פנסיה',
        severity: 'high',
        playbook_slug: 'pension',
        source: 'ai',
      },
    ],
    strength_flags: [
      {
        label_he: 'תיעוד מלא',
        playbook_slug: null,
        source: 'ai',
      },
    ],
    documents_to_request: [
      { key: 'pay_slips', label_he: 'תלושי שכר', priority: 'high' },
    ],
  }

  it('accepts valid workbench output', () => {
    expect(() => workbenchAnalysisOutputSchema.parse(validWorkbenchOutput)).not.toThrow()
  })

  it('defaults missing workbench_summary to empty string', () => {
    const without = { ...validWorkbenchOutput } as Record<string, unknown>
    delete without.workbench_summary
    const result = workbenchAnalysisOutputSchema.parse(without)
    expect(result.workbench_summary).toBe('')
  })

  it('defaults all arrays to empty when missing', () => {
    const result = workbenchAnalysisOutputSchema.parse({})
    expect(result.active_playbooks).toEqual([])
    expect(result.recommended_questions).toEqual([])
    expect(result.risk_flags).toEqual([])
    expect(result.strength_flags).toEqual([])
    expect(result.documents_to_request).toEqual([])
    expect(result.missing_info_he).toEqual([])
    expect(result.risk_notes_internal_he).toEqual([])
  })

  it('accepts empty arrays', () => {
    expect(() =>
      workbenchAnalysisOutputSchema.parse({
        ...validWorkbenchOutput,
        active_playbooks: [],
        recommended_questions: [],
        risk_flags: [],
        strength_flags: [],
        documents_to_request: [],
      })
    ).not.toThrow()
  })

  it('falls back to medium for invalid severity enum', () => {
    const result = workbenchAnalysisOutputSchema.parse({
      ...validWorkbenchOutput,
      risk_flags: [{ label_he: 'test', severity: 'critical', playbook_slug: null, source: 'ai' }],
    })
    expect(result.risk_flags[0].severity).toBe('medium')
  })

  it('defaults selected to true and answered to false', () => {
    const result = workbenchAnalysisOutputSchema.parse({
      ...validWorkbenchOutput,
      recommended_questions: [
        { id: 'q1', text_he: 'שאלה', playbook_slug: null },
      ],
    })
    expect(result.recommended_questions[0].selected).toBe(true)
    expect(result.recommended_questions[0].answered).toBe(false)
  })

  it('falls back to default when wrong type given for string fields', () => {
    const result = workbenchAnalysisOutputSchema.parse({
      ...validWorkbenchOutput,
      workbench_summary: 123,
      risk_flags: 'not_an_array',
    })
    expect(result.workbench_summary).toBe('')
    expect(result.risk_flags).toEqual([])
  })

  it('accepts source values beyond just "ai"', () => {
    const result = workbenchAnalysisOutputSchema.parse({
      ...validWorkbenchOutput,
      risk_flags: [
        { label_he: 'test', severity: 'high', playbook_slug: null, source: 'rule' },
        { label_he: 'test2', severity: 'low', playbook_slug: null, source: 'manual' },
      ],
    })
    expect(result.risk_flags[0].source).toBe('rule')
    expect(result.risk_flags[1].source).toBe('manual')
  })

  it('falls back to "ai" when source is unexpected value', () => {
    const result = workbenchAnalysisOutputSchema.parse({
      ...validWorkbenchOutput,
      risk_flags: [{ label_he: 'test', severity: 'high', playbook_slug: null, source: 'unknown' }],
    })
    expect(result.risk_flags[0].source).toBe('ai')
  })
})

// ---------- Email Draft Schema ----------

describe('emailDraftOutputSchema', () => {
  const validDraftOutput = {
    internal_summary_he: 'סיכום פנימי לעורך דין',
    suggested_subject: 'מענה לפנייתך בנוגע לזכויות עבודה',
    suggested_text: 'שלום רב, תודה על פנייתך למשרדנו.',
    suggested_html: null,
    hebrew_translation: null,
    questions_included: ['q1', 'q2'],
  }

  it('accepts valid draft output', () => {
    expect(() => emailDraftOutputSchema.parse(validDraftOutput)).not.toThrow()
  })

  it('defaults missing internal_summary_he to empty string', () => {
    const without = { ...validDraftOutput } as Record<string, unknown>
    delete without.internal_summary_he
    const result = emailDraftOutputSchema.parse(without)
    expect(result.internal_summary_he).toBe('')
  })

  it('defaults missing fields gracefully', () => {
    const result = emailDraftOutputSchema.parse({})
    expect(result.internal_summary_he).toBe('')
    expect(result.suggested_subject).toBe('המשך טיפול בפנייתך')
    expect(result.suggested_text).toBe('')
    expect(result.suggested_html).toBeNull()
    expect(result.hebrew_translation).toBeNull()
    expect(result.questions_included).toEqual([])
  })

  it('accepts suggested_html as string', () => {
    expect(() =>
      emailDraftOutputSchema.parse({ ...validDraftOutput, suggested_html: '<p>Hello</p>' })
    ).not.toThrow()
  })

  it('accepts hebrew_translation as string for non-Hebrew', () => {
    expect(() =>
      emailDraftOutputSchema.parse({ ...validDraftOutput, hebrew_translation: 'תרגום לעברית' })
    ).not.toThrow()
  })

  it('accepts empty questions_included array', () => {
    expect(() =>
      emailDraftOutputSchema.parse({ ...validDraftOutput, questions_included: [] })
    ).not.toThrow()
  })

  it('falls back to defaults on wrong types', () => {
    const result = emailDraftOutputSchema.parse({
      internal_summary_he: 123,
      suggested_subject: true,
      suggested_text: [],
    })
    expect(result.internal_summary_he).toBe('')
    expect(result.suggested_subject).toBe('המשך טיפול בפנייתך')
    expect(result.suggested_text).toBe('')
  })
})

// ---------- Translation Schema ----------

describe('translationOutputSchema', () => {
  it('accepts valid translation output', () => {
    expect(() =>
      translationOutputSchema.parse({ hebrew_translation: 'שלום עולם' })
    ).not.toThrow()
  })

  it('falls back to empty string when missing', () => {
    const result = translationOutputSchema.parse({})
    expect(result.hebrew_translation).toBe('')
  })

  it('falls back to empty string on wrong type', () => {
    const result = translationOutputSchema.parse({ hebrew_translation: 123 })
    expect(result.hebrew_translation).toBe('')
  })
})

// ---------- SchemaValidationError ----------

describe('SchemaValidationError', () => {
  it('sets name property for proper identification in logs', () => {
    const err = new SchemaValidationError('test', { key: 'value' })
    expect(err.name).toBe('SchemaValidationError')
    expect(err).toBeInstanceOf(Error)
    expect(err.rawOutput).toEqual({ key: 'value' })
  })

  it('stores cause when provided', () => {
    const cause = new Error('original')
    const err = new SchemaValidationError('wrapped', { foo: 'bar' }, cause)
    expect(err.cause).toBe(cause)
    expect(err.message).toBe('wrapped')
  })
})
