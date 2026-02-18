import { getAdminAllowlist } from '@/lib/env'

/**
 * Returns true if the given email is in the ADMIN_ALLOWLIST_EMAILS list.
 * If the allowlist is empty (env var not configured), no one is considered admin.
 */
export function isAdmin(email: string | undefined | null): boolean {
  if (!email) return false
  const allowlist = getAdminAllowlist()
  if (allowlist.length === 0) return false
  return allowlist.includes(email.toLowerCase())
}
