"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    AlertTriangle,
    X,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    Plane,
    Shield,
    CreditCard,
    MapPin,
    Info
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorDetail {
    code: string
    message: string
    suggestion?: string
    details?: Record<string, any>
}

interface ErrorModalProps {
    open: boolean
    onClose: () => void
    onRetry?: () => void
    title?: string
    message: string
    blockers?: ErrorDetail[]
    warnings?: ErrorDetail[]
    details?: string
}

const errorIcons: Record<string, any> = {
    "NO_FLIGHTS": Plane,
    "FLIGHTS_NOT_VERIFIED": Plane,
    "AIRPORT_CLOSED": Plane,
    "AIRPORT_RESTRICTED": Plane,
    "VISA_BLOCKED": Shield,
    "VISA_WARNING": Shield,
    "BUDGET_ADJUSTED": CreditCard,
    "AIRPORT_CHECK_FAILED": MapPin,
    "default": AlertTriangle
}

const getErrorIcon = (code: string) => {
    return errorIcons[code] || errorIcons["default"]
}

export function ErrorModal({
    open,
    onClose,
    onRetry,
    title = "Не удалось создать маршрут",
    message,
    blockers = [],
    warnings = [],
    details
}: ErrorModalProps) {
    const [showDetails, setShowDetails] = useState(false)

    if (!open) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="relative w-full max-w-lg bg-gradient-to-b from-gray-900 to-gray-950 border border-red-500/20 rounded-2xl shadow-md md:shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header gradient */}
                    <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-red-500/10 to-transparent pointer-events-none" />

                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors z-10"
                    >
                        <X className="h-4 w-4 text-gray-400" />
                    </button>

                    {/* Content */}
                    <div className="relative p-6">
                        {/* Icon */}
                        <div className="flex justify-center mb-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse hidden md:block" />
                                <div className="relative p-4 bg-red-500/10 rounded-full border border-red-500/20">
                                    <AlertTriangle className="h-8 w-8 text-red-400" />
                                </div>
                            </div>
                        </div>

                        {/* Title */}
                        <h2 className="text-xl font-bold text-center text-white mb-2">{title}</h2>

                        {/* Main message */}
                        <p className="text-center text-gray-400 mb-6">{message}</p>

                        {/* Blockers (critical errors) */}
                        {blockers.length > 0 && (
                            <div className="space-y-2 mb-4">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-red-400 mb-2">
                                    Критические проблемы
                                </h3>
                                {blockers.map((blocker, i) => {
                                    const Icon = getErrorIcon(blocker.code)
                                    return (
                                        <div
                                            key={i}
                                            className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
                                        >
                                            <Icon className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm text-red-200">{blocker.message}</p>
                                                {blocker.suggestion && (
                                                    <p className="text-xs text-red-300/60 mt-1">{blocker.suggestion}</p>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* Warnings */}
                        {warnings.length > 0 && (
                            <div className="space-y-2 mb-4">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-2">
                                    Предупреждения
                                </h3>
                                {warnings.map((warning, i) => {
                                    const Icon = getErrorIcon(warning.code)
                                    return (
                                        <div
                                            key={i}
                                            className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20"
                                        >
                                            <Icon className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm text-amber-200">{warning.message}</p>
                                                {warning.suggestion && (
                                                    <p className="text-xs text-amber-300/60 mt-1">{warning.suggestion}</p>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* Technical details (collapsible) */}
                        {details && (
                            <div className="mb-6">
                                <button
                                    onClick={() => setShowDetails(!showDetails)}
                                    className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-400 transition-colors w-full"
                                >
                                    {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                    <span>Технические детали</span>
                                </button>
                                {showDetails && (
                                    <motion.pre
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        className="mt-2 p-3 rounded-lg bg-black/30 text-xs text-gray-500 font-mono overflow-x-auto max-h-32"
                                    >
                                        {details}
                                    </motion.pre>
                                )}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1 rounded-xl border-white/10 hover:bg-white/5"
                                onClick={onClose}
                            >
                                Закрыть
                            </Button>
                            {onRetry && (
                                <Button
                                    className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                                    onClick={() => {
                                        onClose()
                                        onRetry()
                                    }}
                                >
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Попробовать снова
                                </Button>
                            )}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
