"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { X, Download, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { appToast as toast } from "@/components/ui/sonner"

const STORAGE_KEY = "travellm_pwa_install_banner_dismissed_at"
const SESSION_KEY = "travellm_pwa_install_banner_shown"
const DISMISS_DAYS = 14

type BannerMode = "ios" | "install" | "androidManual" | null

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return true
  if (window.matchMedia("(display-mode: standalone)").matches) return true
  if ((window.navigator as unknown as { standalone?: boolean }).standalone === true) return true
  return false
}

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return true
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1
}

function isAndroidMobile(): boolean {
  if (typeof navigator === "undefined") return false
  return /Android/i.test(navigator.userAgent) && /Mobile/i.test(navigator.userAgent)
}

function shouldHidePath(pathname: string): boolean {
  if (pathname.startsWith("/auth")) return true
  if (pathname.startsWith("/admin")) return true
  if (pathname === "/maintenance" || pathname === "/blocked") return true
  return false
}

/** Matches `MobileBottomNav` — tab bar hidden → sit lower on screen */
function hasMobileBottomNav(pathname: string): boolean {
  if (pathname === "/auth" || pathname === "/landing" || pathname === "/") return false
  return true
}

function wasDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const t = parseInt(raw, 10)
    if (Number.isNaN(t)) return false
    const days = (Date.now() - t) / (86400 * 1000)
    return days < DISMISS_DAYS
  } catch {
    return false
  }
}

export function PwaInstallBanner() {
  const t = useTranslations("pwaBanner")
  const pathname = usePathname()
  const [mode, setMode] = useState<BannerMode>(null)
  const [mounted, setMounted] = useState(false)
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null)
  const androidHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dismiss = useCallback(() => {
    setMode(null)
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()))
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (typeof window === "undefined") return

    const clearAndroidTimer = () => {
      if (androidHintTimerRef.current) {
        clearTimeout(androidHintTimerRef.current)
        androidHintTimerRef.current = null
      }
    }

    if (shouldHidePath(pathname)) {
      setMode(null)
      clearAndroidTimer()
      return
    }

    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") return
    if (isStandalone()) return
    if (wasDismissedRecently()) return
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return
    } catch {
      /* ignore */
    }

    if (isIosDevice()) {
      setMode("ios")
      try { sessionStorage.setItem(SESSION_KEY, "1") } catch { /* ignore */ }
      return
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      deferredRef.current = e as BeforeInstallPromptEvent
      setMode("install")
      try { sessionStorage.setItem(SESSION_KEY, "1") } catch { /* ignore */ }
      if (androidHintTimerRef.current) {
        clearTimeout(androidHintTimerRef.current)
        androidHintTimerRef.current = null
      }
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall)

    if (isAndroidMobile()) {
      androidHintTimerRef.current = setTimeout(() => {
        if (deferredRef.current) return
        setMode((m) => (m === "install" ? "install" : "androidManual"))
        try { sessionStorage.setItem(SESSION_KEY, "1") } catch { /* ignore */ }
      }, 5000)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall)
      clearAndroidTimer()
    }
  }, [mounted, pathname])

  const handleInstallClick = async () => {
    const ev = deferredRef.current
    if (!ev) return
    try {
      await ev.prompt()
      const { outcome } = await ev.userChoice
      deferredRef.current = null
      if (outcome === "accepted") {
        toast.success(t("toastInstalled"))
        setMode(null)
      }
    } catch {
      toast.error(t("toastFailed"))
    }
  }

  if (!mounted || !mode) return null

  return (
    <div
      role="dialog"
      aria-labelledby="pwa-banner-title"
      className={cn(
        "fixed z-[60] animate-in slide-in-from-bottom-4 fade-in duration-300",
        "max-lg:left-3 max-lg:right-3 max-lg:max-w-none",
        hasMobileBottomNav(pathname)
          ? "max-lg:bottom-[calc(5.85rem+env(safe-area-inset-bottom,0px))]"
          : "max-lg:bottom-[max(1rem,env(safe-area-inset-bottom,0px))]",
        "lg:left-auto lg:right-6 lg:bottom-6 lg:max-w-sm lg:w-full",
      )}
    >
      <div className="trip-glass rounded-2xl px-3.5 py-3 shadow-xl">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            {mode === "ios" ? <Share2 className="h-5 w-5" /> : <Download className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h2 id="pwa-banner-title" className="text-sm font-bold leading-tight text-foreground">
                {t("title")}
              </h2>
              <button
                type="button"
                onClick={dismiss}
                className="shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                aria-label={t("dismissAria")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {mode === "ios" && (
              <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-line">{t("iosBody")}</p>
            )}
            {mode === "install" && (
              <>
                <p className="text-xs leading-relaxed text-muted-foreground">{t("installBody")}</p>
                <Button type="button" size="sm" className="w-full sm:w-auto" onClick={handleInstallClick}>
                  {t("installCta")}
                </Button>
              </>
            )}
            {mode === "androidManual" && (
              <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
                {t("androidManualBody")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
