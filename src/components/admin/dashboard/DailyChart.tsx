'use client'

interface Props {
  data: { date: string; page_views: number; form_submits: number }[]
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })
}

function formatWeekday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('he-IL', { weekday: 'short' })
}

export function DailyChart({ data }: Props) {
  const maxViews = Math.max(...data.map((d) => d.page_views), 1)

  return (
    <div className="card">
      <h3 className="font-bold text-gray-900 mb-4">כניסות לפי יום (7 ימים אחרונים)</h3>

      <div className="flex items-end gap-2 h-48">
        {data.map((day) => {
          const viewHeight = (day.page_views / maxViews) * 100
          const submitHeight = (day.form_submits / maxViews) * 100

          return (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
              <div className="text-xs text-gray-500 font-medium">{day.page_views}</div>

              <div className="w-full flex items-end gap-0.5 h-36">
                {/* Page views bar */}
                <div
                  className="flex-1 bg-blue-200 rounded-t transition-all"
                  style={{ height: `${Math.max(viewHeight, 2)}%` }}
                  title={`כניסות: ${day.page_views}`}
                />
                {/* Form submits bar */}
                <div
                  className="flex-1 bg-green-400 rounded-t transition-all"
                  style={{ height: `${Math.max(submitHeight, day.form_submits > 0 ? 4 : 0)}%` }}
                  title={`טפסים: ${day.form_submits}`}
                />
              </div>

              <div className="text-xs text-gray-400">{formatWeekday(day.date)}</div>
              <div className="text-[10px] text-gray-300">{formatDate(day.date)}</div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-6 mt-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-blue-200" />
          כניסות
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-400" />
          טפסים נשלחו
        </div>
      </div>
    </div>
  )
}
