"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence, Variants } from "framer-motion"
import { useTranslations } from "next-intl"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/MobileBottomNav"
import {
  ChevronRight,
  Zap,
  Timer,
  Cloud,
  MessageSquare,
  CheckCircle2,
  XCircle,
  MinusCircle,
  ArrowRight,
  Plus,
} from "lucide-react"

// --- Animation Variants ---
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
      delay: delay * 0.1,
    },
  }),
}

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
}

export function MobileLanding() {
  const t = useTranslations("landing")
  const [user, setUser] = useState<any>(null)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(1)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null)
    })
  }, [])

  const faqData = [
    { q: t("faq.q1"), a: t("faq.a1") },
    { q: t("faq.q2"), a: t("faq.a2") },
    { q: t("faq.q3"), a: t("faq.a3") },
  ]

  return (
    <div className="bg-background text-foreground min-h-screen pb-32 overflow-x-hidden selection:bg-blue-500/30">
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-[82svh] w-full overflow-hidden">
        <video
          autoPlay
          muted
          loop
          playsInline
          poster="/vidforland_1_frame.png"
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/vidforland.mp4" type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/45 to-[#0B1120]" />

        <div className="relative z-10 flex min-h-[82svh] flex-col justify-end px-6 pb-44 pt-28">
          <motion.div initial="hidden" animate="show" variants={staggerContainer}>
            <motion.span
              variants={fadeUp}
              className="mb-4 inline-block rounded-full bg-blue-500 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg"
            >
              AI Travel Concierge
            </motion.span>
            <motion.h1 variants={fadeUp} className="mb-4 text-5xl font-black leading-[1.04] tracking-tight text-white">
              TraveLLM
            </motion.h1>
            <motion.p variants={fadeUp} className="mb-7 max-w-[310px] text-base leading-relaxed text-white/78">
              {t("hero.subtitle")}
            </motion.p>
            <motion.div variants={fadeUp}>
              <Link
                href={user ? "/plan" : "/auth"}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-500 py-4 font-bold text-white shadow-xl shadow-blue-500/25 transition-transform active:scale-[0.98]"
              >
                {t("hero.getStarted")}
                <ChevronRight className="w-5 h-5" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <main className="space-y-[4.5rem] pt-12">
        {/* Partners */}
        <section className="px-6">
          <p className="mb-6 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            {t("mobile.partnersTitle")}
          </p>
          <div className="mx-auto grid max-w-xs grid-cols-2 gap-3 text-center">
            <span className="rounded-xl border border-border/70 bg-card/45 px-3 py-2 text-sm font-bold text-foreground/55">Yandex</span>
            <span className="rounded-xl border border-border/70 bg-card/45 px-3 py-2 text-sm font-bold uppercase text-foreground/55">Ostrovok</span>
            <span className="rounded-xl border border-border/70 bg-card/45 px-3 py-2 text-sm font-bold text-foreground/55">Aviasales</span>
            <span className="rounded-xl border border-border/70 bg-card/45 px-3 py-2 text-sm font-bold text-foreground/55">Tripadvisor</span>
          </div>
        </section>

        {/* Reels Style Section */}
        <section className="px-6 overflow-hidden">
          <h2 className="mb-8 text-3xl font-extrabold leading-tight text-foreground">
            {t("mobile.activitiesTitle")}
          </h2>

          <div className="relative h-72 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card to-muted/25 p-6 shadow-sm">
            <div className="absolute left-6 top-1/2 z-10 max-w-[52%] -translate-y-1/2 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-sky-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400">
                  Канайма, Венесуэла
                </span>
              </div>
              <p className="text-base font-bold leading-snug text-foreground">
                Полёт на параплане над плато Тебуи: Над облаками Венесуэльской Гайаны
              </p>
            </div>

            <div className="absolute right-[-18px] top-[-10px] w-48 h-80 rotate-6 transform-gpu">
              <img
                src="/phone_reels_ads2.png"
                alt="Reels Ad"
                className="w-full h-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.4)]"
              />
            </div>
          </div>
        </section>

        {/* Bento AI Features */}
        <section className="px-6">
          <h2 className="mb-8 text-3xl font-extrabold text-foreground">{t("mobile.featuresTitle")}</h2>
          <div className="grid grid-cols-2 gap-4">
            {/* Instant Routes card — inspired by the design */}
            <div className="relative flex aspect-square flex-col justify-between overflow-hidden rounded-3xl border border-border bg-card/70 p-5 transition-colors active:bg-muted">
              <Zap className="text-blue-400 w-8 h-8 mb-2" />
              <div>
                <h3 className="text-sm font-bold leading-tight text-foreground">Маршруты за минуту</h3>
                <p className="text-[11px] text-muted-foreground mt-1 leading-tight">От идеи до плана — без вкладок</p>
              </div>
              {/* Watermark */}
              <Timer className="absolute -bottom-3 -right-3 w-20 h-20 text-foreground/5 select-none pointer-events-none" />
            </div>

            <div className="flex aspect-square flex-col justify-between rounded-3xl border border-border bg-card/70 p-5 transition-colors active:bg-muted">
              <Cloud className="text-sky-400 w-8 h-8 mb-4" />
              <h3 className="text-sm font-bold leading-tight text-foreground">Погода по дням</h3>
            </div>

            <div className="col-span-2 flex items-center justify-between rounded-3xl border border-border bg-card/70 p-5 transition-colors active:bg-muted">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/15">
                  <MessageSquare className="text-blue-400 w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-foreground">AI-чат для правок</h3>
              </div>
              <ChevronRight className="text-muted-foreground w-5 h-5" />
            </div>
          </div>
        </section>

        {/* Why Us — Comparison */}
        <section className="px-6">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card/70 p-6 shadow-sm">
            <h2 className="mb-7 text-3xl font-extrabold text-foreground">{t("mobile.comparisonTitle")}</h2>
            <div className="space-y-5">
              <div className="grid grid-cols-3 border-b border-border pb-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                <div>Функция</div>
                <div className="text-center text-blue-400 font-bold">TraveLLM</div>
                <div className="text-center">Другие</div>
              </div>

              {[
                { label: "Маршрут за 60с", partial: false },
                { label: "AI-чат правок", partial: false },
                { label: "Авиабилеты", partial: true },
                { label: "Трекер бюджета", partial: false },
                { label: "План в браузере", partial: false },
                { label: "Погода в плане", partial: false },
                { label: "Совместный доступ", partial: true },
              ].map((row, i) => (
                <div key={i} className="grid grid-cols-3 items-center py-0.5">
                  <div className="text-sm font-medium text-foreground/80">{row.label}</div>
                  <div className="flex justify-center">
                    <CheckCircle2 className="text-blue-400 w-5 h-5" />
                  </div>
                  <div className="flex justify-center">
                    {row.partial
                      ? <MinusCircle className="text-muted-foreground w-5 h-5" />
                      : <XCircle className="text-muted-foreground w-5 h-5" />
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Journal Section */}
        <section className="px-6">
          <div className="flex justify-between items-end mb-8">
            <h2 className="text-3xl font-extrabold text-foreground">{t("mobile.journalTitle")}</h2>
            <Link href="/news" className="text-blue-400 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
              {t("mobile.allArticles")}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-6">
            <div className="group relative bg-card rounded-[32px] overflow-hidden aspect-[4/3] border border-border shadow-lg active:scale-[0.99] transition-transform">
              <img
                alt="Maldives"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                src="https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&q=80&w=800"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 p-8">
                <span className="px-3 py-1 bg-blue-500 text-white text-[10px] font-bold uppercase rounded-full mb-3 inline-block">
                  Тренды 2025
                </span>
                <h3 className="text-2xl font-bold text-white leading-tight drop-shadow-md">
                  Топ-10 направлений для удалённой работы
                </h3>
              </div>
            </div>

            <div className="flex gap-5 bg-card p-5 rounded-[28px] border border-border shadow-sm active:bg-muted transition-colors">
              <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0">
                <img
                  alt="AI Travel"
                  className="w-full h-full object-cover"
                  src="https://images.unsplash.com/photo-1436491865332-7a61a109c0f3?auto=format&fit=crop&q=80&w=200"
                />
              </div>
              <div className="flex flex-col justify-center flex-1">
                <h4 className="font-bold text-sm mb-1 leading-tight line-clamp-2 text-foreground">
                  Как ИИ меняет индустрию планирования путешествий
                </h4>
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">5 минут чтения</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-6">
          <h2 className="text-3xl font-extrabold mb-10 text-center text-foreground">{t("mobile.faqTitle")}</h2>
          <div className="space-y-4">
            {faqData.map((item, idx) => (
              <FAQItem
                key={idx}
                question={item.q}
                answer={item.a}
                isOpen={openFaqIndex === idx}
                onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
              />
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-6 pb-12">
          <div className="bg-gradient-to-br from-blue-600 to-violet-600 rounded-[40px] p-10 text-center text-white shadow-2xl shadow-blue-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20" />
            <h2 className="text-4xl font-black mb-4">{t("hero.getStarted")}</h2>
            <p className="text-white/75 mb-10 text-sm font-medium leading-relaxed">
              Ваш идеальный маршрут ждёт. Начните прямо сейчас.
            </p>
            <Link
              href={user ? "/plan" : "/auth"}
              className="block w-full py-5 bg-white text-blue-600 rounded-3xl font-extrabold active:scale-95 transition-transform shadow-xl uppercase tracking-widest text-[12px]"
            >
              Создать маршрут
            </Link>
          </div>
        </section>
      </main>

      <MobileBottomNav />
    </div>
  )
}

function FAQItem({
  question,
  answer,
  isOpen,
  onClick,
}: {
  question: string
  answer: string
  isOpen: boolean
  onClick: () => void
}) {
  return (
    <div
      className={`rounded-3xl transition-all duration-300 overflow-hidden cursor-pointer ${
        isOpen
          ? "bg-card border border-blue-500/30 shadow-md"
          : "bg-muted/40 border border-border"
      }`}
      onClick={onClick}
    >
      <div className="p-6 flex justify-between items-center">
        <span className="font-bold text-sm pr-6 leading-tight flex-1 text-foreground">{question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          className={`transition-colors flex-shrink-0 ${isOpen ? "text-blue-400" : "text-muted-foreground"}`}
        >
          <Plus className="w-5 h-5" />
        </motion.div>
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="px-6 pb-6 pt-0">
              <p className="text-sm text-muted-foreground leading-relaxed">{answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
