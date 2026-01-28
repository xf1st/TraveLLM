import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  const pathname = request.nextUrl.pathname

  // Check if accessing admin subdomain
  const isAdminSubdomain = host.startsWith('admin.')

  if (isAdminSubdomain) {
    // Get the auth token from cookies
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      // Redirect to main domain if Supabase not configured
      const mainDomain = host.replace('admin.', '')
      return NextResponse.redirect(`https://${mainDomain}`)
    }

    // Get auth token from cookie
    const authCookie = request.cookies.get('sb-access-token')?.value ||
                       request.cookies.get('supabase-auth-token')?.value

    if (!authCookie) {
      // Not logged in - redirect to main domain
      const mainDomain = host.replace('admin.', '')
      return NextResponse.redirect(`https://${mainDomain}/login`)
    }

    try {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: {
          headers: {
            Authorization: `Bearer ${authCookie}`
          }
        }
      })

      const { data: { user } } = await supabase.auth.getUser(authCookie)

      if (!user) {
        const mainDomain = host.replace('admin.', '')
        return NextResponse.redirect(`https://${mainDomain}/login`)
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
        return NextResponse.redirect(new URL('/admin', request.url))
      }
    } catch (error) {
      console.error('Middleware auth error:', error)
      const mainDomain = host.replace('admin.', '')
      return NextResponse.redirect(`https://${mainDomain}`)
    }
  }

  return NextResponse.next()
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
