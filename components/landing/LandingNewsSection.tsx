"use client"

import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight, Clock } from "lucide-react"
import { getAllArticlesSorted } from "@/lib/articles"

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55 } },
}

export function LandingNewsSection() {
  const t = useTranslations("landing")
  const articles = getAllArticlesSorted().slice(0, 3)

  return (
    <section className="relative border-t border-border/50 bg-gradient-to-b from-muted/20 to-background py-16 sm:py-24 lg:py-28 px-3 sm:px-4">
      <div className="mx-auto max-w-6xl min-w-0">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="mb-10 text-center sm:mb-14"
        >
          <Badge variant="outline" className="mb-4 border-sky-500/40 bg-sky-500/8 px-4 py-1 text-sky-600 dark:text-sky-300">
            {t("news.badge")}
          </Badge>
          <h2 className="text-2xl font-black tracking-tight sm:text-4xl md:text-5xl">
            {t("news.title")}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground sm:text-lg">{t("news.subtitle")}</p>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <motion.div
              key={article.id}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-40px" }}
            >
              <Link
                href={`/news/${article.id}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/60 shadow-sm transition-all hover:border-primary/35 hover:shadow-lg"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                  <Image
                    src={article.image}
                    alt=""
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
                <div className="flex flex-1 flex-col p-4 sm:p-5">
                  <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    <span className="text-primary">{article.category}</span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-3 w-3" />
                      {article.readTime}
                    </span>
                  </div>
                  <h3 className="line-clamp-2 text-base font-black leading-snug text-foreground group-hover:text-primary sm:text-lg">
                    {article.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 flex-1 text-sm text-muted-foreground">{article.excerpt}</p>
                  <span className="mt-4 inline-flex items-center text-sm font-bold text-primary">
                    {t("news.readArticle")}
                    <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="mt-10 flex justify-center"
        >
          <Button asChild size="lg" variant="outline" className="rounded-full border-primary/30 px-8 font-bold">
            <Link href="/news">
              {t("news.allArticles")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
