'use client'

import { AlertTriangle, Shield } from 'lucide-react'
import type { WorkbenchRiskFlag, WorkbenchStrength } from '@/types'

interface Props {
  riskFlags: WorkbenchRiskFlag[]
  strengthFlags: WorkbenchStrength[]
  playbookFilter: string | null
}

const severityColor: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-orange-50 text-orange-600 border-orange-200',
}

export function RiskStrengthPanel({ riskFlags, strengthFlags, playbookFilter }: Props) {
  const filteredRisks = playbookFilter
    ? riskFlags.filter((f) => f.playbook_slug === playbookFilter)
    : riskFlags

  const filteredStrengths = playbookFilter
    ? strengthFlags.filter((f) => f.playbook_slug === playbookFilter)
    : strengthFlags

  if (filteredRisks.length === 0 && filteredStrengths.length === 0) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Risk flags */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          סיכונים ({filteredRisks.length})
        </h4>
        {filteredRisks.length === 0 ? (
          <p className="text-sm text-gray-400">לא זוהו סיכונים</p>
        ) : (
          <div className="space-y-1.5">
            {filteredRisks.map((flag, idx) => (
              <div
                key={idx}
                className={`text-xs px-2.5 py-1.5 rounded-md border ${severityColor[flag.severity] ?? severityColor.low}`}
              >
                {flag.label_he}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Strengths */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-green-500" />
          חוזקות ({filteredStrengths.length})
        </h4>
        {filteredStrengths.length === 0 ? (
          <p className="text-sm text-gray-400">לא זוהו חוזקות</p>
        ) : (
          <div className="space-y-1.5">
            {filteredStrengths.map((flag, idx) => (
              <div
                key={idx}
                className="text-xs px-2.5 py-1.5 rounded-md border bg-green-50 text-green-700 border-green-200"
              >
                {flag.label_he}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
