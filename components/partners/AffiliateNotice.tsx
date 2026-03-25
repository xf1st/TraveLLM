"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

/** Короткое раскрытие партнёрских ссылок + ссылка на раздел условий */
export function AffiliateNotice({ className }: { className?: string }) {
  const t = useTranslations("partners")
  return (
    <p className={cn("text-[10px] sm:text-[11px] leading-snug", className)} role="note">
      <span>{t("disclosure")}</span>{" "}
      <Link
        href="/terms#affiliate"
        className="font-semibold underline underline-offset-2 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 rounded-sm"
      >
        {t("termsLink")}
      </Link>
    </p>
  )
}
