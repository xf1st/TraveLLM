"use client"

import { useMemo, useState } from "react"
import { TripImage } from "@/components/TripImage"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

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
  const t = useTranslations("viral")
  const [expanded, setExpanded] = useState(false)

  const normalizedSpots = useMemo(
    () =>
      (spots || [])
        .filter((spot) => spot?.name)
        .map((spot) => ({
          ...spot,
          text: spot.description || spot.desc || t("defaultDesc"),
        })),
    [spots, t],
  )

  if (normalizedSpots.length === 0) return null

  const visibleSpots = expanded ? normalizedSpots : normalizedSpots.slice(0, 4)

  return (
    <div className="trip-glass min-w-0 rounded-2xl p-3 shadow-lg sm:rounded-[2rem] sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-2 sm:mb-4">
        <h4 className="min-w-0 text-[10px] font-bold uppercase tracking-widest text-pink-600 opacity-90 dark:text-pink-300 sm:text-xs">
          {t("title")}
        </h4>
        {normalizedSpots.length > 4 ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex min-h-10 touch-manipulation items-center gap-1 rounded-full py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 transition-colors hover:text-sky-600 dark:text-white/60 dark:hover:text-white"
          >
            {expanded ? t("collapse") : t("seeAll")}
            <span className={cn("material-symbols-outlined text-sm transition-transform", expanded && "rotate-90")}>
              arrow_forward
            </span>
          </button>
        ) : (
          <span className="material-symbols-outlined text-slate-400 dark:text-white/40 text-sm">arrow_forward</span>
        )}
      </div>

      {/* Mobile: horizontal strip of compact cards */}
      <div className="-mx-0.5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-0.5 pb-1 [-webkit-overflow-scrolling:touch] no-scrollbar md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0">
        {visibleSpots.map((spot, idx) => (
          <div
            key={`${spot.name}-${idx}`}
            className={cn(
              "rounded-2xl overflow-hidden relative group shadow-md border border-white/40 dark:border-white/10",
              "snap-start shrink-0 w-[min(78vw,240px)] md:w-auto md:shrink md:snap-none",
              "aspect-[16/10] md:aspect-[4/5]",
            )}
          >
            <TripImage
              query={destination ? `${spot.name} ${destination}` : spot.name}
              alt={spot.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 md:group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 dark:from-black/90 via-black/15 to-transparent" />
            <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-3 sm:right-3 space-y-1 sm:space-y-2">
              <h5 className="text-white font-bold text-xs sm:text-sm drop-shadow-md line-clamp-2 leading-tight">{spot.name}</h5>
              <p className="text-[9px] sm:text-[11px] text-white/85 line-clamp-2 leading-relaxed">{spot.text}</p>
              <button
                type="button"
                onClick={() => {
                  const url =
                    spot.mapLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spot.name)}`
                  window.open(url, "_blank")
                }}
                className="flex min-h-10 w-full touch-manipulation items-center justify-center gap-1 rounded-lg border border-white/40 bg-white/20 py-2 text-[10px] font-bold text-white backdrop-blur-md transition-all hover:bg-white/30 active:scale-[0.98] dark:border-white/30 dark:bg-white/10 dark:hover:bg-white/20 sm:rounded-xl sm:text-[10px]"
              >
                <span className="material-symbols-outlined text-[10px] sm:text-xs">map</span>
                {t("onMap")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
