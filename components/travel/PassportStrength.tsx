"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, Globe, ShieldCheck, Clock, FileWarning } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

interface PassportStrengthProps {
    isOpen: boolean
    onClose: () => void
}

export function PassportStrength({ isOpen, onClose }: PassportStrengthProps) {
    if (!isOpen) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div 
                    className="w-full max-w-md bg-black/80 backdrop-blur-md md:backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-md md:shadow-2xl overflow-hidden relative"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                Индекс Паспорта <span className="text-xs font-normal text-muted-foreground bg-white/10 px-2 py-1 rounded-full">Бета</span>
                            </h2>
                            <p className="text-sm text-muted-foreground">Ваш рейтинг свободы путешествий</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/10">
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 mb-6">
                        <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                            <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Широта</div>
                            <div className="text-xl font-mono font-bold text-white">44.82°</div>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                            <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Долгота</div>
                            <div className="text-xl font-mono font-bold text-white">20.27°</div>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                            <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Ранг</div>
                            <div className="text-xl font-mono font-bold text-emerald-400">#5</div>
                        </div>
                    </div>

                    {/* Main Score */}
                    <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-3xl p-6 mb-6 border border-white/10">
                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <div className="text-4xl font-black text-white">154</div>
                                <div className="text-sm text-emerald-400 font-bold">БЕЗ ВИЗЫ</div>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-white">227</div>
                                <div className="text-xs text-muted-foreground">ВСЕГО СТРАН</div>
                            </div>
                        </div>

                        {/* Progress Bar styled */}
                        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden flex mb-2">
                             <div className="h-full bg-emerald-500 w-[67%]" /> {/* Visa Free */}
                             <div className="h-full bg-blue-500 w-[6%]" />    {/* ETA */}
                             <div className="h-full bg-amber-500 w-[10%]" />   {/* On Arrival */}
                             <div className="h-full bg-red-500 w-[17%]" />     {/* Required */}
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                            <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Без визы</span>
                            <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> ETA</span>
                            <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> По прибытии</span>
                            <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-500" /> Виза</span>
                        </div>
                    </div>

                    {/* Detailed Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                                <ShieldCheck className="h-4 w-4" />
                            </div>
                            <div>
                                <div className="text-lg font-bold text-white">14</div>
                                <div className="text-xs text-muted-foreground">Требуется ETA</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
                                <Clock className="h-4 w-4" />
                            </div>
                            <div>
                                <div className="text-lg font-bold text-white">24</div>
                                <div className="text-xs text-muted-foreground">По прибытии</div>
                            </div>
                        </div>
                    </div>

                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
