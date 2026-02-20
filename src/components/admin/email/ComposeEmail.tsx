'use client'

import { Send, ChevronLeft } from 'lucide-react'

interface Props {
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
      </div>

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

        <div className="flex gap-2">
          <button
            onClick={onSend}
            disabled={sending || !subject.trim() || !body.trim()}
            className="btn-primary text-sm py-2 px-5 flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" />
            {sending ? 'שולח...' : 'שלח'}
          </button>
          <button
            onClick={onCancel}
            className="btn-secondary text-sm py-2 px-5"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  )
}
