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
import { VideoText } from "@/components/ui/video-text"
import { FloatingIcons } from "@/components/FloatingIcons"
import { ItineraryPreview } from "@/components/landing/ItineraryPreview"
import { cn } from "@/lib/utils"

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
      <section className="relative min-h-[100svh] flex flex-col items-center justify-center px-4 pt-20 pb-16 overflow-hidden">

        {/* Ambient background */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <FloatingIcons />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute top-2/3 right-0 w-[400px] h-[400px] rounded-full bg-violet-500/8 blur-[100px]" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center max-w-5xl mx-auto w-full">

          {/* Eyebrow */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
            <Badge variant="outline" className="mb-8 px-4 py-1.5 rounded-full border-primary/30 bg-primary/5 text-primary text-xs font-semibold tracking-widest uppercase gap-2">
              <Sparkles className="w-3 h-3" /> AI-планировщик путешествий
            </Badge>
          </motion.div>

          {/* VideoText logo */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={1} className="w-full max-w-3xl mb-2">
            <div className="relative w-full h-[100px] md:h-[150px] overflow-hidden rounded-2xl">
              <VideoText src="https://cdn.magicui.design/ocean-small.webm" className="font-black" fontSize={14}>
                TraveLLM
              </VideoText>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp} initial="hidden" animate="show" custom={2}
            className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6"
          >
            Полный маршрут{" "}
            <span className="bg-gradient-to-r from-sky-400 via-primary to-violet-400 bg-clip-text text-transparent">
              за 60 секунд
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp} initial="hidden" animate="show" custom={3}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed"
          >
            Скажите куда хотите — AI сгенерирует маршрут по дням, найдёт рейсы и отели,
            покажет на карте и ответит на любой вопрос в чате.
          </motion.p>

          {/* CTA */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4} className="flex flex-col sm:flex-row gap-3 mb-14">
            <Link href="/plan">
              <Button size="lg" className="h-14 px-10 rounded-full text-base font-bold shadow-2xl shadow-primary/30 bg-gradient-to-r from-primary to-violet-500 border-none hover:scale-105 transition-transform gap-2">
                Создать маршрут <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            {user ? (
              <Link href="/trips">
                <Button size="lg" variant="outline" className="h-14 px-8 rounded-full text-base font-bold border-white/20 backdrop-blur-md">
                  Мои поездки
                </Button>
              </Link>
            ) : (
              <Link href="/auth">
                <Button size="lg" variant="outline" className="h-14 px-8 rounded-full text-base font-bold border-white/20 backdrop-blur-md">
                  Войти бесплатно
                </Button>
              </Link>
            )}
          </motion.div>

          {/* Stats row */}
          <motion.div
            variants={fadeUp} initial="hidden" animate="show" custom={5}
            className="flex flex-wrap items-center justify-center gap-6 md:gap-10"
          >
            {[
              { value: 1200, suffix: "+", label: "маршрутов создано" },
              { value: 50,   suffix: "+", label: "стран в базе" },
              { value: 20,   suffix: "+", label: "часов экономии" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl md:text-4xl font-black text-foreground">
                  <Counter to={s.value} suffix={s.suffix} />
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">{s.label}</div>
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
      <section className="relative py-28 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="outline" className="mb-4 border-sky-500/40 text-sky-500 bg-sky-500/8 px-4 py-1 rounded-full uppercase tracking-widest text-[10px] font-bold">
              Как это работает
            </Badge>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
              От идеи до поездки —{" "}
              <span className="text-primary">три шага</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Никаких таблиц, форумов и часов поиска. Просто опишите мечту.
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
                title: "Опишите желание",
                desc: "Куда летите, на сколько дней, какой бюджет, с кем едете. Можно написать всё свободным текстом — AI поймёт.",
              },
              {
                num: "02",
                icon: <Bot className="w-6 h-6" />,
                color: "from-primary/20 to-primary/5 border-primary/20",
                iconColor: "text-primary",
                title: "AI строит план",
                desc: "За 30–60 секунд генерируется маршрут по дням с активностями, картой, ценами на билеты и отелями.",
              },
              {
                num: "03",
                icon: <Globe className="w-6 h-6" />,
                color: "from-violet-500/20 to-violet-500/5 border-violet-500/20",
                iconColor: "text-violet-400",
                title: "Живите моментом",
                desc: "Открывайте маршрут прямо в путешествии. AI-гид рядом, карта работает офлайн, каждый день спланирован.",
              },
            ].map((step, i) => (
              <motion.div
                key={step.num}
                variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i}
                className={cn(
                  "relative rounded-3xl border bg-gradient-to-b p-8 flex flex-col gap-4",
                  step.color
                )}
              >
                <div className="absolute top-6 right-6 text-6xl font-black text-foreground/5 leading-none select-none">{step.num}</div>
                <div className={cn("w-12 h-12 rounded-2xl bg-background/60 backdrop-blur-md border border-white/10 flex items-center justify-center", step.iconColor)}>
                  {step.icon}
                </div>
                <h3 className="text-xl font-black">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          ПРЕВЬЮ РЕАЛЬНОГО МАРШРУТА
      ═══════════════════════════════════════════════ */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-center mb-12"
          >
            <Badge variant="outline" className="mb-4 border-emerald-500/40 text-emerald-400 bg-emerald-500/8 px-4 py-1 rounded-full uppercase tracking-widest text-[10px] font-bold">
              Реальный результат
            </Badge>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
              Вот что вы получите{" "}
              <span className="text-emerald-400">через 60 секунд</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Это не макет — именно так выглядит ваш маршрут в приложении.
              Листайте дни и изучайте план.
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
      <section className="py-28 px-4 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/4 to-transparent" />
        </div>

        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="outline" className="mb-4 border-rose-500/40 text-rose-400 bg-rose-500/8 px-4 py-1 rounded-full uppercase tracking-widest text-[10px] font-bold">
              Почему TraveLLM
            </Badge>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
              Мы делаем то,{" "}
              <span className="bg-gradient-to-r from-rose-400 to-orange-400 bg-clip-text text-transparent">
                чего нет у других
              </span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Обычные сервисы предлагают справочники. Мы строим ваш личный маршрут.
            </p>
          </motion.div>

          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="rounded-3xl border border-white/10 overflow-hidden bg-card/30 backdrop-blur-xl"
          >
            {/* Table header */}
            <div className="grid grid-cols-3 border-b border-white/10">
              <div className="p-5 text-sm font-bold text-muted-foreground">Возможность</div>
              <div className="p-5 text-center text-sm font-bold text-muted-foreground border-l border-white/10">
                Booking / TripAdvisor / Tonkosti
              </div>
              <div className="p-5 text-center border-l border-white/10 bg-primary/8">
                <span className="text-sm font-black text-primary">TraveLLM ✦</span>
              </div>
            </div>

            {[
              { feat: "Полный маршрут по дням за 1 мин", them: false, us: true },
              { feat: "AI-чат для изменения любого дня", them: false, us: true },
              { feat: "Интерактивная карта маршрута", them: false, us: true },
              { feat: "Погода по дням поездки", them: false, us: true },
              { feat: "Реальные цены на авиабилеты", them: "частично", us: true },
              { feat: "Трекер бюджета и расходов", them: false, us: true },
              { feat: "Совместное планирование", them: false, us: true },
              { feat: "Публичные поездки / вдохновение", them: false, us: true },
              { feat: "AI-гид прямо на месте", them: false, us: true },
              { feat: "Полностью на русском языке", them: "частично", us: true },
            ].map((row, i) => (
              <div
                key={row.feat}
                className={cn("grid grid-cols-3 border-b border-white/5 last:border-b-0 hover:bg-white/2 transition-colors", i % 2 === 0 ? "" : "bg-white/1")}
              >
                <div className="p-4 text-sm font-medium">{row.feat}</div>
                <div className="p-4 flex items-center justify-center border-l border-white/10">
                  {row.them === true ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : row.them === "частично" ? (
                    <span className="text-xs text-muted-foreground font-medium">частично</span>
                  ) : (
                    <X className="w-4 h-4 text-red-400/60" />
                  )}
                </div>
                <div className="p-4 flex items-center justify-center border-l border-white/10 bg-primary/5">
                  <Check className="w-5 h-5 text-primary font-bold" />
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          ФИЧИ — bento grid
      ═══════════════════════════════════════════════ */}
      <section className="py-28 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="outline" className="mb-4 border-violet-500/40 text-violet-400 bg-violet-500/8 px-4 py-1 rounded-full uppercase tracking-widest text-[10px] font-bold">
              Возможности
            </Badge>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
              Всё что нужно —{" "}
              <span className="text-violet-400">в одном месте</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              От генерации до возвращения домой — TraveLLM сопровождает вас на каждом шаге
            </p>
          </motion.div>

          {/* Bento grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">

            {/* Big feature — span 2 cols */}
            <motion.div
              variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={0}
              className="sm:col-span-2 rounded-3xl border border-white/10 bg-gradient-to-br from-primary/15 to-violet-500/10 p-8 relative overflow-hidden group hover:border-primary/30 transition-colors"
            >
              <div className="absolute -bottom-8 -right-8 w-48 h-48 rounded-full bg-primary/15 blur-3xl pointer-events-none group-hover:bg-primary/25 transition-colors" />
              <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mb-5">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-2xl font-black mb-3">AI-генерация за 60 секунд</h3>
              <p className="text-muted-foreground leading-relaxed mb-4 max-w-md">
                Введите направление и даты — получите полный маршрут по дням с описаниями, ценами,
                временем и адресами. Для маршрутов 7+ дней работает посегментная генерация.
              </p>
              <div className="flex flex-wrap gap-2">
                {["DeepSeek", "Gemini 2.0", "OpenRouter"].map(m => (
                  <span key={m} className="text-[10px] font-bold uppercase tracking-widest border border-primary/20 rounded-full px-3 py-1 text-primary/80">{m}</span>
                ))}
              </div>
            </motion.div>

            <motion.div
              variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={1}
              className="rounded-3xl border border-white/10 bg-gradient-to-br from-sky-500/10 to-cyan-500/5 p-7 relative overflow-hidden hover:border-sky-500/30 transition-colors group"
            >
              <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-sky-500/10 blur-2xl pointer-events-none" />
              <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center mb-4">
                <Map className="w-6 h-6 text-sky-400" />
              </div>
              <h3 className="text-lg font-black mb-2">Интерактивная карта</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Все точки маршрута на карте MapLibre. Кластеры, маршруты, 2D/3D вид.
              </p>
            </motion.div>

            <motion.div
              variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={2}
              className="rounded-3xl border border-white/10 bg-gradient-to-br from-orange-500/10 to-amber-500/5 p-7 relative overflow-hidden hover:border-orange-500/30 transition-colors"
            >
              <div className="w-12 h-12 rounded-2xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center mb-4">
                <CloudSun className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="text-lg font-black mb-2">Погода по дням</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Прогноз OpenWeather для каждого дня маршрута прямо в карточке дня.
              </p>
            </motion.div>

            <motion.div
              variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={3}
              className="rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/10 to-green-500/5 p-7 relative overflow-hidden hover:border-emerald-500/30 transition-colors"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-black mb-2">AI-чат для изменений</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                «Замени музей на кафе в день 3» — AI моментально обновит маршрут без перегенерации.
              </p>
            </motion.div>

            <motion.div
              variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={4}
              className="rounded-3xl border border-white/10 bg-gradient-to-br from-rose-500/10 to-pink-500/5 p-7 relative overflow-hidden hover:border-rose-500/30 transition-colors"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center mb-4">
                <Wallet className="w-6 h-6 text-rose-400" />
              </div>
              <h3 className="text-lg font-black mb-2">Бюджет и расходы</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ведите трекер расходов во время поездки. AI-экономист предупреждает о перерасходе.
              </p>
            </motion.div>

            {/* Big feature — span 2 cols */}
            <motion.div
              variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={5}
              className="sm:col-span-2 rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 p-8 relative overflow-hidden hover:border-indigo-500/30 transition-colors group"
            >
              <div className="absolute -bottom-6 -left-6 w-40 h-40 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center mb-5">
                <Users className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-2xl font-black mb-3">Совместное планирование и шеринг</h3>
              <p className="text-muted-foreground leading-relaxed max-w-md">
                Поделитесь маршрутом с друзьями по ссылке, планируйте вместе.
                Публичные поездки вдохновляют других путешественников.
                Скачайте Story-карточку для Instagram и TikTok.
              </p>
            </motion.div>

            <motion.div
              variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={6}
              className="rounded-3xl border border-white/10 bg-gradient-to-br from-yellow-500/10 to-amber-500/5 p-7 relative overflow-hidden hover:border-yellow-500/30 transition-colors"
            >
              <div className="w-12 h-12 rounded-2xl bg-yellow-500/15 border border-yellow-500/25 flex items-center justify-center mb-4">
                <Bot className="w-6 h-6 text-yellow-400" />
              </div>
              <h3 className="text-lg font-black mb-2">AI-гид в реальном времени</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Задайте вопрос про текущее место — гид знает где вы и что рядом.
              </p>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          PRICING
      ═══════════════════════════════════════════════ */}
      <section className="py-28 px-4" id="pricing">
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
                  "25 генераций маршрутов/мес",
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
                  "50 генераций маршрутов/мес",
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
                  "100 генераций маршрутов/мес",
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
                  tier.highlight && "ring-1 ring-yellow-400/40 shadow-2xl shadow-yellow-400/5 scale-[1.02]"
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

          <motion.p
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-center text-xs text-muted-foreground/60 mt-8"
          >
            После оплаты напишите в{" "}
            <a href="https://t.me/myszf" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Telegram @myszf
            </a>{" "}
            — активируем вручную в течение 24 часов.
          </motion.p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          FINAL CTA
      ═══════════════════════════════════════════════ */}
      <section className="py-32 px-4 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-primary/15 rounded-full blur-[130px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/4 to-transparent" />
        </div>

        <motion.div
          variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
          className="relative z-10 max-w-3xl mx-auto text-center"
        >
          {/* Mini testimonials */}
          <div className="flex items-center justify-center gap-1.5 mb-8">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            ))}
            <span className="text-sm text-muted-foreground ml-2 font-medium">Сотни довольных путешественников</span>
          </div>

          <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-6">
            Ваш следующий маршрут{" "}
            <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-primary via-violet-400 to-sky-400 bg-clip-text text-transparent">
              уже ждёт вас
            </span>
          </h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-lg mx-auto">
            Бесплатно. Без карты. За 60 секунд.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/plan">
              <Button
                size="lg"
                className="h-16 px-12 rounded-full text-lg font-black shadow-2xl shadow-primary/40 bg-gradient-to-r from-primary to-violet-500 border-none hover:scale-105 transition-transform gap-3"
              >
                <Route className="w-5 h-5" />
                Создать маршрут — бесплатно
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-muted-foreground">
            {["Без регистрации карты", "Маршрут за 60 сек", "25 генераций бесплатно"].map(t => (
              <div key={t} className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" />
                {t}
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  )
}
