'use client'

interface EventItem {
  id: string
  event: string
  lang: string
  source: string
  path: string
  device: string
  timestamp: string
}

interface Props {
  data: EventItem[]
}

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  page_view: { label: 'צפייה', color: 'bg-blue-100 text-blue-700' },
  form_start: { label: 'התחלת טופס', color: 'bg-yellow-100 text-yellow-700' },
  form_submit: { label: 'שליחת טופס', color: 'bg-green-100 text-green-700' },
  cta_click: { label: 'לחיצה CTA', color: 'bg-purple-100 text-purple-700' },
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'עכשיו'
  if (mins < 60) return `לפני ${mins} דק׳`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `לפני ${hours} שע׳`
  const days = Math.floor(hours / 24)
  return `לפני ${days} ימים`
}

export function RecentEvents({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="card">
        <h3 className="font-bold text-gray-900 mb-4">אירועים אחרונים</h3>
        <p className="text-sm text-gray-400">אין אירועים עדיין</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h3 className="font-bold text-gray-900 mb-4">אירועים אחרונים (50)</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-right py-2 font-medium text-gray-500">זמן</th>
              <th className="text-right py-2 font-medium text-gray-500">אירוע</th>
              <th className="text-right py-2 font-medium text-gray-500">דף</th>
              <th className="text-right py-2 font-medium text-gray-500">שפה</th>
              <th className="text-right py-2 font-medium text-gray-500">מקור</th>
              <th className="text-right py-2 font-medium text-gray-500">מכשיר</th>
            </tr>
          </thead>
          <tbody>
            {data.map((ev, i) => {
              const meta = EVENT_LABELS[ev.event] || { label: ev.event, color: 'bg-gray-100 text-gray-700' }
              return (
                <tr key={ev.id || i} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 text-gray-400 text-xs whitespace-nowrap">{timeAgo(ev.timestamp)}</td>
                  <td className="py-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${meta.color}`}>
                      {meta.label}
                    </span>
                  </td>
                  <td className="py-2 text-gray-600 font-mono text-xs">{ev.path}</td>
                  <td className="py-2 text-gray-600">{ev.lang}</td>
                  <td className="py-2 text-gray-600 text-xs">{ev.source}</td>
                  <td className="py-2 text-gray-400 text-xs">{ev.device === 'mobile' ? 'נייד' : 'מחשב'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
