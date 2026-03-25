"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslations, useLocale } from "next-intl"
import { toPng } from "html-to-image"
import { ImagePlus, Download, Share2, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { appToast as toast } from "@/components/ui/sonner"
import { needsProxyImage } from "@/lib/image-utils"
import { collectMemoryGalleryQueries, computeTripMemoryStats } from "@/lib/trip-memory"

function proxyUrl(url: string): string {
  if (!url || url.startsWith("/") || url.startsWith("blob:") || url.startsWith("data:")) return url
  if (url.includes("/api/proxy-image") || url.includes("supabase")) return url
  if (needsProxyImage(url)) return `/api/proxy-image?url=${encodeURIComponent(url)}`
  return url
}

type Slot = { url: string; kind: "api" | "user" }

interface TripMemoryCardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  route: any
}

const CARD_W = 360
const CARD_H = 640

async function fetchGalleryFirstImage(query: string, exclude: string[]): Promise<string | null> {
  const excludeParam = exclude.length ? `&exclude=${encodeURIComponent(exclude.slice(0, 40).join(",").slice(0, 3800))}` : ""
  const res = await fetch(`/api/gallery?query=${encodeURIComponent(query)}&count=3${excludeParam}`)
  if (!res.ok) return null
  const data = await res.json()
  const images: string[] = data.images || []
  const fresh = images.find((u) => u && !exclude.includes(u))
  return fresh || images[0] || null
}

