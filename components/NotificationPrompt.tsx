"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bell, X, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"

export function NotificationPrompt() {
    const [isVisible, setIsVisible] = useState(false)
    const [permission, setPermission] = useState<NotificationPermission>("default")

    useEffect(() => {
        // Check if browser supports notifications
        if (!("Notification" in window)) return

        setPermission(Notification.permission)

        // Show prompt if permission is default and not dismissed recently
        const dismissed = localStorage.getItem("notif-prompt-dismissed")
        const oneWeek = 7 * 24 * 60 * 60 * 1000
        const lastDismissed = dismissed ? parseInt(dismissed) : 0

        if (Notification.permission === "default" && (Date.now() - lastDismissed > oneWeek)) {
            const timer = setTimeout(() => setIsVisible(true), 5000)
            return () => clearTimeout(timer)
        }
    }, [])

    const requestPermission = async () => {
        const result = await Notification.requestPermission()
        setPermission(result)
        setIsVisible(false)

        if (result === "granted") {
            // Save preference to Supabase if user is logged in
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                await supabase
                    .from("profiles")
                    .update({ notifications_enabled: true })
                    .eq("id", user.id)
            }
        }
    }

    const dismiss = () => {
        setIsVisible(false)
        localStorage.setItem("notif-prompt-dismissed", Date.now().toString())
    }

    if (!isVisible) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.9 }}
                className="fixed bottom-6 right-6 z-[100] max-w-sm w-full"
            >
                <div className="bg-background/80 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl relative overflow-hidden group">
                    {/* Animated Background Pulse */}
                    <div className="absolute -top-12 -right-12 w-24 h-24 bg-primary/10 rounded-full blur-3xl animate-pulse" />

                    <button
                        onClick={dismiss}
                        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>

                    <div className="flex gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
                            <Bell className="h-6 w-6 text-primary animate-bounce-slow" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-bold text-foreground tracking-tight">Уведомления о маршрутах</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Мы пришлем пуш, когда ИИ закончит составлять ваш сложный маршрут.
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 flex gap-3">
                        <Button
                            onClick={requestPermission}
                            className="flex-1 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            Включить
                        </Button>
                        <Button
                            variant="outline"
                            onClick={dismiss}
                            className="rounded-xl border-white/10 hover:bg-white/5"
                        >
                            Позже
                        </Button>
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-[10px] text-muted-foreground/60 uppercase font-black tracking-widest">
                        <ShieldCheck className="h-3 w-3" />
                        Конфиденциально • Один клик
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
