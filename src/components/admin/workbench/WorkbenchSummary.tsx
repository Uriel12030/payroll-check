'use client'

import { Brain, Clock, AlertCircle, Eye } from 'lucide-react'
import type { CaseAiState } from '@/types'
import { PlaybookTabs } from './PlaybookTabs'

interface Props {
  aiState: CaseAiState
  activePlaybook: string | null
  onPlaybookChange: (slug: string | null) => void
}

export function WorkbenchSummary({ aiState, activePlaybook, onPlaybookChange }: Props) {
  const lastAnalyzed = aiState.last_analyzed_at
    ? new Date(aiState.last_analyzed_at).toLocaleString('he-IL', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : null

  return (
    <div className="space-y-4">
      {/* Confidence + last analyzed */}
      <div className="flex items-center gap-3 flex-wrap">
        {aiState.confidence_score != null && (
          <div className="flex items-center gap-1.5">
            <Brain className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-gray-700">
              {aiState.confidence_score}% שלמות
            </span>
            <div className="w-20 bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  aiState.confidence_score >= 60
                    ? 'bg-green-500'
                    : aiState.confidence_score >= 30
                      ? 'bg-yellow-500'
                      : 'bg-gray-400'
                }`}
                style={{ width: `${aiState.confidence_score}%` }}
              />
            </div>
          </div>
        )}
        {lastAnalyzed && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            <span>עדכון אחרון: {lastAnalyzed}</span>
          </div>
        )}
      </div>

      {/* Playbook badges */}
      {aiState.active_playbooks.length > 0 && (
        <PlaybookTabs
          activeSlugs={aiState.active_playbooks}
          selectedSlug={activePlaybook}
          onSelect={onPlaybookChange}
        />
      )}

      {/* Workbench summary bullet points */}
      {aiState.workbench_summary && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">סיכום ניתוח</h4>
          <div
            className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed"
            dir="rtl"
          >
            {aiState.workbench_summary}
          </div>
        </div>
      )}

      {/* Missing info */}
      {aiState.missing_info_he && aiState.missing_info_he.length > 0 && (
        <div className="bg-orange-50 rounded-lg border border-orange-200 p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertCircle className="w-4 h-4 text-orange-600" />
            <h4 className="text-sm font-semibold text-orange-800">מידע חסר</h4>
          </div>
          <ul className="list-disc list-inside space-y-1 text-sm text-orange-900" dir="rtl">
            {aiState.missing_info_he.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Internal risk notes (lawyer-only) */}
      {aiState.risk_notes_internal_he && aiState.risk_notes_internal_he.length > 0 && (
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Eye className="w-4 h-4 text-yellow-600" />
            <h4 className="text-sm font-semibold text-yellow-800">הערות פנימיות (לעיני עו&quot;ד בלבד)</h4>
          </div>
          <ul className="list-disc list-inside space-y-1 text-sm text-yellow-900" dir="rtl">
            {aiState.risk_notes_internal_he.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Short case summary */}
      {aiState.summary && (
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 font-medium mb-1">תקציר קצר</p>
          <p className="text-sm text-gray-700">{aiState.summary}</p>
        </div>
      )}
    </div>
  )
}
