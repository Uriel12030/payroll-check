import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(request: NextRequest) {
    const debugToken = process.env.DEBUG_EMAIL_TOKEN
    const headerToken = request.headers.get('X-Debug-Token')

  if (!debugToken || headerToken !== debugToken) {
        return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY
    const EMAIL_FROM = process.env.EMAIL_FROM
    const TEST_EMAIL_TO = process.env.TEST_EMAIL_TO
    const EMAIL_INBOUND_DOMAIN = process.env.EMAIL_INBOUND_DOMAIN

  const missing: string[] = []
      if (!RESEND_API_KEY) missing.push('RESEND_API_KEY')
    if (!EMAIL_FROM) missing.push('EMAIL_FROM')
    if (!TEST_EMAIL_TO) missing.push('TEST_EMAIL_TO')
    if (!EMAIL_INBOUND_DOMAIN) missing.push('EMAIL_INBOUND_DOMAIN')

  if (missing.length > 0) {
        return NextResponse.json(
          { ok: false, error: `Missing environment variables: ${missing.join(', ')}` },
          { status: 500 }
              )
  }

  const apiKey = RESEND_API_KEY as string
    const from = EMAIL_FROM as string
    const to = TEST_EMAIL_TO as string
    const replyTo = `reply+debugtest@${EMAIL_INBOUND_DOMAIN as string}`
    const timestamp = new Date().toISOString()

  try {
        const resend = new Resend(apiKey)
        const { data, error } = await resend.emails.send({
                from,
                to: [to],
                replyTo,
                subject: 'MVP Email Test',
                html: `<strong>MVP test email</strong><br/>Timestamp: ${timestamp}<br/><br/>Reply to this email to test inbound routing.`,
        })

      if (error) {
              return NextResponse.json(
                { ok: false, error: error.message, timestamp },
                { status: 502 }
                      )
      }

      console.log('[debug/email] sent', { to, replyTo, messageId: data?.id })

      return NextResponse.json({
              ok: true,
              provider: 'resend',
              from,
              to,
              replyTo,
              messageId: data?.id ?? null,
              timestamp,
      })
  } catch (err) {
        return NextResponse.json(
          { ok: false, error: err instanceof Error ? err.message : String(err), timestamp },
          { status: 500 }
              )
  }
}
