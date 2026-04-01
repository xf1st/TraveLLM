"use client"

import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { ArrowLeft, Clock, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { FloatingIcons } from "@/components/FloatingIcons"

type Article = {
  id: string
  title: string
  excerpt: string
  category: string
  readTime: string
  publishedAt: string
  image: string
}

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: i * 0.1 } }),
}

export function AnimatedNewsPage({
  articles,
  texts,
}: {
  articles: Article[]
  texts: {
    backHome: string
    badge: string
    listDescription: string
    title: string
  }
}) {
  return (
    <div className="relative min-h-[100svh] px-3 sm:px-4 py-8 sm:py-16 overflow-hidden">
      {/* Background Ambience */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 left-0 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[130px]" />
        <FloatingIcons />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl min-w-0">
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-muted-foreground transition-all hover:text-foreground hover:gap-3"
          >
            <ArrowLeft className="h-4 w-4" />
            {texts.backHome}
          </Link>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={1} className="mb-12 sm:mb-16">
          <Badge variant="outline" className="mb-4 px-4 py-1.5 rounded-full border-primary/20 bg-primary/10 text-primary text-xs font-black tracking-widest uppercase gap-2 shadow-lg shadow-primary/10">
            <Sparkles className="w-3 h-3" /> {texts.badge}
          </Badge>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight mb-4 leading-[1.05]">
            <span className="bg-gradient-to-r from-primary via-violet-400 to-sky-400 bg-clip-text text-transparent">
              {texts.title}
            </span>
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-2xl font-medium leading-relaxed">
            {texts.listDescription}
          </p>
        </motion.div>

        <ul className="grid gap-6 sm:grid-cols-2">
          {articles.map((article, i) => (
            <motion.li
              key={article.id}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              custom={i + 2}
            >
              <Link
                href={`/news/${article.id}`}
                className="group relative block h-full overflow-hidden rounded-[2rem] border border-white/10 bg-card/40 backdrop-blur-md transition-all hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-1"
              >
                {/* Image Area */}
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted/50">
                  {/* Internal dark gradient overlay for better contrast around the edges */}
                  <div className="absolute inset-0 z-10 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-80" />
                  
                  <Image
                    src={article.image}
                    alt={article.title}
                    fill
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                  
                  {/* Floating Tags */}
                  <div className="absolute bottom-4 left-4 z-20 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/90">
                    <span className="rounded-full bg-primary/90 backdrop-blur-md px-3 py-1 shadow-lg shadow-black/30">
                      {article.category}
                    </span>
                    <span className="flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-3 py-1">
                      <Clock className="h-3 w-3" />
                      {article.readTime}
                    </span>
                  </div>
                </div>

                {/* Content Area */}
                <div className="p-6 sm:p-8 flex flex-col gap-3">
                  <h2 className="text-xl sm:text-2xl font-black leading-tight tracking-tight text-foreground transition-colors group-hover:text-primary">
                    {article.title}
                  </h2>
                  <p className="line-clamp-2 text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {article.excerpt}
                  </p>
                </div>
              </Link>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  )
}
