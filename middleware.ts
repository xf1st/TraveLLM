import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 1. Create Supabase Client and Refresh Session
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // This refreshes the session if needed
  const { data: { user } } = await supabase.auth.getUser()

  // 2. Existing Admin Subdomain Logic
  const host = request.headers.get('host') || ''
  const isAdminSubdomain = host.startsWith('admin.')
  const pathname = request.nextUrl.pathname

  if (isAdminSubdomain) {
    if (!user) {
      // Not logged in - redirect to main domain auth
      const mainDomain = host.replace('admin.', '')
      return NextResponse.redirect(`https://${mainDomain}/auth`)
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

    if (!isAdmin) {
      // Not admin - redirect to main domain
      const mainDomain = host.replace('admin.', '')
      return NextResponse.redirect(`https://${mainDomain}`)
    }

    // Admin accessing admin subdomain - redirect to /admin if not already there
    if (pathname === '/' || !pathname.startsWith('/admin')) {
      // Clone the url to keep search params if needed, but here just /admin
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }
  }

  // 3. Protected Routes for Main Domain
  const protectedPaths = ['/dashboard', '/plan', '/results', '/profile', '/onboarding', '/guide']
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    url.searchParams.set('next', pathname) // Optional: redirect back after login
    return NextResponse.redirect(url)
  }

  // 4. Site Access Gate — redirect to /waitlist or /blocked
  if (user) {
    // We don't want to run this for /auth, /blocked, /waitlist or static/api routes (api already excluded in matcher)
    const bypassPaths = ['/auth', '/blocked', '/waitlist', '/onboarding', '/terms', '/privacy', '/support']
    const isBypassPath = bypassPaths.some(path => pathname.startsWith(path))

    if (!isBypassPath) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('site_access, access_mode')
        .eq('id', user.id)
        .single()

      // High priority: Global block
      if (profile?.access_mode === 'full_blocked') {
        const url = request.nextUrl.clone()
        url.pathname = '/blocked'
        return NextResponse.redirect(url)
      }

      // Site access gate: no profile OR site_access=false → /waitlist (protected paths only)
      if (isProtectedPath && (!profile || profile.site_access === false)) {
        const url = request.nextUrl.clone()
        url.pathname = '/waitlist'
        return NextResponse.redirect(url)
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)',
  ],
}
