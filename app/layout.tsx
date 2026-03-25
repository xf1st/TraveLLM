import type React from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { Header } from "@/components/header"
import type { Metadata, Viewport } from "next"
import { Rubik, JetBrains_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/sonner"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { GuardsWrapper } from "@/components/admin/guards-wrapper"
import { ClientModals } from "@/components/client-modals"
import { AuthProvider } from "@/components/auth-provider"
import { ChatProvider } from "@/lib/context/chat-context"
import { GlobalLoader } from "@/components/GlobalLoader"
import { NextIntlClientProvider } from "next-intl"
import { getLocale, getMessages } from "next-intl/server"
import { getHtmlLang, getOgLocale, type AppLocale } from "@/lib/locale-utils"
import { headers } from "next/headers"
import Script from "next/script"
import "./globals.css"
import "material-symbols/outlined.css"

const rubik = Rubik({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-mono",
  display: "swap",
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as AppLocale
  const messages = await getMessages()
  const meta = (messages as any).meta ?? {}
  const headersList = await headers()
  const host = headersList.get('host') ?? 'travellm.ru'
  const siteUrl = `https://${host}`

  const isWorldDomain = host === 'travellm.world' || host.endsWith('.travellm.world')
  const altUrl = isWorldDomain ? 'https://travellm.ru' : 'https://travellm.world'

  return {
    title: meta.title ?? "TraveLLM — AI Travel Assistant",
    description: meta.description ?? "Plan your perfect trip with AI",
    keywords: meta.keywords ? meta.keywords.split(", ") : ["AI travel assistant", "trip planner"],
    verification: {
      yandex: "7b52a6c68729b348",
    },
    alternates: {
      canonical: siteUrl,
      languages: {
        'ru': 'https://travellm.ru',
        'en': 'https://travellm.world',
        'x-default': 'https://travellm.world',
      },
    },
    openGraph: {
      title: meta.ogTitle ?? "TraveLLM",
      description: meta.ogDescription ?? "",
      url: siteUrl,
      siteName: "TraveLLM",
      locale: getOgLocale(locale),
      type: "website",
    },
    icons: {
      icon: "/favicon.ico",
      shortcut: "/favicon.ico",
      apple: "/apple-icon.png",
    },
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = (await getLocale()) as AppLocale
  const messages = await getMessages()

  return (
    <html lang={getHtmlLang(locale)} suppressHydrationWarning>
      <head>
        {/* material-symbols loaded locally via npm */}
      </head>
      <body
        className={`${rubik.variable} ${jetbrainsMono.variable} font-sans antialiased min-h-dvh bg-background overflow-x-hidden`}
        suppressHydrationWarning
      >
        <NextIntlClientProvider messages={messages} locale={locale}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider>
              <ChatProvider>
                <GuardsWrapper>
                  <ErrorBoundary>
                    {children}
                  </ErrorBoundary>
                </GuardsWrapper>
                {/* Non-critical overlays — lazy loaded to keep framer-motion out of critical path */}
                <ClientModals />
              </ChatProvider>
            </AuthProvider>
            <Toaster />
            <Analytics />
            <GlobalLoader />
          </ThemeProvider>
        </NextIntlClientProvider>

        {/* Yandex.Metrika counter */}
        <Script id="yandex-metrika" strategy="afterInteractive">
          {`
            (function(m,e,t,r,i,k,a){
                m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
                m[i].l=1*new Date();
                for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
                k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
            })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=106450259', 'ym');

            ym(106450259, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
          `}
        </Script>
        <noscript>
          <div>
            <img
              src="https://mc.yandex.ru/watch/106450259"
              style={{ position: 'absolute', left: '-9999px' }}
              alt=""
            />
          </div>
        </noscript>

        {/* Travelpayouts Drive: URL из сниппета (script.src), без WP-атрибутов */}
        {process.env.NEXT_PUBLIC_TRAVELPAYOUTS_DRIVE_SCRIPT_URL ? (
          <Script id="travelpayouts-drive-loader" strategy="afterInteractive">
            {`(function(){var s=document.createElement("script");s.async=1;s.src=${JSON.stringify(
              process.env.NEXT_PUBLIC_TRAVELPAYOUTS_DRIVE_SCRIPT_URL
            )};document.head.appendChild(s);})();`}
          </Script>
        ) : null}
      </body>
    </html>
  )
}
