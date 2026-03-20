"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Compass, Home, Search, Sparkles } from "lucide-react"
import { MeshGradient } from "@paper-design/shaders-react"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"

export default function NotFound() {
  const t = useTranslations("errors")
    return (
        <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-black text-white">
            {/* Premium Background */}
            <div className="absolute inset-0 z-0">
                <MeshGradient
                    className="w-full h-full opacity-40"
                    colors={["#6366F1", "#8B5CF6", "#A78BFA", "#6366F1"]}
                    speed={0.1}
                />
                <div className="absolute inset-0 bg-black/60 backdrop-blur-md md:backdrop-blur-3xl hidden md:block" />
            </div>

            {/* Glowing Orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] animate-pulse delay-1000" />

            <main className="relative z-10 container max-w-2xl px-6 text-center space-y-12">
                {/* 404 Text with Gradient and Mask */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="relative"
                >
                    <h1 className="text-[12rem] md:text-[18rem] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white/20 to-transparent select-none">
                        404
                    </h1>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative h-32 w-32 flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full border border-primary/30 animate-[spin_8s_linear_infinite]" />
                            <div className="absolute inset-2 rounded-full border border-white/10 animate-[spin_12s_linear_infinite_reverse]" />
                            <Compass className="h-16 w-16 text-primary animate-pulse" />
                        </div>
                    </div>
                </motion.div>

                <div className="space-y-4">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-3xl md:text-5xl font-black tracking-tight"
                    >
                        {t("notFoundHeading")}
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-slate-400 text-lg md:text-xl font-medium max-w-lg mx-auto leading-relaxed"
                    >
                        {t("notFoundSubtitle")}
                    </motion.p>
                </div>

                {/* Glassmorphic Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8"
                >
                    <Button asChild size="lg" className="rounded-full h-14 px-8 text-lg font-bold bg-white text-black hover:bg-slate-200 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95">
                        <Link href="/">
                            <Home className="mr-2 h-5 w-5" />
                            {t("goHome")}
                        </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="rounded-full h-14 px-8 text-lg font-bold border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-md transition-all hover:scale-105 active:scale-95">
                        <Link href="/plan">
                            <Sparkles className="mr-2 h-5 w-5 text-primary" />
                            {t("newPlan")}
                        </Link>
                    </Button>
                </motion.div>

                {/* Decorative Elements */}
                <div className="pt-20 opacity-20 flex justify-center items-center gap-12 grayscale">
                    <div className="flex flex-col items-center gap-2">
                        <div className="h-0.5 w-12 bg-white" />
                        <span className="text-[10px] uppercase tracking-widest font-black">СКАНИРОВАНИЕ</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <div className="h-0.5 w-12 bg-white" />
                        <span className="text-[10px] uppercase tracking-widest font-black">ЛОКАЦИЯ</span>
                    </div>
                </div>
            </main>

            {/* Subtle Scanning Line Animation */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
                <div className="w-full h-[1px] bg-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.5)] animate-[scanning_4s_linear_infinite]" />
            </div>

            <style jsx global>{`
                @keyframes scanning {
                    0% { transform: translateY(-100vh); }
                    100% { transform: translateY(100vh); }
                }
            `}</style>
        </div>
    )
}
