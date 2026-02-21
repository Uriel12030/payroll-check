import { Webhook } from 'svix'
import { getRequiredEnv } from '@/lib/env'

/**
 * Verify an inbound Resend webhook using Svix signature verification.
 * Throws if the signature is invalid or required headers are missing.
 */
export function verifyResendWebhook(
  body: string,
  headers: {
    'svix-id'?: string | null
    'svix-timestamp'?: string | null
    'svix-signature'?: string | null
  }
): unknown {
  const svixId = headers['svix-id']
  const svixTimestamp = headers['svix-timestamp']
  const svixSignature = headers['svix-signature']

  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new Error('Missing required Svix webhook headers (svix-id, svix-timestamp, svix-signature)')
  }

  const secret = getRequiredEnv('RESEND_WEBHOOK_SECRET')
  const wh = new Webhook(secret)

  return wh.verify(body, {
    'svix-id': svixId,
    'svix-timestamp': svixTimestamp,
    'svix-signature': svixSignature,
  })
}
