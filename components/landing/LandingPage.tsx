"use client"

import Link from "next/link"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowRight, Check, X, Zap, Crown, MapPin, MessageSquare,
  CloudSun, Wallet, Share2, Map, Sparkles, Clock, Users,
  Globe, Star, ChevronRight, Bot, Route, Camera
} from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { motion, useInView } from "framer-motion"
import { Footer } from "@/components/footer"
import { LandingNewsSection } from "@/components/landing/LandingNewsSection"
import { VideoText } from "@/components/ui/video-text"
import { FloatingIcons } from "@/components/FloatingIcons"
import { ItineraryPreview } from "@/components/landing/ItineraryPreview"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

// Animated counter
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    let start = 0
    const step = Math.ceil(to / 60)
    const timer = setInterval(() => {
      start = Math.min(start + step, to)
      setCount(start)
      if (start >= to) clearInterval(timer)
    }, 20)
    return () => clearInterval(timer)
  }, [inView, to])

  return <span ref={ref}>{count.toLocaleString("ru-RU")}{suffix}</span>
}

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: i * 0.1 } }),
}

export default function LandingPage() {
  const t = useTranslations("landing")
  const tm = useTranslations("meta")
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null)
    })
  }, [])

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-background">
      <Header />

      {/* ═══════════════════════════════════════════════
          HERO
      ═══════════════════════════════════════════════ */}
      <section className="relative min-h-[100svh] flex flex-col items-center justify-center px-3 sm:px-4 pt-24 pb-20 sm:pt-20 sm:pb-16 overflow-hidden bg-black">

        {/* Video Background Layer */}
        <div className="absolute inset-0 z-0 overflow-hidden bg-zinc-950">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="absolute inset-0 w-full h-full object-cover scale-[1.01] opacity-90"
          >
            <source src="/vidforland.mp4" type="video/mp4" />
          </video>
          {/* Forced dark overlays for readability in both light/dark themes */}
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-background" />
          <div className="absolute inset-0 backdrop-blur-[0.5px]" />
        </div>

        {/* Ambient elements (on top of video, behind text) */}
        <div className="pointer-events-none absolute inset-0 z-1">
          <FloatingIcons />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center max-w-5xl mx-auto w-full min-w-0">

          {/* Eyebrow */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
            <Badge variant="outline" className="mb-8 px-4 py-1.5 rounded-full border-white/20 bg-white/10 text-white text-xs font-semibold tracking-widest uppercase gap-2 backdrop-blur-md shadow-lg shadow-black/20">
              <Sparkles className="w-3 h-3 text-sky-400" /> {t("hero.badge")}
            </Badge>
          </motion.div>

          {/* Headline - FORCED WHITE FOR READABILITY */}
          <motion.h1
            variants={fadeUp} initial="hidden" animate="show" custom={2}
            className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tight leading-[1.08] mb-5 sm:mb-6 text-white px-1"
          >
            <span className="drop-shadow-2xl">{t("hero.headline1")}</span>
            <br />
            {t("hero.headline2")}{" "}
            <span className="bg-gradient-to-r from-sky-400 via-blue-400 to-violet-400 bg-clip-text text-transparent drop-shadow-sm">
              {t("hero.headline2Accent")}
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp} initial="hidden" animate="show" custom={3}
            className="text-base sm:text-lg md:text-xl text-white/80 max-w-2xl mb-8 sm:mb-10 leading-relaxed drop-shadow-md px-1"
          >
            {t("hero.subtitle")}
          </motion.p>

          {/* CTA */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4} className="flex w-full max-w-md flex-col gap-3 mb-12 sm:mb-14 sm:max-w-none sm:flex-row sm:justify-center">
            <Link href="/plan" className="w-full sm:w-auto touch-manipulation">
              <Button size="lg" className="h-14 w-full sm:w-auto px-8 sm:px-10 rounded-full text-base font-bold shadow-md md:shadow-2xl shadow-primary/30 bg-gradient-to-r from-primary to-violet-500 border-none hover:scale-[1.02] sm:hover:scale-105 transition-transform gap-2 text-white">
                {t("hero.ctaCreate")} <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            {user ? (
              <Link href="/trips" className="w-full sm:w-auto touch-manipulation">
                <Button size="lg" className="h-14 w-full sm:w-auto px-8 rounded-full text-base font-bold bg-white text-black hover:bg-white/90 transition-all shadow-lg border-none">
                  {t("hero.ctaTrips")}
                </Button>
              </Link>
            ) : (
              <Link href="/auth" className="w-full sm:w-auto touch-manipulation">
                <Button size="lg" className="h-14 w-full sm:w-auto px-8 rounded-full text-base font-bold bg-white text-black hover:bg-white/90 transition-all shadow-lg border-none">
                  {t("hero.ctaSignIn")}
                </Button>
              </Link>
            )}
          </motion.div>

          {/* Stats row - FORCED WHITE FOR READABILITY */}
          <motion.div
            variants={fadeUp} initial="hidden" animate="show" custom={5}
            className="flex flex-wrap items-center justify-center gap-6 md:gap-10"
          >
            {[
              { value: 1200, suffix: "+", labelKey: "stat1Label" },
              { value: 50,   suffix: "+", labelKey: "stat2Label" },
              { value: 20,   suffix: "+", labelKey: "stat3Label" },
            ].map((s) => (
              <div key={s.labelKey} className="text-center">
                <div className="text-3xl md:text-4xl font-black text-white drop-shadow-md">
                  <Counter to={s.value} suffix={s.suffix} />
                </div>
                <div className="text-xs text-white/60 uppercase tracking-widest mt-1 font-bold">{t(`hero.${s.labelKey}`)}</div>
              </div>
            ))}
          </motion.div>

        </div>

        {/* Bottom fade */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-10" />
      </section>

      {/* ═══════════════════════════════════════════════
          КАК ЭТО РАБОТАЕТ — 3 шага
      ═══════════════════════════════════════════════ */}
      <section className="relative py-16 sm:py-24 lg:py-28 px-3 sm:px-4">
        <div className="max-w-6xl mx-auto min-w-0">
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-center mb-10 sm:mb-16 px-1"
          >
            <Badge variant="outline" className="mb-4 border-sky-500/40 text-sky-500 bg-sky-500/8 px-4 py-1 rounded-full uppercase tracking-widest text-[10px] font-bold">
              {t("howItWorks.badge")}
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-black tracking-tight mb-4">
              {t("howItWorks.title")}{" "}
              <span className="text-primary">{t("howItWorks.titleAccent")}</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {t("howItWorks.subtitle")}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Connecting line on desktop */}
            <div className="hidden md:block absolute top-16 left-[16.5%] right-[16.5%] h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent pointer-events-none" />

            {[
              {
                num: "01",
                icon: <MessageSquare className="w-6 h-6" />,
                color: "from-sky-500/20 to-sky-500/5 border-sky-500/20",
                iconColor: "text-sky-400",
                titleKey: "step1Title",
                descKey: "step1Desc",
              },
              {
                num: "02",
                icon: <Bot className="w-6 h-6" />,
                color: "from-primary/20 to-primary/5 border-primary/20",
                iconColor: "text-primary",
                titleKey: "step2Title",
                descKey: "step2Desc",
              },
              {
                num: "03",
                icon: <Globe className="w-6 h-6" />,
                color: "from-violet-500/20 to-violet-500/5 border-violet-500/20",
                iconColor: "text-violet-400",
                titleKey: "step3Title",
                descKey: "step3Desc",
              },
            ].map((step, i) => (
              <motion.div
                key={step.num}
                variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i}
                className={cn(
                  "relative rounded-3xl border bg-gradient-to-b p-5 sm:p-8 flex flex-col gap-4",
                  step.color
                )}
              >
                <div className="absolute top-6 right-6 text-6xl font-black text-foreground/5 leading-none select-none">{step.num}</div>
                <div className={cn("w-12 h-12 rounded-2xl bg-background/60 backdrop-blur-md border border-white/10 flex items-center justify-center", step.iconColor)}>
                  {step.icon}
                </div>
                <h3 className="text-xl font-black">{t(`howItWorks.${step.titleKey}`)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(`howItWorks.${step.descKey}`)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          ПРЕВЬЮ РЕАЛЬНОГО МАРШРУТА
      ═══════════════════════════════════════════════ */}
      <section className="py-14 sm:py-20 px-3 sm:px-4">
        <div className="max-w-6xl mx-auto min-w-0">
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-center mb-8 sm:mb-12 px-1"
          >
            <Badge variant="outline" className="mb-4 border-emerald-500/40 text-emerald-400 bg-emerald-500/8 px-4 py-1 rounded-full uppercase tracking-widest text-[10px] font-bold">
              {t("preview.badge")}
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-black tracking-tight mb-4">
              {t("preview.title")}{" "}
              <span className="text-emerald-400">{t("preview.titleAccent")}</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {t("preview.subtitle")}
            </p>
          </motion.div>

          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={1}
          >
            <ItineraryPreview />
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          СРАВНЕНИЕ С КОНКУРЕНТАМИ
      ═══════════════════════════════════════════════ */}
      <section className="py-16 sm:py-24 lg:py-28 px-3 sm:px-4 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/4 to-transparent" />
        </div>

        <div className="max-w-5xl mx-auto relative z-10 min-w-0">
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-center mb-10 sm:mb-16 px-1"
          >
            <Badge variant="outline" className="mb-4 border-rose-500/40 text-rose-400 bg-rose-500/8 px-4 py-1 rounded-full uppercase tracking-widest text-[10px] font-bold">
              {t("comparison.badge")}
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-black tracking-tight mb-4">
              {t("comparison.title")}{" "}
              <span className="bg-gradient-to-r from-rose-400 to-orange-400 bg-clip-text text-transparent">
                {t("comparison.titleAccent")}
              </span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
              {t("comparison.subtitle")}
            </p>
          </motion.div>

          <div className="-mx-1 overflow-x-auto overscroll-x-contain pb-1 sm:mx-0 sm:overflow-visible sm:pb-0">
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="min-w-[min(100%,300px)] sm:min-w-0 rounded-3xl border border-white/10 overflow-hidden bg-card/30 backdrop-blur-md md:backdrop-blur-xl"
          >
            {/* Table header */}
            <div className="grid grid-cols-3 border-b border-white/10">
              <div className="p-2.5 sm:p-5 text-[10px] sm:text-sm font-bold text-muted-foreground leading-tight">{t("comparison.colFeature")}</div>
              <div className="p-2.5 sm:p-5 text-center text-[10px] sm:text-sm font-bold text-muted-foreground border-l border-white/10 leading-tight">
                {t("comparison.colOthers")}
              </div>
              <div className="p-2.5 sm:p-5 text-center border-l border-white/10 bg-primary/8">
                <span className="text-[10px] sm:text-sm font-black text-primary leading-tight">{t("comparison.colUs")}</span>
              </div>
            </div>

            {[
              { featKey: "feat1", them: false, us: true },
              { featKey: "feat2", them: false, us: true },
              { featKey: "feat3", them: false, us: true },
              { featKey: "feat4", them: false, us: true },
              { featKey: "feat5", them: "partly", us: true },
              { featKey: "feat6", them: false, us: true },
              { featKey: "feat7", them: false, us: true },
              { featKey: "feat8", them: false, us: true },
              { featKey: "feat9", them: false, us: true },
              { featKey: "feat10", them: "partly", us: true },
            ].map((row, i) => (
              <div
                key={row.featKey}
                className={cn("grid grid-cols-3 border-b border-white/5 last:border-b-0 hover:bg-white/2 transition-colors", i % 2 === 0 ? "" : "bg-white/1")}
              >
                <div className="p-2 sm:p-4 text-[11px] sm:text-sm font-medium leading-snug break-words min-w-0">{t(`comparison.${row.featKey}`)}</div>
                <div className="p-2 sm:p-4 flex items-center justify-center border-l border-white/10">
                  {row.them === true ? (
                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 shrink-0" />
                  ) : row.them === "partly" ? (
                    <span className="text-[9px] sm:text-xs text-muted-foreground font-medium text-center leading-tight px-0.5">{t("comparison.partly")}</span>
                  ) : (
                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400/60 shrink-0" />
                  )}
                </div>
                <div className="p-2 sm:p-4 flex items-center justify-center border-l border-white/10 bg-primary/5">
                  <Check className="w-4 h-4 sm:w-5 sm:h-5 text-primary font-bold shrink-0" />
                </div>
              </div>
            ))}
          </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          ФИЧИ — bento grid
      ═══════════════════════════════════════════════ */}
      <section className="py-16 sm:py-24 lg:py-28 px-3 sm:px-4">
        <div className="max-w-6xl mx-auto min-w-0">
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-center mb-10 sm:mb-16 px-1"
          >
            <Badge variant="outline" className="mb-4 border-violet-500/40 text-violet-400 bg-violet-500/8 px-4 py-1 rounded-full uppercase tracking-widest text-[10px] font-bold">
              {t("features.badge")}
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-black tracking-tight mb-4">
              {t("features.title")}{" "}
              <span className="text-violet-400">{t("features.titleAccent")}</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
              {t("features.subtitle")}
            </p>
          </motion.div>

          {/* Bento grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">

            {/* Big feature — span 2 cols */}
            <motion.div
              variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={0}
              className="sm:col-span-2 rounded-3xl border border-white/10 bg-gradient-to-br from-primary/15 to-violet-500/10 p-5 sm:p-8 relative overflow-hidden group hover:border-primary/30 transition-colors"
            >
              <div className="absolute -bottom-8 -right-8 w-48 h-48 rounded-full bg-primary/15 blur-3xl pointer-events-none group-hover:bg-primary/25 transition-colors hidden md:block" />
              <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mb-5">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-2xl font-black mb-3">{t("features.ai60Title")}</h3>
              <p className="text-muted-foreground leading-relaxed mb-4 max-w-md">
                {t("features.ai60Desc")}
              </p>
              <div className="flex flex-wrap gap-2">
                {["DeepSeek", "Gemini 2.5 Flash", "OpenRouter"].map(m => (
                  <span key={m} className="text-[10px] font-bold uppercase tracking-widest border border-primary/20 rounded-full px-3 py-1 text-primary/80">{m}</span>
                ))}
              </div>
            </motion.div>

            <motion.div
              variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={1}
              className="rounded-3xl border border-white/10 bg-gradient-to-br from-sky-500/10 to-cyan-500/5 p-5 sm:p-7 relative overflow-hidden hover:border-sky-500/30 transition-colors group"
            >
              <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-sky-500/10 blur-2xl pointer-events-none hidden md:block" />
              <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center mb-4">
                <Map className="w-6 h-6 text-sky-400" />
              </div>
              <h3 className="text-lg font-black mb-2">{t("features.mapTitle")}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("features.mapDesc")}
              </p>
            </motion.div>

            <motion.div
              variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={2}
              className="rounded-3xl border border-white/10 bg-gradient-to-br from-orange-500/10 to-amber-500/5 p-5 sm:p-7 relative overflow-hidden hover:border-orange-500/30 transition-colors"
            >
              <div className="w-12 h-12 rounded-2xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center mb-4">
                <CloudSun className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="text-lg font-black mb-2">{t("features.weatherTitle")}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("features.weatherDesc")}
              </p>
            </motion.div>

            <motion.div
              variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={3}
              className="rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/10 to-green-500/5 p-5 sm:p-7 relative overflow-hidden hover:border-emerald-500/30 transition-colors"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-black mb-2">{t("features.chatTitle")}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("features.chatDesc")}
              </p>
            </motion.div>

            <motion.div
              variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={4}
              className="rounded-3xl border border-white/10 bg-gradient-to-br from-rose-500/10 to-pink-500/5 p-5 sm:p-7 relative overflow-hidden hover:border-rose-500/30 transition-colors"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center mb-4">
                <Wallet className="w-6 h-6 text-rose-400" />
              </div>
              <h3 className="text-lg font-black mb-2">{t("features.budgetTitle")}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("features.budgetDesc")}
              </p>
            </motion.div>

            {/* Big feature — span 2 cols */}
            <motion.div
              variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={5}
              className="sm:col-span-2 rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 p-5 sm:p-8 relative overflow-hidden hover:border-indigo-500/30 transition-colors group"
            >
              <div className="absolute -bottom-6 -left-6 w-40 h-40 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none hidden md:block" />
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center mb-5">
                <Users className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-2xl font-black mb-3">{t("features.socialTitle")}</h3>
              <p className="text-muted-foreground leading-relaxed max-w-md">
                {t("features.socialDesc")}
              </p>
            </motion.div>

            <motion.div
              variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={6}
              className="rounded-3xl border border-white/10 bg-gradient-to-br from-yellow-500/10 to-amber-500/5 p-5 sm:p-7 relative overflow-hidden hover:border-yellow-500/30 transition-colors"
            >
              <div className="w-12 h-12 rounded-2xl bg-yellow-500/15 border border-yellow-500/25 flex items-center justify-center mb-4">
                <Bot className="w-6 h-6 text-yellow-400" />
              </div>
              <h3 className="text-lg font-black mb-2">{t("features.guideTitle")}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("features.guideDesc")}
              </p>
            </motion.div>

          </div>
        </div>
      </section>

      {/* PRICING section removed */}
      {false && <section className="py-28 px-4" id="pricing">
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="outline" className="mb-4 border-yellow-500/40 text-yellow-400 bg-yellow-500/8 px-4 py-1 rounded-full uppercase tracking-widest text-[10px] font-bold">
              <Star className="w-3 h-3 mr-1" /> Тарифы
            </Badge>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
              Начните бесплатно,{" "}
              <span className="text-yellow-400">растите вместе с нами</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              TraveLLM развивается на поддержке пользователей. Подписка помогает оплачивать AI-модели и серверы.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {[
              {
                name: "Free",
                price: "0 ₽",
                period: "навсегда",
                icon: null,
                highlight: false,
                color: "border-border/50",
                cta: { href: "/auth", label: "Начать бесплатно", variant: "outline" as const },
                features: [
                  "3 генерации маршрута",
                  "10 AI-сообщений на маршрут",
                  "Интерактивная карта",
                  "Погода по дням",
                  "Публичные маршруты",
                  "Базовый AI-чат",
                ],
                missing: ["Приоритетная генерация", "История маршрутов без лимита", "AI-экономист"],
              },
              {
                name: "Pro",
                price: "399 ₽",
                period: "в месяц",
                icon: Zap,
                highlight: true,
                color: "border-yellow-400/50",
                badge: "Популярный",
                cta: { href: "/subscribe", label: "Поддержать проект", variant: "default" as const },
                features: [
                  "25 генераций маршрутов/мес",
                  "25 AI-сообщений на маршрут",
                  "Всё из Free",
                  "Gemini 2.0 Flash (быстрее)",
                  "AI-экономист для бюджета",
                  "Приоритетная обработка",
                  "Поддержка в Telegram",
                ],
                missing: [],
              },
              {
                name: "Max",
                price: "Скоро",
                period: "",
                icon: Crown,
                highlight: false,
                color: "border-purple-400/30",
                cta: { href: "https://t.me/TraveLLM_AI", label: "Следить за обновлением", variant: "outline" as const },
                features: [
                  "50 генераций маршрутов/мес",
                  "50 AI-сообщений на маршрут",
                  "Всё из Pro",
                  "Групповые поездки (до 10 чел.)",
                  "Экспорт в PDF / Google Docs",
                  "Персональный AI-консьерж",
                  "Ранний доступ к фичам",
                ],
                missing: [],
              },
            ].map((tier, i) => (
              <motion.div
                key={tier.name}
                variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i}
                className={cn(
                  "relative rounded-3xl border p-7 flex flex-col bg-card/40 backdrop-blur-sm transition-all duration-300",
                  tier.color,
                  tier.highlight && "ring-1 ring-yellow-400/40 shadow-md md:shadow-2xl shadow-yellow-400/5 scale-[1.02]"
                )}
              >
                {tier.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <Badge className="bg-yellow-400 text-black text-xs font-black px-4 py-1 rounded-full">
                      ⭐ Популярный
                    </Badge>
                  </div>
                )}

                <div className="flex items-center gap-2.5 mb-5">
                  {tier.icon && <tier.icon className={cn("w-5 h-5", tier.name === "Pro" ? "text-yellow-400" : "text-purple-400")} />}
                  <span className="text-lg font-black">{tier.name}</span>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-black">{tier.price}</span>
                  {tier.period && <span className="text-sm text-muted-foreground ml-1.5">{tier.period}</span>}
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {tier.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                  {tier.missing?.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground/50">
                      <X className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link href={tier.cta.href}>
                  <Button
                    variant={tier.cta.variant}
                    className={cn(
                      "w-full rounded-2xl h-12 font-bold",
                      tier.highlight && "bg-yellow-400 text-black hover:bg-yellow-300 border-none"
                    )}
                  >
                    {tier.cta.label} <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>

        </div>
      </section>}

      {/* ═══════════════════════════════════════════════
          FINAL CTA
      ═══════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 lg:py-32 px-3 sm:px-4 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-primary/15 rounded-full blur-[130px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/4 to-transparent" />
        </div>

        <motion.div
          variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
          className="relative z-10 max-w-3xl mx-auto text-center min-w-0 px-1"
        >
          {/* Mini testimonials */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mb-6 sm:mb-8">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            ))}
            <span className="text-sm text-muted-foreground ml-2 font-medium">{t("cta.stars")}</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tight mb-4 sm:mb-6 leading-tight">
            {t("cta.title")}{" "}
            <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-primary via-violet-400 to-sky-400 bg-clip-text text-transparent">
              {t("cta.titleAccent")}
            </span>
          </h2>
          <p className="text-base sm:text-xl text-muted-foreground mb-8 sm:mb-10 max-w-lg mx-auto leading-relaxed">
            {t("cta.subtitle")}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center px-2">
            <Link href="/plan" className="w-full max-w-md mx-auto sm:max-w-none sm:w-auto touch-manipulation">
              <Button
                size="lg"
                className="h-14 sm:h-16 w-full sm:w-auto px-8 sm:px-12 rounded-full text-base sm:text-lg font-black shadow-md md:shadow-2xl shadow-primary/40 bg-gradient-to-r from-primary to-violet-500 border-none hover:scale-[1.02] sm:hover:scale-105 transition-transform gap-3"
              >
                <Route className="w-5 h-5 shrink-0" />
                {t("cta.button")}
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-8 sm:mt-10 text-xs sm:text-sm text-muted-foreground px-2">
            {(["check1", "check2", "check3"] as const).map(key => (
              <div key={key} className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" />
                {t(`cta.${key}`)}
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      <LandingNewsSection />

      {/* FAQ — совпадает с JSON-LD FAQPage на главной (SEO) */}
      <section className="relative border-t border-border/40 py-14 sm:py-20 px-3 sm:px-4">
        <div className="max-w-3xl mx-auto min-w-0">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-8 text-center">
            {tm("faqSectionTitle")}
          </h2>
          <dl className="space-y-6 text-left">
            {(
              [
                ["faq1Q", "faq1A"],
                ["faq2Q", "faq2A"],
                ["faq3Q", "faq3A"],
                ["faq4Q", "faq4A"],
              ] as const
            ).map(([qk, ak]) => (
              <div key={qk} className="rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-5">
                <dt className="font-bold text-foreground mb-2">{tm(qk)}</dt>
                <dd className="text-sm sm:text-base text-muted-foreground leading-relaxed">{tm(ak)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <Footer />
    </div>
  )
}
