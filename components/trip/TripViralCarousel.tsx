"use client"

import { useMemo, useState } from "react"
import { TripImage } from "@/components/TripImage"
import { cn } from "@/lib/utils"

interface ViralSpot {
  name: string
  desc?: string
  description?: string
  mapLink?: string
}

interface TripViralCarouselProps {
  spots: ViralSpot[]
  destination?: string
}

export function TripViralCarousel({ spots, destination }: TripViralCarouselProps) {
  const [expanded, setExpanded] = useState(false)

  const normalizedSpots = useMemo(
    () =>
      (spots || [])
        .filter((spot) => spot?.name)
        .map((spot) => ({
          ...spot,
          text: spot.description || spot.desc || "Популярная локация из соцсетей",
        })),
    [spots]
  )

  if (normalizedSpots.length === 0) return null

  const visibleSpots = expanded ? normalizedSpots : normalizedSpots.slice(0, 4)

  return (
    <div className="trip-glass p-6 rounded-[2rem] shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-xs font-bold text-pink-600 dark:text-pink-300 uppercase tracking-widest opacity-90">
          TikTok места
        </h4>
        {normalizedSpots.length > 4 ? (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-white/60 hover:text-sky-600 dark:hover:text-white transition-colors inline-flex items-center gap-1"
          >
            {expanded ? "Свернуть" : "Показать все"}
            <span className={cn("material-symbols-outlined text-sm transition-transform", expanded && "rotate-90")}>arrow_forward</span>
          </button>
        ) : (
          <span className="material-symbols-outlined text-slate-400 dark:text-white/40 text-sm">arrow_forward</span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {visibleSpots.map((spot, idx) => (
          <div
            key={`${spot.name}-${idx}`}
            className="rounded-3xl overflow-hidden relative group aspect-[4/5] shadow-xl border border-white/40 dark:border-white/10"
          >
            <TripImage
              query={destination ? `${spot.name} ${destination}` : spot.name}
              alt={spot.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 dark:from-black/90 via-black/10 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 space-y-2">
              <h5 className="text-white font-bold text-sm drop-shadow-md line-clamp-2">{spot.name}</h5>
              <p className="text-[11px] text-white/85 line-clamp-2 leading-relaxed">{spot.text}</p>
              <button
                onClick={() => {
                  const url =
                    spot.mapLink ||
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spot.name)}`
                  window.open(url, "_blank")
                }}
                className="w-full py-2 bg-white/20 dark:bg-white/10 backdrop-blur-md border border-white/40 dark:border-white/30 text-white text-[10px] font-bold rounded-xl hover:bg-white/30 dark:hover:bg-white/20 transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-xs">map</span>
                На карте
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
