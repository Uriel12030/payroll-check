'use client'

import type { Lead } from '@/types'
import { FileDown } from 'lucide-react'

interface Props {
  lead: Lead
}

export function LeadPDFButton({ lead }: Props) {
  const handlePrint = () => {
    window.open(`/api/admin/leads/${lead.id}/pdf`, '_blank')
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 mb-3">דוח PDF</h2>
      <p className="text-sm text-gray-500 mb-4">פתחו את הדוח בחלון חדש ושמרו כ-PDF באמצעות הדפסה (Ctrl+P)</p>
      <button
        onClick={handlePrint}
        className="btn-secondary flex items-center gap-2 text-sm py-2 px-5"
      >
        <FileDown className="w-4 h-4" />
        הורד PDF
      </button>
    </div>
  )
}
