import { Webhook } from 'svix'
import { getRequiredEnv } from '@/lib/env'

/**
 * Verify an inbound Resend webhook using Svix signature verification.
 * Throws if the signature is invalid.
 */
export function verifyResendWebhook(
  body: string,
  headers: {
    'svix-id'?: string | null
    'svix-timestamp'?: string | null
    'svix-signature'?: string | null
  }
): unknown {
  const secret = getRequiredEnv('RESEND_WEBHOOK_SECRET')
  const wh = new Webhook(secret)

  return wh.verify(body, {
    'svix-id': headers['svix-id'] ?? '',
    'svix-timestamp': headers['svix-timestamp'] ?? '',
    'svix-signature': headers['svix-signature'] ?? '',
  })
}
