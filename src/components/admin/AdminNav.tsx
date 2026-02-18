'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'

interface AdminNavProps {
  userEmail: string
}

export function AdminNav({ userEmail }: AdminNavProps) {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/admin/leads" className="font-bold text-blue-600 text-lg">
            Payroll Check
          </Link>
          <nav className="flex items-center gap-4 text-sm text-gray-600">
            <Link href="/admin/leads" className="hover:text-blue-600 transition-colors">
              פניות
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-500 hidden md:block">{userEmail}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-gray-600 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>יציאה</span>
          </button>
        </div>
      </div>
    </header>
  )
}
