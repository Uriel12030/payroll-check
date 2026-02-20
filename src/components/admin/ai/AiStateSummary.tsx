'use client'

import { CircleDot } from 'lucide-react'
import type { CaseAiState } from '@/types'

interface Props {
  aiState: CaseAiState
}

export function AiStateSummary({ aiState }: Props) {
  const missingFields = (aiState.missing_fields ?? []) as Array<{ key: string; label: string; question: string }>

  return (
    <>
      {aiState.summary && (
        <div>
          <p className="text-xs text-gray-500 font-medium mb-1">סיכום תיק</p>
          <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border border-gray-100">
            {aiState.summary}
          </p>
        </div>
      )}

      {missingFields.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 font-medium mb-1">
            מידע חסר ({missingFields.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {missingFields.map((f) => (
              <span
                key={f.key}
                className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1"
              >
                <CircleDot className="w-3 h-3" />
                {f.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {aiState.last_analyzed_at && (
        <p className="text-xs text-gray-400">
          ניתוח אחרון:{' '}
          {new Intl.DateTimeFormat('he-IL', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }).format(new Date(aiState.last_analyzed_at))}
        </p>
      )}
    </>
  )
}
