import type React from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { Header } from "@/components/header"
import type { Metadata } from "next"
import { Rubik, JetBrains_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

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
  title: "TraveLM — Ваш умный ИИ-гид по миру",
  description: "Персонализированные маршруты, умные советы и незабываемые приключения с TraveLM AI.",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/logo-main.svg",
        type: "image/svg+xml",
      },
    ],
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
          {children}
          <Toaster position="top-center" richColors />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
