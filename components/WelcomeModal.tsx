"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  Sparkles, Handshake, MessageCircle, Plane, ArrowRight, X,
  Zap, Star, Globe, ChevronRight, Gift, CheckCircle2,
  ClipboardList, Bot, CalendarDays,
} from "lucide-react"

const STEP_ICONS = [ClipboardList, Bot, CalendarDays]
const STEP_COLORS = ["#60a5fa", "#c084fc", "#34d399"]

const FEATURE_ICONS = [Zap, Handshake, MessageCircle, Globe, Plane, Star]
const FEATURE_COLORS = ["#60a5fa", "#34d399", "#c084fc", "#fbbf24", "#f87171", "#a78bfa"]

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
  const t = useTranslations("onboarding")
  const tc = useTranslations("common")
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
            className="relative w-full max-w-[520px] overflow-hidden rounded-[2rem] shadow-md md:shadow-2xl"
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
              aria-label={tc("close")}
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
                      {t("welcome")}
                    </h1>
                    <p className="mt-3 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                      {t("subtitle")}
                    </p>
                  </motion.div>

                  {/* Free tier badge */}
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.38 }}
                    className="mt-5 flex items-center gap-2 rounded-2xl px-4 py-3 w-full"
                    style={{ background: "rgba(133,173,255,0.1)", border: "1px solid rgba(133,173,255,0.2)" }}>
                    <Gift className="h-5 w-5 flex-shrink-0" style={{ color: "#85adff" }} />
                    <div className="text-left">
                      <div className="text-xs font-bold" style={{ color: "#85adff" }}>{t("freeTier.generations")}</div>
                      <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>{t("freeTier.noCard")}</div>
                    </div>
                  </motion.div>

                  <motion.div className="mt-6 flex w-full flex-col gap-2.5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                    <PrimaryButton onClick={next}>
                      <Sparkles className="h-4 w-4" /> {t("howItWorks")} <ArrowRight className="h-4 w-4" />
                    </PrimaryButton>
                    <button onClick={start} className="text-xs font-medium transition-colors" style={{ color: "rgba(255,255,255,0.28)" }}
                      onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.6)" }}
                      onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.28)" }}>
                      {t("skip")}
                    </button>
                  </motion.div>
                </motion.div>
              )}

              {/* STEP 1 — HOW TO CREATE */}
              {step === 1 && (
                <motion.div key="s1" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.22 }}
                  className="px-6 pb-7 pt-8">
                  <div className="mb-5 text-center">
                    <h2 className="text-2xl font-black tracking-tight sm:text-[1.65rem]"
                      style={{ background: "linear-gradient(135deg, #fff 30%, #a5b4fc 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      {t("howToCreate")}
                    </h2>
                    <p className="mt-2 text-sm leading-snug" style={{ color: "rgba(255,255,255,0.45)" }}>
                      {t("threeSteps")}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 mb-5">
                    {STEP_ICONS.map((Icon, i) => {
                      const stepKey = String(i) as "0" | "1" | "2"
                      const color = STEP_COLORS[i]
                      return (
                        <motion.div key={i}
                          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.09 }}
                          className="flex items-start gap-3 rounded-2xl p-4"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                            style={{ background: `${color}22` }}>
                            <Icon style={{ color, width: "20px", height: "20px" }} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-xs font-bold tabular-nums" style={{ color }}>{t(`steps.${stepKey}.step`)}</span>
                              <span className="text-sm font-bold text-white">{t(`steps.${stepKey}.title`)}</span>
                            </div>
                            <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>{t(`steps.${stepKey}.desc`)}</p>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>

                  {/* Quick tip */}
                  <div className="mb-5 flex items-start gap-2 rounded-xl p-3.5"
                    style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.18)" }}>
                    <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: "#818cf8" }} />
                    <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                      {t("tip")}
                    </p>
                  </div>

                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.32 }}>
                    <PrimaryButton onClick={next}>
                      {t("whatElse")} <ArrowRight className="h-4 w-4" />
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
                      {t("whatElse")}
                    </h2>
                    <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {t("allInOne")}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {FEATURE_ICONS.map((Icon, i) => {
                      const fKey = String(i) as "0" | "1" | "2" | "3" | "4" | "5"
                      const color = FEATURE_COLORS[i]
                      return (
                        <motion.div key={i}
                          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                          className="flex flex-col items-center rounded-xl p-3 text-center"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg"
                            style={{ background: `${color}22` }}>
                            <Icon className="h-4 w-4" style={{ color }} />
                          </div>
                          <div className="text-xs font-bold text-white leading-tight mb-1">{t(`features.${fKey}.title`)}</div>
                          <div className="text-[11px] leading-snug" style={{ color: "rgba(255,255,255,0.45)" }}>{t(`features.${fKey}.desc`)}</div>
                        </motion.div>
                      )
                    })}
                  </div>

                  {/* Free tier callout */}
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="mb-4 rounded-2xl p-4"
                    style={{ background: "linear-gradient(135deg, rgba(133,173,255,0.1) 0%, rgba(172,137,255,0.06) 100%)", border: "1px solid rgba(133,173,255,0.22)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Gift className="h-4 w-4" style={{ color: "#85adff" }} />
                      <span className="text-sm font-bold" style={{ color: "#85adff" }}>{t("freeTierTitle")}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      {(["generations", "access", "save", "links"] as const).map(key => (
                        <div key={key} className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#85adff" }} />
                          <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>{t(`freeTier.${key}`)}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}>
                    <PrimaryButton onClick={start}>
                      <Sparkles className="h-4 w-4" /> {t("finish")} <ArrowRight className="h-4 w-4" />
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
