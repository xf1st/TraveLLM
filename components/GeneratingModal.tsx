"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { MapPin, Plane, Hotel, Utensils, Camera } from "lucide-react"

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

        // Cycle through steps
        const stepInterval = setInterval(() => {
            setCurrentStep((prev) => (prev + 1) % STEPS.length)
        }, 2500)

        // Animate progress bar
        const progressInterval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 95) return prev // Cap at 95% until actually done
                return prev + Math.random() * 3
            })
        }, 300)

        return () => {
            clearInterval(stepInterval)
            clearInterval(progressInterval)
        }
    }, [open])

    const CurrentIcon = STEPS[currentStep].icon

    return (
        <Dialog open={open} onOpenChange={() => { }}>
            <DialogContent className="sm:max-w-md border-none bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
                <DialogTitle className="sr-only">Генерация маршрута</DialogTitle>
                <div className="relative py-8">
                    {/* Animated Background Grid */}
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:24px_24px]" />
                    </div>

                    {/* Main Content */}
                    <div className="relative z-10 text-center space-y-6">
                        {/* Animated Icon */}
                        <div className="relative mx-auto h-24 w-24">
                            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                            <div className="absolute inset-2 rounded-full bg-primary/30 animate-pulse" />
                            <div className="relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-2xl shadow-primary/50">
                                <CurrentIcon className="h-10 w-10 text-white animate-bounce" />
                            </div>
                        </div>

                        {/* Text */}
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold tracking-tight">
                                Создаём ваш маршрут
                            </h2>
                            {destination && (
                                <p className="text-lg text-primary font-semibold">{destination}</p>
                            )}
                            <p className="text-slate-400 animate-pulse transition-all duration-500">
                                {STEPS[currentStep].text}
                            </p>
                        </div>

                        {/* Progress Bar */}
                        <div className="mx-auto max-w-xs space-y-2">
                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-primary via-sky-400 to-primary transition-all duration-300 ease-out"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="text-xs text-slate-500">
                                Это может занять до 30 секунд...
                            </p>
                        </div>

                        {/* Animated Dots (Road) */}
                        <div className="flex justify-center items-center gap-1 pt-4">
                            {[...Array(5)].map((_, i) => (
                                <div
                                    key={i}
                                    className="h-2 w-2 rounded-full bg-slate-600 animate-pulse"
                                    style={{ animationDelay: `${i * 200}ms` }}
                                />
                            ))}
                            <MapPin className="h-4 w-4 text-primary ml-2 animate-bounce" />
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
