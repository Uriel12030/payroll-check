import { SignOutButton } from '@/components/admin/SignOutButton'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'גישה נדחתה – Admin | Payroll Check',
}

/**
 * Shown when a user has a valid Supabase session but their email is not in
 * ADMIN_ALLOWLIST_EMAILS. AdminLayout redirects non-admin authenticated users
 * here instead of /admin/login to break the redirect loop.
 */
export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <div className="font-bold text-xl text-blue-600">Payroll Check</div>
          <p className="text-sm text-gray-500 mt-1">Admin Panel</p>
        </div>
        <div className="card space-y-4">
          <h1 className="text-lg font-bold text-gray-900">גישה נדחתה</h1>
          <p className="text-sm text-gray-600">
            אתה מחובר אך אינך מורשה לגשת לממשק הניהול. אנא פנה למנהל המערכת
            להוספת כתובת האימייל שלך לרשימת המורשים.
          </p>
          <SignOutButton className="btn-secondary w-full" label="התנתק" />
        </div>
      </div>
    </div>
  )
}
