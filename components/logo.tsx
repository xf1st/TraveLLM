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

    // Determine logo based on theme (default to light for SSR)
    const logoSrc = mounted && resolvedTheme === "dark"
        ? "/logo-dark.svg"
        : "/logo-light.svg"

    // Consistent className for both SSR and client
    const combinedClassName = `rounded-xl ${className}`.trim()

    return (
        <Image
            src={logoSrc}
            alt="TraveLM"
            width={size}
            height={size}
            className={combinedClassName}
            priority
        />
    )
}
