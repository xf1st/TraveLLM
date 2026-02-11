import type React from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { Header } from "@/components/header"
import type { Metadata } from "next"
import { Rubik, JetBrains_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/sonner"
import { NotificationPrompt } from "@/components/NotificationPrompt"
import { CookieConsent } from "@/components/CookieConsent"
import { MaintenanceGuard } from "@/components/admin/maintenance-guard"
import { UserAccessGuard } from "@/components/admin/user-access-guard"
import Script from "next/script"
import "./globals.css"
import { AuthProvider } from "@/components/auth-provider"

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

export const metadata: Metadata = {
  title: "TraveLM — Ваш умный ИИ-гид для идеальных путешествий",
  description: "Создавайте персональные маршруты за секунды с помощью ИИ. TraveLM поможет спланировать поездку, найти скрытые места и сэкономить время.",
  keywords: ["ИИ гид", "планировщик путешествий", "создать маршрут", "умный путеводитель", "travel ai", "отпуск 2024", "куда поехать"],
  verification: {
    yandex: "7b52a6c68729b348"
  },
  openGraph: {
    title: "TraveLM — Ваш умный ИИ-гид по миру",
    description: "Персонализированные маршруты и умные советы для ваших приключений.",
    url: "https://travelmind.ai",
    siteName: "TraveLM",
    locale: "ru_RU",
    type: "website",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${rubik.variable} ${jetbrainsMono.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <MaintenanceGuard>
              <UserAccessGuard>
                {children}
              </UserAccessGuard>
            </MaintenanceGuard>
          </AuthProvider>
          {/* Notification & Cookie System */}
          <NotificationPrompt />
          <CookieConsent />
          <Toaster position="top-center" />
          <Analytics />
        </ThemeProvider>

        {/* Ownership Verification Script */}
        <Script
          id="emrld-verification"
          strategy="afterInteractive"
          data-noptimize="1"
          data-cfasync="false"
          data-wpfc-render="false"
        >
          {`
            (function () {
                var script = document.createElement("script");
                script.async = 1;
                script.src = 'https://emrld.ltd/NDkyMjc2.js?t=492276';
                document.head.appendChild(script);
            })();
          `}
        </Script>

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
      </body>
    </html>
  )
}
