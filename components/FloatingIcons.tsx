"use client"

import { motion } from 'framer-motion'
import {
    Plane,
    Globe,
    Map,
    Mountain,
    Palmtree,
    Camera,
    Compass,
    Anchor,
    Tent,
    Umbrella,
    Ship,
    Train,
    Building2,
    Sunset,
    Star
} from 'lucide-react'

const icons = [
    { Icon: Plane, size: 32, x: '10%', y: '15%', delay: 0, duration: 20 },
    { Icon: Globe, size: 40, x: '85%', y: '20%', delay: 2, duration: 25 },
    { Icon: Map, size: 28, x: '20%', y: '75%', delay: 4, duration: 22 },
    { Icon: Mountain, size: 36, x: '75%', y: '70%', delay: 1, duration: 18 },
    { Icon: Palmtree, size: 30, x: '5%', y: '45%', delay: 3, duration: 24 },
    { Icon: Camera, size: 26, x: '90%', y: '50%', delay: 5, duration: 21 },
    { Icon: Compass, size: 34, x: '30%', y: '10%', delay: 2.5, duration: 19 },
    { Icon: Anchor, size: 28, x: '65%', y: '85%', delay: 1.5, duration: 23 },
    { Icon: Tent, size: 32, x: '50%', y: '5%', delay: 4.5, duration: 20 },
    { Icon: Umbrella, size: 24, x: '15%', y: '90%', delay: 3.5, duration: 26 },
    { Icon: Ship, size: 30, x: '80%', y: '35%', delay: 0.5, duration: 22 },
    { Icon: Train, size: 28, x: '40%', y: '80%', delay: 2, duration: 24 },
    { Icon: Building2, size: 34, x: '60%', y: '15%', delay: 3, duration: 21 },
    { Icon: Sunset, size: 26, x: '25%', y: '55%', delay: 4, duration: 25 },
    { Icon: Star, size: 20, x: '70%', y: '45%', delay: 1, duration: 18 },
]

export function FloatingIcons() {
    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            {/* Animated travel icons */}
            {icons.map((item, index) => {
                const Icon = item.Icon
                return (
                    <motion.div
                        key={index}
                        className="absolute text-black/[0.06] dark:text-white/[0.03]"
                        style={{ left: item.x, top: item.y }}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{
                            opacity: [0.4, 0.7, 0.4],
                            scale: [1, 1.1, 1],
                            y: [0, -20, 0],
                            rotate: [0, 5, -5, 0]
                        }}
                        transition={{
                            duration: item.duration,
                            delay: item.delay,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    >
                        <Icon size={item.size} strokeWidth={1} />
                    </motion.div>
                )
            })}

            {/* Glowing orbs — visible in both themes */}
            <motion.div
                className="absolute w-[500px] h-[500px] rounded-full bg-sky-400/10 dark:bg-violet-500/5 blur-3xl hidden md:block"
                style={{ left: '-10%', top: '20%' }}
                animate={{
                    x: [0, 50, 0],
                    y: [0, 30, 0],
                    scale: [1, 1.1, 1],
                }}
                transition={{
                    duration: 15,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />
            <motion.div
                className="absolute w-[400px] h-[400px] rounded-full bg-violet-400/10 dark:bg-indigo-500/5 blur-3xl hidden md:block"
                style={{ right: '-5%', bottom: '10%' }}
                animate={{
                    x: [0, -40, 0],
                    y: [0, -40, 0],
                    scale: [1, 1.15, 1],
                }}
                transition={{
                    duration: 18,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />
            <motion.div
                className="absolute w-[300px] h-[300px] rounded-full bg-rose-300/10 dark:bg-purple-500/5 blur-3xl hidden md:block"
                style={{ left: '50%', top: '60%', transform: 'translateX(-50%)' }}
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                    duration: 12,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />
        </div>
    )
}
