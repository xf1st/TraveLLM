"use client"

import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { SkySandBackground } from "@/components/SkySandBackground"
import { useEffect, useState } from "react"

export function GlobalBackground() {
  const pathname = usePathname()
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  // Exclude Profile and Trip Details (Map)
  // Also exclude studio/admin if needed, but sticking to user request first.
  const isProfile = pathname?.startsWith('/profile')
  const isTrip = pathname?.startsWith('/trip/')
  const isAuth = pathname?.startsWith('/auth') // Login/Signup page
  const isDesignDemo = pathname?.startsWith('/design-demo') // We are deleting it, but safe to exclude

  if (isProfile || isTrip || isAuth || isDesignDemo) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none">
      <SkySandBackground />
    </div>
  )
}
