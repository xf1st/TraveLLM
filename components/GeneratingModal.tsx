"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { MapPin, Plane, Hotel, Utensils, Camera, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { LottieLoader } from "@/components/ui/LottieLoader"
import { useTranslations } from "next-intl"

interface GeneratingModalProps {
    open: boolean
    destination?: string
    onCancel?: () => void
}

export function GeneratingModal({ open, destination, onCancel }: GeneratingModalProps) {
    const t = useTranslations("generating")
    const STEPS = [
        { icon: Plane,    text: t("steps.flights"),       color: "text-sky-400" },
        { icon: Hotel,    text: t("steps.hotels"),        color: "text-violet-400" },
        { icon: MapPin,   text: t("steps.route"),         color: "text-emerald-400" },
        { icon: Utensils, text: t("steps.restaurants"),   color: "text-amber-400" },
        { icon: Camera,   text: t("steps.sights"),        color: "text-rose-400" },
    ]
    const [currentStep, setCurrentStep] = useState(0)
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        if (!open) {
            setCurrentStep(0)
            setProgress(0)
            return
        }

        const stepInterval = setInterval(() => {
            setCurrentStep((prev) => (prev + 1) % STEPS.length)
        }, 3000)

        const progressInterval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 98) return prev
                return prev + (Math.random() < 0.3 ? 2 : 0.5)
            })
        }, 200)

        return () => {
            clearInterval(stepInterval)
            clearInterval(progressInterval)
        }
    }, [open])

    const step = STEPS[currentStep]
    const StepIcon = step.icon

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onCancel && onCancel()}>
            <DialogContent className="sm:max-w-md border-none p-0 overflow-hidden rounded-[2.5rem] shadow-2xl [&>button]:hidden">
                <DialogTitle className="sr-only">{t("title")}</DialogTitle>

                <div className="relative min-h-[450px] flex flex-col items-center justify-center p-8 bg-zinc-950 overflow-hidden">

                    {/* Grid dot pattern */}
                    <div
                        className="absolute inset-0 opacity-[0.04]"
                        style={{
                            backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
                            backgroundSize: "28px 28px",
                        }}
                    />

                    {/* Ambient glow orbs */}
                    <div className="absolute -top-24 -left-24 w-72 h-72 bg-violet-600/20 rounded-full blur-3xl" />
                    <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-sky-600/15 rounded-full blur-3xl" />

                    {/* Close button */}
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-white/40 hover:text-white/80"
                        >
                            <span className="sr-only">{t("close")}</span>
                            <X className="h-5 w-5" />
                        </button>
                    )}

                    <div className="relative z-10 w-full flex flex-col items-center gap-8">

                        {/* Plane */}
                        <div className="relative h-48 w-48 flex items-center justify-center">
                            <div className="absolute inset-0 bg-violet-500/10 blur-3xl rounded-full" />
                            <LottieLoader type="plane" className="h-[120%] w-[120%] relative z-10" />
                        </div>

                        {/* Title + destination */}
                        <div className="text-center space-y-3">
                            <h2 className="text-2xl font-black tracking-tight text-white">
                                {t("title")}
                            </h2>
                            {destination && (
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
                                    <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                                    <span className="text-sm font-semibold text-white/80">{destination}</span>
                                </div>
                            )}
                        </div>

                        {/* Progress + step */}
                        <div className="w-full max-w-sm space-y-4">

                            {/* Progress bar */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center px-0.5">
                                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/30">{t("processing")}</span>
                                    <span className="text-xs font-black tabular-nums text-white/60">{Math.round(progress)}%</span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                                    <motion.div
                                        className="h-full rounded-full bg-gradient-to-r from-violet-500 via-sky-400 to-emerald-400"
                                        style={{ width: `${progress}%` }}
                                        transition={{ duration: 0.4, ease: "easeOut" }}
                                    />
                                </div>
                            </div>

                            {/* Current step */}
                            <div className="h-10 flex items-center justify-center">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={currentStep}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -6 }}
                                        transition={{ duration: 0.3 }}
                                        className="flex items-center gap-2.5"
                                    >
                                        <StepIcon className={`h-4 w-4 ${step.color} shrink-0`} />
                                        <span className="text-sm font-medium text-white/70">{step.text}</span>
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            {/* Step dots */}
                            <div className="flex justify-center gap-1.5">
                                {STEPS.map((_, i) => (
                                    <motion.div
                                        key={i}
                                        animate={{
                                            width: i === currentStep ? 20 : 6,
                                            backgroundColor: i === currentStep ? "#a78bfa" : "rgba(255,255,255,0.15)",
                                        }}
                                        transition={{ duration: 0.3 }}
                                        className="h-1.5 rounded-full"
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
