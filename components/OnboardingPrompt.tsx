"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, X, ArrowRight } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"

export function OnboardingPrompt() {
    const [isVisible, setIsVisible] = useState(false)
    const pathname = usePathname()
    const router = useRouter()

    useEffect(() => {
        const checkOnboarding = async () => {
            // Don't show on onboarding page itself or auth pages
            if (pathname?.startsWith('/onboarding') || pathname?.startsWith('/auth') || pathname === '/') {
                setIsVisible(false)
                return
            }

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setIsVisible(false)
                return
            }

            // Check if dismissed in this session
            const dismissed = sessionStorage.getItem("onboarding-prompt-dismissed")
            if (dismissed) {
                setIsVisible(false)
                return
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('preferences')
                .eq('id', user.id)
                .single()

            // If preferences are missing or empty object, show prompt
            const hasPrefs = profile?.preferences && Object.keys(profile.preferences as object).length > 0
            
            if (!hasPrefs) {
                // Delay slightly for better UX
                const timer = setTimeout(() => setIsVisible(true), 3000)
                return () => clearTimeout(timer)
            } else {
                setIsVisible(false)
            }
        }

        checkOnboarding()
    }, [pathname])

    const dismiss = () => {
        setIsVisible(false)
        sessionStorage.setItem("onboarding-prompt-dismissed", "true")
    }

    const goToOnboarding = () => {
        router.push("/onboarding")
        dismiss()
    }

    if (!isVisible) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-lg"
            >
                <div className="bg-card/90 backdrop-blur-md md:backdrop-blur-2xl border border-primary/20 p-5 rounded-3xl shadow-md md:shadow-2xl shadow-primary/10 flex flex-col sm:flex-row items-center gap-4 relative overflow-hidden">
                    {/* Decorative glow */}
                    <div className="absolute -top-10 -left-10 w-24 h-24 bg-primary/20 rounded-full blur-3xl pointer-events-none hidden md:block" />
                    
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                    </div>
                    
                    <div className="flex-1 text-center sm:text-left space-y-1">
                        <h4 className="font-bold text-foreground">Настройте ваш профиль</h4>
                        <p className="text-sm text-muted-foreground leading-snug">
                            Расскажите о своих предпочтениях, чтобы AI создавал идеальные маршруты специально для вас.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button 
                            onClick={goToOnboarding}
                            size="sm"
                            className="flex-1 sm:flex-none rounded-xl font-bold px-5"
                        >
                            Настроить
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                        <button
                            onClick={dismiss}
                            className="h-10 w-10 flex items-center justify-center rounded-xl border border-border/50 text-muted-foreground hover:bg-white/5 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
