"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, X } from "lucide-react"

const TG_URL = "https://t.me/TraveLLM_AI"

export function NotificationPrompt() {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const dismissed = localStorage.getItem("notif-prompt-dismissed")
        const twoWeeks = 14 * 24 * 60 * 60 * 1000
        const lastDismissed = dismissed ? parseInt(dismissed) : 0

        if (Date.now() - lastDismissed > twoWeeks) {
            const timer = setTimeout(() => setIsVisible(true), 6000)
            return () => clearTimeout(timer)
        }
    }, [])

    const dismiss = () => {
        setIsVisible(false)
        localStorage.setItem("notif-prompt-dismissed", Date.now().toString())
    }

    const handleSubscribe = () => {
        window.open(TG_URL, "_blank", "noopener,noreferrer")
        dismiss()
    }

    if (!isVisible) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 360, damping: 28 }}
                className="fixed bottom-0 sm:bottom-6 left-0 sm:left-auto sm:right-6 z-[100] w-full sm:max-w-sm p-4 sm:p-0"
            >
                <div className="bg-background/85 backdrop-blur-md md:backdrop-blur-2xl border border-sky-500/25 p-6 rounded-3xl shadow-md md:shadow-2xl shadow-sky-500/10 relative overflow-hidden">
                    {/* Glow orbs */}
                    <div className="absolute -top-10 -right-10 w-28 h-28 bg-sky-500/15 rounded-full blur-3xl pointer-events-none hidden md:block" />
                    <div className="absolute -bottom-8 -left-8 w-20 h-20 bg-blue-600/10 rounded-full blur-3xl pointer-events-none hidden md:block" />

                    <button
                        onClick={dismiss}
                        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors rounded-lg p-1 hover:bg-white/5"
                    >
                        <X className="h-4 w-4" />
                    </button>

                    <div className="flex gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center shrink-0">
                            <Send className="h-6 w-6 text-sky-400" />
                        </div>
                        <div className="space-y-1 pr-6">
                            <h3 className="font-bold text-foreground tracking-tight">Следите за обновлениями</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Новые функции и анонсы — в нашем Telegram-канале.
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 flex gap-3">
                        <button
                            onClick={handleSubscribe}
                            className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold bg-sky-500 text-white hover:bg-sky-400 active:scale-[0.98] transition-all shadow-lg shadow-sky-500/25"
                        >
                            <Send className="h-4 w-4" />
                            Подписаться
                        </button>
                        <button
                            onClick={dismiss}
                            className="rounded-xl px-4 text-sm text-muted-foreground border border-border/50 hover:bg-white/5 transition-colors"
                        >
                            Позже
                        </button>
                    </div>

                    <p className="mt-3 text-center text-[10px] text-muted-foreground/50 uppercase font-bold tracking-widest">
                        @TraveLLM_AI
                    </p>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
