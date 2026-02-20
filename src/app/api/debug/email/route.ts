import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(request: NextRequest) {
  // Auth: require X-Debug-Token header matching DEBUG_EMAIL_TOKEN env
  const debugToken = process.env.DEBUG_EMAIL_TOKEN
  const headerToken = request.headers.get('X-Debug-Token')

  if (!debugToken || headerToken !== debugToken) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  // Validate required env vars
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  const EMAIL_FROM = process.env.EMAIL_FROM
  const TEST_EMAIL_TO = process.env.TEST_EMAIL_TO

  const missing: string[] = []
  if (!RESEND_API_KEY) missing.push('RESEND_API_KEY')
  if (!EMAIL_FROM) missing.push('EMAIL_FROM')
  if (!TEST_EMAIL_TO) missing.push('TEST_EMAIL_TO')

  if (missing.length > 0) {
    return NextResponse.json(
      { ok: false, error: `Missing environment variables: ${missing.join(', ')}` },
      { status: 500 }
    )
  }

  const timestamp = new Date().toISOString()

  try {
    const resend = new Resend(RESEND_API_KEY)
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [TEST_EMAIL_TO],
      subject: 'MVP Email Test',
      html: `<strong>MVP test email</strong><br/>Timestamp: ${timestamp}`,
    })

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message, timestamp },
        { status: 502 }
      )
    }

    console.log('[debug/email] sent', { to: TEST_EMAIL_TO, messageId: data?.id })

    return NextResponse.json({
      ok: true,
      provider: 'resend',
      from: EMAIL_FROM,
      to: TEST_EMAIL_TO,
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