export function TripMemoryCardDialog({ open, onOpenChange, route }: TripMemoryCardDialogProps) {
  const t = useTranslations("trip.memory")
  const locale = useLocale()
  const cardRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [apiSlots, setApiSlots] = useState<string[]>([])
  const [userSlots, setUserSlots] = useState<string[]>([])
  const [loadedKeys, setLoadedKeys] = useState<Record<string, boolean>>({})

  const stats = useMemo(() => computeTripMemoryStats(route || {}), [route])
  const displayTitle = (route?.title || route?.destination || t("fallbackTitle")).slice(0, 80)
  const brandUrl = locale === "en" ? "travellm.world" : "travellm.ru"

  const gridSlots: (Slot | null)[] = useMemo(() => {
    const u = [...userSlots]
    const a = [...apiSlots]
    const out: (Slot | null)[] = [null, null, null, null]
    let i = 0
    while (i < 4 && u.length) {
      const url = u.shift()!
      out[i++] = { url, kind: "user" }
    }
    while (i < 4 && a.length) {
      const url = a.shift()!
      out[i++] = { url, kind: "api" }
    }
    return out
  }, [userSlots, apiSlots])

  const markLoaded = useCallback((key: string) => {
    setLoadedKeys((prev) => (prev[key] ? prev : { ...prev, [key]: true }))
  }, [])

  useEffect(() => {
    if (!open || !route?.itinerary) return
    let cancelled = false
    const run = async () => {
      setLoading(true)
      setApiSlots([])
      setLoadedKeys({})
      const queries = collectMemoryGalleryQueries(route.itinerary, 8)
      const urls: string[] = []
      const used = new Set<string>()
      for (const q of queries) {
        if (urls.length >= 4) break
        try {
          const u = await fetchGalleryFirstImage(q, [...used])
          if (cancelled) return
          if (u && !used.has(u)) {
            used.add(u)
            urls.push(u)
          }
        } catch {
          /* skip */
        }
      }
      if (!cancelled) setApiSlots(urls)
      if (!cancelled) setLoading(false)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [open, route?.itinerary])

  useEffect(() => {
    if (!open) {
      setUserSlots([])
      setLoadedKeys({})
    }
  }, [open])

  useEffect(() => {
    setLoadedKeys({})
  }, [userSlots, apiSlots])

  const slotsWithUrl = gridSlots.filter(Boolean) as Slot[]
  const loadKeys = slotsWithUrl.map((s, i) => `${s.kind}-${i}-${s.url}`)
  const allImagesLoaded =
    slotsWithUrl.length === 0 || loadKeys.every((k) => loadedKeys[k])

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    const next: string[] = []
    const max = Math.min(2, files.length)
    let pending = max
    for (let i = 0; i < max; i++) {
      const f = files[i]
      const r = new FileReader()
      r.onload = () => {
        if (typeof r.result === "string") next.push(r.result)
        pending--
        if (pending === 0) {
          setUserSlots(next.slice(0, 2))
          setLoadedKeys({})
        }
      }
      r.onerror = () => {
        pending--
        if (pending === 0) setUserSlots(next.slice(0, 2))
      }
      r.readAsDataURL(f)
    }
    e.target.value = ""
  }

  const runExport = useCallback(async () => {
    const el = cardRef.current
    if (!el) return null
    try {
      const dataUrl = await toPng(el, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: "#0f172a",
      })
      return dataUrl
    } catch (err) {
      console.error(err)
      toast.error(t("exportError"))
      return null
    }
  }, [t])

  const handleDownload = async () => {
    setExporting(true)
    const dataUrl = await runExport()
    setExporting(false)
    if (!dataUrl) return
    const a = document.createElement("a")
    a.href = dataUrl
    a.download = `travellm-memory-${displayTitle.slice(0, 24).replace(/\s+/g, "-") || "trip"}.png`
    a.click()
  }

  const handleShare = async () => {
    setExporting(true)
    const dataUrl = await runExport()
    setExporting(false)
    if (!dataUrl) return
    try {
      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], "travellm-trip.png", { type: "image/png" })
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: displayTitle,
          text: t("shareText"),
        })
      } else {
        const a = document.createElement("a")
        a.href = dataUrl
        a.download = `travellm-memory-${displayTitle.slice(0, 24).replace(/\s+/g, "-") || "trip"}.png`
        a.click()
        toast.info(t("shareFallback"))
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return
      toast.error(t("exportError"))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg max-h-[95vh] overflow-y-auto rounded-3xl border-slate-200/80 dark:border-white/10">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onPickFiles}
          />

          <div className="rounded-2xl border border-slate-200/60 dark:border-white/10 p-2 bg-slate-100/50 dark:bg-black/20 shadow-inner">
            <div
              ref={cardRef}
              className="relative overflow-hidden rounded-xl bg-slate-900 text-white"
              style={{ width: CARD_W, height: CARD_H, fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
            >
              <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5 bg-slate-950">
                {gridSlots.map((slot, i) => {
                  const key = slot ? `${slot.kind}-${i}-${slot.url}` : `empty-${i}`
                  if (!slot) {
                    return (
                      <div
                        key={key}
                        className="bg-gradient-to-br from-violet-900/80 via-slate-800 to-sky-900/70"
                      />
                    )
                  }
                  const src = proxyUrl(slot.url)
                  return (
                    <div key={key} className="relative overflow-hidden bg-slate-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt=""
                        className="h-full w-full object-cover"
                        onLoad={() => markLoaded(key)}
                        onError={() => markLoaded(key)}
                      />
                    </div>
                  )
                })}
              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent pointer-events-none" />

              <div className="absolute bottom-0 left-0 right-0 p-5 pt-24 space-y-3">
                <h2 className="text-xl font-black leading-tight tracking-tight line-clamp-3 drop-shadow-lg">
                  {displayTitle}
                </h2>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide backdrop-blur-md">
                    {t("days", { count: stats.days })}
                  </span>
                  <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide backdrop-blur-md">
                    {t("activities", { count: stats.totalActivities })}
                  </span>
                  <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide backdrop-blur-md">
                    {t("countries", { count: stats.countriesCount })}
                  </span>
                </div>
                <div className="flex items-end justify-between pt-2 border-t border-white/10">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
                      {t("madeWith")}
                    </p>
                    <p className="text-sm font-black text-white">{brandUrl}</p>
                  </div>
                  <div className="text-2xl font-black italic tracking-tighter text-violet-300">TraveLLM</div>
                </div>
              </div>

              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm z-10">
                  <Loader2 className="h-10 w-10 animate-spin text-violet-400" />
                </div>
              )}
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
            <Button
              type="button"
              variant="outline"
              className="gap-2 rounded-xl"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4" />
              {t("addPhotos")}
            </Button>
            <Button
              type="button"
              className="gap-2 rounded-xl bg-violet-600 hover:bg-violet-500"
              disabled={loading || exporting || !allImagesLoaded}
              onClick={handleDownload}
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {t("download")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="gap-2 rounded-xl"
              disabled={loading || exporting || !allImagesLoaded}
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" />
              {t("share")}
            </Button>
          </div>
          {loading && (
            <p className="text-xs text-muted-foreground text-center">{t("loading")}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
