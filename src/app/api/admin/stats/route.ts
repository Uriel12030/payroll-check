import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/isAdmin'
import { getRedis } from '@/lib/redis'

/** Generate array of date strings YYYY-MM-DD going back N days from today */
function getDateRange(days: number): string[] {
  const dates: string[] = []
  const now = new Date()
  for (let i = 0; i < days; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

/** Safely read a counter value (may be null or number) */
function num(val: unknown): number {
  if (val === null || val === undefined) return 0
  const n = Number(val)
  return isNaN(n) ? 0 : n
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

  const redis = getRedis()
  if (!redis) {
    return NextResponse.json({ error: 'Analytics not configured' }, { status: 503 })
  }

  try {
    const todayDates = getDateRange(1)
    const weekDates = getDateRange(7)
    const monthDates = getDateRange(30)

    // ── 1. Summary counters ──
    const events = ['page_views', 'form_start', 'form_submit', 'cta_click'] as const
    // Map display name to stored event name
    const eventMap: Record<string, string> = {
      page_views: 'page_view',
      form_start: 'form_start',
      form_submit: 'form_submit',
      cta_click: 'cta_click',
    }

    // Build MGET keys for today, week, month
    const allCounterKeys: string[] = []
    for (const dates of [todayDates, weekDates, monthDates]) {
      for (const ev of events) {
        for (const date of dates) {
          allCounterKeys.push(`c:${date}:${eventMap[ev]}`)
        }
      }
    }

    const allCounterVals = await redis.mget<(number | null)[]>(...allCounterKeys)

    // Parse summary
    let idx = 0
    const summaryPeriods = [todayDates, weekDates, monthDates]
    const summaryLabels = ['today', 'week', 'month'] as const
    const summary: Record<string, Record<string, number>> = {}

    for (let p = 0; p < summaryPeriods.length; p++) {
      const period: Record<string, number> = {}
      for (const ev of events) {
        let total = 0
        for (let d = 0; d < summaryPeriods[p].length; d++) {
          total += num(allCounterVals[idx++])
        }
        period[ev] = total
      }
      summary[summaryLabels[p]] = period
    }

    // ── 2. Daily chart (last 7 days) ──
    const dailyKeys: string[] = []
    for (const date of weekDates) {
      dailyKeys.push(`c:${date}:page_view`, `c:${date}:form_submit`)
    }
    const dailyVals = await redis.mget<(number | null)[]>(...dailyKeys)

    const daily = weekDates.map((date, i) => ({
      date,
      page_views: num(dailyVals[i * 2]),
      form_submits: num(dailyVals[i * 2 + 1]),
    })).reverse() // oldest first for chart

    // ── 3. Language breakdown (last 30 days) ──
    // Collect unique languages
    const langSets = await Promise.all(
      monthDates.map((date) => redis.smembers(`dims:${date}:langs`))
    )
    const allLangs = Array.from(new Set(langSets.flat().filter(Boolean))) as string[]

    let byLanguage: { lang: string; page_views: number; form_submits: number }[] = []
    if (allLangs.length > 0) {
      const langKeys: string[] = []
      for (const lang of allLangs) {
        for (const date of monthDates) {
          langKeys.push(`c:${date}:l:${lang}:page_view`, `c:${date}:l:${lang}:form_submit`)
        }
      }
      const langVals = await redis.mget<(number | null)[]>(...langKeys)

      let li = 0
      byLanguage = allLangs.map((lang) => {
        let pv = 0, fs = 0
        for (let d = 0; d < monthDates.length; d++) {
          pv += num(langVals[li++])
          fs += num(langVals[li++])
        }
        return { lang, page_views: pv, form_submits: fs }
      }).sort((a, b) => b.page_views - a.page_views)
    }

    // ── 4. Source/campaign breakdown (last 30 days) ──
    const sourceSets = await Promise.all(
      monthDates.map((date) => redis.smembers(`dims:${date}:sources`))
    )
    const allSources = Array.from(new Set(sourceSets.flat().filter(Boolean))) as string[]

    const campaignSets = await Promise.all(
      monthDates.map((date) => redis.smembers(`dims:${date}:campaigns`))
    )
    const allCampaigns = Array.from(new Set(campaignSets.flat().filter(Boolean))) as string[]

    let bySource: { source: string; page_views: number; form_submits: number }[] = []
    if (allSources.length > 0) {
      const srcKeys: string[] = []
      for (const src of allSources) {
        for (const date of monthDates) {
          srcKeys.push(`c:${date}:s:${src}:page_view`, `c:${date}:s:${src}:form_submit`)
        }
      }
      const srcVals = await redis.mget<(number | null)[]>(...srcKeys)

      let si = 0
      bySource = allSources.map((source) => {
        let pv = 0, fs = 0
        for (let d = 0; d < monthDates.length; d++) {
          pv += num(srcVals[si++])
          fs += num(srcVals[si++])
        }
        return { source, page_views: pv, form_submits: fs }
      }).sort((a, b) => b.page_views - a.page_views)
    }

    let byCampaign: { campaign: string; page_views: number; form_submits: number }[] = []
    if (allCampaigns.length > 0) {
      const camKeys: string[] = []
      for (const cam of allCampaigns) {
        for (const date of monthDates) {
          camKeys.push(`c:${date}:cam:${cam}:page_view`, `c:${date}:cam:${cam}:form_submit`)
        }
      }
      const camVals = await redis.mget<(number | null)[]>(...camKeys)

      let ci = 0
      byCampaign = allCampaigns.map((campaign) => {
        let pv = 0, fs = 0
        for (let d = 0; d < monthDates.length; d++) {
          pv += num(camVals[ci++])
          fs += num(camVals[ci++])
        }
        return { campaign, page_views: pv, form_submits: fs }
      }).sort((a, b) => b.form_submits - a.form_submits)
    }

    // ── 5. Device breakdown (last 30 days) ──
    const deviceKeys: string[] = []
    for (const dev of ['mobile', 'desktop']) {
      for (const date of monthDates) {
        deviceKeys.push(`c:${date}:d:${dev}:page_view`)
      }
    }
    const deviceVals = await redis.mget<(number | null)[]>(...deviceKeys)

    let mobileTotal = 0, desktopTotal = 0
    for (let d = 0; d < monthDates.length; d++) {
      mobileTotal += num(deviceVals[d])
      desktopTotal += num(deviceVals[monthDates.length + d])
    }

    const byDevice = [
      { device: 'mobile', page_views: mobileTotal },
      { device: 'desktop', page_views: desktopTotal },
    ]

    // ── 6. Recent events ──
    const rawRecent = await redis.lrange('recent_events', 0, 49)
    const recentEvents = rawRecent.map((item) => {
      if (typeof item === 'string') {
        try { return JSON.parse(item) } catch { return item }
      }
      return item
    })

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
