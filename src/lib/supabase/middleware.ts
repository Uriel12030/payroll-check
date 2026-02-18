import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getRequiredEnv } from '@/lib/env'

export async function updateSession(request: NextRequest) {
  // Validate required env vars early so misconfiguration surfaces immediately
  const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL')
  const supabaseAnonKey = getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

  // Forward the current pathname as a request header so server components
  // (e.g. AdminLayout) can read it without client-side access.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        supabaseResponse = NextResponse.next({
          request: { headers: requestHeaders },
        })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Pages always reachable without a session — never redirect away from these.
  // /admin/login  → server component handles 3 states: no-session / non-admin / admin
  // /admin/forbidden → shown to authenticated-but-not-admin users
  const isAdminLoginPage = pathname === '/admin/login'
  const isAdminForbiddenPage = pathname === '/admin/forbidden'
  const isAdminRoute = pathname.startsWith('/admin')

  // Only redirect unauthenticated users away from protected admin routes.
  if (isAdminRoute && !isAdminLoginPage && !isAdminForbiddenPage && !user) {
    console.log(`[middleware] No session for ${pathname} → /admin/login`)
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    return NextResponse.redirect(url)
  }

  // NOTE: Do NOT redirect authenticated users away from /admin/login here.
  // The login page is a server component that checks session + admin status
  // and handles all three cases: admin → /admin/leads, non-admin → show error,
  // no session → show form. A middleware redirect here would bypass that logic
  // and recreate the loop for non-admin users.

  return supabaseResponse
}
