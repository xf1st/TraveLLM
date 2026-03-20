import { NextRequest, NextResponse } from 'next/server';

// Languages whose primary speakers should get Russian UI + RUB pricing
const CIS_LANGS = new Set(['ru', 'uk', 'be', 'kk', 'uz', 'ky', 'tg', 'az', 'hy', 'ka', 'tk']);

const COOKIE_NAME = 'NEXT_LOCALE';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/** travellm.world and its subdomains are English-first */
function isWorldDomain(req: NextRequest): boolean {
  const host = req.headers.get('host') ?? '';
  return host === 'travellm.world' || host.endsWith('.travellm.world');
}

function detectLocale(req: NextRequest): 'ru' | 'en' {
  // 1. Respect saved preference
  const saved = req.cookies.get(COOKIE_NAME)?.value;
  if (saved === 'ru' || saved === 'en') return saved;

  // 2. travellm.world is always English by default
  if (isWorldDomain(req)) return 'en';

  // 3. Auto-detect from Accept-Language header
  const acceptLang = req.headers.get('accept-language') ?? '';
  const langs = acceptLang
    .split(',')
    .map((s) => s.split(';')[0].trim().toLowerCase().split('-')[0]);

  for (const lang of langs) {
    if (CIS_LANGS.has(lang)) return 'ru';
    if (lang === 'en') return 'en';
  }

  // 4. Default: .ru → Russian, everything else → English
  const host = req.headers.get('host') ?? '';
  return host.endsWith('.ru') ? 'ru' : 'en';
}

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Set locale cookie on first visit (or if not set)
  if (!req.cookies.has(COOKIE_NAME)) {
    const locale = detectLocale(req);
    res.cookies.set(COOKIE_NAME, locale, {
      maxAge: COOKIE_MAX_AGE,
      path: '/',
      sameSite: 'lax',
    });
  }

  return res;
}

export const config = {
  // Run on all routes except API, static files, admin (RU only)
  matcher: ['/((?!api|_next|_vercel|admin|favicon|apple-icon|.*\\..*).*)'],
};
