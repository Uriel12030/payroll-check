'use client'

import { useState } from 'react'
import { Check, Clock, RotateCcw, Eye, Star } from 'lucide-react'
import type { PromptTemplate } from '@/types'

interface VersionHistoryProps {
  versions: PromptTemplate[]
  activeVersionId: string
  onActivate: (versionId: string) => void
  onViewContent: (version: PromptTemplate) => void
}

export function VersionHistory({
  versions,
  activeVersionId,
  onActivate,
  onViewContent,
}: VersionHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (versions.length === 0) {
    return (
      <div className="card text-center py-8 text-gray-400">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">אין היסטוריית גרסאות</p>
      </div>
    )
  }

  return (
    <div className="card p-0 divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
      <div className="px-4 py-3 bg-gray-50 rounded-t-xl sticky top-0 z-10">
        <h3 className="text-sm font-semibold text-gray-700">
          היסטוריית גרסאות ({versions.length})
        </h3>
      </div>

      {versions.map((v) => {
        const isActive = v.id === activeVersionId
        const isExpanded = expandedId === v.id

        return (
          <div key={v.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isActive ? (
                  <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    <Check className="w-3 h-3" /> פעיל
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 px-2">v{v.version}</span>
                )}
                {v.is_default && (
                  <span className="flex items-center gap-1 text-xs text-amber-600">
                    <Star className="w-3 h-3" /> ברירת מחדל
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : v.id)}
                  className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                  title="צפה בתוכן"
                >
                  <Eye className="w-4 h-4" />
                </button>

                {!isActive && (
                  <button
                    onClick={() => {
                      if (confirm(`לשחזר גרסה ${v.version}?`)) {
                        onActivate(v.id)
                      }
                    }}
                    className="p-1 text-gray-400 hover:text-green-600 rounded transition-colors"
                    title="שחזר גרסה זו"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="mt-1 text-xs text-gray-400 flex items-center gap-2">
              <Clock className="w-3 h-3" />
              {new Date(v.created_at).toLocaleString('he-IL')}
              {v.created_by && (
                <>
                  {' · '}
                  {v.created_by}
                </>
              )}
            </div>

            {/* Expandable content preview */}
            {isExpanded && (
              <div className="mt-3 relative">
                <pre className="bg-gray-50 rounded-lg p-3 text-xs font-mono text-gray-700 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap border border-gray-200">
                  {v.content.slice(0, 1000)}
                  {v.content.length > 1000 && '...'}
                </pre>
                <button
                  onClick={() => onViewContent(v)}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                >
                  טען לעורך
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
