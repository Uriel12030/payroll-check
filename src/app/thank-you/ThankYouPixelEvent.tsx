'use client';

import { useEffect, useRef } from 'react';
import { trackPixelEvent } from '@/lib/meta-pixel';

/**
 * Fires a Meta Pixel "Lead" event once on mount.
 * Uses the same eventID as the server-side CAPI call for deduplication.
 */
export function ThankYouPixelEvent({ eventId }: { eventId?: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackPixelEvent('Lead', {}, eventId ? { eventID: eventId } : undefined);
  }, [eventId]);

  return null;
}
