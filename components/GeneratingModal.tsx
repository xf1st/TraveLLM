"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { MapPin, Plane, Hotel, Utensils, Camera, X } from "lucide-react"
import { MeshGradient } from "@paper-design/shaders-react"
import { LottieLoader } from "@/components/ui/LottieLoader"
import GradientText from "@/components/GradientText"
import { MorphingText } from "@/components/ui/morphing-text"

const STEPS = [
    { icon: Plane, text: "Подбираем рейсы..." },
    { icon: Hotel, text: "Бронируем отели..." },
    { icon: MapPin, text: "Составляем маршрут..." },
    { icon: Utensils, text: "Ищем рестораны..." },
    { icon: Camera, text: "Добавляем достопримечательности..." },
]

interface GeneratingModalProps {
    open: boolean
    destination?: string
}

export function GeneratingModal({ open, destination, onCancel }: GeneratingModalProps & { onCancel?: () => void }) {
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

    const CurrentIcon = STEPS[currentStep].icon

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onCancel && onCancel()}>
            <DialogContent className="sm:max-w-md border-none bg-background/80 dark:bg-black/90 p-0 overflow-hidden rounded-[2.5rem] shadow-2xl [&>button]:hidden backdrop-blur-xl">
                <DialogTitle className="sr-only">Генерация маршрута</DialogTitle>
                <div className="relative min-h-[450px] flex flex-col items-center justify-center p-8">
                    {/* Background Shader - Theme Aware */}
                    <div className="absolute inset-0 z-0">
                        <MeshGradient
                            className="w-full h-full opacity-30 dark:opacity-40"
                            colors={["#6366F1", "#8B5CF6", "#A78BFA", "#6366F1"]}
                            speed={0.1}
                        />
                        <div className="absolute inset-0 bg-white/40 dark:bg-black/60 backdrop-blur-3xl" />
                    </div>

                    {/* Close Button */}
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white"
                        >
                            <span className="sr-only">Закрыть</span>
                            <X className="h-5 w-5" />
                        </button>
                    )}

                    <div className="relative z-10 w-full text-center space-y-8">
                        {/* Lottie Animation */}
                        <div className="relative h-48 w-48 mx-auto">
                            <LottieLoader type="plane" className="h-full w-full" />
                            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full -z-10 animate-pulse" />
                        </div>

                        {/* Text Content */}
                        <div className="space-y-3">
                            <h2 className="text-3xl font-black text-foreground dark:text-white tracking-tighter">
                                <GradientText>ПЛАНИРУЕМ МАРШРУТ</GradientText>
                            </h2>
                            {destination && (
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/40 dark:bg-white/5 border border-black/5 dark:border-white/10 backdrop-blur-md justify-center shadow-sm">
                                    <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{destination}</span>
                                </div>
                            )}
                        </div>

                        {/* Progress Section */}
                        <div className="space-y-6 max-w-sm mx-auto">
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] uppercase tracking-widest font-black text-muted-foreground px-1">
                                    <span>СИНХРОНИЗАЦИЯ</span>
                                    <span className="text-primary">{Math.round(progress)}%</span>
                                </div>
                                <div className="h-3 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 p-0.5">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-blue-500 to-emerald-500 bg-[length:200%_auto] animate-[gradient_2s_linear_infinite] shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all duration-500"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>

                            <MorphingText className="text-xl md:text-2xl lg:text-3xl leading-none h-12 text-slate-800 dark:text-white font-heavy" texts={STEPS.map(s => s.text)} />
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
