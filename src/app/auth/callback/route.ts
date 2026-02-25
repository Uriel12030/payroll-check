import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { getRequiredEnv } from '@/lib/env'

/**
 * OAuth callback handler — called by Supabase after Google redirects back.
 * Exchanges the one-time `code` for a session cookie, then sends the user to
 * /admin/leads (admin layout enforces isAdmin and redirects non-admins to
 * /admin/forbidden).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
      getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}/admin/leads`)
    }
  }

  // Code missing or exchange failed — send back to login.
  return NextResponse.redirect(`${origin}/admin/login?error=oauth`)
}
