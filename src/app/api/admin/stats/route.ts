import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/isAdmin'

/** ISO date string for N days ago */
function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

export async function GET() {
  // Admin auth — same pattern as all other admin API routes
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const db = createServiceClient()

  try {
    // ── 1. Summary counters (today / 7d / 30d) ──
    const periods = [
      { key: 'today', since: daysAgo(1) },
      { key: 'week', since: daysAgo(7) },
      { key: 'month', since: daysAgo(30) },
    ] as const

    const summaryResults = await Promise.all(
      periods.map(({ since }) =>
        db
          .from('analytics_events')
          .select('event')
          .gte('created_at', since)
      )
    )

    const summary: Record<string, Record<string, number>> = {}
    for (let i = 0; i < periods.length; i++) {
      const rows = summaryResults[i].data || []
      const counts: Record<string, number> = {
        page_views: 0,
        form_start: 0,
        form_submit: 0,
        cta_click: 0,
      }
      for (const row of rows) {
        const ev = row.event === 'page_view' ? 'page_views' : row.event
        counts[ev] = (counts[ev] || 0) + 1
      }
      summary[periods[i].key] = counts
    }

    // ── 2. Daily chart (last 7 days) ──
    const { data: weekRows } = await db
      .from('analytics_events')
      .select('created_at, event')
      .gte('created_at', daysAgo(7))

    const dailyMap: Record<string, { page_views: number; form_submits: number }> = {}
    // Pre-fill last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      dailyMap[key] = { page_views: 0, form_submits: 0 }
    }
    for (const row of weekRows || []) {
      const date = row.created_at.split('T')[0]
      if (!dailyMap[date]) dailyMap[date] = { page_views: 0, form_submits: 0 }
      if (row.event === 'page_view') dailyMap[date].page_views++
      if (row.event === 'form_submit') dailyMap[date].form_submits++
    }
    const daily = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ date, ...counts }))

    // ── 3. Language breakdown (last 30 days) ──
    const { data: langRows } = await db
      .from('analytics_events')
      .select('lang, event')
      .gte('created_at', daysAgo(30))
      .in('event', ['page_view', 'form_submit'])

    const langMap: Record<string, { page_views: number; form_submits: number }> = {}
    for (const row of langRows || []) {
      if (!langMap[row.lang]) langMap[row.lang] = { page_views: 0, form_submits: 0 }
      if (row.event === 'page_view') langMap[row.lang].page_views++
      if (row.event === 'form_submit') langMap[row.lang].form_submits++
    }
    const byLanguage = Object.entries(langMap)
      .map(([lang, counts]) => ({ lang, ...counts }))
      .sort((a, b) => b.page_views - a.page_views)

    // ── 4. Source breakdown (last 30 days) ──
    const { data: sourceRows } = await db
      .from('analytics_events')
      .select('source, event')
      .gte('created_at', daysAgo(30))
      .in('event', ['page_view', 'form_submit'])

    const sourceMap: Record<string, { page_views: number; form_submits: number }> = {}
    for (const row of sourceRows || []) {
      if (!sourceMap[row.source]) sourceMap[row.source] = { page_views: 0, form_submits: 0 }
      if (row.event === 'page_view') sourceMap[row.source].page_views++
      if (row.event === 'form_submit') sourceMap[row.source].form_submits++
    }
    const bySource = Object.entries(sourceMap)
      .map(([source, counts]) => ({ source, ...counts }))
      .sort((a, b) => b.page_views - a.page_views)

    // ── 5. Campaign breakdown (last 30 days) ──
    const { data: campaignRows } = await db
      .from('analytics_events')
      .select('campaign, event')
      .gte('created_at', daysAgo(30))
      .in('event', ['page_view', 'form_submit'])
      .neq('campaign', '')

    const campaignMap: Record<string, { page_views: number; form_submits: number }> = {}
    for (const row of campaignRows || []) {
      if (!campaignMap[row.campaign]) campaignMap[row.campaign] = { page_views: 0, form_submits: 0 }
      if (row.event === 'page_view') campaignMap[row.campaign].page_views++
      if (row.event === 'form_submit') campaignMap[row.campaign].form_submits++
    }
    const byCampaign = Object.entries(campaignMap)
      .map(([campaign, counts]) => ({ campaign, ...counts }))
      .sort((a, b) => b.form_submits - a.form_submits)

    // ── 6. Device breakdown (last 30 days) ──
    const { data: deviceRows } = await db
      .from('analytics_events')
      .select('device')
      .gte('created_at', daysAgo(30))
      .eq('event', 'page_view')

    let mobile = 0, desktop = 0
    for (const row of deviceRows || []) {
      if (row.device === 'mobile') mobile++
      else desktop++
    }
    const byDevice = [
      { device: 'mobile', page_views: mobile },
      { device: 'desktop', page_views: desktop },
    ]

    // ── 7. Recent events (last 50) ──
    const { data: recentRows } = await db
      .from('analytics_events')
      .select('id, event, lang, source, path, device, created_at')
      .order('created_at', { ascending: false })
      .limit(50)

    const recentEvents = (recentRows || []).map((r) => ({
      id: r.id,
      event: r.event,
      lang: r.lang,
      source: r.source,
      path: r.path,
      device: r.device,
      timestamp: r.created_at,
    }))

    return NextResponse.json({
      summary,
      daily,
      byLanguage,
      bySource,
      byCampaign,
      byDevice,
      recentEvents,
    })
  } catch (error) {
    console.error('[stats] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
