/**
 * Client-side analytics tracking utility.
 * Sends events to /api/track. Uses sendBeacon for reliability.
 */

export type AnalyticsEvent = 'page_view' | 'form_start' | 'form_submit' | 'cta_click'

const UTM_KEYS = ['utm_source', 'utm_campaign', 'utm_medium', 'utm_term', 'utm_content'] as const
const SESSION_KEY = 'pc_utm'

interface UTMParams {
  utm_source?: string
  utm_campaign?: string
  utm_medium?: string
  utm_term?: string
  utm_content?: string
}

/** Read UTM params from URL and persist to sessionStorage */
function captureUTMParams(): UTMParams {
  if (typeof window === 'undefined') return {}

  // If URL has UTM params, store them
  const params = new URLSearchParams(window.location.search)
  const fromUrl: UTMParams = {}
  let hasUtm = false
  for (const key of UTM_KEYS) {
    const val = params.get(key)
    if (val) {
      fromUrl[key] = val
      hasUtm = true
    }
  }

  if (hasUtm) {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(fromUrl))
    } catch {}
    return fromUrl
  }

  // Otherwise, read from sessionStorage (persisted from earlier pageview)
  try {
    const stored = sessionStorage.getItem(SESSION_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}

  return {}
}

function getDeviceType(): 'mobile' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop'
  return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
}

export function trackEvent(event: AnalyticsEvent, lang?: string) {
  if (typeof window === 'undefined') return

  const utm = captureUTMParams()

  const payload = {
    event,
    lang: lang || document.documentElement.lang || 'he',
    source: utm.utm_source || 'direct',
    campaign: utm.utm_campaign || '',
    medium: utm.utm_medium || '',
    referrer: document.referrer || '',
    device: getDeviceType(),
    path: window.location.pathname,
    timestamp: new Date().toISOString(),
  }

  // Use sendBeacon for reliability — doesn't block navigation
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/track', blob)
  } else {
    fetch('/api/track', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {})
  }
}
