import type { Metadata } from "next"
import { headers } from "next/headers"
import { getTranslations } from "next-intl/server"
import { AppLayout } from "@/components/app-layout"
import { getAllArticlesSorted } from "@/lib/articles"
import { AnimatedNewsPage } from "@/components/news/AnimatedNewsPage"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("newsPage")
  const host = (await headers()).get("host") ?? "travellm.ru"
  const siteUrl = `https://${host}`
  return {
    title: t("listTitle"),
    description: t("listDescription"),
    alternates: {
      canonical: `${siteUrl}/news`,
    },
    keywords: [
      "travel guides",
      "itinerary ideas",
      "AI trip planner",
      "маршруты путешествий",
      "идеи поездок",
      "гайды путешествий",
    ],
    openGraph: {
      title: t("listTitle"),
      description: t("listDescription"),
      url: `${siteUrl}/news`,
      type: "website",
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
