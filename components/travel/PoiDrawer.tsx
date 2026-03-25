"use client"

import { useEffect, useMemo, useState } from "react"
import { Drawer } from "vaul"
import { AnimatePresence, motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useMediaQuery } from "@/lib/hooks/use-media-query"
import { Camera, Compass, Info, MapPin, Navigation, Route, Sparkles, Trees, Landmark, UtensilsCrossed, ShoppingBag, X } from "lucide-react"
import { DEFAULT_TRAVEL_IMAGE, buildImageQuery, getGalleryApiUrl, getImageApiUrl } from "@/lib/image-utils"

export type PoiDrawerPoint = {
  title: string
  description?: string
  category?: string
  source: "nearby" | "social"
  lat: number
  lng: number
  day?: number | null
  time?: string
  distanceKm?: number | null
  color?: string
}

interface PoiDrawerProps {
  isOpen: boolean
  onClose: () => void
  poi: PoiDrawerPoint | null
  onBuildRoute?: (lat: number, lng: number, title?: string) => void
  onFlyTo?: (lat: number, lng: number) => void
}

type PoiTab = "about" | "photos" | "route"

const toTitleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()

const getCategoryMeta = (category?: string) => {
  const key = String(category || "").toLowerCase()
  if (key === "food") return { label: "Еда", icon: UtensilsCrossed, color: "text-orange-300", bg: "bg-orange-500/15 border-orange-500/25" }
  if (key === "culture") return { label: "Культура", icon: Landmark, color: "text-blue-300", bg: "bg-blue-500/15 border-blue-500/25" }
  if (key === "nature") return { label: "Природа", icon: Trees, color: "text-emerald-300", bg: "bg-emerald-500/15 border-emerald-500/25" }
  if (key === "shopping") return { label: "Шопинг", icon: ShoppingBag, color: "text-violet-300", bg: "bg-violet-500/15 border-violet-500/25" }
  return { label: key ? toTitleCase(key) : "POI", icon: Sparkles, color: "text-cyan-300", bg: "bg-cyan-500/15 border-cyan-500/25" }
}

