"use client"

import { useTranslations } from "next-intl"
import { LottieLoader } from "@/components/ui/LottieLoader"

export default function Loading() {
  const t = useTranslations("common")

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-5">
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
