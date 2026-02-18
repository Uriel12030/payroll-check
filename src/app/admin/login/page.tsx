import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/isAdmin'
import { redirect } from 'next/navigation'
import { LoginForm } from './LoginForm'
import { SignOutButton } from '@/components/admin/SignOutButton'

/**
 * Three possible states when arriving at /admin/login:
 *
 * 1. No session       → render the login form (normal flow)
 * 2. Session + admin  → redirect to /admin/leads
 * 3. Session + NOT admin → render "not authorized" message + sign-out button
 *                          (do NOT redirect — that would recreate the loop)
 */
export default async function AdminLoginPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    if (isAdmin(user.email)) {
      console.log(`[login] Admin session (${user.email}) → /admin/leads`)
      redirect('/admin/leads')
    }

    // Authenticated but not in the allowlist.
    // Rendering an error here (instead of redirecting) is the key fix:
    // any redirect from this page toward /admin/* would loop back here.
    console.log(`[login] Non-admin session (${user.email}) → showing not-authorized UI`)
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="max-w-sm w-full">
          <div className="text-center mb-8">
            <div className="font-bold text-xl text-blue-600">Payroll Check</div>
            <p className="text-sm text-gray-500 mt-1">Admin Panel</p>
          </div>
          <div className="card space-y-4">
            <h1 className="text-lg font-bold text-gray-900">אין הרשאה</h1>
            <p className="text-sm text-gray-600">
              החשבון{' '}
              <span className="font-mono text-gray-800">{user.email}</span>{' '}
              אינו מורשה לגשת לממשק הניהול.
            </p>
            <SignOutButton className="btn-secondary w-full" label="התנתק" />
          </div>
        </div>
      </div>
    )
  }

  console.log('[login] No session → showing login form')
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <div className="font-bold text-xl text-blue-600">Payroll Check</div>
          <p className="text-sm text-gray-500 mt-1">Admin Panel</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
