'use client'

import { useState } from 'react'
import { Send, Copy, Check, RefreshCw } from 'lucide-react'
import type { CaseAiDraft } from '@/types'

interface Props {
  draft: CaseAiDraft
  sending: boolean
  analyzing: boolean
  onSendDraft: () => void
  onCopy: () => void
  onRefresh: () => void
}

export function AiDraftCard({ draft, sending, analyzing, onSendDraft, onCopy, onRefresh }: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <p className="text-xs text-gray-500 font-medium mb-1">טיוטת תשובה מוצעת</p>
      <div className="bg-white rounded-lg border border-gray-100 p-3">
        <p className="text-xs text-gray-400 mb-1">
          נושא: <span className="text-gray-700">{draft.suggested_subject}</span>
        </p>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">
          {draft.suggested_text}
        </p>
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
          onClick={onSendDraft}
          disabled={sending}
          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
        >
          <Send className="w-3.5 h-3.5" />
          {sending ? 'שולח...' : 'שלח טיוטה'}
        </button>
        <button
          onClick={handleCopy}
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
