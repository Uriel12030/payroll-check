import { describe, it, expect } from 'vitest'
import { z } from 'zod'
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

  it('rejects missing case_summary', () => {
    const withoutSummary = { ...validOutput } as Record<string, unknown>
    delete withoutSummary.case_summary
    expect(() => aiAnalysisOutputSchema.parse(withoutSummary)).toThrow()
  })

  it('rejects missing suggested_reply_text', () => {
    const withoutReply = { ...validOutput } as Record<string, unknown>
    delete withoutReply.suggested_reply_text
    expect(() => aiAnalysisOutputSchema.parse(withoutReply)).toThrow()
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

  it('rejects missing workbench_summary', () => {
    const without = { ...validWorkbenchOutput } as Record<string, unknown>
    delete without.workbench_summary
    expect(() => workbenchAnalysisOutputSchema.parse(without)).toThrow()
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

  it('validates severity enum on risk_flags', () => {
    expect(() =>
      workbenchAnalysisOutputSchema.parse({
        ...validWorkbenchOutput,
        risk_flags: [{ label_he: 'test', severity: 'critical', playbook_slug: null, source: 'ai' }],
      })
    ).toThrow()
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

  it('rejects missing internal_summary_he', () => {
    const without = { ...validDraftOutput } as Record<string, unknown>
    delete without.internal_summary_he
    expect(() => emailDraftOutputSchema.parse(without)).toThrow()
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
})

// ---------- Translation Schema ----------

describe('translationOutputSchema', () => {
  it('accepts valid translation output', () => {
    expect(() =>
      translationOutputSchema.parse({ hebrew_translation: 'שלום עולם' })
    ).not.toThrow()
  })

  it('rejects missing hebrew_translation', () => {
    expect(() => translationOutputSchema.parse({})).toThrow()
  })

  it('rejects non-string hebrew_translation', () => {
    expect(() => translationOutputSchema.parse({ hebrew_translation: 123 })).toThrow()
  })
})

// ---------- SchemaValidationError (incomplete AI response handling) ----------

describe('SchemaValidationError', () => {
  // Simulates the exact scenario from the original bug: OpenAI returns JSON
  // missing all draft fields, Zod rejects it, and we wrap the error with the
  // raw output so callers can persist it for investigation.
  const incompleteAiResponse = {
    some_unrelated_key: 'value the model hallucinated',
  }

  it('wraps a Zod error with the raw AI output for email draft schema', () => {
    let caughtError: SchemaValidationError | undefined

    try {
      emailDraftOutputSchema.parse(incompleteAiResponse)
    } catch (zodErr) {
      // This mirrors what callOpenAIWithSchema does
      caughtError = new SchemaValidationError(
        zodErr instanceof Error ? zodErr.message : String(zodErr),
        incompleteAiResponse,
        zodErr
      )
    }

    expect(caughtError).toBeInstanceOf(SchemaValidationError)
    expect(caughtError!.rawOutput).toEqual(incompleteAiResponse)
    expect(caughtError!.cause).toBeInstanceOf(z.ZodError)

    // Verify we can extract per-field details (what gets stored in error_message)
    const zodCause = caughtError!.cause as z.ZodError
    const missingPaths = zodCause.issues.map((i) => i.path.join('.'))
    expect(missingPaths).toContain('internal_summary_he')
    expect(missingPaths).toContain('suggested_subject')
    expect(missingPaths).toContain('suggested_text')
    expect(missingPaths).toContain('questions_included')
  })

  it('wraps a Zod error with the raw AI output for workbench analysis schema', () => {
    let caughtError: SchemaValidationError | undefined

    try {
      workbenchAnalysisOutputSchema.parse(incompleteAiResponse)
    } catch (zodErr) {
      caughtError = new SchemaValidationError(
        zodErr instanceof Error ? zodErr.message : String(zodErr),
        incompleteAiResponse,
        zodErr
      )
    }

    expect(caughtError).toBeInstanceOf(SchemaValidationError)
    expect(caughtError!.rawOutput).toEqual(incompleteAiResponse)
    expect(caughtError!.cause).toBeInstanceOf(z.ZodError)

    const zodCause = caughtError!.cause as z.ZodError
    const missingPaths = zodCause.issues.map((i) => i.path.join('.'))
    expect(missingPaths).toContain('workbench_summary')
    expect(missingPaths).toContain('case_summary')
    expect(missingPaths).toContain('recommended_questions')
  })

  it('produces a clean error_message string from Zod issues', () => {
    try {
      emailDraftOutputSchema.parse(incompleteAiResponse)
    } catch (zodErr) {
      const wrapped = new SchemaValidationError(
        zodErr instanceof Error ? zodErr.message : String(zodErr),
        incompleteAiResponse,
        zodErr
      )

      // This is the format stored in case_ai_actions.error_message
      const cause = wrapped.cause as z.ZodError
      const errorDetails = cause.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')

      expect(errorDetails).toContain('internal_summary_he:')
      expect(errorDetails).toContain('suggested_subject:')
      expect(errorDetails).toContain('questions_included:')
      expect(errorDetails).not.toContain('"code"') // not the raw Zod JSON dump
    }
  })
})
