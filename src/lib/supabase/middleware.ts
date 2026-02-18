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

  // Protect /admin/* routes — but NEVER redirect /admin/login to itself.
  // /admin/login and /admin/logout must be excluded from this guard to avoid
  // ERR_TOO_MANY_REDIRECTS.
  const isAdminLoginPage = pathname === '/admin/login'
  const isAdminRoute = pathname.startsWith('/admin')

  if (isAdminRoute && !isAdminLoginPage && !user) {
    console.log(`[middleware] Unauthenticated access to ${pathname} → redirecting to /admin/login`)
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    return NextResponse.redirect(url)
  }

  // Redirect already-authenticated users away from the login page
  if (isAdminLoginPage && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/leads'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
