import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getRequiredEnv } from '@/lib/env'

export async function updateSession(request: NextRequest) {
  // Validate required env vars early so misconfiguration surfaces immediately
  const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL')
  const supabaseAnonKey = getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

  // Generate a per-request nonce for Content-Security-Policy
  // crypto.randomUUID() is available in both Node.js and Edge runtimes
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  // Forward the current pathname and nonce as request headers so server
  // components can read them via next/headers without client-side access.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)
  requestHeaders.set('x-nonce', nonce)

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

  // Security headers — applied to every response
  supabaseResponse.headers.set('X-Frame-Options', 'DENY')
  supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff')
  supabaseResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  supabaseResponse.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  supabaseResponse.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  supabaseResponse.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      // nonce-based script policy — no unsafe-inline or unsafe-eval
      // 'strict-dynamic' trusts scripts loaded by the nonce-whitelisted scripts
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
      "style-src 'self' 'unsafe-inline'", // Tailwind requires inline styles
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.facebook.com https://*.facebook.net`,
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; ')
  )

  return supabaseResponse
}
