import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const VALID_EVENTS = ['page_view', 'form_start', 'form_submit', 'cta_click'] as const

export async function POST(request: NextRequest) {
  try {
    // sendBeacon sends as text/plain, so try json() first, then parse text
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      const text = await request.text()
      body = JSON.parse(text)
    }

    const { event, lang, source, campaign, medium, referrer, device, path } = body

    if (!VALID_EVENTS.includes(event as typeof VALID_EVENTS[number])) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { error: dbError } = await supabase.from('analytics_events').insert({
      event: String(event),
      lang: String(lang || 'he').slice(0, 5),
      source: String(source || 'direct').slice(0, 50),
      campaign: String(campaign || '').slice(0, 100),
      medium: String(medium || '').slice(0, 50),
      referrer: String(referrer || '').slice(0, 500),
      device: device === 'mobile' ? 'mobile' : 'desktop',
      path: String(path || '/').slice(0, 200),
    })

    if (dbError) {
      console.error('[track] Supabase error:', dbError.message)
      return NextResponse.json({ ok: false, error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[track] Error:', error)
    // Never fail tracking — always return success
    return NextResponse.json({ ok: true })
  }
}
