"use client"

import { useEffect } from "react"

/**
 * Registers /sw.js so Chromium can treat the site as installable PWA (with manifest).
 * No offline cache — requests stay network-first.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return
    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") return

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {})
    }

    if (document.readyState === "complete") register()
    else window.addEventListener("load", register, { once: true })
  }, [])

  return null
}
