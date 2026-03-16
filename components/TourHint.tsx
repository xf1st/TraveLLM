"use client"

import { useState, useEffect, useRef } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface TourHintProps {
  /** Unique ID for localStorage persistence */
  id: string
  /** Hint text */
  text: string
  /** Position relative to the pulsing dot */
  position?: "top" | "bottom" | "left" | "right"
  /** Delay in ms before showing (default 1500) */
  delay?: number
  /** Additional className for the wrapper */
  className?: string
  children?: React.ReactNode
}

/**
 * Pulsing tooltip hint that appears once per user.
 * Dismissed on click or X button, saved to localStorage as `travellm_hint_{id}`.
 *
 * Usage:
 * <TourHint id="map-3d" text="Нажмите для переключения в 3D" position="bottom">
 *   <Button>3D</Button>
 * </TourHint>
 */
export function TourHint({
  id,
  text,
  position = "bottom",
  delay = 1500,
  className,
  children,
}: TourHintProps) {
  const storageKey = `travellm_hint_${id}`
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    try {
      const seen = localStorage.getItem(storageKey)
      if (seen) return
      setDismissed(false)
      timerRef.current = setTimeout(() => setVisible(true), delay)
    } catch {
      // localStorage unavailable
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [storageKey, delay])

  const dismiss = () => {
    setVisible(false)
    setDismissed(true)
    try { localStorage.setItem(storageKey, "1") } catch {}
  }

  if (dismissed) return <>{children}</>

  const tooltipPosition = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-3",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-3",
    left: "right-full top-1/2 -translate-y-1/2 mr-3",
    right: "left-full top-1/2 -translate-y-1/2 ml-3",
  }[position]

  const arrowPosition = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-zinc-800 border-x-transparent border-b-transparent border-[6px]",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-zinc-800 border-x-transparent border-t-transparent border-[6px]",
    left: "left-full top-1/2 -translate-y-1/2 border-l-zinc-800 border-y-transparent border-r-transparent border-[6px]",
    right: "right-full top-1/2 -translate-y-1/2 border-r-zinc-800 border-y-transparent border-l-transparent border-[6px]",
  }[position]

  return (
    <div className={cn("relative inline-flex", className)}>
      {children}

      {/* Pulsing ring */}
      <span className="absolute -top-1 -right-1 z-50 pointer-events-none">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500 shadow-lg shadow-sky-500/50" />
        </span>
      </span>

      {/* Tooltip */}
      {visible && (
        <div
          className={cn(
            "absolute z-[60] animate-in fade-in slide-in-from-bottom-2 duration-300",
            tooltipPosition
          )}
        >
          <div className="relative bg-zinc-800 text-white rounded-xl px-4 py-2.5 shadow-2xl max-w-[220px] text-xs leading-relaxed">
            <span>{text}</span>
            <button
              onClick={(e) => { e.stopPropagation(); dismiss() }}
              className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-zinc-700 hover:bg-zinc-600 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
            {/* Arrow */}
            <div className={cn("absolute w-0 h-0", arrowPosition)} />
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Reset all tour hints (used in profile settings).
 */
export function resetAllHints() {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith("travellm_hint_"))
    keys.forEach(k => localStorage.removeItem(k))
    localStorage.removeItem("travellm_welcome_seen")
  } catch {}
}
