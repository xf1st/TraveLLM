"use client"

import { motion } from "framer-motion"
import { Plane, Cloud, Globe } from "lucide-react"

export function PremiumLoader({ text = "Загружаем путешествие..." }: { text?: string }) {
    return (
        <div className="flex flex-col items-center justify-center p-8">
            <div className="relative w-32 h-32 flex items-center justify-center">
                {/* Central Globe (Static or rotating slowly) */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="text-primary/20"
                >
                    <Globe strokeWidth={1} className="w-16 h-16" />
                </motion.div>

                {/* Orbiting Plane */}
                <motion.div
                    className="absolute inset-0"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        >
                            <Plane className="w-8 h-8 text-primary fill-primary/50 rotate-90" />
                        </motion.div>
                    </div>
                </motion.div>

                {/* Pulsing Ring */}
                <motion.div
                    className="absolute inset-0 border-2 border-primary/20 rounded-full"
                    animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div
                    className="absolute inset-4 border border-primary/10 rounded-full"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0, 0.3] }}
                    transition={{ duration: 2, delay: 0.5, repeat: Infinity }}
                />
            </div>

            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="mt-6 text-sm font-medium text-muted-foreground animate-pulse"
            >
                {text}
            </motion.p>
        </div>
    )
}
