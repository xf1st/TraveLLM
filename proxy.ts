import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host') || ''
  const isAdminSubdomain = host.startsWith('admin.')

  // ─── DEV MODE: skip all Supabase auth checks ──────────────────────────────
  // In development, every getUser() + profile select = ~9-18s through proxy.
  // Auth is enforced client-side by Supabase React hooks anyway.
  if (process.env.NODE_ENV === 'development' && !isAdminSubdomain) {
    return NextResponse.next()
  }
  // ──────────────────────────────────────────────────────────────────────────

  // Early-return for fully public routes — no Supabase call needed at all
  if (!isAdminSubdomain) {
    const isFullyPublic =
      pathname === '/' ||
      pathname.startsWith('/news') ||
      pathname.startsWith('/auth') ||
      pathname.startsWith('/waitlist') ||
      pathname.startsWith('/blocked') ||
      pathname.startsWith('/terms') ||
      pathname.startsWith('/privacy') ||
      pathname.startsWith('/support')

    if (isFullyPublic) return NextResponse.next()
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: request.headers } })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // ─── ADMIN subdomain ──────────────────────────────────────────────────────
  // Requires verified JWT via getUser() — security-critical, no shortcuts
  if (isAdminSubdomain) {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      const mainDomain = host.replace('admin.', '')
      return NextResponse.redirect(`https://${mainDomain}/auth`)
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

    if (!isAdmin) {
      const mainDomain = host.replace('admin.', '')
      return NextResponse.redirect(`https://${mainDomain}`)
    }

    if (pathname === '/' || !pathname.startsWith('/admin')) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }

    return response
  }

  // ─── Regular routes ───────────────────────────────────────────────────────
  // Use getSession() — reads from cookie, no network round-trip (~0ms).
  // We only need to know *if* a user exists to guard protected paths.
  // Actual data is protected by Supabase RLS; UserAccessGuard handles
  // the full_blocked check client-side.
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null

  const protectedPaths = ['/dashboard', '/plan', '/trips', '/trip', '/results', '/onboarding', '/guide']
  const isOwnProfile = pathname === '/profile' || pathname.startsWith('/profile?') || pathname.startsWith('/profile/')
  const isPublicProfilePath = /^\/profile\/[^/]+$/.test(pathname)
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path)) || (isOwnProfile && !isPublicProfilePath)

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}
