'use client'

interface RowData {
  page_views: number
  form_submits: number
  [key: string]: unknown
}

interface Props {
  title: string
  data: RowData[]
  columnLabel: string
  columnKey: string
}

function pct(submits: number, views: number): string {
  if (views === 0) return '0%'
  return (submits / views * 100).toFixed(1) + '%'
}

export function SourceTable({ title, data, columnLabel, columnKey }: Props) {
  if (data.length === 0) {
    return (
      <div className="card">
        <h3 className="font-bold text-gray-900 mb-4">{title}</h3>
        <p className="text-sm text-gray-400">אין נתונים עדיין</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h3 className="font-bold text-gray-900 mb-4">{title}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-right py-2 font-medium text-gray-500">{columnLabel}</th>
            <th className="text-right py-2 font-medium text-gray-500">כניסות</th>
            <th className="text-right py-2 font-medium text-gray-500">טפסים</th>
            <th className="text-right py-2 font-medium text-gray-500">המרה</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-gray-50">
              <td className="py-2 font-medium text-gray-900 font-mono text-xs">
                {String(row[columnKey]) || '—'}
              </td>
              <td className="py-2 text-gray-600">{row.page_views.toLocaleString()}</td>
              <td className="py-2 text-gray-600">{row.form_submits.toLocaleString()}</td>
              <td className="py-2 text-green-600 font-medium">{pct(row.form_submits, row.page_views)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
