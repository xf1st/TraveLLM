"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { useTranslations } from "next-intl"

export function ProfileSkeleton({ settings = false }: { settings?: boolean }) {
  const t = useTranslations("profile")
  return (
    <div role="status" aria-label={t("loadingProfile")} aria-busy="true" className="[&_.animate-pulse]:motion-reduce:animate-none mx-auto min-w-0 max-w-4xl px-3 pb-20 pt-6 sm:px-4 sm:pt-8">
      <span className="sr-only">{t("loadingProfile")}</span>
      <div aria-hidden="true">
        <Skeleton className="h-28 rounded-2xl sm:h-32 sm:rounded-[2rem]" />
        <div className="relative -mt-12 flex items-end gap-4 px-4 sm:px-6">
          <Skeleton className="h-20 w-20 shrink-0 rounded-full ring-4 ring-background sm:h-24 sm:w-24" />
          <div className="flex-1 space-y-2 pb-1">
            <Skeleton className="h-6 w-32 sm:w-44" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="hidden h-10 w-28 rounded-xl sm:block" />
        </div>
        <Skeleton className="mx-4 mt-6 h-4 w-48 sm:mx-6" />
        <div className="mx-4 mt-5 flex gap-3 overflow-hidden sm:mx-6">
          {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-[52px] w-28 shrink-0 rounded-2xl" />)}
        </div>
        <Skeleton className="mb-6 mt-6 h-[50px] w-full rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-2">
          {settings && <Skeleton className="h-16 w-60 md:col-span-2" />}
          {[0, 1, 2].map((item) => (
            <div key={item} className={`trip-glass space-y-5 rounded-[1.75rem] p-5 sm:p-6 ${item === 0 ? "md:col-span-2" : ""}`}>
              <Skeleton className="h-10 w-44 rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              {settings && <Skeleton className="h-10 w-full rounded-xl" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
