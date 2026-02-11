"use client"

import { useMemo, useState } from "react"
import { Drawer } from "vaul"
import { motion, AnimatePresence } from "framer-motion"
import { X, Calendar, ChevronDown, ChevronUp, LocateFixed, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useMediaQuery } from "@/lib/hooks/use-media-query"
import { useRouter } from "next/navigation"
import { TripImage } from "@/components/TripImage"

interface RouteDrawerProps {
  isOpen: boolean
  onClose: () => void
  route?: any
  activeDay: number
  onSelectDay: (day: number) => void
  activeActivity?: number | null
  onSelectActivity?: (activityIndex: number) => void
  onGoToPoint?: (day: number, activityIndex: number, title?: string) => void
  onCompleteTrip?: () => Promise<void> | void
  isCompletingTrip?: boolean
}

export function RouteDrawer({
  isOpen,
  onClose,
  route,
  activeDay,
  onSelectDay,
  activeActivity = null,
  onSelectActivity,
  onGoToPoint,
  onCompleteTrip,
  isCompletingTrip = false,
}: RouteDrawerProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const router = useRouter()

  const content = (
    <div className="space-y-6 pb-20">
      <RouteContent
        route={route}
        activeDay={activeDay}
        onSelectDay={onSelectDay}
        activeActivity={activeActivity}
        onSelectActivity={onSelectActivity}
        onGoToPoint={onGoToPoint}
        onCompleteTrip={onCompleteTrip}
        isCompletingTrip={isCompletingTrip}
      />
    </div>
  )

  if (isDesktop) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 bottom-0 w-[min(94vw,620px)] bg-black/90 backdrop-blur-2xl border-r border-white/10 z-50 shadow-2xl flex flex-col pt-6"
          >
            <div className="flex items-center justify-between mb-6 px-6">
              <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-500">Маршрут</h2>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push("/results")}
                  title="Мои маршруты"
                  className="rounded-full hover:bg-white/10 text-zinc-400 hover:text-white"
                >
                  <Calendar className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/10 text-zinc-400 hover:text-white">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 px-5 md:px-6">{content}</ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" />
        <Drawer.Content className="bg-zinc-950/95 border-t border-white/10 flex flex-col rounded-t-[20px] h-[92vh] fixed bottom-0 left-0 right-0 z-50 outline-none">
          <div className="p-4 flex-1 flex flex-col min-h-0">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-zinc-800 mb-6" />
            <div className="flex items-center justify-between mb-4 px-2">
              <Drawer.Title className="font-bold text-2xl text-white">Маршрут</Drawer.Title>
              <Button variant="ghost" size="sm" onClick={() => router.push("/results")} className="text-xs text-zinc-400 hover:text-white">
                Мои маршруты
              </Button>
            </div>
            <div className="flex-1 -mx-4 px-4 overflow-y-auto overscroll-contain touch-pan-y">{content}</div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

function RouteContent({
  route,
  activeDay,
  onSelectDay,
  activeActivity,
  onSelectActivity,
  onGoToPoint,
  onCompleteTrip,
  isCompletingTrip,
}: {
  route: any
  activeDay: number
  onSelectDay: (day: number) => void
  activeActivity: number | null
  onSelectActivity?: (activityIndex: number) => void
  onGoToPoint?: (day: number, activityIndex: number, title?: string) => void
  onCompleteTrip?: () => Promise<void> | void
  isCompletingTrip: boolean
}) {
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({})

  if (!route?.itinerary || !Array.isArray(route.itinerary)) {
    return <div className="text-muted-foreground px-4">Нет данных маршрута</div>
  }

  const itinerary = route.itinerary
  const dayCount = itinerary.length || route.days || 1
  const safeDay = Math.min(Math.max(activeDay || 1, 1), dayCount)
  const dayData = itinerary[safeDay - 1] || { activities: [] }
  const activities = Array.isArray(dayData.activities) ? dayData.activities : []

  const selectedActivity = useMemo(() => {
    if (activeActivity === null || activeActivity === undefined) return null
    return activities[activeActivity] || null
  }, [activities, activeActivity])

  const heroImage = selectedActivity?.image || selectedActivity?.photo || null
  const heroQuery = selectedActivity?.visual_query || selectedActivity?.title || selectedActivity?.placeName || "travel landmark"

  const toggleExpanded = (key: string) => {
    setExpandedMap((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="px-1">
        <h3 className="text-xl font-bold text-white mb-1 break-words">{route.title || "Путешествие"}</h3>
        <p className="text-sm text-zinc-400 leading-relaxed break-words">{route.description || "Детали маршрута по дням."}</p>
      </div>

      <div className="flex flex-wrap gap-2 pb-1">
        {Array.from({ length: dayCount }, (_, i) => i + 1).map((dayNum) => (
          <button
            key={dayNum}
            onClick={() => {
              onSelectDay(dayNum)
              onSelectActivity?.(0)
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors whitespace-nowrap ${
              safeDay === dayNum ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-300" : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
            }`}
          >
            День {dayNum}
          </button>
        ))}
      </div>

      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur pb-4 pt-1 px-1 border-b border-white/10">
        <h2 className="text-xl font-bold text-white">День {safeDay}</h2>
        <div className="text-sm text-zinc-300 mt-1 break-words">{dayData.title || `Активности на день ${safeDay}`}</div>

        {selectedActivity && (
          <div className="relative h-36 md:h-40 rounded-2xl overflow-hidden border border-emerald-500/20 mt-3">
            <TripImage src={heroImage} query={heroQuery} alt={selectedActivity?.title || "активность"} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            {selectedActivity && (
              <div className="absolute left-3 bottom-3 text-white font-semibold text-sm line-clamp-2">{selectedActivity.title || selectedActivity.placeName || "Активность"}</div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {activities.map((act: any, actIdx: number) => {
          const title = act.title || act.placeName || act.place_name || "Активность"
          const desc = act.desc || act.description || ""
          const time = act.time || "Днём"
          const cost = act.cost || act.price || ""
          const cardKey = `${safeDay}-${actIdx}`
          const expanded = !!expandedMap[cardKey]
          const isCurrent = activeActivity === actIdx

          return (
            <div
              key={cardKey}
              className={`bg-zinc-900/50 p-3.5 md:p-4 rounded-2xl border transition-all hover:bg-zinc-800/50 ${
                isCurrent ? "border-emerald-400/60 shadow-[0_0_25px_rgba(16,185,129,0.25)]" : "border-white/5 hover:border-white/20"
              }`}
            >
              <div className="flex gap-3 md:gap-4">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-zinc-800 flex-shrink-0 overflow-hidden relative shadow-lg">
                  <TripImage src={act.image || act.photo} query={act.visual_query || title} alt={title} className="w-full h-full object-cover" />
                </div>

                <div className="flex-1 min-w-0 py-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] uppercase font-bold bg-white/5 px-2 py-0.5 rounded text-zinc-400">{time}</span>
                    {cost && cost !== "0" && <span className="text-[10px] font-bold text-emerald-400">{cost}</span>}
                  </div>
                  <h5 className="font-bold text-white text-sm md:text-base leading-snug line-clamp-2 mb-1.5" title={title}>
                    {title}
                  </h5>
                  {desc && <p className={`text-xs text-zinc-400 leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>{desc}</p>}

                  <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] px-2.5 border-white/15 text-white/80 hover:bg-white/10"
                      onClick={() => onSelectActivity?.(actIdx)}
                    >
                      Выбрать
                    </Button>

                    <Button size="sm" className="h-7 text-[11px] px-2.5 bg-blue-500 hover:bg-blue-400 text-white" onClick={() => onGoToPoint?.(safeDay, actIdx, title)}>
                      <LocateFixed className="h-3 w-3 mr-1" />
                      На карте
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[11px] px-2 text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/10"
                      onClick={() => toggleExpanded(cardKey)}
                    >
                      Подробнее
                      {expanded ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                    </Button>
                  </div>

                  {expanded && (
                    <div className="mt-3 p-3 rounded-xl bg-black/30 border border-white/10 text-xs text-zinc-300 space-y-2">
                      <div>{desc || "Описание отсутствует."}</div>
                      {(act.contact || act.phone || act.address) && <div className="text-zinc-400">{[act.contact, act.phone, act.address].filter(Boolean).join(" • ")}</div>}
                      {(act.bookingLink || act.link) && (
                        <a href={act.bookingLink || act.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-emerald-400 hover:text-emerald-300 underline">
                          Ссылка на бронь
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <Button
        onClick={() => onCompleteTrip?.()}
        disabled={isCompletingTrip}
        className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold py-6 rounded-xl transition-all shadow-lg shadow-emerald-500/20 mt-8"
      >
        <CheckCircle2 className="h-5 w-5 mr-2" />
        {isCompletingTrip ? "Завершаем..." : "Завершить маршрут"}
      </Button>
    </div>
  )
}
