import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import type { Lead, LeadFlags } from '@/types'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'פניות – Admin | Payroll Check',
}

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  reviewing: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

const statusLabels: Record<string, string> = {
  new: 'חדש',
  reviewing: 'בבדיקה',
  accepted: 'מקובל',
  rejected: 'נדחה',
}

const langLabels: Record<string, string> = {
  he: 'עברית',
  en: 'English',
  ru: 'Русский',
  am: 'አማርኛ',
}

const yearsLabels: Record<string, string> = {
  less_than_1: 'פחות משנה',
  '1_3': '1–3 שנים',
  '3_7': '3–7 שנים',
  '7_plus': '7+ שנים',
}

const employmentTypeLabels: Record<string, string> = {
  direct: 'העסקה ישירה',
  contractor: 'קבלן',
  not_sure: 'לא בטוח/ה',
}

const issueLabels: Record<string, string> = {
  unpaid_overtime: 'שעות נוספות',
  severance: 'פיצויים',
  vacation_sick: 'חופשה/מחלה',
  pension_benefits: 'פנסיה/תנאים',
  payslips_missing: 'תלושים חסרים',
  other: 'אחר',
}

interface PageProps {
  searchParams: { status?: string; q?: string; lang?: string }
}

/** Extract quick-start field from lead_flags or top-level column */
function getQuickField<T>(lead: LeadListRow, flagKey: keyof LeadFlags, topKey?: keyof LeadListRow): T | null {
  // Check top-level column first (migration 006 columns)
  if (topKey && lead[topKey] != null && lead[topKey] !== '') return lead[topKey] as T
  // Fall back to lead_flags (where createQuickLead stores data)
  const flags = lead.lead_flags as LeadFlags | null
  if (flags && flagKey in flags) return flags[flagKey] as T
  return null
}

type LeadListRow = Pick<Lead,
  'id' | 'created_at' | 'full_name' | 'email' | 'phone' | 'status' |
  'preferred_language' | 'years_with_employer_bucket' | 'employment_type_quick' | 'main_issues' | 'lead_flags'
>

export default async function AdminLeadsPage({ searchParams }: PageProps) {
  const supabase = createClient()

  let query = supabase
    .from('leads')
    .select('id, created_at, full_name, email, phone, status, preferred_language, years_with_employer_bucket, employment_type_quick, main_issues, lead_flags')
    .order('created_at', { ascending: false })

  if (searchParams.status && searchParams.status !== 'all') {
    query = query.eq('status', searchParams.status)
  }

  if (searchParams.q) {
    query = query.or(
      `full_name.ilike.%${searchParams.q}%,email.ilike.%${searchParams.q}%,phone.ilike.%${searchParams.q}%`
    )
  }

  if (searchParams.lang && searchParams.lang !== 'all') {
    query = query.eq('preferred_language', searchParams.lang)
  }

  const { data: leads = [] } = await query

  // Fetch unread conversation counts per lead
  const { data: unreadData = [] } = await supabase
    .from('email_conversations')
    .select('customer_id')
    .eq('is_read', false)

  const unreadMap = new Map<string, number>()
  ;(unreadData ?? []).forEach((c: { customer_id: string }) => {
    unreadMap.set(c.customer_id, (unreadMap.get(c.customer_id) || 0) + 1)
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">פניות</h1>
        <span className="text-sm text-gray-500">{leads?.length ?? 0} תוצאות</span>
      </div>

      {/* Filters */}
      <form method="get" className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex gap-4 flex-wrap">
        <input
          name="q"
          defaultValue={searchParams.q}
          placeholder="חיפוש לפי שם, אימייל, טלפון..."
          className="form-input max-w-xs"
        />
        <select
          name="status"
          defaultValue={searchParams.status ?? 'all'}
          className="form-input bg-white max-w-[160px]"
        >
          <option value="all">כל הסטטוסים</option>
          <option value="new">חדש</option>
          <option value="reviewing">בבדיקה</option>
          <option value="accepted">מקובל</option>
          <option value="rejected">נדחה</option>
        </select>
        <select
          name="lang"
          defaultValue={searchParams.lang ?? 'all'}
          className="form-input bg-white max-w-[160px]"
        >
          <option value="all">כל השפות</option>
          <option value="he">עברית</option>
          <option value="en">English</option>
          <option value="ru">Русский</option>
          <option value="am">አማרኛ</option>
        </select>
        <button type="submit" className="btn-primary py-2 px-5 text-sm">
          חפש
        </button>
        {(searchParams.status || searchParams.q || searchParams.lang) && (
          <Link href="/admin/leads" className="btn-secondary py-2 px-4 text-sm">
            נקה
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {!leads || leads.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-lg font-medium">לא נמצאו פניות</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">תאריך</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">שם</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 hidden md:table-cell">טלפון</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 hidden md:table-cell">שפה</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">ותק</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">סוג העסקה</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 hidden xl:table-cell">נושאים</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">סטטוס</th>
                  <th className="px-4 py-3 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(leads as LeadListRow[]).map((lead) => {
                  const lang = getQuickField<string>(lead, 'preferred_language', 'preferred_language')
                  const years = getQuickField<string>(lead, 'years_with_employer_bucket', 'years_with_employer_bucket')
                  const empType = getQuickField<string>(lead, 'employment_type_quick', 'employment_type_quick')
                  const issues = getQuickField<string[]>(lead, 'main_issues', 'main_issues')
                  const unreadCount = unreadMap.get(lead.id) || 0

                  return (
                    <tr key={lead.id} className="relative hover:bg-blue-50/40 transition-colors cursor-pointer group">
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {new Date(lead.created_at).toLocaleDateString('he-IL')}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/leads/${lead.id}`}
                          className="font-medium text-gray-900 group-hover:text-blue-700 transition-colors after:absolute after:inset-0"
                        >
                          {lead.full_name || '—'}
                        </Link>
                        <div className="text-xs text-gray-400">{lead.email || '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell" dir="ltr">
                        {lead.phone || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                        {lang ? (langLabels[lang] ?? lang) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden lg:table-cell text-xs">
                        {years ? (yearsLabels[years] ?? years) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden lg:table-cell text-xs">
                        {empType ? (employmentTypeLabels[empType] ?? empType) : '—'}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        {issues && issues.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {issues.map((issue) => (
                              <span
                                key={issue}
                                className="inline-block text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
                              >
                                {issueLabels[issue] ?? issue}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[lead.status]}`}>
                          {statusLabels[lead.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/leads/${lead.id}?tab=emails`}
                          className="relative z-10 inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                          title="אימיילים"
                        >
                          <Mail className="w-4 h-4" />
                          {unreadCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-bold leading-none">
                              {unreadCount}
                            </span>
                          )}
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
