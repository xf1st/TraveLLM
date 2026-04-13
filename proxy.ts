import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'

// ─── Global API rate limit ────────────────────────────────────────────────────
const GLOBAL_API_LIMIT = 30      // requests
const GLOBAL_API_WINDOW = 60_000 // per minute

// ─── LLM-specific rate limit (tighter — protects AI budget) ──────────────────
const LLM_API_LIMIT  = 6         // 6 requests
const LLM_API_WINDOW = 60_000    // per minute

/** AI/LLM endpoints that need a tighter per-user limit. */
const LLM_PATHS = [
  '/api/gemini',
  '/api/deepseek',
  '/api/trip-assistant',
  '/api/guide-chat',
  '/api/modify-itinerary',
  '/api/enrich-trip',
]

/** Routes exempt from the global rate limit (public callbacks, webhooks). */
const API_RATE_LIMIT_SKIP = [
  '/api/admin',
  '/api/auth/',
  '/api/telegram/webhook',
  '/api/image',
  '/api/proxy-image',
]

// ─── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = new Set([
  'https://travellm.ru',
  'https://travellm.world',
  'https://admin.travellm.ru',
  'https://admin.travellm.world',
  ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : []),
])

function getRequestIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Locale detection ─────────────────────────────────────────────────────────
const CIS_LANGS = new Set(['ru', 'uk', 'be', 'kk', 'uz', 'ky', 'tg', 'az', 'hy', 'ka', 'tk'])
const LOCALE_COOKIE = 'NEXT_LOCALE'
const LOCALE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

