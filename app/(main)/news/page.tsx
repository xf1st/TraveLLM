import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { getTranslations } from "next-intl/server"
import { AppLayout } from "@/components/app-layout"
import { Badge } from "@/components/ui/badge"
import { getAllArticlesSorted } from "@/lib/articles"
import { ArrowLeft, Clock } from "lucide-react"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("newsPage")
  return {
    title: t("listTitle"),
    description: t("listDescription"),
    openGraph: {
      title: t("listTitle"),
      description: t("listDescription"),
    },
  }
}

export default async function NewsIndexPage() {
  const t = await getTranslations("newsPage")
  const tl = await getTranslations("landing")
  const articles = getAllArticlesSorted()

  return (
    <AppLayout title={tl("news.title")} description={t("listDescription")}>
      <div className="mx-auto max-w-5xl min-w-0">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backHome")}
        </Link>

        <div className="mb-10">
          <Badge variant="outline" className="mb-3 border-primary/30 text-primary">
            {tl("news.badge")}
          </Badge>
          <p className="text-lg text-muted-foreground sm:text-xl">{t("listDescription")}</p>
        </div>

        <ul className="grid gap-6 sm:grid-cols-2">
          {articles.map((article) => (
            <li key={article.id}>
              <Link
                href={`/news/${article.id}`}
                className="group block h-full overflow-hidden rounded-2xl border border-border/60 bg-card/50 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
                  <Image
                    src={article.image}
                    alt=""
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                </div>
                <div className="p-5">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-primary">{article.category}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {article.readTime}
                    </span>
                  </div>
                  <h2 className="text-lg font-black leading-snug tracking-tight text-foreground group-hover:text-primary sm:text-xl">
                    {article.title}
                  </h2>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{article.excerpt}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </AppLayout>
  )
}
