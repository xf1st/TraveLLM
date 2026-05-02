import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { headers } from "next/headers"
import { getTranslations } from "next-intl/server"
import { AppLayout } from "@/components/app-layout"
import { getAllArticleIds, getArticleById } from "@/lib/articles"
import { ArticleMarkdown } from "@/components/news/ArticleMarkdown"
import { ArticleCta } from "@/components/news/ArticleCta"
import { AnimatedArticleLayout } from "@/components/news/AnimatedArticleLayout"

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return getAllArticleIds().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const article = getArticleById(slug)
  if (!article) return { title: "TraveLLM" }

  const host = (await headers()).get("host") ?? "travellm.ru"
  const siteUrl = `https://${host}`
  return {
    title: `${article.title} — TraveLLM`,
    description: article.excerpt,
    alternates: {
      canonical: `${siteUrl}/news/${article.id}`,
    },
    keywords: [...article.tags, article.category, "TraveLLM", "AI trip planner"],
    authors: [{ name: article.author.name }],
    openGraph: {
      title: article.title,
      description: article.excerpt,
      url: `${siteUrl}/news/${article.id}`,
      type: "article",
      publishedTime: article.publishedAt,
      authors: [article.author.name],
      section: article.category,
      tags: article.tags,
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

  const texts = {
    backToNews: t("backToNews"),
    published: t("published"),
    author: t("author"),
  }

  return (
    <AppLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: article.title,
            description: article.excerpt,
            image: [article.image],
            datePublished: article.publishedAt,
            articleSection: article.category,
            keywords: article.tags.join(", "),
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

      <AnimatedArticleLayout article={article} texts={texts}>
        <div className="news-article-body text-base md:text-lg">
          <ArticleMarkdown content={article.content} />
        </div>

        <ArticleCta />
      </AnimatedArticleLayout>
    </AppLayout>
  )
}
