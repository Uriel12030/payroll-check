'use client'

import { useState } from 'react'
import { Plus, Check } from 'lucide-react'
import type { WorkbenchQuestion } from '@/types'

const PLAYBOOK_LABELS: Record<string, string> = {
  overtime: 'שעות נוספות',
  wage_withholding: 'הלנת שכר',
  pension: 'פנסיה',
  severance: 'פיצויי פיטורים',
  vacation_sick: 'חופשה/מחלה',
  wrongful_termination: 'שימוע/פיטורים',
  deterioration: 'הרעת תנאים',
}

interface Props {
  questions: WorkbenchQuestion[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onAddCustom: (text: string) => void
  playbookFilter: string | null
}

export function QuestionChecklist({
  questions,
  selectedIds,
  onToggle,
  onAddCustom,
  playbookFilter,
}: Props) {
  const [customText, setCustomText] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)

  const filtered = playbookFilter
    ? questions.filter((q) => q.playbook_slug === playbookFilter)
    : questions

  // Group by playbook
  const grouped = filtered.reduce<Record<string, WorkbenchQuestion[]>>((acc, q) => {
    const key = q.playbook_slug ?? 'general'
    if (!acc[key]) acc[key] = []
    acc[key].push(q)
    return acc
  }, {})

  const handleAddCustom = () => {
    if (!customText.trim()) return
    onAddCustom(customText.trim())
    setCustomText('')
    setShowCustomInput(false)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900">
          שאלות ({selectedIds.length}/{questions.length})
        </h4>
        <button
          onClick={() => setShowCustomInput(!showCustomInput)}
          className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          הוסף שאלה
        </button>
      </div>

      {/* Custom question input */}
      {showCustomInput && (
        <div className="mb-3 flex gap-2">
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
            placeholder="כתוב שאלה מותאמת..."
            className="flex-1 form-input text-sm py-1.5"
            dir="rtl"
          />
          <button
            onClick={handleAddCustom}
            disabled={!customText.trim()}
            className="btn-primary text-xs py-1.5 px-3"
          >
            הוסף
          </button>
        </div>
      )}

      <div className="space-y-3">
        {Object.entries(grouped).map(([slug, groupQuestions]) => (
          <div key={slug}>
            <p className="text-xs text-gray-400 font-medium mb-1.5">
              {PLAYBOOK_LABELS[slug] ?? (slug === 'general' ? 'כללי' : slug)}
            </p>
            <div className="space-y-1">
              {groupQuestions.map((q) => (
                <label
                  key={q.id}
                  className={`flex items-start gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                    q.answered
                      ? 'bg-green-50 opacity-60'
                      : selectedIds.includes(q.id)
                        ? 'bg-purple-50'
                        : 'hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(q.id)}
                    onChange={() => onToggle(q.id)}
                    disabled={q.answered}
                    className="mt-0.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700 flex-1">{q.text_he}</span>
                  {q.answered && (
                    <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                  )}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-2">אין שאלות עבור נושא זה</p>
      )}
    </div>
  )
}
