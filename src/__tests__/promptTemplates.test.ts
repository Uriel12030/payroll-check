import { describe, it, expect } from 'vitest'
import { buildSystemPrompt, buildAnalysisPrompt } from '@/lib/ai/promptTemplates'

describe('buildSystemPrompt', () => {
  it('returns a non-empty Hebrew prompt', () => {
    const prompt = buildSystemPrompt()
    expect(prompt.length).toBeGreaterThan(50)
    expect(prompt).toContain('Payroll Check')
    expect(prompt).toContain('JSON')
  })
})

describe('buildAnalysisPrompt', () => {
  it('includes all sections', () => {
    const prompt = buildAnalysisPrompt({
      leadName: 'Test User',
      caseType: 'general',
      currentSummary: 'Some summary',
      knownFacts: { employer: 'Acme', salary: 15000 },
      missingFields: [{ key: 'start_date', label: 'תאריך התחלה', question: 'מתי התחלת?' }],
      conversationThread: [
        { direction: 'inbound', from: 'user@test.com', occurred_at: '2024-01-01', text: 'Hello' },
      ],
    })

    expect(prompt).toContain('Test User')
    expect(prompt).toContain('general')
    expect(prompt).toContain('Some summary')
    expect(prompt).toContain('Acme')
    expect(prompt).toContain('תאריך התחלה')
    expect(prompt).toContain('Hello')
    expect(prompt).toContain('JSON')
  })

  it('handles empty known facts', () => {
    const prompt = buildAnalysisPrompt({
      leadName: 'User',
      caseType: 'general',
      currentSummary: '',
      knownFacts: {},
      missingFields: [],
      conversationThread: [
        { direction: 'outbound', from: 'system@test.com', occurred_at: '2024-01-01', text: 'Hi' },
      ],
    })

    expect(prompt).toContain('אין עובדות עדיין')
    expect(prompt).toContain('אין סיכום עדיין')
    expect(prompt).toContain('אין מידע חסר')
  })

  it('formats thread with direction labels', () => {
    const prompt = buildAnalysisPrompt({
      leadName: 'User',
      caseType: 'general',
      currentSummary: '',
      knownFacts: {},
      missingFields: [],
      conversationThread: [
        { direction: 'inbound', from: 'user@test.com', occurred_at: '2024-01-01', text: 'msg1' },
        { direction: 'outbound', from: 'sys@test.com', occurred_at: '2024-01-02', text: 'msg2' },
      ],
    })

    expect(prompt).toContain('פונה')
    expect(prompt).toContain('מערכת')
  })
})
