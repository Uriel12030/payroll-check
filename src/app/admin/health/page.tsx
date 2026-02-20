import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/isAdmin'
import { getAdminAllowlist } from '@/lib/env'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Admin Health – Payroll Check' }

// Mask a URL: show scheme + first 8 chars of host, rest as ***
function maskUrl(url: string): string {
  try {
    const u = new URL(url)
    const masked = u.host.slice(0, 8) + '***'
    return `${u.protocol}//${masked}`
  } catch {
    return '***'
  }
}

async function checkDbConnectivity(): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = createClient()
    const { error } = await supabase.from('leads').select('id').limit(1)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-3 border-b border-gray-100 last:border-0">
      <span className="text-gray-500 text-sm w-48 shrink-0">{label}</span>
      <span className="text-gray-900 text-sm font-mono">{children}</span>
    </div>
  )
}

function Badge({ ok, yes, no }: { ok: boolean; yes?: string; no?: string }) {
  return ok ? (
    <span className="inline-block bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5 rounded">
      {yes ?? 'OK'}
    </span>
  ) : (
    <span className="inline-block bg-red-100 text-red-800 text-xs font-semibold px-2 py-0.5 rounded">
      {no ?? 'FAIL'}
    </span>
  )
}

export default async function HealthPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !isAdmin(user.email)) {
    redirect('/admin/login')
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const urlPresent = Boolean(supabaseUrl)
  const anonKeyPresent = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const serviceKeyPresent = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  const allowlist = getAdminAllowlist()
  const adminOk = isAdmin(user.email)
  const resendKeyPresent = Boolean(process.env.RESEND_API_KEY)
  const emailFromPresent = Boolean(process.env.EMAIL_FROM)
  const inboundDomainPresent = Boolean(process.env.EMAIL_INBOUND_DOMAIN)
  const webhookSecretPresent = Boolean(process.env.RESEND_WEBHOOK_SECRET)

  const dbCheck = await checkDbConnectivity()

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Health Check</h1>

      <div className="card mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Environment Variables
        </h2>
        <Row label="NEXT_PUBLIC_SUPABASE_URL">
          <Badge ok={urlPresent} yes="present" no="MISSING" />
          {urlPresent && (
            <span className="ml-2 text-gray-500">{maskUrl(supabaseUrl)}</span>
          )}
        </Row>
        <Row label="NEXT_PUBLIC_SUPABASE_ANON_KEY">
          <Badge ok={anonKeyPresent} yes="present" no="MISSING" />
        </Row>
        <Row label="SUPABASE_SERVICE_ROLE_KEY">
          <Badge ok={serviceKeyPresent} yes="present" no="MISSING" />
        </Row>
        <Row label="ADMIN_ALLOWLIST_EMAILS">
          {allowlist.length > 0 ? (
            <>
              <Badge ok={true} yes={`${allowlist.length} email(s)`} />
              <span className="ml-2 text-gray-400 text-xs">
                {allowlist.map((e) => e.replace(/(.{2}).+(@.+)/, '$1***$2')).join(', ')}
              </span>
            </>
          ) : (
            <Badge ok={false} no="NOT SET – nobody can be admin" />
          )}
        </Row>
      </div>

      <div className="card mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Email (Resend)
        </h2>
        <Row label="RESEND_API_KEY">
          <Badge ok={resendKeyPresent} yes="present" no="MISSING" />
        </Row>
        <Row label="EMAIL_FROM">
          <Badge ok={emailFromPresent} yes="present" no="MISSING" />
          {emailFromPresent && (
            <span className="ml-2 text-gray-500">{process.env.EMAIL_FROM}</span>
          )}
        </Row>
        <Row label="EMAIL_INBOUND_DOMAIN">
          <Badge ok={inboundDomainPresent} yes="present" no="MISSING" />
          {inboundDomainPresent && (
            <span className="ml-2 text-gray-500">{process.env.EMAIL_INBOUND_DOMAIN}</span>
          )}
        </Row>
        <Row label="RESEND_WEBHOOK_SECRET">
          <Badge ok={webhookSecretPresent} yes="present" no="MISSING" />
        </Row>
      </div>

      <div className="card mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Session
        </h2>
        <Row label="Logged-in email">{user.email ?? '—'}</Row>
        <Row label="isAdmin">
          <Badge ok={adminOk} yes="true" no="false" />
        </Row>
      </div>

      <div className="card mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Database Connectivity
        </h2>
        <Row label="SELECT 1 row from leads">
          <Badge ok={dbCheck.ok} yes="success" no="error" />
          {!dbCheck.ok && (
            <span className="ml-2 text-red-600 text-xs">{dbCheck.error}</span>
          )}
        </Row>
      </div>

      {(!urlPresent || !anonKeyPresent || !serviceKeyPresent || allowlist.length === 0 || !resendKeyPresent || !emailFromPresent || !inboundDomainPresent || !webhookSecretPresent) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <strong>Action required:</strong> One or more environment variables are missing.
          Add them in Vercel → Project Settings → Environment Variables, then redeploy.
        </div>
      )}
    </div>
  )
}
