"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { motion } from "framer-motion"
import {
  ChevronUp,
  Clapperboard,
  MapPin,
  Volume2,
  VolumeX,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { reelImageDirectUrl, reelImageProxyUrl } from "@/lib/reel-image-url"

export type ReelCardDTO = {
  id: string
  title: string
  country: string
  city: string | null
  price_label: string | null
  suggested_start_date: string | null
  suggested_end_date: string | null
  anchor_day: number
  images: unknown
  activity_anchor?: Record<string, unknown> | null
  music_url: string | null
  locale: string
}

function asImageUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((x): x is string => typeof x === "string" && x.length > 0).slice(0, 5)
}

function ReelSlide({
  reel,
  isActive,
  slideHeight,
}: {
  reel: ReelCardDTO
  isActive: boolean
  slideHeight: number
}) {
  const t = useTranslations("reels")
  const [imgIdx, setImgIdx] = useState(0)
  const [imgBroken, setImgBroken] = useState(false)
  const [imgMode, setImgMode] = useState<"direct" | "proxy">("direct")
  const [soundOn, setSoundOn] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urls = asImageUrls(reel.images)
  const rawUrl = urls[imgIdx] ? reelImageDirectUrl(urls[imgIdx]) : ""
  const proxyUrl = urls[imgIdx] ? reelImageProxyUrl(urls[imgIdx]) : ""
  const displaySrc = imgMode === "direct" ? rawUrl : proxyUrl

  useEffect(() => {
    setImgBroken(false)
    setImgMode("direct")
  }, [imgIdx, reel.id])

  useEffect(() => {
    if (!isActive) {
      setSoundOn(false)
      const a = audioRef.current
      if (a) {
        a.pause()
        a.currentTime = 0
      }
    }
  }, [isActive])

  const stopAudio = () => {
    setSoundOn(false)
    const a = audioRef.current
    if (a) {
      a.pause()
      a.currentTime = 0
    }
  }

  const toggleSound = async () => {
    if (!reel.music_url) return
    if (!audioRef.current) {
      audioRef.current = new Audio(reel.music_url)
      audioRef.current.preload = "metadata"
    }
    const a = audioRef.current
    if (soundOn) {
      stopAudio()
      return
    }
    try {
      await a.play()
      setSoundOn(true)
    } catch {
      setSoundOn(false)
    }
  }

  useEffect(() => {
    return () => stopAudio()
  }, [])

  const loc = [reel.city, reel.country].filter(Boolean).join(", ")

  const bumpImage = (delta: number) => {
    if (urls.length <= 1) return
    setImgIdx((i) => (i + delta + urls.length) % urls.length)
  }

  const slideStyle =
    slideHeight > 0
      ? { minHeight: slideHeight, height: slideHeight }
      : { minHeight: "calc(100dvh - 5rem)", height: "calc(100dvh - 5rem)" }

  return (
    <div className="w-full shrink-0 snap-start snap-always relative overflow-hidden bg-neutral-950" style={slideStyle}>
      {/* Background */}
      <div className="absolute inset-0 bg-neutral-900">
        {displaySrc && !imgBroken ? (
          // eslint-disable-next-line @next/next/no-img-element -- external URLs + proxy; avoids Next/Image remote issues
          <img
            src={displaySrc}
            alt=""
            className="h-full w-full object-cover scale-[1.02]"
            loading={isActive ? "eager" : "lazy"}
            decoding="async"
            referrerPolicy={imgMode === "proxy" ? "no-referrer" : undefined}
            onError={() => {
              if (imgMode === "direct" && proxyUrl && proxyUrl !== rawUrl) {
                setImgMode("proxy")
              } else {
                setImgBroken(true)
              }
            }}
          />
        ) : null}
        {(imgBroken || urls.length === 0) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-violet-950/90 via-neutral-950 to-sky-950/80">
            <MapPin className="h-20 w-20 text-white/25" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">{t("noImage")}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/95 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/70 to-transparent pointer-events-none" />
      </div>

      {/* Horizontal photo zones (don’t steal vertical scroll) */}
      {urls.length > 1 && (
        <>
          <button
            type="button"
            aria-label={t("prevImage")}
            className="absolute left-0 top-0 bottom-32 w-[18%] z-20 max-w-[120px] cursor-w-resize opacity-0 hover:opacity-100 focus:opacity-100 focus:outline-none"
            onClick={(e) => {
              e.stopPropagation()
              bumpImage(-1)
            }}
          />
          <button
            type="button"
            aria-label={t("nextImage")}
            className="absolute right-0 top-0 bottom-32 w-[18%] z-20 max-w-[120px] cursor-e-resize opacity-0 hover:opacity-100 focus:opacity-100 focus:outline-none"
            onClick={(e) => {
              e.stopPropagation()
              bumpImage(1)
            }}
          />
          <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
            {urls.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`${i + 1}`}
                className={cn(
                  "h-1 rounded-full transition-all duration-300",
                  i === imgIdx ? "w-7 bg-white shadow-[0_0_12px_rgba(255,255,255,0.5)]" : "w-1.5 bg-white/35 hover:bg-white/55",
                )}
                onClick={() => setImgIdx(i)}
              />
            ))}
          </div>
        </>
      )}

      {/* Right rail — TikTok-style */}
      <div className="absolute right-3 bottom-40 z-20 flex flex-col gap-5 items-center">
        {reel.music_url && (
          <button
            type="button"
            onClick={toggleSound}
            className="flex flex-col items-center gap-1 group"
          >
            <div
              className={cn(
                "h-12 w-12 rounded-full flex items-center justify-center border transition-transform active:scale-90",
                soundOn
                  ? "bg-primary/90 border-primary text-primary-foreground shadow-lg shadow-primary/30"
                  : "bg-white/10 border-white/25 text-white backdrop-blur-md",
              )}
            >
              {soundOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </div>
            <span className="text-[9px] font-black text-white/80 uppercase tracking-wider max-w-[4rem] text-center leading-tight">
              {soundOn ? t("soundOn") : t("soundTap")}
            </span>
          </button>
        )}
        <div className="flex flex-col items-center gap-1 opacity-80">
          <div className="h-11 w-11 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-amber-300" />
          </div>
          <span className="text-[9px] font-bold text-white/60 uppercase">{t("inspire")}</span>
        </div>
      </div>

      {/* Bottom copy + CTA */}
      <div className="absolute inset-x-0 bottom-0 z-20 px-5 pb-8 pt-4 space-y-4 max-w-2xl mx-auto w-full">
        <motion.div
          initial={false}
          animate={{ opacity: isActive ? 1 : 0.85, y: isActive ? 0 : 6 }}
          transition={{ duration: 0.35 }}
          className="space-y-3"
        >
          <Badge className="bg-white/15 text-white border-white/25 backdrop-blur-md text-[10px] font-bold tracking-widest uppercase">
            {t("reelBadge")}
          </Badge>
          <h2 className="text-[1.65rem] sm:text-3xl font-black text-white leading-[1.15] tracking-tight drop-shadow-[0_4px_24px_rgba(0,0,0,0.85)]">
            {reel.title}
          </h2>
          <div className="flex items-center gap-2 text-white/90 text-sm font-medium">
            <MapPin className="h-4 w-4 text-sky-400 shrink-0" />
            <span>{loc}</span>
          </div>
          {reel.price_label && (
            <p className="text-lg font-bold text-emerald-400 drop-shadow-md">{reel.price_label}</p>
          )}
          <p className="text-white/55 text-xs font-medium leading-relaxed pr-12">
            {t("anchorDay", { day: reel.anchor_day })}
          </p>
        </motion.div>

        <Button
          asChild
          size="lg"
          className="w-full rounded-full h-14 text-base font-bold shadow-xl shadow-primary/25 bg-primary hover:bg-primary/90 text-primary-foreground border-0"
        >
          <Link href={`/plan/from-reel/${reel.id}`}>{t("ctaBuild")}</Link>
        </Button>
      </div>
    </div>
  )
}

