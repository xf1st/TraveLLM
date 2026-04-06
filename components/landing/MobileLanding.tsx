"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence, Variants } from "framer-motion"
import { useTranslations } from "next-intl"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/MobileBottomNav"

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
    <div className="bg-[#0B1120] text-slate-50 min-h-screen pb-32 overflow-x-hidden selection:bg-blue-500/30">
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <section className="relative h-[92vh] w-full overflow-hidden">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/vidforland.mp4" type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/50 to-[#0B1120]" />

        <div className="relative h-full flex flex-col justify-end px-6 pb-16 z-10">
          <motion.div initial="hidden" animate="show" variants={staggerContainer}>
            <motion.span
              variants={fadeUp}
              className="inline-block px-3 py-1 mb-4 text-[10px] font-bold tracking-widest uppercase bg-blue-500 text-white rounded-full shadow-lg"
            >
              AI Travel Concierge
            </motion.span>
            <motion.h1 variants={fadeUp} className="text-5xl font-black text-white mb-4 leading-[1.08] tracking-tight">
              TraveLLM
            </motion.h1>
            <motion.p variants={fadeUp} className="text-white/75 text-lg mb-8 leading-relaxed max-w-[280px]">
              {t("hero.subtitle")}
            </motion.p>
            <motion.div variants={fadeUp}>
              <Link
                href={user ? "/plan" : "/auth"}
                className="w-full py-4 bg-blue-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-xl shadow-blue-500/30"
              >
                {t("hero.getStarted")}
                <span className="material-symbols-outlined">chevron_right</span>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <main className="space-y-20 pt-14">
        {/* Partners */}
        <section className="px-6">
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-8">
            {t("mobile.partnersTitle")}
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-6 opacity-30 grayscale">
            <span className="font-bold text-lg">Yandex</span>
            <span className="font-bold text-lg uppercase">Ostrovok</span>
            <span className="font-bold text-lg">Aviasales</span>
            <span className="font-bold text-lg">Tripadvisor</span>
          </div>
        </section>

        {/* Reels Style Section */}
        <section className="px-6 overflow-hidden">
          <h2 className="text-3xl font-extrabold mb-10 leading-tight text-white">
            {t("mobile.activitiesTitle")}
          </h2>

          <div className="relative rounded-[32px] overflow-visible bg-slate-900/60 p-8 border border-white/10 shadow-lg h-72">
            <div className="relative z-10 space-y-4 max-w-[58%] top-1/2 -translate-y-1/2 absolute left-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-sky-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400">
                  Канайма, Венесуэла
                </span>
              </div>
              <p className="font-bold text-lg leading-snug text-white">
                Полёт на параплане над плато Тебуи: Над облаками Венесуэльской Гайаны
              </p>
            </div>

            <div className="absolute right-[-20px] top-[-20px] w-52 h-80 rotate-6 transform-gpu">
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
          <h2 className="text-3xl font-extrabold mb-10 text-white">{t("mobile.featuresTitle")}</h2>
          <div className="grid grid-cols-2 gap-4">
            {/* Instant Routes card — inspired by the design */}
            <div className="bg-slate-900/80 rounded-3xl p-6 border border-white/10 flex flex-col justify-between aspect-square group active:bg-slate-800 transition-colors relative overflow-hidden">
              <span className="material-symbols-outlined text-blue-400 text-3xl mb-2">speed</span>
              <div>
                <h3 className="text-sm font-bold leading-tight text-white">Маршруты за минуту</h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-tight">От идеи до плана — без вкладок</p>
              </div>
              {/* Watermark */}
              <span className="material-symbols-outlined absolute -bottom-3 -right-3 text-[80px] text-white/5 select-none pointer-events-none">timer</span>
            </div>

            <div className="bg-slate-900/80 rounded-3xl p-6 border border-white/10 flex flex-col justify-between aspect-square group active:bg-slate-800 transition-colors">
              <span className="material-symbols-outlined text-sky-400 text-3xl mb-4">cloud</span>
              <h3 className="text-sm font-bold leading-tight text-white">Погода по дням</h3>
            </div>

            <div className="col-span-2 bg-slate-900/80 rounded-3xl p-6 flex items-center justify-between border border-white/10 active:bg-slate-800 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/15 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-400">forum</span>
                </div>
                <h3 className="text-sm font-bold text-white">AI-чат для правок</h3>
              </div>
              <span className="material-symbols-outlined text-slate-600">arrow_forward_ios</span>
            </div>
          </div>
        </section>

        {/* Why Us — Comparison */}
        <section className="px-6">
          <div className="bg-slate-900/60 rounded-[32px] p-8 border border-white/10 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl -mr-20 -mt-20" />
            <h2 className="text-3xl font-extrabold mb-8 text-white">{t("mobile.comparisonTitle")}</h2>
            <div className="space-y-5">
              <div className="grid grid-cols-3 text-[10px] uppercase tracking-[0.15em] text-slate-500 pb-4 border-b border-white/10">
                <div>Функция</div>
                <div className="text-center text-blue-400 font-bold">TraveLLM</div>
                <div className="text-center">Другие</div>
              </div>

              {[
                { label: "Маршрут за 60с", app: "check_circle", other: "cancel", icon: true },
                { label: "AI-чат правок", app: "check_circle", other: "cancel", icon: true },
                { label: "Авиабилеты", app: "check_circle", other: "remove_circle", icon: true },
                { label: "Трекер бюджета", app: "check_circle", other: "cancel", icon: true },
                { label: "Офлайн доступ", app: "check_circle", other: "cancel", icon: true },
                { label: "Погода в плане", app: "check_circle", other: "cancel", icon: true },
                { label: "Совместный доступ", app: "check_circle", other: "remove_circle", icon: true },
              ].map((row, i) => (
                <div key={i} className="grid grid-cols-3 items-center py-0.5">
                  <div className="text-sm font-medium text-slate-300">{row.label}</div>
                  <div className="flex justify-center">
                    <span className="material-symbols-outlined text-blue-400 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {row.app}
                    </span>
                  </div>
                  <div className="flex justify-center">
                    <span className="material-symbols-outlined text-slate-600 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {row.other}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Journal Section */}
        <section className="px-6">
          <div className="flex justify-between items-end mb-8">
            <h2 className="text-3xl font-extrabold text-white">{t("mobile.journalTitle")}</h2>
            <Link href="/news" className="text-blue-400 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
              {t("mobile.allArticles")}
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>

          <div className="space-y-6">
            <div className="group relative bg-slate-900/60 rounded-[32px] overflow-hidden aspect-[4/3] border border-white/10 shadow-lg active:scale-[0.99] transition-transform">
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
                <h3 className="text-2xl font-bold text-white leading-tight">
                  Топ-10 направлений для удалённой работы
                </h3>
              </div>
            </div>

            <div className="flex gap-5 bg-slate-900/60 p-5 rounded-[28px] border border-white/10 shadow-sm active:bg-slate-800 transition-colors">
              <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0">
                <img
                  alt="AI Travel"
                  className="w-full h-full object-cover"
                  src="https://images.unsplash.com/photo-1436491865332-7a61a109c0f3?auto=format&fit=crop&q=80&w=200"
                />
              </div>
              <div className="flex flex-col justify-center flex-1">
                <h4 className="font-bold text-sm mb-1 leading-tight line-clamp-2 text-white">
                  Как ИИ меняет индустрию планирования путешествий
                </h4>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">5 минут чтения</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-6">
          <h2 className="text-3xl font-extrabold mb-10 text-center text-white">{t("mobile.faqTitle")}</h2>
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
          ? "bg-slate-800 border border-blue-500/30 shadow-md"
          : "bg-slate-900/60 border border-white/10"
      }`}
      onClick={onClick}
    >
      <div className="p-6 flex justify-between items-center">
        <span className="font-bold text-sm pr-6 leading-tight flex-1 text-white">{question}</span>
        <motion.span
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          className={`material-symbols-outlined transition-colors ${isOpen ? "text-blue-400" : "text-slate-500"}`}
        >
          add
        </motion.span>
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
              <p className="text-sm text-slate-400 leading-relaxed">{answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
