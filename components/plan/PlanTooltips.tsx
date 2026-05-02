"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslations } from "next-intl"
import { X, ArrowRight, ChevronLeft, MapPin, Globe, Wallet, Sparkles, Users, Route } from "lucide-react"

/* ── Storage helpers ── single stable key, no userId dependency ── */
const SEEN_KEY = "travellm_plan_hints_seen"
function getSeen() {
  if (typeof window === "undefined") return true
  try { return !!localStorage.getItem(SEEN_KEY) } catch { return true }
}
function setSeen() {
  try { localStorage.setItem(SEEN_KEY, "1") } catch {}
}

const HINTS = [
  { id: "hub", icon: MapPin, color: "#60a5fa" },
  { id: "inspiration", icon: Globe, color: "#34d399" },
  { id: "routeConstructor", icon: Route, color: "#34d399" },
  { id: "budget", icon: Wallet, color: "#fbbf24" },
  { id: "highlight", icon: Sparkles, color: "#c084fc" },
  { id: "team", icon: Users, color: "#f472b6" },
] as const

interface Props {
  forceShow?: boolean
}

export function PlanTooltips({ forceShow }: Props) {
  const t = useTranslations("plan.tooltips")
  const tc = useTranslations("common")
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (forceShow || !getSeen()) {
      const hasCookieBanner =
        typeof window !== "undefined" &&
        !localStorage.getItem("travellm_cookies_consent")
      const timer = setTimeout(() => setVisible(true), hasCookieBanner ? 8000 : 3500)
      return () => clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // run once on mount only

  const close = () => {
    setSeen()
    setVisible(false)
  }

  const next = () => {
    if (step < HINTS.length - 1) setStep(s => s + 1)
    else close()
  }

  const prev = () => setStep(s => Math.max(0, s - 1))

  const hint = HINTS[step]
  const Icon = hint.icon
  const isLast = step === HINTS.length - 1
  const title = t(`${hint.id}.title`)
  const body = t(`${hint.id}.body`)

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Overlay */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[990] pointer-events-none"
            style={{ background: "rgba(0,0,0,0.34)", backdropFilter: "blur(1px)" }}
          />

          {/* Hint card */}
          <motion.div
            key={`plan-hint-${step}`}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 22, stiffness: 300 }}
            className="fixed z-[995] left-1/2 bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] -translate-x-1/2 w-[min(92vw,400px)] pointer-events-auto sm:bottom-8"
          >
            <div
              className="relative rounded-2xl overflow-hidden shadow-2xl"
              style={{
                background: "linear-gradient(160deg,#0f1117 0%,#161b2e 100%)",
                border: "1px solid rgba(255,255,255,0.09)",
              }}
            >
              {/* Glow */}
              <div
                className="pointer-events-none absolute -top-10 -right-10 h-36 w-36 rounded-full opacity-25"
                style={{ background: `radial-gradient(circle, ${hint.color} 0%, transparent 70%)`, filter: "blur(28px)" }}
              />

              {/* Close */}
              <button
                onClick={close}
                className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full transition-all"
                style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.14)"; e.currentTarget.style.color = "#fff" }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "rgba(255,255,255,0.4)" }}
                aria-label={tc("close")}
              >
                <X className="h-3.5 w-3.5" />
              </button>

              <div className="p-5">
                {/* Badge */}
                <div className="mb-3 flex items-center gap-2.5">
                  <div
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                    style={{ background: `${hint.color}22` }}
                  >
                    <Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18, color: hint.color }} />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: hint.color }}>
                    {step + 1} / {HINTS.length}
                  </span>
                </div>

                <h3 className="text-base font-black text-white mb-2 pr-6">{title}</h3>
                <p className="text-[15px] leading-relaxed" style={{ color: "rgba(255,255,255,0.58)" }}>
                  {body}
                </p>

                {/* Controls */}
                <div className="mt-4 flex items-center gap-2">
                  {step > 0 && (
                    <button
                      onClick={prev}
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-all"
                      style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#fff" }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)" }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  )}

                  <button
                    onClick={next}
                    className="flex flex-1 h-9 items-center justify-center gap-1.5 rounded-xl text-sm font-bold text-white transition-all"
                    style={{
                      background: `linear-gradient(135deg, ${hint.color} 0%, ${hint.color}bb 100%)`,
                      boxShadow: `0 4px 20px ${hint.color}44`,
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.88" }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1" }}
                  >
                    {isLast ? t("finish") : <>{tc("next")} <ArrowRight className="h-3.5 w-3.5" /></>}
                  </button>
                </div>

                {/* Progress dots */}
                <div className="mt-3 flex justify-center gap-1.5">
                  {HINTS.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setStep(i)}
                      className="h-1 rounded-full transition-all duration-300"
                      style={{
                        width: i === step ? "18px" : "5px",
                        background: i === step ? hint.color : "rgba(255,255,255,0.15)",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
