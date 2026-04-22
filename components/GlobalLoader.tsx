"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { useTranslations } from "next-intl"
import { LottieLoader } from "@/components/ui/LottieLoader"

function subscribeToMount() {
  return () => {}
}

export function GlobalLoader() {
  const t = useTranslations("common")
  const [loading, setLoading] = useState(true)
  const mounted = useSyncExternalStore(
    subscribeToMount,
    () => true,
    () => false
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false)
    }, 900)

    return () => clearTimeout(timer)
  }, [])

  if (!mounted || !loading) return null

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background pointer-events-none transition-opacity duration-500 ease-out">
      <div className="relative flex flex-col items-center gap-5">
        <div className="relative h-36 w-36 sm:h-44 sm:w-44">
          <div className="absolute inset-0 blur-2xl bg-primary/25 rounded-full animate-pulse" />
          <LottieLoader type="plane" className="relative z-10 h-full w-full" />
        </div>
        <p className="text-sm font-medium text-muted-foreground animate-pulse tracking-wide">
          {t("loadingApp")}
        </p>
      </div>
    </div>
  )
}
