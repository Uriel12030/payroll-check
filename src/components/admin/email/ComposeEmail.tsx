'use client'

import { useState } from 'react'
import { Send, ChevronLeft, Sparkles, Loader2 } from 'lucide-react'

interface Props {
  leadId: string
  leadEmail: string
  subject: string
  body: string
  sending: boolean
  sendError: string
  onSubjectChange: (value: string) => void
  onBodyChange: (value: string) => void
  onSend: () => void
  onCancel: () => void
}

export function ComposeEmail({
  leadId,
  leadEmail,
  subject,
  body,
  sending,
  sendError,
  onSubjectChange,
  onBodyChange,
  onSend,
  onCancel,
}: Props) {
  const [drafting, setDrafting] = useState(false)
  const [draftError, setDraftError] = useState('')

  const handleAiDraft = async () => {
    setDrafting(true)
    setDraftError('')
    try {
      const res = await fetch('/api/admin/ai/workbench/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          tone: 'friendly',
          selectedQuestionIds: [],
          selectedDocumentKeys: [],
          adminNotes: '',
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'שגיאה ביצירת טיוטה')
      }
      const data = await res.json()
      const draft = data.draft
      if (draft?.suggested_subject) onSubjectChange(draft.suggested_subject)
      if (draft?.suggested_text) onBodyChange(draft.suggested_text)
      else if (draft?.suggested_reply_text) onBodyChange(draft.suggested_reply_text)
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : 'שגיאה ביצירת טיוטה')
    } finally {
      setDrafting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="font-semibold text-gray-900">שליחת אימייל חדש</h2>
        <div className="mr-auto">
          <button
            onClick={handleAiDraft}
            disabled={drafting}
            className="flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors border border-purple-200"
          >
            {drafting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {drafting ? 'יוצר...' : 'יצור עם AI'}
          </button>
        </div>
      </div>

      {draftError && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-600">{draftError}</p>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="form-label">אל</label>
          <input
            type="text"
            value={leadEmail}
            disabled
            className="form-input bg-gray-50 text-gray-500"
          />
        </div>
        <div>
          <label className="form-label">נושא</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            className="form-input"
            placeholder="נושא ההודעה..."
          />
        </div>
        <div>
          <label className="form-label">הודעה</label>
          <textarea
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            rows={8}
            className="form-input resize-none"
            placeholder="תוכן ההודעה..."
          />
        </div>

        {sendError && (
          <p className="text-sm text-red-600">{sendError}</p>
        )}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="btn-secondary text-sm py-2 px-5"
          >
            ביטול
          </button>
          <button
            onClick={onSend}
            disabled={sending || !subject.trim() || !body.trim()}
            className="btn-primary text-sm py-2 px-5 flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" />
            {sending ? 'שולח...' : 'שלח'}
          </button>
        </div>
      </div>
    </div>
  )
}
