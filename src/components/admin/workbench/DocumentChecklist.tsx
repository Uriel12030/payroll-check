'use client'

import { FileText, Check, Minus, X } from 'lucide-react'
import type { DocumentRequest } from '@/types'

interface Props {
  documents: DocumentRequest[]
  selectedKeys: string[]
  onToggle: (key: string) => void
  onStatusChange?: (key: string, status: DocumentRequest['status']) => void
}

const statusConfig: Record<DocumentRequest['status'], { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: 'ממתין', icon: Minus, color: 'text-yellow-500' },
  received: { label: 'התקבל', icon: Check, color: 'text-green-500' },
  not_applicable: { label: 'לא רלוונטי', icon: X, color: 'text-gray-400' },
}

const priorityConfig: Record<string, { label: string; color: string }> = {
  high: { label: 'גבוהה', color: 'bg-red-100 text-red-700' },
  medium: { label: 'בינונית', color: 'bg-yellow-100 text-yellow-700' },
  low: { label: 'נמוכה', color: 'bg-gray-100 text-gray-500' },
}

export function DocumentChecklist({ documents, selectedKeys, onToggle, onStatusChange }: Props) {
  if (documents.length === 0) return null

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
        <FileText className="w-4 h-4 text-blue-500" />
        מסמכים לבקשה ({selectedKeys.length}/{documents.length})
      </h4>

      <div className="space-y-1">
        {documents.map((doc) => {
          const cfg = statusConfig[doc.status]
          const StatusIcon = cfg.icon
          return (
            <div
              key={doc.key}
              className={`flex items-center gap-2 p-2 rounded-md ${
                doc.status === 'received'
                  ? 'bg-green-50 opacity-60'
                  : selectedKeys.includes(doc.key)
                    ? 'bg-blue-50'
                    : 'hover:bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedKeys.includes(doc.key)}
                onChange={() => onToggle(doc.key)}
                disabled={doc.status === 'received'}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 flex-1">{doc.label_he}</span>
              {doc.priority && priorityConfig[doc.priority] && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${priorityConfig[doc.priority].color}`}>
                  {priorityConfig[doc.priority].label}
                </span>
              )}
              {onStatusChange ? (
                <select
                  value={doc.status}
                  onChange={(e) => onStatusChange(doc.key, e.target.value as DocumentRequest['status'])}
                  className="text-xs border border-gray-200 rounded px-1.5 py-0.5 text-gray-500"
                >
                  <option value="pending">ממתין</option>
                  <option value="received">התקבל</option>
                  <option value="not_applicable">לא רלוונטי</option>
                </select>
              ) : (
                <span className={`flex items-center gap-1 text-xs ${cfg.color}`}>
                  <StatusIcon className="w-3 h-3" />
                  {cfg.label}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