type DiscoveryReelsFeedProps = {
  className?: string
}

export function DiscoveryReelsFeed({ className }: DiscoveryReelsFeedProps) {
  const locale = useLocale()
  const t = useTranslations("reels")
  const [reels, setReels] = useState<ReelCardDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [slideHeight, setSlideHeight] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => {
      const h = el.clientHeight
      if (h > 0) setSlideHeight(h)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [reels.length])

  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const h = slideHeight > 0 ? slideHeight : el.clientHeight
    if (h <= 0) return
    const idx = Math.min(reels.length - 1, Math.max(0, Math.round(el.scrollTop / h)))
    setCurrentIndex(idx)
  }, [reels.length, slideHeight])

  useEffect(() => {
    let cancelled = false
    const loadErrorMsg = t("loadError")
    ;(async () => {
      try {
        const res = await fetch(`/api/reels?limit=24&locale=${locale === "en" ? "en" : "ru"}`, {
          credentials: "include",
        })
        const j = (await res.json().catch(() => ({}))) as { reels?: ReelCardDTO[]; error?: string }
        if (!res.ok) throw new Error(j.error || loadErrorMsg)
        if (!cancelled) setReels(Array.isArray(j.reels) ? j.reels : [])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : loadErrorMsg)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [locale, t])

  useEffect(() => {
    const el = containerRef.current
    if (!el || reels.length === 0) return
    el.scrollTop = 0
    setCurrentIndex(0)
  }, [reels])

  if (loading) {
    return (
      <div className={cn("flex flex-1 flex-col items-center justify-center gap-4 bg-black text-white/50", className)}>
        <div className="h-14 w-14 rounded-full border-2 border-white/20 border-t-primary animate-spin" />
        <p className="text-sm font-medium">{t("loading")}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className={cn(
          "flex flex-1 flex-col items-center justify-center p-6 text-center bg-black text-white/80",
          className,
        )}
      >
        <p className="text-sm text-rose-300/90 max-w-sm">{error}</p>
      </div>
    )
  }

  if (reels.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-1 flex-col items-center justify-center p-8 text-center bg-black text-white/60",
          className,
        )}
      >
        <Clapperboard className="h-14 w-14 mb-4 text-white/25" />
        <p className="text-sm max-w-xs">{t("empty")}</p>
      </div>
    )
  }

  return (
    <div className={cn("relative flex flex-1 flex-col min-h-0 h-full bg-black", className)}>
      {/* Top overlay — не ломает вертикальный скролл */}
      <div className="pointer-events-none absolute top-0 inset-x-0 z-30 flex flex-col items-center pt-[calc(0.75rem+env(safe-area-inset-top,0px))]">
        <div className="pointer-events-auto flex w-full max-w-2xl items-center justify-between px-4">
          <div className="flex items-center gap-2 rounded-full bg-black/45 backdrop-blur-xl border border-white/10 px-3 py-1.5">
            <Clapperboard className="h-5 w-5 text-sky-400" />
            <div className="leading-tight">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50 block">
                {t("title")}
              </span>
              <span className="text-xs font-bold text-white tabular-nums">
                {currentIndex + 1} / {reels.length}
              </span>
            </div>
          </div>
        </div>
        <p className="mt-2 text-[10px] font-medium text-center text-white/40 max-w-[16rem] leading-snug px-4">
          {t("catalogHint")}
        </p>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 basis-0 overflow-y-auto overflow-x-hidden snap-y snap-mandatory no-scrollbar touch-pan-y overscroll-y-contain"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {reels.map((r, i) => (
          <ReelSlide key={r.id} reel={r} isActive={i === currentIndex} slideHeight={slideHeight} />
        ))}
      </div>

      <div className="pointer-events-none absolute bottom-24 lg:bottom-10 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1 animate-pulse">
        <span className="text-[9px] font-black text-white/35 uppercase tracking-[0.25em]">{t("swipeHint")}</span>
        <ChevronUp className="h-4 w-4 text-white/30" />
      </div>
    </div>
  )
}
