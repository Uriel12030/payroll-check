'use client'

interface Props {
  summary: Record<string, Record<string, number>>
}

function pct(submits: number, views: number): string {
  if (views === 0) return '0%'
  return (submits / views * 100).toFixed(1) + '%'
}

export function SummaryCards({ summary }: Props) {
  const periods = [
    { key: 'today', label: 'היום' },
    { key: 'week', label: '7 ימים' },
    { key: 'month', label: '30 יום' },
  ]

  return (
    <div className="grid md:grid-cols-3 gap-4">
      {periods.map(({ key, label }) => {
        const s = summary[key] || {}
        const views = s.page_views || 0
        const submits = s.form_submit || 0
        const starts = s.form_start || 0

        return (
          <div key={key} className="card">
            <div className="text-sm text-gray-500 mb-3 font-medium">{label}</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold text-gray-900">{views.toLocaleString()}</div>
                <div className="text-xs text-gray-500">כניסות</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{submits.toLocaleString()}</div>
                <div className="text-xs text-gray-500">טפסים נשלחו</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-green-600">{pct(submits, views)}</div>
                <div className="text-xs text-gray-500">המרה</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-700">{starts.toLocaleString()}</div>
                <div className="text-xs text-gray-500">התחילו טופס</div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
