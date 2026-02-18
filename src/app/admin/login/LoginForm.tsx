'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('אימייל או סיסמה שגויים')
      setLoading(false)
      return
    }

    router.push('/admin/leads')
    router.refresh()
  }

  return (
    <div className="card">
      <h1 className="text-lg font-bold text-gray-900 mb-6">כניסת מנהל</h1>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="form-label">אימייל</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-input"
            placeholder="admin@example.com"
            dir="ltr"
            required
          />
        </div>

        <div>
          <label className="form-label">סיסמה</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input"
            placeholder="••••••••"
            dir="ltr"
            required
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">
            {error}
          </div>
        )}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'מתחבר...' : 'כניסה'}
        </button>
      </form>
    </div>
  )
}
