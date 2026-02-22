import { Resend } from 'resend'
import { getRequiredEnv } from '@/lib/env'

let _resend: Resend | null = null

export function getResendClient(): Resend {
  if (!_resend) {
    _resend = new Resend(getRequiredEnv('RESEND_API_KEY'))
  }
  return _resend
}

export function getEmailFrom(): string {
  return `Payroll Check <${getRequiredEnv('EMAIL_FROM')}>`
}

export function getInboundDomain(): string {
  return getRequiredEnv('EMAIL_INBOUND_DOMAIN')
}

/**
 * Build the reply-to address for a conversation.
 * Format: reply+<token>@<inbound-domain>
 */
export function buildReplyToAddress(replyToken: string): string {
  return `reply+${replyToken}@${getInboundDomain()}`
}

/**
 * Extract the reply token from a recipient address.
 * Expects a 24-char hex token (gen_random_bytes(12)): reply+<token>@domain
 * Returns null if the address doesn't match the expected format.
 */
export function extractReplyToken(address: string): string | null {
  const match = address.match(/^reply\+([a-f0-9]{24})@/i)
  return match ? match[1] : null
}
