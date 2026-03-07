"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { Drawer } from "vaul"
import { motion, AnimatePresence } from "framer-motion"
import { X, Calendar, ChevronDown, ChevronUp, LocateFixed, CheckCircle2, MessageSquare, Save, Loader2, Paperclip, Image as ImageIcon, Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useMediaQuery } from "@/lib/hooks/use-media-query"
import { useRouter } from "next/navigation"
import { TripImage } from "@/components/TripImage"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface RouteDrawerProps {
  isOpen: boolean
  onClose: () => void
  route?: any
  activeDay: number
  onSelectDay: (day: number) => void
  activeActivity?: number | null
  onSelectActivity?: (activityIndex: number, mode?: "focus" | "silent") => void
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
            className="fixed left-0 top-0 bottom-0 w-[min(94vw,620px)] bg-zinc-950/95 backdrop-blur-md md:backdrop-blur-3xl border-r border-white/10 z-50 shadow-[20px_0_50px_rgba(0,0,0,0.5)] flex flex-col pt-6"
          >
            <div className="flex items-center justify-between mb-6 px-6">
              <div className="flex flex-col">
                <h2 className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 uppercase italic">
                  Маршрут
                </h2>
                <div className="h-1 w-12 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full mt-1" />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push("/trips")}
                  title="Мои маршруты"
                  className="rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-all hover:scale-110 active:scale-95"
                >
                  <Calendar className="h-5 w-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onClose} 
                  className="rounded-xl hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-all hover:scale-110 active:scale-95"
                >
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
        <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50 backdrop-blur-md" />
        <Drawer.Content className="bg-zinc-950/95 border-t border-white/10 flex flex-col rounded-t-[32px] h-[94vh] fixed bottom-0 left-0 right-0 z-50 outline-none shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <div className="p-4 flex-1 flex flex-col min-h-0">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-zinc-800/50 mb-6" />
            <div className="flex items-center justify-between mb-6 px-2">
              <div className="flex flex-col">
                <Drawer.Title className="font-black text-2xl text-white tracking-tighter uppercase italic bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                  Маршрут
                </Drawer.Title>
                <div className="h-1 w-8 bg-emerald-500 rounded-full mt-0.5" />
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.push("/trips")} 
                className="text-xs font-bold text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-full px-4"
              >
                Мои маршруты
              </Button>
            </div>
            <div className="flex-1 -mx-4 px-4 overflow-y-auto overscroll-contain touch-pan-y no-scrollbar">{content}</div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

