import type React from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { Header } from "@/components/header"
import type { Metadata, Viewport } from "next"
import { Rubik, JetBrains_Mono, Space_Grotesk, Plus_Jakarta_Sans } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { GuardsWrapper } from "@/components/admin/guards-wrapper"
import { ClientModals } from "@/components/client-modals"
import { PwaRegister } from "@/components/pwa-register"
import { PwaInstallBanner } from "@/components/pwa-install-banner"
import { AuthProvider } from "@/components/auth-provider"
import { ChatProvider } from "@/lib/context/chat-context"
import { TripGenerationProvider } from "@/lib/context/trip-generation-context"
import { GlobalLoader } from "@/components/GlobalLoader"
import { DriveLegalLabelRelocator } from "@/components/partners/DriveLegalLabelRelocator"
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

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
})

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  /* Safari: tone outside web content / overscroll closer to app bg (less harsh black band) */
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0e14" },
  ],
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
      ...(process.env.GOOGLE_SITE_VERIFICATION
        ? { google: process.env.GOOGLE_SITE_VERIFICATION }
        : {}),
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
    twitter: {
      card: "summary_large_image",
      title: meta.ogTitle ?? "TraveLLM",
      description: meta.ogDescription ?? "",
    },
    applicationName: "TraveLLM",
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "TraveLLM",
    },
    formatDetection: {
      telephone: false,
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
    <html
      lang={getHtmlLang(locale)}
      className="bg-background"
      suppressHydrationWarning
    >
      <head>
        {/* material-symbols loaded locally via npm */}
      </head>
      <body
        className={`${rubik.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable} ${plusJakartaSans.variable} font-sans antialiased min-h-dvh bg-background overflow-x-hidden`}
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
                <TripGenerationProvider>
                <GuardsWrapper>
                  <ErrorBoundary>
                    {children}
                  </ErrorBoundary>
                  <DriveLegalLabelRelocator />
                </GuardsWrapper>
                <PwaRegister />
                <PwaInstallBanner />
                {/* Non-critical overlays — lazy loaded to keep framer-motion out of critical path */}
                <ClientModals />
                </TripGenerationProvider>
              </ChatProvider>
            </AuthProvider>
            <Toaster />
            <GlobalLoader />
          </ThemeProvider>
        </NextIntlClientProvider>

        {/* Yandex.Metrika counter */}
        <Script src="/scripts/yandex-metrika.js" strategy="afterInteractive" />
        <noscript>
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://mc.yandex.ru/watch/106450259"
              style={{ position: 'absolute', left: '-9999px' }}
              alt=""
            />
          </div>
        </noscript>

        {/* Travelpayouts Drive: URL из сниппета (script.src), без WP-атрибутов */}
        {process.env.NEXT_PUBLIC_TRAVELPAYOUTS_DRIVE_SCRIPT_URL ? (
          <Script
            id="travelpayouts-drive-loader"
            src={process.env.NEXT_PUBLIC_TRAVELPAYOUTS_DRIVE_SCRIPT_URL}
            strategy="afterInteractive"
          />
        ) : null}
      </body>
    </html>
  )
}
