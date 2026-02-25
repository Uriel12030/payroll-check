import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'

const VALID_EVENTS = ['page_view', 'form_start', 'form_submit', 'cta_click'] as const
const EVENT_TTL = 30 * 24 * 60 * 60 // 30 days
const COUNTER_TTL = 90 * 24 * 60 * 60 // 90 days

export async function POST(request: NextRequest) {
  try {
    const redis = getRedis()
    if (!redis) {
      // Analytics disabled — silently succeed
      return NextResponse.json({ ok: true })
    }

    // sendBeacon sends as text/plain, so try json() first, then parse text
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      const text = await request.text()
      body = JSON.parse(text)
    }
    const { event, lang, source, campaign, medium, referrer, device, path, timestamp } = body

    if (!VALID_EVENTS.includes(event as typeof VALID_EVENTS[number])) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const safeLang = String(lang || 'he').slice(0, 5)
    const safeSource = String(source || 'direct').slice(0, 50)
    const safeCampaign = String(campaign || '').slice(0, 100)
    const safeDevice = device === 'mobile' ? 'mobile' : 'desktop'

    const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const eventId = crypto.randomUUID()

    const eventData = {
      id: eventId,
      event,
      lang: safeLang,
      source: safeSource,
      campaign: safeCampaign,
      medium: String(medium || '').slice(0, 50),
      referrer: String(referrer || '').slice(0, 500),
      device: safeDevice,
      path: String(path || '/').slice(0, 200),
      timestamp: timestamp || new Date().toISOString(),
    }

    const pipe = redis.pipeline()

    // Store individual event
    pipe.set(`evt:${date}:${eventId}`, JSON.stringify(eventData), { ex: EVENT_TTL })

    // Global counters per event type
    pipe.incr(`c:${date}:${event}`)

    // Language counters
    pipe.incr(`c:${date}:l:${safeLang}:${event}`)

    // Source counters
    pipe.incr(`c:${date}:s:${safeSource}:${event}`)

    // Device counters
    pipe.incr(`c:${date}:d:${safeDevice}:${event}`)

    // Campaign counters (only if present)
    if (safeCampaign) {
      pipe.incr(`c:${date}:cam:${safeCampaign}:${event}`)
    }

    // Recent events list (keep last 200)
    pipe.lpush('recent_events', JSON.stringify(eventData))
    pipe.ltrim('recent_events', 0, 199)

    // Track unique dimensions for this date (so stats API knows what to query)
    pipe.sadd(`dims:${date}:langs`, safeLang)
    pipe.sadd(`dims:${date}:sources`, safeSource)
    if (safeCampaign) pipe.sadd(`dims:${date}:campaigns`, safeCampaign)

    // Track active dates
    pipe.sadd('analytics:dates', date)

    await pipe.exec()

    // Set TTL on counter keys (idempotent — resets TTL each time, which is fine)
    const counterKeys = [
      `c:${date}:${event}`,
      `c:${date}:l:${safeLang}:${event}`,
      `c:${date}:s:${safeSource}:${event}`,
      `c:${date}:d:${safeDevice}:${event}`,
    ]
    if (safeCampaign) counterKeys.push(`c:${date}:cam:${safeCampaign}:${event}`)

    const ttlPipe = redis.pipeline()
    for (const key of counterKeys) {
      ttlPipe.expire(key, COUNTER_TTL)
    }
    ttlPipe.expire(`dims:${date}:langs`, COUNTER_TTL)
    ttlPipe.expire(`dims:${date}:sources`, COUNTER_TTL)
    if (safeCampaign) ttlPipe.expire(`dims:${date}:campaigns`, COUNTER_TTL)
    await ttlPipe.exec()

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[track] Error:', error)
    // Never fail tracking — always return success
    return NextResponse.json({ ok: true })
  }
}
