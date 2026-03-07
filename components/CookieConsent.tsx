"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Cookie, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function CookieConsent() {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        // Check if user has already consented
        const consent = localStorage.getItem("cookie-consent")
        if (!consent) {
            // Small delay to not overwhelm user immediately on load
            const timer = setTimeout(() => setIsVisible(true), 1500)
            return () => clearTimeout(timer)
        }
    }, [])

    const acceptCookies = () => {
        localStorage.setItem("cookie-consent", "true")
        setIsVisible(false)
    }

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="fixed bottom-0 left-0 right-0 z-[90] p-4 md:p-6 flex justify-center pointer-events-none"
                >
                    <div className="bg-background/80 backdrop-blur-md border border-white/10 shadow-md md:shadow-2xl rounded-2xl p-4 md:p-5 max-w-2xl w-full flex flex-col md:flex-row items-center gap-4 md:gap-6 pointer-events-auto relative overflow-hidden">

                        {/* Decoration */}
                        <div className="absolute -left-10 -top-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl rounded-full hidden md:block" />

                        <div className="flex items-center gap-4 flex-1">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <Cookie className="h-5 w-5 text-primary" />
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Мы используем файлы cookie, чтобы сделать ваш опыт использования сайта лучше.
                                Продолжая, вы соглашаетесь с нашей политикой конфиденциальности.
                            </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
                            <Button
                                onClick={acceptCookies}
                                className="rounded-xl flex-1 md:flex-none font-medium"
                            >
                                Понятно
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={acceptCookies}
                                className="rounded-full text-muted-foreground hover:text-foreground hidden md:flex"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
