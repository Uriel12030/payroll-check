/**
 * Meta Conversions API (server-side).
 * Sends events directly to Meta for better attribution when combined
 * with the client-side pixel (deduped via shared event_id).
 */

import crypto from 'crypto';
import { headers, cookies } from 'next/headers';

const PIXEL_ID = process.env.META_PIXEL_ID;
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN;
const API_VERSION = 'v21.0';

function sha256(value: string): string {
  return crypto
    .createHash('sha256')
    .update(value.trim().toLowerCase())
    .digest('hex');
}

/**
 * Send a Lead conversion event to Meta's Conversions API.
 *
 * Reads IP, user-agent, _fbc, and _fbp automatically from the
 * current request context (next/headers + next/cookies).
 *
 * @returns The event_id used, so callers can pass it to the client
 *          pixel for deduplication.
 */
export async function sendLeadEvent(params: {
  email?: string;
  phone?: string;
  sourceUrl: string;
}): Promise<string | null> {
  if (!PIXEL_ID || !ACCESS_TOKEN) return null;

  const eventId = crypto.randomUUID();

  try {
    const headersList = headers();
    const cookieStore = cookies();

    const clientIp =
      headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
    const userAgent = headersList.get('user-agent') || '';
    const fbc = cookieStore.get('_fbc')?.value;
    const fbp = cookieStore.get('_fbp')?.value;

    const userData: Record<string, unknown> = {};
    if (params.email) userData.em = [sha256(params.email)];
    if (params.phone) userData.ph = [sha256(params.phone.replace(/\D/g, ''))];
    if (clientIp) userData.client_ip_address = clientIp;
    if (userAgent) userData.client_user_agent = userAgent;
    if (fbc) userData.fbc = fbc;
    if (fbp) userData.fbp = fbp;

    const payload = {
      data: [
        {
          event_name: 'Lead',
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          event_source_url: params.sourceUrl,
          action_source: 'website',
          user_data: userData,
        },
      ],
    };

    const url = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[meta-capi] Lead event failed:', res.status, body);
    }
  } catch (err) {
    // Non-fatal — never block lead creation for tracking failures
    console.error('[meta-capi] Lead event error:', err);
  }

  return eventId;
}
