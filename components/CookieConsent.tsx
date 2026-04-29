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
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", damping: 24, stiffness: 200 }}
          className="fixed inset-x-3 bottom-3 z-[200] mx-auto max-w-[760px] sm:bottom-5 sm:left-auto sm:right-5 sm:mx-0 sm:max-w-[430px]"
        >
          <div
            className="relative rounded-2xl p-3.5 shadow-2xl sm:p-4"
            style={{
              background: "rgba(15, 18, 24, 0.95)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 18px 50px rgba(0,0,0,0.38)",
            }}
          >
            {/* Close */}
            <button
              onClick={() => accept("necessary")}
              className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full text-white/40 transition-all hover:bg-white/10 hover:text-white/80"
              aria-label={t("close")}
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-start gap-3 pr-8">
              <div
                className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                style={{ background: "rgba(133,173,255,0.15)" }}
              >
                <Cookie className="text-blue-300" style={{ width: 18, height: 18 }} />
              </div>
              <div className="min-w-0">
                <div className="mb-1 text-sm font-bold text-white">{t("title")}</div>
                <p className="text-[11px] leading-relaxed text-white/58 sm:text-xs">
                  {t("message")}{" "}
                  <Link href="/cookies" className="text-sky-300 hover:underline">
                    {t("learnMore")}
                  </Link>
                </p>
                <p className="mt-1.5 text-[10px] leading-relaxed text-white/38">
                  <span className="font-semibold text-white/50">{t("affiliateTitle")}</span>{" "}
                  {t("affiliateText")}{" "}
                  <Link href="/terms#affiliate" className="text-sky-300/80 hover:underline">
                    {t("affiliateLink")}
                  </Link>
                </p>
              </div>
            </div>

            <div className="mt-3 flex gap-2 sm:mt-3.5">
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
