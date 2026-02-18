'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface SignOutButtonProps {
  className?: string
  label?: string
}

export function SignOutButton({
  className = 'btn-secondary',
  label = 'התנתק',
}: SignOutButtonProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <button onClick={handleSignOut} className={className}>
      {label}
    </button>
  )
}
