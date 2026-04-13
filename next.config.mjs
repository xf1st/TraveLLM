import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// ─── Content-Security-Policy ──────────────────────────────────────────────────
// • script-src: 'unsafe-inline' required for Yandex Metrika inline snippet and
//   Next.js runtime chunks; 'unsafe-eval' for Three.js/OGL shader compilation.
// • img-src https: — travel content loads images from arbitrary HTTPS sources.
// • connect-src: Supabase (REST + Realtime WS) + Yandex Metrika analytics.
// • next/font/google self-hosts fonts at build time → no external font-src needed.
// ─────────────────────────────────────────────────────────────────────────────
const ContentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' mc.yandex.ru *.travelpayouts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' *.supabase.co wss://*.supabase.co mc.yandex.ru *.travelpayouts.com",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join('; ')

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
    ],
  },
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: false,
  },

  // Required in Next.js 16 where Turbopack is the default.
  turbopack: {},

  async redirects() {
    return [{ source: '/trip/join/:path*', destination: '/trips', permanent: false }];
  },

  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options',             value: 'nosniff' },
          { key: 'X-Frame-Options',                     value: 'DENY' },
          { key: 'Strict-Transport-Security',           value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'Referrer-Policy',                     value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection',                    value: '1; mode=block' },
          { key: 'X-DNS-Prefetch-Control',              value: 'on' },
          { key: 'X-Permitted-Cross-Domain-Policies',   value: 'none' },
          { key: 'Content-Security-Policy',             value: ContentSecurityPolicy },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), payment=(), usb=(), interest-cohort=(), display-capture=(), fullscreen=(self)',
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
