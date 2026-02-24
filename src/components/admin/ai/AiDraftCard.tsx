'use client'

import { useState } from 'react'
import { Send, Copy, Check, RefreshCw, Edit3, AlertTriangle } from 'lucide-react'
import type { CaseAiDraft } from '@/types'

interface Props {
  draft: CaseAiDraft
  sending: boolean
  analyzing: boolean
  onSendDraft: (editedText: string, editedSubject: string) => void
  onCopy: (text: string) => void
  onRefresh: () => void
}

export function AiDraftCard({ draft, sending, analyzing, onSendDraft, onCopy, onRefresh }: Props) {
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editedSubject, setEditedSubject] = useState(draft.suggested_subject)
  const [editedText, setEditedText] = useState(draft.suggested_text)

  const bodyEmpty = !editedText.trim()

  const handleCopy = async () => {
    await onCopy(editedText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSend = () => {
    onSendDraft(editedText, editedSubject)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-gray-500 font-medium">טיוטת תשובה מוצעת</p>
        <button
          onClick={() => setEditing(!editing)}
          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <Edit3 className="w-3 h-3" />
          {editing ? 'תצוגה מקדימה' : 'ערוך'}
        </button>
      </div>
      <div className="bg-white rounded-lg border border-gray-100 p-3">
        {/* Subject */}
        <div className="mb-2">
          <p className="text-xs text-gray-400 mb-1">נושא:</p>
          {editing ? (
            <input
              type="text"
              value={editedSubject}
              onChange={(e) => setEditedSubject(e.target.value)}
              className="form-input text-sm py-1"
              dir="auto"
            />
          ) : (
            <p className="text-sm text-gray-700">{editedSubject}</p>
          )}
        </div>

        {/* Body */}
        {editing ? (
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            rows={8}
            className="form-input resize-none text-sm"
            dir="auto"
          />
        ) : bodyEmpty ? (
          <div className="flex items-center gap-1.5 py-3 text-amber-600">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm">גוף האימייל ריק — לחצו &quot;ערוך&quot; להוספת תוכן או &quot;חדש&quot; ליצירת טיוטה מחדש</p>
          </div>
        ) : (
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{editedText}</p>
        )}

        {draft.questions.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-1">שאלות ממוקדות:</p>
            <ul className="text-sm text-gray-600 list-disc mr-4 space-y-0.5">
              {draft.questions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-2">
        <button
          onClick={handleSend}
          disabled={sending || bodyEmpty}
          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
        >
          <Send className="w-3.5 h-3.5" />
          {sending ? 'שולח...' : 'שלח טיוטה'}
        </button>
        <button
          onClick={handleCopy}
          disabled={bodyEmpty}
          className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'הועתק' : 'העתק'}
        </button>
        <button
          onClick={onRefresh}
          disabled={analyzing}
          className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
          {analyzing ? 'מנתח...' : 'חדש'}
        </button>
      </div>
    </div>
  )
}
