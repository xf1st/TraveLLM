"use client"

import Link from "next/link"
import Image from "next/image"
import { motion, useScroll, useTransform } from "framer-motion"
import { ArrowLeft, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: i * 0.1 } }),
}

export function AnimatedArticleLayout({
  article,
  texts,
  children,
}: {
  article: {
    category: string
    publishedAt: string
    title: string
    excerpt: string
    author: { name: string }
    image: string
  }
  texts: {
    backToNews: string
    published: string
    author: string
  }
  children: React.ReactNode
}) {
  const { scrollY } = useScroll()
  const imageY = useTransform(scrollY, [0, 500], [0, 150])
  const opacity = useTransform(scrollY, [0, 300], [1, 0.4])

  return (
    <article className="relative min-h-[100svh] pb-16 sm:pb-24 pt-8 sm:pt-16">
      {/* Background Ambience */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] left-[-10%] w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl min-w-0 px-3 sm:px-4">
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
          <Link
            href="/news"
            className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-muted-foreground transition-all hover:text-foreground hover:gap-3"
          >
            <ArrowLeft className="h-4 w-4" />
            {texts.backToNews}
          </Link>
        </motion.div>

        <header className="mb-10 sm:mb-14">
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={1} className="mb-4 sm:mb-6 flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary font-black uppercase tracking-widest px-3 py-1 shadow-lg shadow-primary/5 text-[10px] sm:text-xs">
              {article.category}
            </Badge>
            <time className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1.5" dateTime={article.publishedAt}>
              <Clock className="w-3.5 h-3.5" />
              {texts.published}: {article.publishedAt}
            </time>
          </motion.div>
          
          <motion.h1 variants={fadeUp} initial="hidden" animate="show" custom={2} className="text-3xl sm:text-4xl md:text-6xl font-black leading-[1.05] tracking-tight text-foreground mb-6">
            <span className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
              {article.title}
            </span>
          </motion.h1>
          
          <motion.p variants={fadeUp} initial="hidden" animate="show" custom={3} className="text-lg sm:text-xl md:text-2xl font-medium leading-relaxed text-muted-foreground mb-6 max-w-3xl">
            {article.excerpt}
          </motion.p>
          
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4} className="flex items-center gap-3 text-sm text-muted-foreground backdrop-blur-sm bg-card/20 rounded-full w-max pr-5 p-1.5 border border-white/5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary/30 to-violet-500/30 border border-primary/20 flex items-center justify-center shrink-0">
               <span className="text-xs font-bold text-primary">{article.author.name[0]}</span>
            </div>
            <span>
              {texts.author}: <strong className="font-bold text-foreground">{article.author.name}</strong>
            </span>
          </motion.div>
        </header>

        {/* Parallax Image */}
        <motion.div
          variants={fadeUp} initial="hidden" animate="show" custom={5}
          className="relative mb-12 sm:mb-20 aspect-[16/9] sm:aspect-[21/9] w-full overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] border border-white/10 bg-muted/50 shadow-2xl shadow-black/20"
        >
          <motion.div style={{ y: imageY, opacity, scale: 1.1 }} className="absolute inset-[-10%] z-0">
            <Image
              src={article.image}
              alt={article.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 1024px"
              priority
            />
          </motion.div>
          <div className="absolute inset-0 z-10 rounded-[2rem] sm:rounded-[2.5rem] ring-1 ring-inset ring-white/10 pointer-events-none" />
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-background/60 to-transparent pointer-events-none" />
        </motion.div>

        {/* Content Wrapper */}
        <motion.div 
          variants={fadeUp} initial="hidden" animate="show" custom={6}
          className="mx-auto max-w-3xl min-w-0"
        >
          {children}
        </motion.div>
      </div>
    </article>
  )
}
