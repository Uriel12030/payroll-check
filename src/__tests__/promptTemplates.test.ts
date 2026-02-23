import { describe, it, expect } from 'vitest'
import {
  buildSystemPrompt,
  buildAnalysisPrompt,
  buildWorkbenchSystemPrompt,
  buildWorkbenchAnalysisPrompt,
  buildEmailDraftSystemPrompt,
  buildEmailDraftPrompt,
  buildTranslationPrompt,
} from '@/lib/ai/promptTemplates'

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

// ---------- Workbench Prompt Templates ----------

import type { AiPlaybook } from '@/types'

const mockPlaybook: AiPlaybook = {
  id: 'test-id-1',
  slug: 'overtime',
  title_he: 'שעות נוספות',
  title_en: 'Overtime',
  description_he: 'בדיקת זכויות שעות נוספות',
  questions: [{ key: 'q1', label_he: 'כמה שעות?', priority: 1 }],
  documents: [{ key: 'pay_slips', label_he: 'תלושי שכר' }],
  red_flags: [{ condition: 'no_overtime_pay', label_he: 'אין תשלום שעות', severity: 'high' }],
  strengths: [{ condition: 'has_records', label_he: 'יש תיעוד' }],
  is_active: true,
  display_order: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

describe('buildWorkbenchSystemPrompt', () => {
  it('returns Hebrew prompt with playbook info', () => {
    const prompt = buildWorkbenchSystemPrompt([mockPlaybook])

    expect(prompt.length).toBeGreaterThan(100)
    expect(prompt).toContain('שעות נוספות')
    expect(prompt).toContain('overtime')
    expect(prompt).toContain('JSON')
  })

  it('handles empty playbooks array', () => {
    const prompt = buildWorkbenchSystemPrompt([])
    expect(prompt.length).toBeGreaterThan(50)
  })
})

describe('buildWorkbenchAnalysisPrompt', () => {
  it('includes lead context and playbook info', () => {
    const prompt = buildWorkbenchAnalysisPrompt({
      leadName: 'ישראל ישראלי',
      caseType: 'overtime',
      currentSummary: 'סיכום קיים',
      knownFacts: { employer: 'חברה' },
      missingFields: [{ key: 'salary', label: 'שכר', question: 'מה השכר?' }],
      conversationThread: [
        { direction: 'inbound', from: 'user@test.com', occurred_at: '2024-01-01', text: 'שלום' },
      ],
      playbooks: [mockPlaybook],
    })

    expect(prompt).toContain('ישראל ישראלי')
    expect(prompt).toContain('overtime')
    expect(prompt).toContain('חברה')
    expect(prompt).toContain('שכר')
    expect(prompt).toContain('שלום')
  })
})

describe('buildEmailDraftSystemPrompt', () => {
  it('includes tone and language instructions', () => {
    const prompt = buildEmailDraftSystemPrompt('friendly', 'he')
    expect(prompt).toContain('ידידותי')
    expect(prompt).toContain('JSON')
  })

  it('includes English language name for English target', () => {
    const prompt = buildEmailDraftSystemPrompt('formal', 'en')
    expect(prompt).toContain('אנגלית')
  })
})

describe('buildEmailDraftPrompt', () => {
  it('includes selected questions and documents', () => {
    const prompt = buildEmailDraftPrompt({
      leadName: 'Test Lead',
      caseType: 'general',
      language: 'he',
      knownFacts: {},
      selectedQuestions: [{ id: 'q1', text_he: 'שאלה לדוגמה', playbook_slug: null }],
      selectedDocuments: [{ key: 'doc1', label_he: 'מסמך לדוגמה' }],
      conversationThread: [],
      adminNotes: 'הערה מיוחדת',
    })

    expect(prompt).toContain('Test Lead')
    expect(prompt).toContain('שאלה לדוגמה')
    expect(prompt).toContain('מסמך לדוגמה')
    expect(prompt).toContain('הערה מיוחדת')
  })
})

describe('buildTranslationPrompt', () => {
  it('includes the text to translate', () => {
    const prompt = buildTranslationPrompt('Hello world, this is a test.')
    expect(prompt).toContain('Hello world, this is a test.')
  })
})
