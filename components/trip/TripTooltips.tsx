"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ArrowRight, CalendarDays, Map, MessageCircle, BedDouble, ChevronLeft } from "lucide-react"

/* ── Storage helpers ── */
function getKey(userId?: string) {
  return userId ? `travellm_trip_hints_seen_${userId}` : "travellm_trip_hints_seen_anon"
}
function getSeen(userId?: string) {
  if (typeof window === "undefined") return true
  try { return !!localStorage.getItem(getKey(userId)) } catch { return true }
}
function setSeen(userId?: string) {
  try { localStorage.setItem(getKey(userId), "1") } catch {}
}

/* ── Hint definitions ── */
const HINTS = [
  {
    id: "days",
    icon: CalendarDays,
    color: "#60a5fa",
    title: "Навигация по дням",
    body: "Щёлкни на любой день чтобы увидеть его план. Дни с ✈️ — дни перелётов. Прокручивается горизонтально.",
    anchor: "top-center", // visual hint position (decorative only — we show a floating popover)
  },
  {
    id: "activities",
    icon: CalendarDays,
    color: "#c084fc",
    title: "Активности дня",
    body: "Карточки показывают расписание: время, место, стоимость. Кнопка «Открыть» — прямая ссылка на бронирование.",
    anchor: "center",
  },
  {
    id: "map",
    icon: Map,
    color: "#34d399",
    title: "Карта маршрута",
    body: "Все точки выбранного дня отображаются на карте. Попробуй нажать на маркер — откроется миникарточка места.",
    anchor: "center",
  },
  {
    id: "chat",
    icon: MessageCircle,
    color: "#f472b6",
    title: "AI-ассистент",
    body: "Кнопка чата (💬) в правом нижнем углу на телефоне и справа с верху на компьютере. Можно попросить AI изменить маршрут: «добавь ещё один ресторан» или «сократи день 3».",
    anchor: "bottom-right",
  },
  {
    id: "hotel",
    icon: BedDouble,
    color: "#fbbf24",
    title: "Отели и перелёты",
    body: "В боковой панели справа — рекомендованный отель и рейс для каждого дня. Кнопка «Забронировать» ведёт на Aviasales или Яндекс.Отели.",
    anchor: "right",
  },
]

interface Props {
  userId?: string
  /** Pass true to force-show (e.g. for testing) */
  forceShow?: boolean
}

export function TripTooltips({ userId, forceShow }: Props) {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (forceShow || !getSeen(userId)) {
      const t = setTimeout(() => setVisible(true), 4200) // let the user orient before interrupting
      return () => clearTimeout(t)
    }
  }, [userId, forceShow])

  const close = () => {
    setSeen(userId)
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

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Dark overlay */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[990] pointer-events-none"
            style={{ background: "rgba(0,0,0,0.34)", backdropFilter: "blur(1px)" }}
          />

          {/* Floating hint card — centred on screen */}
          <motion.div
            key={`hint-${step}`}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 22, stiffness: 300 }}
            className="fixed z-[995] left-1/2 bottom-8 -translate-x-1/2 w-[min(92vw,380px)] pointer-events-auto"
          >
            <div
              className="relative rounded-2xl shadow-md md:shadow-2xl overflow-hidden"
              style={{
                background: "linear-gradient(160deg,#0f1117 0%,#161b2e 100%)",
                border: "1px solid rgba(255,255,255,0.09)",
              }}
            >
              {/* Glow accent */}
              <div
                className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full opacity-25"
                style={{ background: `radial-gradient(circle, ${hint.color} 0%, transparent 70%)`, filter: "blur(24px)" }}
              />

              {/* Close */}
              <button
                onClick={close}
                className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full transition"
                style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.14)"; e.currentTarget.style.color = "rgba(255,255,255,0.8)" }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "rgba(255,255,255,0.4)" }}
                aria-label="Закрыть подсказки"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              <div className="p-5">
                {/* Step badge */}
                <div className="mb-3 flex items-center gap-2">
                  <div
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
                    style={{ background: `${hint.color}22` }}
                  >
                    <Icon className="h-4 w-4" style={{ color: hint.color }} />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: hint.color }}>
                    {step + 1} / {HINTS.length}
                  </span>
                </div>

                <h3 className="text-base font-black text-white mb-1.5 pr-6">{hint.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                  {hint.body}
                </p>

                {/* Controls */}
                <div className="mt-4 flex items-center gap-2">
                  {step > 0 && (
                    <button
                      onClick={prev}
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition"
                      style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#fff" }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)" }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  )}

                  <button
                    onClick={next}
                    className="flex flex-1 h-9 items-center justify-center gap-1.5 rounded-xl text-sm font-bold text-white transition"
                    style={{
                      background: `linear-gradient(135deg, ${hint.color} 0%, ${hint.color}bb 100%)`,
                      boxShadow: `0 4px 20px ${hint.color}44`,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = "0.88" }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = "1" }}
                  >
                    {isLast ? "Понятно, поехали!" : (
                      <>Дальше <ArrowRight className="h-3.5 w-3.5" /></>
                    )}
                  </button>
                </div>

                {/* Progress dots */}
                <div className="mt-3 flex justify-center gap-1.5">
                  {HINTS.map((_, i) => (
                    <button
                      key={i}
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
