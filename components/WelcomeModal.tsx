"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { X, Sparkles, Map, MessageCircle, Users } from "lucide-react"

const FEATURES = [
  {
    icon: Sparkles,
    color: "text-blue-400",
    bg: "from-blue-500/20 to-indigo-500/20",
    border: "border-blue-500/20",
    title: "AI-маршрут за секунды",
    desc: "Нейросеть составит детальный план с отелями, ресторанами и активностями",
  },
  {
    icon: Map,
    color: "text-emerald-400",
    bg: "from-emerald-500/20 to-teal-500/20",
    border: "border-emerald-500/20",
    title: "Интерактивные карты",
    desc: "2D и 3D виды маршрута, точки интереса прямо на карте",
  },
  {
    icon: MessageCircle,
    color: "text-purple-400",
    bg: "from-purple-500/20 to-pink-500/20",
    border: "border-purple-500/20",
    title: "AI-ассистент",
    desc: "Редактируйте план и задавайте вопросы прямо в чате",
  },
  {
    icon: Users,
    color: "text-amber-400",
    bg: "from-amber-500/20 to-orange-500/20",
    border: "border-amber-500/20",
    title: "Совместные поездки",
    desc: "Делитесь маршрутами с друзьями и планируйте вместе",
  },
]

const LS_KEY = "travellm_welcome_seen"

function getSeenFlag(): boolean {
  if (typeof window === "undefined") return true
  try {
    return !!localStorage.getItem(LS_KEY)
  } catch {
    return true
  }
}

function setSeenFlag() {
  try {
    localStorage.setItem(LS_KEY, "1")
  } catch {}
}

export function WelcomeModal() {
  const { user } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    if (!getSeenFlag()) {
      const t = setTimeout(() => setOpen(true), 700)
      return () => clearTimeout(t)
    }
  }, [user])

  const handleStart = () => {
    setSeenFlag()
    setOpen(false)
    router.push("/plan")
  }

  const handleClose = () => {
    setSeenFlag()
    setOpen(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/65 backdrop-blur-md p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 28 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 8 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-card border border-border rounded-3xl p-7 shadow-2xl overflow-hidden"
          >
            {/* Decorative glows */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-blue-500/8 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-purple-500/8 blur-3xl pointer-events-none" />

            {/* Close */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors rounded-full p-1.5 hover:bg-muted/60"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="text-center mb-6 relative">
              <div className="text-5xl mb-3 select-none">✈️</div>
              <h1 className="text-2xl font-black text-foreground mb-1.5 tracking-tight">
                Добро пожаловать в TraveLLM!
              </h1>
              <p className="text-sm text-muted-foreground">
                Ваш умный AI-помощник для планирования идеальных путешествий
              </p>
            </div>

            {/* Features 2×2 grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {FEATURES.map((f) => {
                const Icon = f.icon
                return (
                  <div
                    key={f.title}
                    className={`p-3.5 rounded-2xl bg-gradient-to-br ${f.bg} border ${f.border}`}
                  >
                    <Icon className={`h-5 w-5 ${f.color} mb-1.5`} />
                    <div className="text-xs font-semibold text-foreground leading-tight mb-1">
                      {f.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground leading-relaxed">
                      {f.desc}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* CTA */}
            <Button
              onClick={handleStart}
              className="w-full h-12 rounded-2xl text-base font-bold gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Начать планировать
            </Button>
            <p className="text-center text-[11px] text-muted-foreground mt-3">
              Первый маршрут бесплатно · Без привязки карты
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
