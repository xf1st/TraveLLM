"use client"

import { useEffect, useState } from "react"
import { Plane, Hotel, ExternalLink, Loader2, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

type DealsData = {
  flightLink: string
  hotelLink: string
  destination: string
  originCity: string
  cheapestPrice: number | null
  priceFormatted: string | null
  hasPriceData: boolean
}

// ─── Compact strip for mobile ─────────────────────────────────────────────────
export function ReelDealsStrip({ reelId, isActive }: { reelId: string; isActive: boolean }) {
  const [deals, setDeals] = useState<DealsData | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!isActive || loaded) return
    let cancelled = false
    fetch(`/api/reels/${reelId}/deals`, { credentials: "include" })
      .then((r) => r.json())
      .then((j) => { if (!cancelled && j.flightLink) { setDeals(j); setLoaded(true) } })
      .catch(() => {})
    return () => { cancelled = true }
  }, [reelId, isActive, loaded])

  if (!deals) return null

  return (
    <div className="flex gap-2 w-full">
      <a
        href={deals.flightLink}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="flex-1 flex items-center gap-2 rounded-2xl bg-sky-500/20 border border-sky-400/30 backdrop-blur-md px-3 py-2.5 hover:bg-sky-500/30 transition-colors active:scale-95"
      >
        <Plane className="h-4 w-4 text-sky-300 shrink-0" />
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-sky-300 uppercase tracking-wider">Билеты</p>
          <p className="text-xs font-black text-white truncate">
            {deals.hasPriceData && deals.priceFormatted
              ? `от ${deals.priceFormatted}`
              : deals.destination}
          </p>
        </div>
        <ExternalLink className="h-3 w-3 text-white/40 shrink-0 ml-auto" />
      </a>
      <a
        href={deals.hotelLink}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="flex-1 flex items-center gap-2 rounded-2xl bg-violet-500/20 border border-violet-400/30 backdrop-blur-md px-3 py-2.5 hover:bg-violet-500/30 transition-colors active:scale-95"
      >
        <Hotel className="h-4 w-4 text-violet-300 shrink-0" />
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-violet-300 uppercase tracking-wider">Отели</p>
          <p className="text-xs font-black text-white truncate">{deals.destination}</p>
        </div>
        <ExternalLink className="h-3 w-3 text-white/40 shrink-0 ml-auto" />
      </a>
    </div>
  )
}

// ─── Full card for desktop panel ──────────────────────────────────────────────
export function ReelDealsCard({ reelId, isActive }: { reelId: string; isActive: boolean }) {
  const [deals, setDeals] = useState<DealsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!isActive || loaded) return
    let cancelled = false
    setLoading(true)
    fetch(`/api/reels/${reelId}/deals`, { credentials: "include" })
      .then((r) => r.json())
      .then((j) => { if (!cancelled && j.flightLink) { setDeals(j); setLoaded(true) } })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [reelId, isActive, loaded])

  if (!isActive && !loaded) return null

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-1">
          <TrendingDown className="h-3 w-3" />
          Купить сейчас
        </span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      {loading && (
        <div className="flex justify-center py-3">
          <Loader2 className="h-4 w-4 animate-spin text-white/30" />
        </div>
      )}

      {deals && (
        <div className="space-y-2">
          {/* Flight card */}
          <a
            href={deals.flightLink}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="group flex items-center gap-3 rounded-2xl bg-gradient-to-r from-sky-500/15 to-sky-600/10 border border-sky-400/20 p-3.5 hover:border-sky-400/40 hover:from-sky-500/25 hover:to-sky-600/15 transition-all"
          >
            <div className="h-10 w-10 rounded-xl bg-sky-500/20 flex items-center justify-center shrink-0 border border-sky-400/20">
              <Plane className="h-5 w-5 text-sky-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/50 font-medium">
                {deals.originCity} → {deals.destination}
              </p>
              <p className="text-sm font-black text-white">
                {deals.hasPriceData && deals.priceFormatted ? (
                  <>
                    <span className="text-sky-300">от {deals.priceFormatted}</span>
                    <span className="text-white/40 font-medium text-xs ml-1">/ чел.</span>
                  </>
                ) : (
                  "Найти билеты"
                )}
              </p>
            </div>
            <div className="flex items-center gap-1 text-white/40 group-hover:text-sky-300 transition-colors shrink-0">
              <span className="text-[10px] font-bold">Aviasales</span>
              <ExternalLink className="h-3 w-3" />
            </div>
          </a>

          {/* Hotel card */}
          <a
            href={deals.hotelLink}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="group flex items-center gap-3 rounded-2xl bg-gradient-to-r from-violet-500/15 to-violet-600/10 border border-violet-400/20 p-3.5 hover:border-violet-400/40 hover:from-violet-500/25 hover:to-violet-600/15 transition-all"
          >
            <div className="h-10 w-10 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0 border border-violet-400/20">
              <Hotel className="h-5 w-5 text-violet-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/50 font-medium">{deals.destination}</p>
              <p className="text-sm font-black text-white">Найти отель</p>
            </div>
            <div className="flex items-center gap-1 text-white/40 group-hover:text-violet-300 transition-colors shrink-0">
              <span className="text-[10px] font-bold">Островок</span>
              <ExternalLink className="h-3 w-3" />
            </div>
          </a>
        </div>
      )}
    </div>
  )
}
