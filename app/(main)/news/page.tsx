import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { AppLayout } from "@/components/app-layout"
import { getAllArticlesSorted } from "@/lib/articles"
import { AnimatedNewsPage } from "@/components/news/AnimatedNewsPage"

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

  const texts = {
    backHome: t("backHome"),
    badge: tl("news.badge"),
    listDescription: t("listDescription"),
    title: tl("news.title"),
  }

  return (
    <AppLayout>
      <AnimatedNewsPage articles={articles} texts={texts} />
    </AppLayout>
  )
}
