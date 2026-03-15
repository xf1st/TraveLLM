import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host') || ''
  const isAdminSubdomain = host.startsWith('admin.')

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
    request: {
      headers: request.headers,
    },
  })

  // Create Supabase client (needed for auth checks below)
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

  // Admin subdomain — requires verified user via getUser() (JWT network validation for security)
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

  // Regular routes — getUser() validates JWT with Supabase (secure)
  const { data: { user } } = await supabase.auth.getUser()

  // Protected Routes for Main Domain
  // Note: /profile/[username] is public (user profiles), only /profile itself is protected
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

  // Site Access Gate — redirect to /blocked
  if (user) {
    const bypassPaths = ['/auth', '/blocked', '/waitlist', '/onboarding', '/terms', '/privacy', '/support']
    const isBypassPath = bypassPaths.some(path => pathname.startsWith(path))

    if (!isBypassPath) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('site_access, access_mode')
        .eq('id', user.id)
        .single()

      if (profile?.access_mode === 'full_blocked') {
        const url = request.nextUrl.clone()
        url.pathname = '/blocked'
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
     * - public folder files (with extensions)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}
