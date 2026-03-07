"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Send } from "lucide-react"

const TG_URL = "https://t.me/TraveLLM_AI"
const STORAGE_KEY = "tg-toast-dismissed"
const DISMISS_DAYS = 14

export function TelegramToast() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY)
    const threshold = DISMISS_DAYS * 24 * 60 * 60 * 1000
    const lastDismissed = dismissed ? parseInt(dismissed) : 0

    if (Date.now() - lastDismissed > threshold) {
      const timer = setTimeout(() => setVisible(true), 8000)
      return () => clearTimeout(timer)
    }
  }, [])

  const dismiss = () => {
    setVisible(false)
    localStorage.setItem(STORAGE_KEY, Date.now().toString())
  }

  const handleClick = () => {
    window.open(TG_URL, "_blank", "noopener,noreferrer")
    dismiss()
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60, scale: 0.92 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-[200] w-[calc(100vw-2rem)] sm:w-80"
        >
          <div className="relative overflow-hidden rounded-2xl border border-sky-500/30 bg-background/85 backdrop-blur-md md:backdrop-blur-2xl shadow-md md:shadow-2xl shadow-sky-500/10 p-5">
            {/* Glow orb */}
            <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-sky-500/15 blur-3xl hidden md:block" />
            <div className="pointer-events-none absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-blue-600/10 blur-3xl hidden md:block" />

            {/* Close */}
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors rounded-lg p-1 hover:bg-white/5"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <div className="flex items-start gap-3.5">
              {/* Icon */}
              <div className="shrink-0 h-10 w-10 rounded-xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center">
                <Send className="h-5 w-5 text-sky-400" />
              </div>

              <div className="flex-1 min-w-0 pr-4">
                <p className="text-sm font-bold text-foreground leading-tight mb-0.5">
                  Следите за обновлениями
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Новые функции, релизы и анонсы — в нашем Telegram-канале.
                </p>
              </div>
            </div>

            <button
              onClick={handleClick}
              className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold bg-sky-500 text-white hover:bg-sky-400 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-sky-500/25"
            >
              <Send className="h-4 w-4" />
              Подписаться на TraveLLM
            </button>

            <p className="mt-2.5 text-center text-[10px] text-muted-foreground/50 font-medium tracking-wide uppercase">
              @TraveLLM_AI
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
