'use client'

import { useState, useMemo, Fragment } from 'react'
import type { PromptVariable } from '@/types'

interface PromptPreviewProps {
  content: string
  variables: PromptVariable[]
  language: string
}

export function PromptPreview({ content, variables, language }: PromptPreviewProps) {
  // Initialize sample values for variables
  const [sampleValues, setSampleValues] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {}
    for (const v of variables) {
      defaults[v.name] = getDefaultSample(v.name)
    }
    return defaults
  })

  // Interpolate content with sample values
  const previewContent = useMemo(() => {
    let result = content
    for (const [key, value] of Object.entries(sampleValues)) {
      result = result.replace(
        new RegExp(`\\$\\{${key}\\}`, 'g'),
        value || `[${key}]`
      )
    }
    return result
  }, [content, sampleValues])

  // Split into segments: plain text and un-substituted variables (rendered safely)
  const segments = useMemo(() => {
    const parts: Array<{ type: 'text' | 'var'; value: string }> = []
    const regex = /\$\{(\w+)\}/g
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = regex.exec(previewContent)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', value: previewContent.slice(lastIndex, match.index) })
      }
      parts.push({ type: 'var', value: match[0] })
      lastIndex = regex.lastIndex
    }

    if (lastIndex < previewContent.length) {
      parts.push({ type: 'text', value: previewContent.slice(lastIndex) })
    }

    return parts
  }, [previewContent])

  return (
    <div className="card p-0">
      <div className="px-4 py-3 bg-gray-50 rounded-t-xl border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700">תצוגה מקדימה</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          משתנים מוחלפים בערכי דוגמה — ניתן לערוך
        </p>
      </div>

      {/* Sample values editor */}
      {variables.length > 0 && (
        <div className="px-4 py-3 border-b border-gray-100 bg-white">
          <h4 className="text-xs font-semibold text-gray-500 mb-2">ערכי דוגמה:</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {variables.map((v) => (
              <div key={v.name} className="flex items-center gap-2">
                <label className="text-xs text-gray-500 min-w-[100px] font-mono">
                  {v.name}
                </label>
                <input
                  type="text"
                  value={sampleValues[v.name] ?? ''}
                  onChange={(e) =>
                    setSampleValues((prev) => ({ ...prev, [v.name]: e.target.value }))
                  }
                  className="form-input text-xs flex-1 py-1"
                  dir={language === 'he' ? 'rtl' : 'ltr'}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview content — rendered safely without dangerouslySetInnerHTML */}
      <div
        className="px-4 py-4 max-h-[500px] overflow-y-auto"
        dir={language === 'he' ? 'rtl' : 'ltr'}
      >
        <pre className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed font-mono">
          {segments.map((seg, i) => (
            <Fragment key={i}>
              {seg.type === 'var' ? (
                <span className="bg-red-100 text-red-600 px-1 rounded">{seg.value}</span>
              ) : (
                seg.value
              )}
            </Fragment>
          ))}
        </pre>
      </div>

      {/* Stats */}
      <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 rounded-b-xl text-xs text-gray-400 flex items-center gap-4">
        <span>{previewContent.length.toLocaleString()} תווים</span>
        <span>~{Math.ceil(previewContent.length / 4).toLocaleString()} טוקנים (הערכה)</span>
      </div>
    </div>
  )
}

/**
 * Provide sensible default sample values for common variable names.
 */
function getDefaultSample(varName: string): string {
  const samples: Record<string, string> = {
    leadName: 'ישראל ישראלי',
    caseType: 'פיטורים',
    currentSummary: 'עובד שפוטר לאחר 5 שנות עבודה ללא שימוע. מבקש בדיקת זכויות.',
    factsStr: '  employment_start_date: 2019-03-01\n  employer_name: חברת דוגמה בע"מ\n  last_salary: 12000',
    missingStr: '  - תאריך סיום עבודה (employment_end_date): "מתי סיימת לעבוד?"\n  - שימוע (hearing_held): "האם נערך לך שימוע?"',
    threadStr: '[פונה] (2024-01-15):\nשלום, פוטרתי מהעבודה ואני רוצה לבדוק את הזכויות שלי.',
    playbookSlugs: '"overtime", "severance", "wrongful_termination"',
    playbooksSection: '### שעות נוספות (slug: "overtime")\n  שאלות:\n    - האם שעות נוספות משולמות?',
    toneInstruction: 'ידידותי, חם, אמפתי. פנייה בגוף שני, שפה פשוטה וברורה.',
    langName: 'עברית',
    questionsStr: '  - [q_1] כמה שעות אתה עובד בשבוע? (overtime)',
    docsStr: '  - תלושי שכר (payslips)\n  - חוזה עבודה (contract)',
    adminNotesSection: '',
    hebrewTranslationExample: 'null',
    text: 'Hello, I was fired from my job after 5 years without a hearing. I would like to check my rights.',
  }
  return samples[varName] ?? `[${varName}]`
}
