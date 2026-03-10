"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

export function GlobalLoader() {
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Small delay to ensure styles, fonts and animations are ready
    const timer = setTimeout(() => {
      setLoading(false)
    }, 600)
    
    return () => clearTimeout(timer)
  }, [])

  if (!mounted || !loading) return null

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background pointer-events-none transition-opacity duration-500 ease-out">
      <div className="relative flex flex-col items-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 blur-xl bg-primary/20 rounded-full animate-pulse" />
          <Loader2 className="h-12 w-12 animate-spin text-primary relative z-10" />
        </div>
        <p className="text-sm font-medium text-muted-foreground animate-pulse tracking-wide">
          Загрузка TraveLLM...
        </p>
      </div>
    </div>
  )
}
