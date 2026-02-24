/**
 * Meta Pixel configuration and helpers.
 * The pixel only loads when NEXT_PUBLIC_META_PIXEL_ID is set.
 */

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '';

/**
 * Inline bootstrap script for the Meta Pixel.
 * Injected via next/script with the per-request CSP nonce so it works
 * under the strict Content-Security-Policy set by middleware.
 */
export function getPixelInitScript(pixelId: string): string {
  return `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');
`.trim();
}

/**
 * Fire a pixel event from client-side code.
 * Safe to call even when the pixel isn't loaded — silently no-ops.
 */
export function trackPixelEvent(
  eventName: string,
  params?: Record<string, unknown>,
  options?: { eventID?: string }
) {
  if (typeof window === 'undefined') return;
  const fbq = (window as unknown as Record<string, unknown>).fbq as
    | ((...args: unknown[]) => void)
    | undefined;
  if (!fbq) return;
  if (options?.eventID) {
    fbq('track', eventName, params ?? {}, { eventID: options.eventID });
  } else {
    fbq('track', eventName, params ?? {});
  }
}
