'use client'

import { Smartphone, Monitor } from 'lucide-react'

interface Props {
  data: { device: string; page_views: number }[]
}

export function DeviceBreakdown({ data }: Props) {
  const mobile = data.find((d) => d.device === 'mobile')?.page_views || 0
  const desktop = data.find((d) => d.device === 'desktop')?.page_views || 0
  const total = mobile + desktop

  const mobilePct = total > 0 ? Math.round((mobile / total) * 100) : 0
  const desktopPct = total > 0 ? 100 - mobilePct : 0

  return (
    <div className="card">
      <h3 className="font-bold text-gray-900 mb-4">מכשירים</h3>

      {total === 0 ? (
        <p className="text-sm text-gray-400">אין נתונים עדיין</p>
      ) : (
        <div className="space-y-4">
          {/* Visual bar */}
          <div className="flex h-4 rounded-full overflow-hidden">
            <div
              className="bg-blue-500 transition-all"
              style={{ width: `${mobilePct}%` }}
            />
            <div
              className="bg-gray-300 transition-all"
              style={{ width: `${desktopPct}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="font-bold text-gray-900">{mobile.toLocaleString()}</div>
                <div className="text-xs text-gray-500">מובייל ({mobilePct}%)</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Monitor className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <div className="font-bold text-gray-900">{desktop.toLocaleString()}</div>
                <div className="text-xs text-gray-500">דסקטופ ({desktopPct}%)</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
