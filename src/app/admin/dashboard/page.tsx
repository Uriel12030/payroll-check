'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import { SummaryCards } from '@/components/admin/dashboard/SummaryCards'
import { DailyChart } from '@/components/admin/dashboard/DailyChart'
import { LanguageTable } from '@/components/admin/dashboard/LanguageTable'
import { SourceTable } from '@/components/admin/dashboard/SourceTable'
import { DeviceBreakdown } from '@/components/admin/dashboard/DeviceBreakdown'
import { RecentEvents } from '@/components/admin/dashboard/RecentEvents'

interface Stats {
  summary: Record<string, Record<string, number>>
  daily: { date: string; page_views: number; form_submits: number }[]
  byLanguage: { lang: string; page_views: number; form_submits: number }[]
  bySource: { source: string; page_views: number; form_submits: number }[]
  byCampaign: { campaign: string; page_views: number; form_submits: number }[]
  byDevice: { device: string; page_views: number }[]
  recentEvents: {
    id: string
    event: string
    lang: string
    source: string
    path: string
    device: string
    timestamp: string
  }[]
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/stats')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      setStats(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת נתונים')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">דשבורד אנליטיקס</h1>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="btn-secondary flex items-center gap-2 text-sm py-2 px-4"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          רענון
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm">
          {error}
        </div>
      )}

      {loading && !stats && (
        <div className="text-center py-20 text-gray-400">טוען נתונים...</div>
      )}

      {stats && (
        <>
          <SummaryCards summary={stats.summary} />
          <DailyChart data={stats.daily} />

          <div className="grid lg:grid-cols-2 gap-6">
            <LanguageTable data={stats.byLanguage} />
            <DeviceBreakdown data={stats.byDevice} />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <SourceTable title="מקורות תנועה" data={stats.bySource} columnLabel="מקור" columnKey="source" />
            <SourceTable title="קמפיינים" data={stats.byCampaign} columnLabel="קמפיין" columnKey="campaign" />
          </div>

          <RecentEvents data={stats.recentEvents} />
        </>
      )}
    </div>
  )
}
