'use client'

import { useState } from 'react'
import type { Lead } from '@/types'
import { FileDown } from 'lucide-react'

interface Props {
  lead: Lead
}

export function LeadPDFButton({ lead }: Props) {
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}/pdf`)
      if (!res.ok) throw new Error('Failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lead-${lead.id.slice(0, 8)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('שגיאה ביצירת PDF')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 mb-3">דוח PDF</h2>
      <p className="text-sm text-gray-500 mb-4">הורידו סיכום מלא של הפנייה בפורמט PDF</p>
      <button
        onClick={handleDownload}
        disabled={loading}
        className="btn-secondary flex items-center gap-2 text-sm py-2 px-5"
      >
        <FileDown className="w-4 h-4" />
        {loading ? 'מייצר PDF...' : 'הורד PDF'}
      </button>
    </div>
  )
}