function DiaryEntry({
  tripId,
  dayIndex,
  activityIndex,
  initialValue = "",
  memoryPhotos = [],
  onUpdatePhotos,
}: {
  tripId: string
  dayIndex: number
  activityIndex: number
  initialValue?: string
  memoryPhotos?: string[]
  onUpdatePhotos?: (photos: string[]) => void
}) {
  const [value, setValue] = useState(initialValue)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSave = async (text: string) => {
    if (!tripId) return
    setIsSaving(true)
    try {
      const res = await fetch("/api/trip-diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId,
          dayIndex,
          activityIndex,
          content: text,
        }),
      })
      if (res.ok) {
        setLastSaved(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))
      }
    } catch (e) {
      console.error("Failed to save diary entry", e)
    } finally {
      setIsSaving(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !tripId) return

    if (memoryPhotos.length >= 8) {
      toast.error("Максимум 8 фотографий на весь маршрут")
      return
    }

    setIsUploading(true)
    try {
      const file = files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${tripId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      
      const { data, error } = await supabase.storage
        .from('memories')
        .upload(fileName, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('memories')
        .getPublicUrl(fileName)

      const updatedPhotos = [...memoryPhotos, publicUrl]
      
      // Update DB
      const { error: updateError } = await supabase
        .from('trips')
        .update({ memory_photos: updatedPhotos })
        .eq('id', tripId)

      if (updateError) throw updateError

      onUpdatePhotos?.(updatedPhotos)
      toast.success("Фотография добавлена в дневник")
    } catch (err: any) {
      console.error("Upload error:", err)
      toast.error("Ошибка при загрузке: " + err.message)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const removePhoto = async (url: string) => {
    if (!tripId) return
    try {
      const updatedPhotos = memoryPhotos.filter(p => p !== url)
      const { error } = await supabase
        .from('trips')
        .update({ memory_photos: updatedPhotos })
        .eq('id', tripId)

      if (error) throw error
      onUpdatePhotos?.(updatedPhotos)
      toast.success("Фотография удалена")
    } catch (err) {
      toast.error("Ошибка при удалении")
    }
  }

  // Use a simple debounce for autosave
  useEffect(() => {
    if (value === initialValue) return
    const timer = setTimeout(() => {
      handleSave(value)
    }, 1500)
    return () => clearTimeout(timer)
  }, [value, initialValue])

  return (
    <div className="mt-4 space-y-3 border-t border-white/5 pt-4">
      <div className="flex items-center justify-between px-1">
        <label className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1.5">
          <MessageSquare className="w-3 h-3 text-emerald-400" />
          Дневник путешественника
        </label>
        <div className="flex items-center gap-3">
          {isSaving && <Loader2 className="w-3 h-3 text-emerald-400 animate-spin" />}
          {lastSaved && !isSaving && <span className="text-[9px] text-zinc-600 italic">Сохранено {lastSaved}</span>}
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || memoryPhotos.length >= 8}
            className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />}
            ПРИКРЕПИТЬ
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/*" 
            className="hidden" 
          />
        </div>
      </div>
      
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ваши впечатления, мысли или заметки об этом месте..."
        className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 min-h-[100px] transition-all resize-none shadow-inner"
      />

      {memoryPhotos.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {memoryPhotos.map((url, i) => (
            <div key={i} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-white/10 shadow-lg">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button 
                onClick={() => removePhoto(url)}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          ))}
          {memoryPhotos.length < 8 && (
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-16 h-16 rounded-lg border border-dashed border-white/20 flex items-center justify-center text-zinc-500 hover:text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
    </div>
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
  onSelectActivity?: (activityIndex: number, mode?: "focus" | "silent") => void
  onGoToPoint?: (day: number, activityIndex: number, title?: string) => void
  onCompleteTrip?: () => Promise<void> | void
  isCompletingTrip: boolean
}) {
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({})
  const [diaryData, setDiaryData] = useState<Record<string, string>>({})
  const [memoryPhotos, setMemoryPhotos] = useState<string[]>(route?.memory_photos || [])

  const tripId = route?.id

  // Load diary entries and trip photos on mount
  useEffect(() => {
    if (!tripId) return
    
    // Load diary
    fetch(`/api/trip-diary?tripId=${tripId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.entries) {
          const mapped: Record<string, string> = {}
          data.entries.forEach((e: any) => {
            mapped[`${e.day_index}-${e.activity_index}`] = e.content
          })
          setDiaryData(mapped)
        }
      })
      .catch((e) => console.error("Failed to load diary entries", e))

    // Refresh memory photos from DB
    supabase.from('trips').select('memory_photos').eq('id', tripId).single()
      .then(({ data }) => {
        if (data?.memory_photos) setMemoryPhotos(data.memory_photos)
      })
  }, [tripId])

  if (!route?.itinerary || !Array.isArray(route.itinerary)) {
    return <div className="text-muted-foreground px-4 py-8 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">Нет данных маршрута</div>
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="px-1 relative overflow-hidden group">
        <div className="relative z-10">
          <h3 className="text-2xl font-black text-white mb-2 break-words tracking-tight">{route.title || "Путешествие"}</h3>
          <p className="text-sm text-zinc-400 leading-relaxed break-words font-medium">{route.description || "Детали маршрута по дням."}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pb-1 overflow-x-auto no-scrollbar py-1">
        {Array.from({ length: dayCount }, (_, i) => i + 1).map((dayNum) => (
          <button
            key={dayNum}
            onClick={() => {
              onSelectDay(dayNum)
              onSelectActivity?.(0, "silent")
            }}
            className={cn(
              "px-5 py-2 rounded-2xl text-xs font-black transition-all whitespace-nowrap border tracking-tighter uppercase italic",
              safeDay === dayNum 
                ? "bg-emerald-500 border-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-105 z-10" 
                : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:border-white/20"
            )}
          >
            День {dayNum}
          </button>
        ))}
      </div>

      <div className="sticky top-0 z-20 bg-zinc-950/80 backdrop-blur-md md:backdrop-blur-xl -mx-5 px-5 pb-4 pt-2 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-lg italic">
              {safeDay}
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight uppercase italic leading-none">День {safeDay}</h2>
              <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">График активностей</div>
            </div>
          </div>
        </div>
        
        <div className="text-sm text-zinc-300 font-medium line-clamp-1">{dayData.title || `Активности на день ${safeDay}`}</div>

        {selectedActivity && (
          <motion.div 
            layoutId="hero-image"
            className="relative h-44 rounded-[2rem] overflow-hidden border border-emerald-500/20 mt-4 shadow-md md:shadow-2xl group"
          >
            <TripImage src={heroImage} query={heroQuery} alt={selectedActivity?.title || "активность"} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
            <div className="absolute left-5 bottom-5 text-white">
              <div className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-1">Сейчас выбрано</div>
              <div className="font-black text-lg line-clamp-1 tracking-tight italic uppercase">
                {selectedActivity.title || selectedActivity.placeName || "Активность"}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="space-y-5">
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
              className={cn(
                "relative bg-zinc-900/40 p-4 rounded-[2.5rem] border transition-all duration-300 overflow-hidden will-change-transform",
                isCurrent 
                  ? "border-emerald-500/50 bg-zinc-900/80 shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_20px_rgba(16,185,129,0.1)] ring-1 ring-emerald-500/20" 
                  : "border-white/5 hover:border-white/10 hover:bg-zinc-900/60"
              )}
            >
              {isCurrent && <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] pointer-events-none" />}
              
              <div className="flex gap-4 relative z-10">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-zinc-800 flex-shrink-0 overflow-hidden relative shadow-md md:shadow-2xl border border-white/5">
                  <TripImage src={act.image || act.photo} query={act.visual_query || title} alt={title} className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-[8px] font-black text-white uppercase tracking-tighter">
                    {actIdx + 1}
                  </div>
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] uppercase font-black bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg text-zinc-400 tracking-tighter italic">
                      {time}
                    </span>
                    {cost && cost !== "0" && (
                      <span className="text-[10px] font-black text-emerald-400 tracking-tight">{cost}</span>
                    )}
                  </div>
                  <h5 className="font-black text-white text-base md:text-lg leading-tight tracking-tight mb-2 uppercase italic" title={title}>
                    {title}
                  </h5>
                  {desc && (
                    <p className={cn(
                      "text-xs text-zinc-400 leading-relaxed font-medium",
                      expanded ? "" : "line-clamp-1"
                    )}>
                      {desc}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-5 relative z-10">
                <Button
                  size="sm"
                  className={cn(
                    "h-9 rounded-2xl text-[11px] px-5 font-black uppercase tracking-tighter italic transition-all active:scale-95",
                    isCurrent 
                      ? "bg-emerald-500 text-black hover:bg-emerald-400" 
                      : "bg-white/5 text-white/80 border border-white/10 hover:bg-white/10"
                  )}
                  onClick={() => onSelectActivity?.(actIdx, "focus")}
                >
                  Выбрать
                </Button>

                <Button 
                  size="sm" 
                  className="h-9 rounded-2xl text-[11px] px-5 bg-blue-500 hover:bg-blue-400 text-white font-black uppercase tracking-tighter italic shadow-lg shadow-blue-500/20 active:scale-95" 
                  onClick={() => onGoToPoint?.(safeDay, actIdx, title)}
                >
                  <LocateFixed className="h-3.5 w-3.5 mr-2" />
                  На карте
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 rounded-2xl text-[11px] px-3 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 font-black uppercase tracking-tighter italic"
                  onClick={() => toggleExpanded(cardKey)}
                >
                  Подробнее
                  {expanded ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                </Button>
              </div>

              <AnimatePresence>
                {expanded && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-5 p-5 rounded-[2rem] bg-black/40 border border-white/10 text-xs text-zinc-300 space-y-4 shadow-inner relative z-10">
                      <div className="leading-relaxed font-medium">{desc || "Описание отсутствует."}</div>
                      
                      {(act.contact || act.phone || act.address) && (
                        <div className="flex flex-wrap gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                          {[act.contact, act.phone, act.address].filter(Boolean).map((info, idx) => (
                            <span key={idx} className="flex items-center gap-1">
                              {idx > 0 && <span>•</span>}
                              {info}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {act.bookingLink || act.link ? (
                        <a 
                          href={act.bookingLink || act.link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center text-emerald-400 hover:text-emerald-300 font-black uppercase tracking-tighter italic group"
                        >
                          <span className="border-b border-emerald-500/30 group-hover:border-emerald-400">Ссылка на бронь</span>
                          <Plus className="w-3 h-3 ml-1 rotate-45" />
                        </a>
                      ) : null}
                      
                      {tripId && (
                        <DiaryEntry 
                          tripId={tripId} 
                          dayIndex={safeDay} 
                          activityIndex={actIdx} 
                          initialValue={diaryData[cardKey] || ""} 
                          memoryPhotos={memoryPhotos}
                          onUpdatePhotos={(photos) => setMemoryPhotos(photos)}
                        />
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      <div className="pt-4">
        <Button
          onClick={() => onCompleteTrip?.()}
          disabled={isCompletingTrip}
          className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-black py-8 rounded-[2rem] transition-all shadow-md md:shadow-2xl shadow-emerald-500/20 active:scale-[0.98] group overflow-hidden relative"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          <div className="relative z-10 flex items-center justify-center gap-3 text-lg uppercase italic tracking-tighter">
            {isCompletingTrip ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <CheckCircle2 className="h-6 w-6" />
            )}
            <span>{isCompletingTrip ? "Завершаем..." : "Завершить маршрут"}</span>
          </div>
        </Button>
      </div>
    </div>
  )
}
