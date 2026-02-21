"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import {
  Sparkles, Map, MessageCircle, Plane, ArrowRight, X,
  Zap, Star, Globe, ChevronRight, Gift, CheckCircle2,
  ClipboardList, Bot, CalendarDays,
} from "lucide-react"

/* ───────────────────────────────────────────────
   CONTENT DATA
─────────────────────────────────────────────── */

const HOW_TO_STEPS = [
  {
    icon: ClipboardList,
    color: "#60a5fa",
    step: "01",
    title: "Заполни форму",
    desc: "Укажи страну, город назначения, даты поездки, бюджет и свои предпочтения (пляж, культура, гастро и т.д.).",
  },
  {
    icon: Bot,
    color: "#c084fc",
    step: "02",
    title: "AI строит маршрут",
    desc: "За несколько секунд нейросеть создаёт детальный план по дням с активностями, отелями и ресторанами.",
  },
  {
    icon: CalendarDays,
    color: "#34d399",
    step: "03",
    title: "Редактируй и бронируй",
    desc: "Доработай маршрут в AI-чате, смотри на карте, переходи на Aviasales и Яндекс.Отели по готовым ссылкам.",
  },
]

const SITE_FEATURES = [
  { icon: Zap, color: "#60a5fa", title: "AI-генерация", desc: "Маршруты от Gemini и DeepSeek" },
  { icon: Map, color: "#34d399", title: "2D / 3D карты", desc: "Все точки маршрута на карте" },
  { icon: MessageCircle, color: "#c084fc", title: "Мини-чат", desc: "Редактируй план в диалоге с AI" },
  { icon: Globe, color: "#fbbf24", title: "Ссылки на сервисы", desc: "Aviasales, Яндекс.Отели и др." },
  { icon: Plane, color: "#f87171", title: "История поездок", desc: "Все маршруты сохраняются в профиле" },
  { icon: Star, color: "#a78bfa", title: "Viral Spots", desc: "TikTok-тренды и хайповые места" },
]

/* ───────────────────────────────────────────────
   STORAGE HELPERS
─────────────────────────────────────────────── */

function getLsKey(userId?: string) {
  return userId ? `travellm_welcome_seen_${userId}` : "travellm_welcome_seen_anon"
}

function getSeenFlag(userId?: string): boolean {
  if (typeof window === "undefined") return true
  try { return !!localStorage.getItem(getLsKey(userId)) } catch { return true }
}

function setSeenFlag(userId?: string) {
  try { localStorage.setItem(getLsKey(userId), "1") } catch {}
}

/* ───────────────────────────────────────────────
   SHARED STYLED BUTTON
─────────────────────────────────────────────── */

function PrimaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex h-[50px] w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold text-white transition-all duration-200"
      style={{ background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)", boxShadow: "0 4px 24px rgba(99,102,241,0.4)" }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-1px)"
        e.currentTarget.style.boxShadow = "0 8px 32px rgba(99,102,241,0.55)"
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = ""
        e.currentTarget.style.boxShadow = "0 4px 24px rgba(99,102,241,0.4)"
      }}
    >
      {children}
    </button>
  )
}

/* ───────────────────────────────────────────────
   COMPONENT
─────────────────────────────────────────────── */

