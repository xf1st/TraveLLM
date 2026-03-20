"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { X, Cookie } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslations } from "next-intl"

const STORAGE_KEY = "travellm_cookies_consent"

export function CookieConsent() {
  const t = useTranslations("cookie")
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        const t = setTimeout(() => setVisible(true), 1200)
        return () => clearTimeout(t)
      }
    } catch {}
  }, [])

  const accept = (level: "all" | "necessary") => {
    try { localStorage.setItem(STORAGE_KEY, level) } catch {}
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 24, stiffness: 200 }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm z-[200]"
        >
          <div
            className="relative rounded-2xl p-5 shadow-2xl"
            style={{
              background: "rgba(22, 26, 33, 0.97)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            {/* Close */}
            <button
              onClick={() => accept("necessary")}
              className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/10 transition-all"
              aria-label={t("close")}
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* Icon + Title */}
            <div className="flex items-center gap-2.5 mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(133,173,255,0.15)" }}
              >
                <Cookie className="text-blue-300" style={{ width: 18, height: 18 }} />
              </div>
              <span className="font-bold text-white text-sm">{t("title")}</span>
            </div>

            {/* Text */}
            <p className="text-xs text-white/55 leading-relaxed mb-3">
              {t("message")}{" "}
              <Link href="/cookies" className="text-sky-400 hover:underline">
                {t("learnMore")}
              </Link>
            </p>

            {/* Affiliate disclosure */}
            <div
              className="text-[10px] text-white/40 leading-relaxed mb-4 px-3 py-2.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <span className="font-bold text-white/55">{t("affiliateTitle")}</span> {t("affiliateText")}{" "}
              <Link href="/terms#affiliate" className="text-sky-400/70 hover:underline">
                {t("affiliateLink")}
              </Link>
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => accept("necessary")}
                className="flex-1 h-9 rounded-xl text-xs font-semibold transition-colors"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  color: "rgba(255,255,255,0.6)",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.9)" }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.6)" }}
              >
                {t("decline")}
              </button>
              <button
                onClick={() => accept("all")}
                className="flex-1 h-9 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)" }}
              >
                {t("accept")}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
