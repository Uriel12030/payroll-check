'use client';

import Script from 'next/script';
import { META_PIXEL_ID, getPixelInitScript } from '@/lib/meta-pixel';

/**
 * Meta Pixel loader — renders the bootstrap script + noscript fallback.
 * Only renders when NEXT_PUBLIC_META_PIXEL_ID is set.
 *
 * Place once in the root layout. Individual pages fire events via
 * `trackPixelEvent()` from `@/lib/meta-pixel`.
 */
export function MetaPixel({ nonce }: { nonce?: string }) {
  if (!META_PIXEL_ID) return null;

  return (
    <>
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: getPixelInitScript(META_PIXEL_ID),
        }}
      />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