function PoiContent({
  poi,
  onClose,
  onBuildRoute,
  onFlyTo,
  activeTab,
  onTabChange,
  galleryImages,
  isLoadingGallery,
  coverImage,
}: {
  poi: PoiDrawerPoint
  onClose: () => void
  onBuildRoute?: (lat: number, lng: number, title?: string) => void
  onFlyTo?: (lat: number, lng: number) => void
  activeTab: PoiTab
  onTabChange: (tab: PoiTab) => void
  galleryImages: string[]
  isLoadingGallery: boolean
  coverImage: string
}) {
  const category = getCategoryMeta(poi.category)
  const SourceIcon = poi.source === "nearby" ? Sparkles : MapPin
  const sourceLabel = poi.source === "nearby" ? "Рядом с вами" : "Внешний POI"
  const timeLabel = poi.time || "Сейчас"
  const metaLine = poi.day && poi.day > 0 ? `День ${poi.day} • ${timeLabel}` : timeLabel
  const latText = poi.lat.toFixed(5)
  const lngText = poi.lng.toFixed(5)

  return (
    <div className="space-y-5 pb-6">
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => onTabChange("about")}
          className={`h-9 rounded-xl border text-xs font-semibold transition-colors ${activeTab === "about" ? "bg-white/15 border-white/20 text-white" : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"}`}
        >
          <span className="inline-flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5" />О месте
          </span>
        </button>
        <button
          onClick={() => onTabChange("photos")}
          className={`h-9 rounded-xl border text-xs font-semibold transition-colors ${activeTab === "photos" ? "bg-white/15 border-white/20 text-white" : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"}`}
        >
          <span className="inline-flex items-center gap-1.5">
            <Camera className="h-3.5 w-3.5" />
            Фото
          </span>
        </button>
        <button
          onClick={() => onTabChange("route")}
          className={`h-9 rounded-xl border text-xs font-semibold transition-colors ${activeTab === "route" ? "bg-white/15 border-white/20 text-white" : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"}`}
        >
          <span className="inline-flex items-center gap-1.5">
            <Compass className="h-3.5 w-3.5" />
            Маршрут
          </span>
        </button>
      </div>

      <div className="p-4 rounded-2xl border border-white/10 bg-white/5">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[11px] font-semibold text-zinc-200">
            <SourceIcon className="h-3.5 w-3.5 text-emerald-300" />
            {sourceLabel}
          </div>
          <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${category.bg} ${category.color}`}>
            <category.icon className="h-3.5 w-3.5" />
            {category.label}
          </div>
        </div>

        <h3 className="text-xl font-bold text-white mt-3 leading-tight">{poi.title || "Точка интереса"}</h3>
        <p className="text-xs text-zinc-400 mt-1">{metaLine}</p>
        {activeTab === "about" && <p className="text-sm text-zinc-300 leading-relaxed mt-3">{poi.description || "Описание точки пока недоступно."}</p>}
        {activeTab === "photos" && (
          <div className="mt-3">
            <div className="relative h-36 rounded-xl overflow-hidden border border-white/10">
              <img
                src={coverImage}
                alt={poi.title}
                className="w-full h-full object-cover"
                onError={(event) => {
                  const target = event.currentTarget
                  if (target.src !== DEFAULT_TRAVEL_IMAGE) target.src = DEFAULT_TRAVEL_IMAGE
                }}
              />
            </div>
            <div className="text-xs text-zinc-400 mt-2">Автоподбор фото по названию точки и категории.</div>
          </div>
        )}
        {activeTab === "route" && (
          <p className="text-sm text-zinc-300 leading-relaxed mt-3">
            Откройте точку на карте и постройте маршрут от вашего текущего местоположения. Для точного времени и дистанции включите геолокацию.
          </p>
        )}
      </div>

      {activeTab !== "photos" && (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
            <div className="text-[10px] uppercase text-zinc-400">Км</div>
            <div className="text-sm font-semibold text-white mt-0.5">{Number.isFinite(poi.distanceKm) ? Number(poi.distanceKm).toFixed(1) : "—"}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
            <div className="text-[10px] uppercase text-zinc-400">Широта</div>
            <div className="text-xs font-semibold text-white mt-0.5">{latText}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
            <div className="text-[10px] uppercase text-zinc-400">Долгота</div>
            <div className="text-xs font-semibold text-white mt-0.5">{lngText}</div>
          </div>
        </div>
      )}

      {activeTab === "photos" && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          {isLoadingGallery ? (
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="h-24 rounded-lg bg-white/10 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {(galleryImages.length ? galleryImages : [coverImage]).slice(0, 6).map((img, idx) => (
                <div key={`${img}-${idx}`} className="h-24 rounded-lg overflow-hidden border border-white/10">
                  <img
                    src={img}
                    alt={`${poi.title} ${idx + 1}`}
                    className="w-full h-full object-cover"
                    onError={(event) => {
                      const target = event.currentTarget
                      if (target.src !== DEFAULT_TRAVEL_IMAGE) target.src = DEFAULT_TRAVEL_IMAGE
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs border-white/15 text-white/90 hover:bg-white/10"
          onClick={() => onFlyTo?.(poi.lat, poi.lng)}
        >
          <Navigation className="h-3.5 w-3.5 mr-1.5" />
          На карте
        </Button>

        <Button size="sm" className="h-8 text-xs bg-blue-500 hover:bg-blue-400 text-white" onClick={() => onBuildRoute?.(poi.lat, poi.lng, poi.title)}>
          <Route className="h-3.5 w-3.5 mr-1.5" />
          Маршрут
        </Button>

        <Button size="sm" variant="ghost" className="h-8 text-xs text-zinc-300 hover:text-white hover:bg-white/10" onClick={onClose}>
          Закрыть
        </Button>
      </div>
    </div>
  )
}

export function PoiDrawer({ isOpen, onClose, poi, onBuildRoute, onFlyTo }: PoiDrawerProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [activeTab, setActiveTab] = useState<PoiTab>("about")
  const [galleryImages, setGalleryImages] = useState<string[]>([])
  const [isLoadingGallery, setIsLoadingGallery] = useState(false)
  const [coverImage, setCoverImage] = useState<string>(DEFAULT_TRAVEL_IMAGE)

  const photoQuery = useMemo(() => buildImageQuery(poi?.title, poi?.category, poi?.description, "travel landmark"), [poi?.title, poi?.category, poi?.description])

  useEffect(() => {
    if (!poi || !isOpen) return

    let cancelled = false
    setActiveTab("about")
    setGalleryImages([])
    setIsLoadingGallery(true)

    const load = async () => {
      try {
        const [coverRes, galleryRes] = await Promise.all([fetch(getImageApiUrl(photoQuery)), fetch(getGalleryApiUrl(photoQuery, 6))])

        if (coverRes.ok) {
          const coverData = await coverRes.json()
          const url = String(coverData?.url || "")
          if (!cancelled && url) setCoverImage(url)
        } else if (!cancelled) {
          setCoverImage(DEFAULT_TRAVEL_IMAGE)
        }

        if (galleryRes.ok) {
          const galleryData = await galleryRes.json()
          const images = Array.isArray(galleryData?.images) ? galleryData.images.filter(Boolean) : []
          if (!cancelled) setGalleryImages(images)
        } else if (!cancelled) {
          setGalleryImages([])
        }
      } catch {
        if (!cancelled) {
          setCoverImage(DEFAULT_TRAVEL_IMAGE)
          setGalleryImages([])
        }
      } finally {
        if (!cancelled) setIsLoadingGallery(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [isOpen, poi, photoQuery])

  if (!poi) return null

  const content = (
    <PoiContent
      poi={poi}
      onClose={onClose}
      onBuildRoute={onBuildRoute}
      onFlyTo={onFlyTo}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      galleryImages={galleryImages}
      isLoadingGallery={isLoadingGallery}
      coverImage={coverImage}
    />
  )

  if (isDesktop) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 24, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-0 w-[min(94vw,430px)] bg-black/90 backdrop-blur-md md:backdrop-blur-2xl border-l border-white/10 z-50 shadow-md md:shadow-2xl flex flex-col pt-[calc(1.5rem+env(safe-area-inset-top,0px))]"
          >
            <div className="flex items-center justify-between mb-5 px-5">
              <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 to-emerald-400">POI Детали</h2>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/10 text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <ScrollArea className="flex-1 px-5">{content}</ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" />
        <Drawer.Content className="bg-zinc-950/95 border-t border-white/10 flex flex-col rounded-t-[20px] h-[80vh] fixed bottom-0 left-0 right-0 z-50 outline-none pb-[env(safe-area-inset-bottom)]">
          <Drawer.Title className="sr-only">Информация о точке</Drawer.Title>
          <Drawer.Description className="sr-only">Детальная карточка внешней или nearby-точки на карте.</Drawer.Description>

          <div className="p-4 flex-1 flex flex-col min-h-0">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-zinc-800 mb-4" />
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-bold text-white">POI Детали</div>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-zinc-400 hover:text-white">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 pr-1 overflow-y-auto overscroll-contain touch-pan-y">{content}</div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
