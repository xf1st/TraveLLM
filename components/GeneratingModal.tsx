"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { MapPin, Plane, Hotel, Utensils, Camera, X, TimerReset } from "lucide-react"
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
    const [dismissed, setDismissed] = useState(false)
    const [confirmCancelOpen, setConfirmCancelOpen] = useState(false)
    const wasOpenRef = useRef(false)

    useEffect(() => {
        if (!open) {
            setCurrentStep(0)
            setProgress(0)
            setDismissed(false)
            setConfirmCancelOpen(false)
            wasOpenRef.current = false
            return
        }

        if (!wasOpenRef.current) {
            setCurrentStep(0)
            setProgress(0)
            setDismissed(false)
            wasOpenRef.current = true
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
    const roundedProgress = Math.round(progress)
    const dialogOpen = open && !dismissed
    const requestCancel = () => {
        if (onCancel) setConfirmCancelOpen(true)
    }
    const confirmCancel = () => {
        setConfirmCancelOpen(false)
        onCancel?.()
    }

    return (
        <>
        <Dialog open={dialogOpen} onOpenChange={(val) => !val && setDismissed(true)}>
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
                    <button
                        type="button"
                        onClick={() => setDismissed(true)}
                        className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-white/40 hover:text-white/80"
                    >
                        <span className="sr-only">{t("close")}</span>
                        <X className="h-5 w-5" />
                    </button>

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
                                    <span className="text-xs font-black tabular-nums text-white/60">{roundedProgress}%</span>
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

                            {onCancel && (
                                <button
                                    type="button"
                                    onClick={requestCancel}
                                    className="mx-auto mt-3 flex h-10 items-center justify-center rounded-full border border-red-400/20 bg-red-500/10 px-5 text-xs font-bold uppercase tracking-[0.14em] text-red-200 transition-colors hover:bg-red-500/15 hover:text-red-100"
                                >
                                    {t("cancelGeneration")}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
        <AnimatePresence>
            {open && dismissed && (
                <motion.div
                    initial={{ opacity: 0, y: 18, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.96 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="fixed bottom-24 left-1/2 z-[220] w-[min(calc(100vw-1.25rem),24rem)] -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-400/70 via-violet-400/45 to-emerald-400/60 p-px shadow-[0_22px_70px_rgba(0,0,0,0.48)] md:bottom-6 md:left-auto md:right-6 md:w-[23rem] md:translate-x-0"
                >
                    <div className="flex h-16 items-center rounded-full bg-[#07151d]/92 px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-2xl">
                    <button
                        type="button"
                        onClick={() => setDismissed(false)}
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-full px-2 text-left"
                        aria-label={`${t("processing")} ${roundedProgress}%`}
                    >
                        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/8 text-cyan-200 ring-1 ring-white/10">
                            <span className="absolute inset-0 rounded-full bg-cyan-400/15 motion-safe:animate-ping" />
                            <TimerReset className="relative h-5 w-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-3">
                                <span className="truncate text-sm font-black uppercase tracking-[0.16em] text-white/85">
                                    {t("miniTitle")}
                                </span>
                                <span className="shrink-0 text-lg font-black tabular-nums text-cyan-100">
                                    {roundedProgress}%
                                </span>
                            </span>
                            <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-white/12">
                                <motion.span
                                    className="block h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 to-emerald-300 shadow-[0_0_18px_rgba(34,211,238,0.55)]"
                                    style={{ width: `${progress}%` }}
                                    transition={{ duration: 0.35, ease: "easeOut" }}
                                />
                            </span>
                        </span>
                    </button>
                    {onCancel && (
                        <button
                            type="button"
                            onClick={requestCancel}
                            className="ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/8 text-white/55 ring-1 ring-white/10 transition-colors hover:bg-red-500/18 hover:text-red-100 hover:ring-red-300/20"
                            aria-label={t("cancelGeneration")}
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
        <AnimatePresence>
            {confirmCancelOpen && (
                <motion.div
                    className="fixed inset-0 z-[260] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="generation-cancel-title"
                        aria-describedby="generation-cancel-description"
                        initial={{ opacity: 0, y: 16, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.96 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="w-full max-w-sm rounded-[2rem] border border-white/10 bg-zinc-950 p-6 text-white shadow-2xl"
                    >
                        <h3 id="generation-cancel-title" className="text-xl font-black tracking-tight">
                            {t("cancelTitle")}
                        </h3>
                        <p id="generation-cancel-description" className="mt-3 text-sm leading-relaxed text-white/60">
                            {t("cancelBody")}
                        </p>
                        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                            <button
                                type="button"
                                onClick={() => setConfirmCancelOpen(false)}
                                className="h-11 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white/80 transition-colors hover:bg-white/10"
                            >
                                {t("keepGenerating")}
                            </button>
                            <button
                                type="button"
                                onClick={confirmCancel}
                                className="h-11 flex-1 rounded-2xl bg-red-500 px-4 text-sm font-black text-white transition-colors hover:bg-red-600"
                            >
                                {t("confirmCancel")}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
        </>
    )
}
