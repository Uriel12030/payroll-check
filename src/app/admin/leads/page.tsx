import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import type { Lead } from '@/types'
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

interface PageProps {
  searchParams: { status?: string; q?: string }
}

export default async function AdminLeadsPage({ searchParams }: PageProps) {
  const supabase = createClient()

  let query = supabase
    .from('leads')
    .select('id, created_at, last_interaction_at, full_name, email, phone, city, status, lead_score, employer_name')
    .order('last_interaction_at', { ascending: false })

  if (searchParams.status && searchParams.status !== 'all') {
    query = query.eq('status', searchParams.status)
  }

  if (searchParams.q) {
    query = query.or(
      `full_name.ilike.%${searchParams.q}%,email.ilike.%${searchParams.q}%,employer_name.ilike.%${searchParams.q}%`
    )
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
          placeholder="חיפוש לפי שם, אימייל, מעסיק..."
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
        <button type="submit" className="btn-primary py-2 px-5 text-sm">
          חפש
        </button>
        {(searchParams.status || searchParams.q) && (
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
                  <th className="text-right px-4 py-3 font-medium text-gray-600">שם</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 hidden md:table-cell">מעסיק</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 hidden md:table-cell">טלפון</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">ציון</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">סטטוס</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">פעילות אחרונה</th>
                  <th className="px-4 py-3 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(leads as Pick<Lead, 'id' | 'created_at' | 'last_interaction_at' | 'full_name' | 'email' | 'phone' | 'city' | 'status' | 'lead_score' | 'employer_name'>[]).map((lead) => {
                  const unreadCount = unreadMap.get(lead.id) || 0
                  return (
                  <tr key={lead.id} className="relative hover:bg-blue-50/40 transition-colors cursor-pointer group">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/leads/${lead.id}`}
                        className="font-medium text-gray-900 group-hover:text-blue-700 transition-colors after:absolute after:inset-0"
                      >
                        {lead.full_name}
                      </Link>
                      <div className="text-xs text-gray-400">{lead.email}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{lead.employer_name}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell" dir="ltr">{lead.phone}</td>
                    <td className="px-4 py-3">
                      {lead.lead_score !== null ? (
                        <span className={`inline-flex items-center justify-center w-10 h-8 rounded-lg text-xs font-bold ${
                          lead.lead_score >= 60
                            ? 'bg-green-100 text-green-700'
                            : lead.lead_score >= 30
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {lead.lead_score}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[lead.status]}`}>
                        {statusLabels[lead.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 hidden lg:table-cell text-xs">
                      {new Date(lead.last_interaction_at).toLocaleDateString('he-IL')}
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
