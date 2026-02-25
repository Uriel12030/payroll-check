'use client'

import { useRouter } from 'next/navigation'
import { useRef } from 'react'

interface Props {
  initialQ?: string
  initialStatus?: string
  initialLang?: string
}

export function LeadsFilter({ initialQ, initialStatus, initialLang }: Props) {
  const router = useRouter()
  const qRef = useRef<HTMLInputElement>(null)
  const statusRef = useRef<HTMLSelectElement>(null)
  const langRef = useRef<HTMLSelectElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = qRef.current?.value ?? ''
    const status = statusRef.current?.value ?? 'all'
    const lang = langRef.current?.value ?? 'all'
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (status && status !== 'all') params.set('status', status)
    if (lang && lang !== 'all') params.set('lang', lang)
    router.push(`/admin/leads${params.toString() ? '?' + params.toString() : ''}`)
  }

  function handleClear() {
    router.push('/admin/leads')
  }

  const hasFilters = initialQ || (initialStatus && initialStatus !== 'all') || (initialLang && initialLang !== 'all')

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex gap-4 flex-wrap">
      <input
        ref={qRef}
        name="q"
        defaultValue={initialQ}
        placeholder="חיפוש לפי שם, אימייל, טלפון..."
        className="form-input max-w-xs"
      />
      <select
        ref={statusRef}
        name="status"
        defaultValue={initialStatus ?? 'all'}
        className="form-input bg-white max-w-[160px]"
      >
        <option value="all">כל הסטטוסים</option>
        <option value="new">חדש</option>
        <option value="reviewing">בבדיקה</option>
        <option value="accepted">מקובל</option>
        <option value="rejected">נדחה</option>
      </select>
      <select
        ref={langRef}
        name="lang"
        defaultValue={initialLang ?? 'all'}
        className="form-input bg-white max-w-[160px]"
      >
        <option value="all">כל השפות</option>
        <option value="he">עברית</option>
        <option value="en">English</option>
        <option value="ru">Русский</option>
        <option value="am">አማርኛ</option>
      </select>
      <button type="submit" className="btn-primary py-2 px-5 text-sm">
        חפש
      </button>
      {hasFilters && (
        <button type="button" onClick={handleClear} className="btn-secondary py-2 px-4 text-sm">
          נקה
        </button>
      )}
    </form>
  )
}