export function WelcomeModal() {
  const { user } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0) // 0=hero, 1=how-to, 2=features+free

  useEffect(() => {
    if (!user) return
    if (!getSeenFlag(user.id)) {
      const t = setTimeout(() => setOpen(true), 600)
      return () => clearTimeout(t)
    }
  }, [user])

  const close = () => { setSeenFlag(user?.id); setOpen(false) }
  const start = () => { setSeenFlag(user?.id); setOpen(false); router.push("/plan") }
  const next  = () => setStep(s => Math.min(s + 1, 2))

  const TOTAL_STEPS = 3

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.25 } }}
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(14px)" }}
          onClick={close}
        >
          <motion.div
            key="card"
            initial={{ scale: 0.92, opacity: 0, y: 32 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 12 }}
            transition={{ type: "spring", damping: 24, stiffness: 300, mass: 0.8 }}
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-[520px] overflow-hidden rounded-[2rem] shadow-2xl"
            style={{
              background: "linear-gradient(160deg, #0f1117 0%, #161b2e 50%, #0f1117 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {/* Ambient glows */}
            {[
              { top: "-8rem", right: "-8rem", color: "#6366f1", size: "18rem" },
              { bottom: "-6rem", left: "-6rem", color: "#0ea5e9", size: "16rem" },
            ].map((g, i) => (
              <div key={i} className="pointer-events-none absolute rounded-full opacity-[0.15]"
                style={{ ...g, width: g.size, height: g.size, background: `radial-gradient(circle, ${g.color} 0%, transparent 70%)`, filter: "blur(40px)" }} />
            ))}

            {/* Close */}
            <button onClick={close}
              className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full transition-all"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "rgba(255,255,255,0.8)" }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.4)" }}
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>

            {/* ── SLIDES ── */}
            <AnimatePresence mode="wait">

              {/* STEP 0 — HERO */}
              {step === 0 && (
                <motion.div key="s0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.22 }}
                  className="flex flex-col items-center px-8 pb-8 pt-10 text-center">

                  <motion.div
                    initial={{ scale: 0.5, rotate: -20, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    transition={{ type: "spring", damping: 14, stiffness: 200, delay: 0.12 }}
                    className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-3xl"
                    style={{ background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)", boxShadow: "0 0 48px rgba(99,102,241,0.5), 0 0 100px rgba(59,130,246,0.2)" }}
                  >
                    <Plane className="h-11 w-11 text-white" style={{ transform: "rotate(-10deg)" }} />
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} className="absolute h-1.5 w-1.5 rounded-full bg-white"
                        style={{ top: `${[8, 52, 20][i]}%`, right: `${[-8, -12, 78][i]}%` }}
                        animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
                        transition={{ duration: 2, delay: i * 0.6, repeat: Infinity, repeatDelay: 1 }} />
                    ))}
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
                    <div className="mb-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest"
                      style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.25)" }}>
                      <Star className="h-3 w-3" /> AI Travel Planner
                    </div>
                    <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight"
                      style={{ background: "linear-gradient(135deg, #fff 30%, #a5b4fc 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      Добро пожаловать<br />в TraveLLM!
                    </h1>
                    <p className="mt-3 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                      Умный AI-помощник для планирования идеальных путешествий. Маршрут, отели, билеты — за несколько секунд.
                    </p>
                  </motion.div>

                  {/* Free badge */}
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.38 }}
                    className="mt-5 flex items-center gap-2 rounded-2xl px-4 py-3 w-full"
                    style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)" }}>
                    <Gift className="h-5 w-5 flex-shrink-0" style={{ color: "#34d399" }} />
                    <div className="text-left">
                      <div className="text-xs font-bold" style={{ color: "#34d399" }}>1 бесплатная генерация для новых пользователей</div>
                      <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>Без привязки карты · Без ограничений по функциям</div>
                    </div>
                  </motion.div>

                  <motion.div className="mt-6 flex w-full flex-col gap-2.5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                    <PrimaryButton onClick={next}>
                      <Sparkles className="h-4 w-4" /> Как это работает? <ArrowRight className="h-4 w-4" />
                    </PrimaryButton>
                    <button onClick={start} className="text-xs font-medium transition-colors" style={{ color: "rgba(255,255,255,0.28)" }}
                      onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.6)" }}
                      onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.28)" }}>
                      Пропустить — сразу к маршруту
                    </button>
                  </motion.div>
                </motion.div>
              )}

              {/* STEP 1 — HOW TO CREATE */}
              {step === 1 && (
                <motion.div key="s1" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.22 }}
                  className="px-6 pb-7 pt-8">
                  <div className="mb-5 text-center">
                    <h2 className="text-xl font-black tracking-tight"
                      style={{ background: "linear-gradient(135deg, #fff 30%, #a5b4fc 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      Как создать маршрут
                    </h2>
                    <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      Три простых шага до идеальной поездки
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 mb-5">
                    {HOW_TO_STEPS.map((s, i) => {
                      const Icon = s.icon
                      return (
                        <motion.div key={s.step}
                          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.09 }}
                          className="flex items-start gap-3 rounded-2xl p-4"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                            style={{ background: `${s.color}22` }}>
                            <Icon className="h-4.5 w-4.5" style={{ color: s.color, width: "18px", height: "18px" }} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[10px] font-bold tabular-nums" style={{ color: s.color }}>Шаг {s.step}</span>
                              <span className="text-xs font-bold text-white">{s.title}</span>
                            </div>
                            <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{s.desc}</p>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>

                  {/* Quick tip */}
                  <div className="mb-5 flex items-center gap-2 rounded-xl p-3"
                    style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.18)" }}>
                    <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: "#818cf8" }} />
                    <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                      Нажми <strong className="text-white">«Создать маршрут»</strong> в сайдбаре слева или кнопку в шапке сайта — откроется форма плана.
                    </p>
                  </div>

                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.32 }}>
                    <PrimaryButton onClick={next}>
                      Что ещё есть на сайте? <ArrowRight className="h-4 w-4" />
                    </PrimaryButton>
                  </motion.div>
                </motion.div>
              )}

              {/* STEP 2 — FEATURES + FREE */}
              {step === 2 && (
                <motion.div key="s2" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}
                  className="px-6 pb-7 pt-8">
                  <div className="mb-4 text-center">
                    <h2 className="text-xl font-black tracking-tight"
                      style={{ background: "linear-gradient(135deg, #fff 30%, #a5b4fc 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      Что есть на сайте
                    </h2>
                    <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      Всё что нужно — в одном месте
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {SITE_FEATURES.map((f, i) => {
                      const Icon = f.icon
                      return (
                        <motion.div key={f.title}
                          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                          className="flex flex-col items-center rounded-xl p-3 text-center"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg"
                            style={{ background: `${f.color}22` }}>
                            <Icon className="h-4 w-4" style={{ color: f.color }} />
                          </div>
                          <div className="text-[11px] font-bold text-white leading-tight mb-0.5">{f.title}</div>
                          <div className="text-[10px] leading-tight" style={{ color: "rgba(255,255,255,0.4)" }}>{f.desc}</div>
                        </motion.div>
                      )
                    })}
                  </div>

                  {/* Free tier callout */}
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="mb-4 rounded-2xl p-4"
                    style={{ background: "linear-gradient(135deg, rgba(52,211,153,0.1) 0%, rgba(16,185,129,0.06) 100%)", border: "1px solid rgba(52,211,153,0.22)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Gift className="h-4 w-4" style={{ color: "#34d399" }} />
                      <span className="text-sm font-bold" style={{ color: "#34d399" }}>Бесплатный план</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      {[
                        "1 бесплатная AI-генерация маршрута",
                        "Полный доступ к картам и чату",
                        "Сохранение маршрута в профиле",
                        "Все ссылки на бронирование",
                      ].map(item => (
                        <div key={item} className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#34d399" }} />
                          <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>{item}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}>
                    <PrimaryButton onClick={start}>
                      <Sparkles className="h-4 w-4" /> Начать планировать <ArrowRight className="h-4 w-4" />
                    </PrimaryButton>
                  </motion.div>
                </motion.div>
              )}

            </AnimatePresence>

            {/* Step dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <button key={i} onClick={() => setStep(i)}
                  className="h-1 rounded-full transition-all duration-300 cursor-pointer"
                  style={{ width: step === i ? "20px" : "6px", background: step === i ? "#6366f1" : "rgba(255,255,255,0.15)" }} />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
