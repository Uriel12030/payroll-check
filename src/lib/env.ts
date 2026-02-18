/**
 * Server-side environment variable validation.
 * Import this in server components, server actions, and middleware only.
 * Never import in client components.
 */

export function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `[Payroll Check] Missing required environment variable "${name}". ` +
        `Add it to .env.local (local dev) or Vercel Project Settings → Environment Variables (production).`
    )
  }
  return value
}

/**
 * Returns the admin allowlist from ADMIN_ALLOWLIST_EMAILS (comma-separated).
 * If the env var is not set or empty, returns an empty array → no one is admin.
 */
export function getAdminAllowlist(): string[] {
  const raw = process.env.ADMIN_ALLOWLIST_EMAILS ?? ''
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}
