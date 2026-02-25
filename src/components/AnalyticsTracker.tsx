'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { trackEvent } from '@/lib/analytics'
import { useLanguage } from '@/lib/i18n/LanguageContext'

/**
 * Fires a page_view event on every client-side navigation.
 * Place once in the root layout.
 */
export function AnalyticsTracker() {
  const pathname = usePathname()
  const { lang } = useLanguage()
  const prev = useRef<string | null>(null)

  useEffect(() => {
    // Fire on initial load and on every pathname change
    if (prev.current !== pathname) {
      prev.current = pathname
      trackEvent('page_view', lang)
    }
  }, [pathname, lang])

  return null
}
