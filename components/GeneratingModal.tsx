"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { MapPin, Plane, Hotel, Utensils, Camera } from "lucide-react"
import { MeshGradient } from "@paper-design/shaders-react"

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

export function GeneratingModal({ open, destination }: GeneratingModalProps) {
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
        <Dialog open={open} onOpenChange={() => { }}>
            <DialogContent className="sm:max-w-md border-none bg-black/90 p-0 overflow-hidden rounded-[2.5rem] shadow-2xl">
                <DialogTitle className="sr-only">Генерация маршрута</DialogTitle>
                <div className="relative min-h-[450px] flex flex-col items-center justify-center p-8">
                    {/* Background Shader - Similar to Profile/Plan */}
                    <div className="absolute inset-0 z-0">
                        <MeshGradient
                            className="w-full h-full opacity-40"
                            colors={["#10B981", "#3B82F6", "#8B5CF6", "#10B981"]}
                            speed={0.1}
                        />
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-3xl" />
                    </div>

                    <div className="relative z-10 w-full text-center space-y-8">
                        {/* Animated Icon Ring */}
                        <div className="relative mx-auto h-32 w-32 flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-[spin_10s_linear_infinite]" />
                            <div className="absolute inset-4 rounded-full border border-primary/40 animate-[spin_6s_linear_infinite_reverse]" />
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-blue-500/20 blur-2xl" />

                            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white/10 border border-white/20 backdrop-blur-md shadow-2xl">
                                <CurrentIcon className="h-10 w-10 text-white animate-pulse" />
                            </div>
                        </div>

                        {/* Text Content */}
                        <div className="space-y-3">
                            <h2 className="text-3xl font-black text-white tracking-tighter">
                                ПЛАНИРУЕМ <span className="text-primary tracking-normal">AI</span> МАРШРУТ
                            </h2>
                            {destination && (
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                                    <MapPin className="h-4 w-4 text-emerald-400" />
                                    <span className="text-sm font-bold text-slate-200">{destination}</span>
                                </div>
                            )}
                        </div>

                        {/* Progress Section */}
                        <div className="space-y-6 max-w-sm mx-auto">
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] uppercase tracking-widest font-black text-slate-500 px-1">
                                    <span>СИНХРОНИЗАЦИЯ</span>
                                    <span className="text-primary">{Math.round(progress)}%</span>
                                </div>
                                <div className="h-3 w-full overflow-hidden rounded-full bg-white/5 border border-white/10 p-0.5">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-blue-500 to-emerald-500 bg-[length:200%_auto] animate-[gradient_2s_linear_infinite] shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all duration-500"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>

                            <p className="text-lg font-medium text-slate-300 transition-all duration-500 h-8">
                                {STEPS[currentStep].text}
                            </p>
                        </div>

                        {/* Visual Scanning Effect Lines */}
                        <div className="flex justify-center items-center gap-1.5 pt-4">
                            {[0, 1, 2, 3, 4].map((i) => (
                                <div
                                    key={i}
                                    className="h-1 w-6 rounded-full bg-primary/20 overflow-hidden"
                                >
                                    <div
                                        className="h-full w-full bg-primary animate-[loading_1.5s_infinite]"
                                        style={{ animationDelay: `${i * 0.2}s` }}
                                    />
                                </div>
                            ))}
                        </div>

                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">
                            Анализ предпочтений и логистики...
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
