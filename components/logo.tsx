"use client"

import Image from "next/image"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

interface LogoProps {
    size?: number
    className?: string
}

export function Logo({ size = 36, className = "" }: LogoProps) {
    const { resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Unified logo for all themes
    const logoSrc = "/logo-main.svg"

    // Consistent className for both SSR and client
    const combinedClassName = `rounded-xl ${className}`.trim()

    return (
        <Image
            src={logoSrc}
            alt="TraveLLM"
            width={size}
            height={size}
            className={combinedClassName}
            priority
        />
    )
}
