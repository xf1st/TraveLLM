"use client"

import { useEffect, useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

const Lottie = dynamic(() => import("lottie-react"), { ssr: false })

export type AnimationType = "plane" | "suitcase" | "default"

// Fallback high-quality public URLs
const ANIMATION_URLS: Record<AnimationType, string> = {
    plane: "https://assets2.lottiefiles.com/packages/lf20_x62chJ.json",
    suitcase: "https://assets1.lottiefiles.com/packages/lf20_sFtbjW.json",
    default: "https://assets3.lottiefiles.com/packages/lf20_rwq6ciql.json"
}

// In-memory cache for animation data
const animationCache = new Map<string, any>()

interface LottieLoaderProps {
    type?: AnimationType
    className?: string
    loop?: boolean
}

export function LottieLoader({ type = "default", className, loop = true }: LottieLoaderProps) {
    const [animationData, setAnimationData] = useState<any>(null)
    const [error, setError] = useState(false)

    useEffect(() => {
        let isMounted = true
        const targetUrl = ANIMATION_URLS[type]

        // Check cache first
        if (animationCache.has(targetUrl)) {
            if (isMounted) {
                setAnimationData(animationCache.get(targetUrl))
            }
            return
        }

        fetch(targetUrl)
            .then(res => {
                if (!res.ok) throw new Error("Failed to load animation")
                return res.json()
            })
            .then(data => {
                if (isMounted) {
                    animationCache.set(targetUrl, data)
                    setAnimationData(data)
                }
            })
            .catch(() => {
                if (isMounted) setError(true)
            })

        return () => { isMounted = false }
    }, [type])

    if (error) {
        return (
            <div className={`flex items-center justify-center text-muted-foreground ${className}`}>
                <Loader2 className="animate-spin h-8 w-8" />
            </div>
        )
    }

    if (!animationData) {
        return (
            <div className={`flex items-center justify-center text-muted-foreground ${className}`}>
                <Loader2 className="animate-spin h-6 w-6 opacity-50" />
            </div>
        )
    }

    return (
        <div className={className}>
            <Lottie animationData={animationData} loop={loop} />
        </div>
    )
}
