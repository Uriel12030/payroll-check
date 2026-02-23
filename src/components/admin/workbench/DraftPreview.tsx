'use client'

import { useState } from 'react'
import { Eye, Edit3, Send, Copy, RefreshCw, Trash2, Globe, Languages } from 'lucide-react'
import type { EmailDraftOutput } from '@/lib/ai/schemas'

interface Props {
  draft: EmailDraftOutput
  language: string
  sending: boolean
  onSend: (editedText: string, editedHtml: string | null, editedSubject: string) => void
  onCopy: () => void
  onRegenerate: () => void
  onDiscard: () => void
}

const LANGUAGE_LABELS: Record<string, string> = {
  he: 'עברית',
  en: 'אנגלית',
  ru: 'רוסית',
  am: 'אמהרית',
}

export function DraftPreview({
  draft,
  language,
  sending,
  onSend,
  onCopy,
  onRegenerate,
  onDiscard,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [editedSubject, setEditedSubject] = useState(draft.suggested_subject)
  const [editedText, setEditedText] = useState(draft.suggested_text)
  const [showTranslation, setShowTranslation] = useState(false)

  const handleSend = () => {
    onSend(editedText, null, editedSubject)
  }

  return (
    <div className="space-y-4">
      {/* Internal preview (Hebrew) — for lawyer only */}
      <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Eye className="w-4 h-4 text-yellow-600" />
          <h4 className="text-sm font-semibold text-yellow-800">תצוגה פנימית (לא נשלח ללקוח)</h4>
        </div>
        <p className="text-sm text-yellow-900 whitespace-pre-wrap leading-relaxed" dir="rtl">
          {draft.internal_summary_he}
        </p>
      </div>

      {/* External email preview */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-blue-500" />
            <h4 className="text-sm font-semibold text-gray-900">
              אימייל ללקוח ({LANGUAGE_LABELS[language] ?? language})
            </h4>
          </div>
          <button
            onClick={() => setEditing(!editing)}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <Edit3 className="w-3 h-3" />
            {editing ? 'תצוגה מקדימה' : 'ערוך'}
          </button>
        </div>

        {/* Subject */}
        <div className="mb-3">
          <p className="text-xs text-gray-400 mb-1">נושא:</p>
          {editing ? (
            <input
              type="text"
              value={editedSubject}
              onChange={(e) => setEditedSubject(e.target.value)}
              className="form-input text-sm py-1.5"
              dir="auto"
            />
          ) : (
            <p className="text-sm font-medium text-gray-900" dir="auto">
              {editedSubject}
            </p>
          )}
        </div>

        {/* Body */}
        {editing ? (
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            rows={10}
            className="form-input resize-none text-sm"
            dir="auto"
          />
        ) : (
          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed border rounded-lg p-3 bg-gray-50" dir="auto">
            {editedText}
          </div>
        )}
      </div>

      {/* Hebrew translation (for non-Hebrew emails) */}
      {draft.hebrew_translation && language !== 'he' && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <button
            onClick={() => setShowTranslation(!showTranslation)}
            className="flex items-center gap-1.5 text-sm font-semibold text-blue-800 mb-2"
          >
            <Languages className="w-4 h-4" />
            תרגום לעברית {showTranslation ? '▲' : '▼'}
          </button>
          {showTranslation && (
            <p className="text-sm text-blue-900 whitespace-pre-wrap leading-relaxed" dir="rtl">
              {draft.hebrew_translation}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 justify-end">
        <button
          onClick={onDiscard}
          className="px-4 py-2 text-sm border border-red-200 rounded-lg text-red-600 hover:bg-red-50 flex items-center gap-1.5"
        >
          <Trash2 className="w-4 h-4" />
          בטל
        </button>
        <button
          onClick={onRegenerate}
          className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-1.5"
        >
          <RefreshCw className="w-4 h-4" />
          חדש
        </button>
        <button
          onClick={onCopy}
          className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-1.5"
        >
          <Copy className="w-4 h-4" />
          העתק
        </button>
        <button
          onClick={handleSend}
          disabled={sending}
          className="btn-primary text-sm py-2 px-5 flex items-center gap-1.5"
        >
          <Send className="w-4 h-4" />
          {sending ? 'שולח...' : 'שלח אימייל'}
        </button>
      </div>
    </div>
  )
}
