import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import { headers } from "next/headers"
import { getTranslations } from "next-intl/server"
import { AppLayout } from "@/components/app-layout"
import { Badge } from "@/components/ui/badge"
import { getAllArticleIds, getArticleById } from "@/lib/articles"
import { ArticleMarkdown } from "@/components/news/ArticleMarkdown"
import { ArticleCta } from "@/components/news/ArticleCta"
import { ArrowLeft } from "lucide-react"

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return getAllArticleIds().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const article = getArticleById(slug)
  if (!article) return { title: "TraveLLM" }

  const t = await getTranslations("newsPage")
  return {
    title: `${article.title} — TraveLLM`,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
      publishedTime: article.publishedAt,
      images: [{ url: article.image, width: 1200, height: 630, alt: article.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt,
      images: [article.image],
    },
  }
}

export default async function NewsArticlePage({ params }: Props) {
  const { slug } = await params
  const article = getArticleById(slug)
  if (!article) notFound()

  const t = await getTranslations("newsPage")
  const host = (await headers()).get("host") ?? "travellm.ru"
  const siteUrl = `https://${host}`

  return (
    <AppLayout>
      <article className="mx-auto max-w-3xl min-w-0 pb-16">
        <Link
          href="/news"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToNews")}
        </Link>

        <header className="mb-8">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="font-bold uppercase tracking-wide">
              {article.category}
            </Badge>
            <time className="text-sm text-muted-foreground" dateTime={article.publishedAt}>
              {t("published")}: {article.publishedAt}
            </time>
          </div>
          <h1 className="text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {article.title}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">{article.excerpt}</p>
          <p className="mt-4 text-sm text-muted-foreground">
            {t("author")}: <span className="font-medium text-foreground">{article.author.name}</span>
          </p>
        </header>

        <div className="relative mb-10 aspect-[16/9] w-full overflow-hidden rounded-2xl border border-border/50 bg-muted shadow-lg">
          <Image
            src={article.image}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
            priority
          />
        </div>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              headline: article.title,
              description: article.excerpt,
              image: [article.image],
              datePublished: article.publishedAt,
              author: { "@type": "Person", name: article.author.name },
              publisher: {
                "@type": "Organization",
                name: "TraveLLM",
                url: siteUrl,
              },
              mainEntityOfPage: {
                "@type": "WebPage",
                "@id": `${siteUrl}/news/${article.id}`,
              },
            }),
          }}
        />

        <div className="news-article-body text-base">
          <ArticleMarkdown content={article.content} />
        </div>

        <ArticleCta />
      </article>
    </AppLayout>
  )
}
