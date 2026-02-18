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
  // Read the pathname forwarded by middleware so we can skip the auth
  // redirect on the login page itself — otherwise the layout would loop:
  // /admin/login → layout sees no user → redirect /admin/login → repeat.
  const headersList = headers()
  const pathname = headersList.get('x-pathname') ?? ''
  const isLoginPage = pathname === '/admin/login'

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isLoginPage) {
    if (!user) {
      console.log(`[AdminLayout] No session for ${pathname} → /admin/login`)
      redirect('/admin/login')
    }
    if (!isAdmin(user.email)) {
      console.log(`[AdminLayout] Non-admin user ${user.email} → /admin/login`)
      redirect('/admin/login')
    }
  }

  // Login page renders without the admin chrome
  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNav userEmail={user!.email ?? ''} />
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
