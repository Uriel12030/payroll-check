import { describe, it, expect } from 'vitest'
import { aiAnalysisOutputSchema } from '@/lib/ai/schemas'

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
    const { _case_summary, ...rest } = validOutput
    expect(() => aiAnalysisOutputSchema.parse(rest)).toThrow()
  })

  it('rejects missing suggested_reply_text', () => {
    const { _suggested_reply_text, ...rest } = validOutput
    expect(() => aiAnalysisOutputSchema.parse(rest)).toThrow()
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
