import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/isAdmin'
import { redirect } from 'next/navigation'
import { AdminNav } from '@/components/admin/AdminNav'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Read the pathname forwarded by middleware so we can skip auth guards on
  // pages that are intentionally public within /admin/*.
  const headersList = headers()
  const pathname = headersList.get('x-pathname') ?? ''

  // These pages must always be reachable to avoid redirect loops:
  // /admin/login    → server component with its own 3-state session logic
  // /admin/forbidden → shown to authenticated-but-not-admin users
  const isLoginPage = pathname === '/admin/login'
  const isForbiddenPage = pathname === '/admin/forbidden'
  const isUnguarded = isLoginPage || isForbiddenPage

  // Unguarded pages render without the admin chrome and without auth checks.
  if (isUnguarded) {
    return <>{children}</>
  }

  // For all other /admin/* routes: require a valid session AND admin status.
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.log(`[AdminLayout] No session for ${pathname} → /admin/login`)
    redirect('/admin/login')
  }

  if (!isAdmin(user.email)) {
    // Redirect to /admin/forbidden, NOT /admin/login.
    // Redirecting a non-admin to /admin/login would loop because the login
    // page's middleware used to redirect authenticated users back to /admin/leads,
    // which loops back here. /admin/forbidden breaks that cycle.
    console.log(`[AdminLayout] Non-admin ${user.email} at ${pathname} → /admin/forbidden`)
    redirect('/admin/forbidden')
  }

  console.log(`[AdminLayout] Admin ok: ${user.email} at ${pathname}`)

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNav userEmail={user!.email ?? ''} />
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
