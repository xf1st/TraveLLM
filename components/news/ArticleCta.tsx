import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { getLocale } from "next-intl/server"
import { Button } from "@/components/ui/button"
import { Plane, Route } from "lucide-react"

export async function ArticleCta() {
  const t = await getTranslations("newsPage")
  const locale = await getLocale()
  const flightsUrl = locale === "en" ? "https://www.aviasales.com" : "https://www.aviasales.ru"

  return (
    <aside
      className="not-prose my-12 rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/15 via-background to-violet-500/10 p-6 sm:p-8 shadow-lg shadow-primary/5"
      aria-label={t("ctaTitle")}
    >
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">{t("stickyNote")}</p>
      <h2 className="text-xl font-black tracking-tight text-foreground sm:text-2xl">{t("ctaTitle")}</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">{t("ctaBody")}</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Button asChild size="lg" className="rounded-full font-bold">
          <Link href="/plan">
            <Route className="mr-2 h-4 w-4" />
            {t("ctaPlan")}
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="rounded-full border-primary/30 bg-background/80 font-bold">
          <a href={flightsUrl} target="_blank" rel="noopener noreferrer">
            <Plane className="mr-2 h-4 w-4" />
            {t("ctaFlights")}
          </a>
        </Button>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">{t("ctaFlightsHint")}</p>
    </aside>
  )
}