function detectLocale(request: NextRequest, host: string): 'ru' | 'en' {
  const saved = request.cookies.get(LOCALE_COOKIE)?.value
  if (saved === 'ru' || saved === 'en') return saved

  // travellm.world → English-first
  if (host === 'travellm.world' || host.endsWith('.travellm.world')) return 'en'

  const acceptLang = request.headers.get('accept-language') ?? ''
  const langs = acceptLang.split(',').map(s => s.split(';')[0].trim().toLowerCase().split('-')[0])
  for (const lang of langs) {
    if (CIS_LANGS.has(lang)) return 'ru'
    if (lang === 'en') return 'en'
  }

  // .ru domain → Russian by default
  return host.endsWith('.ru') ? 'ru' : 'en'
}
// ──────────────────────────────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host') || ''
  const isAdminSubdomain = host.startsWith('admin.')

  // ─── CVE-2025-29927 mitigation ────────────────────────────────────────────
  // Block external requests that carry the internal Next.js middleware-bypass
  // header. Attackers can use it to skip auth/rate-limit middleware entirely.
  if (request.headers.has('x-middleware-subrequest')) {
    return new NextResponse(null, { status: 403 })
  }
  // ──────────────────────────────────────────────────────────────────────────

  // ─── DEV MODE (opt-in): skip Supabase auth in proxy for faster local dev ───
  // By default development uses the same proxy checks as production.
  // Set TRAVELLM_DEV_SKIP_PROXY_AUTH=1 in .env.local to restore the old fast path.
  const isAdminApiRoute = pathname.startsWith('/api/admin')
  const skipDevProxyAuth =
    process.env.NODE_ENV === 'development' &&
    process.env.TRAVELLM_DEV_SKIP_PROXY_AUTH === '1'
  if (skipDevProxyAuth && !isAdminSubdomain && !isAdminApiRoute) {
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
      pathname.startsWith('/maintenance') ||
      pathname.startsWith('/terms') ||
      pathname.startsWith('/privacy') ||
      pathname.startsWith('/support')

    if (isFullyPublic) return NextResponse.next()
  }

  // Next.js internals — always pass through
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/_vercel') ||
    pathname === '/404'
  ) {
    return NextResponse.next()
  }

  // API routes — rate limits + CORS, then pass through
  if (!isAdminSubdomain && pathname.startsWith('/api')) {
    const isSkipped = API_RATE_LIMIT_SKIP.some(p => pathname.startsWith(p))

    if (!isSkipped) {
      // Read session from cookie — no network call, just cookie parsing
      const tempSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } },
      )
      const { data: { session } } = await tempSupabase.auth.getSession()

      // Rate limit by user ID (from session cookie) or IP for unauthenticated
      const rlKey = session?.user?.id
        ? `user:${session.user.id}`
        : `ip:${getRequestIp(request)}`

      // 1. Global rate limit (30 req/min for all API)
      const rl = checkRateLimit(rlKey, 'global-api', GLOBAL_API_LIMIT, GLOBAL_API_WINDOW)
      if (!rl.allowed) {
        const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000)
        return new NextResponse(
          JSON.stringify({ error: 'Слишком много запросов. Подождите немного.', code: 'RATE_LIMIT' }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(retryAfter),
              'X-RateLimit-Remaining': '0',
            },
          },
        )
      }

      // 2. LLM-specific rate limit (6 req/min) — prevents AI budget drain
      if (LLM_PATHS.some(p => pathname.startsWith(p))) {
        const llmRl = checkRateLimit(rlKey, 'llm-api', LLM_API_LIMIT, LLM_API_WINDOW)
        if (!llmRl.allowed) {
          const retryAfter = Math.ceil((llmRl.resetAt - Date.now()) / 1000)
          return new NextResponse(
            JSON.stringify({ error: 'Превышен лимит запросов к AI. Подождите немного.', code: 'LLM_RATE_LIMIT' }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'Retry-After': String(retryAfter),
                'X-RateLimit-Remaining': '0',
              },
            },
          )
        }
      }
    }

    // CORS — restrict to known app origins only
    const origin = request.headers.get('origin') ?? ''
    const corsOrigin = ALLOWED_ORIGINS.has(origin) ? origin : null

    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: {
          ...(corsOrigin ? { 'Access-Control-Allow-Origin': corsOrigin, 'Vary': 'Origin' } : {}),
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      })
    }

    const apiResponse = NextResponse.next()
    if (corsOrigin) {
      apiResponse.headers.set('Access-Control-Allow-Origin', corsOrigin)
      apiResponse.headers.set('Vary', 'Origin')
    }
    return apiResponse
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

  // ─── Maintenance mode ─────────────────────────────────────────────────────
  // Only check on non-API, non-maintenance routes to avoid overhead
  const isMaintPath = pathname === '/maintenance'
  const isApiRoute = pathname.startsWith('/api')
  if (!isMaintPath && !isApiRoute) {
    const { data: appSettings } = await supabase
      .from('app_settings')
      .select('maintenance_mode, maintenance_allow_admin_bypass')
      .single()

    if (appSettings?.maintenance_mode) {
      let bypassAllowed = false

      if (appSettings.maintenance_allow_admin_bypass) {
        // Need verified user — check role
        const { data: { user: maintUser } } = await supabase.auth.getUser()
        if (maintUser) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', maintUser.id)
            .single()
          bypassAllowed = prof?.role === 'admin' || prof?.role === 'super_admin'
        }
      }

      if (!bypassAllowed) {
        const url = request.nextUrl.clone()
        url.pathname = '/maintenance'
        return NextResponse.redirect(url)
      }
    }
  }
  // ──────────────────────────────────────────────────────────────────────────

  // ─── Regular routes ───────────────────────────────────────────────────────
  // Use getSession() — reads from cookie, no network round-trip (~0ms).
  // We only need to know *if* a user exists to guard protected paths.
  // Actual data is protected by Supabase RLS; UserAccessGuard handles
  // the full_blocked check client-side.
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null

  const protectedPaths = [
    '/dashboard',
    '/plan',
    '/trips',
    '/trip',
    '/results',
    '/onboarding',
    '/guide',
    '/reels',
  ]
  const isOwnProfile = pathname === '/profile' || pathname.startsWith('/profile?') || pathname.startsWith('/profile/')
  const isPublicProfilePath = /^\/profile\/[^/]+$/.test(pathname)
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path)) || (isOwnProfile && !isPublicProfilePath)

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Set locale cookie if not present
  if (!request.cookies.has(LOCALE_COOKIE)) {
    response.cookies.set(LOCALE_COOKIE, detectLocale(request, host), {
      maxAge: LOCALE_MAX_AGE,
      path: '/',
      sameSite: 'lax',
    })
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}
