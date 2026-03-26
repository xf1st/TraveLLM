"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, Star, MapPin, Calendar, Camera, Compass, Quote, MoveRight, Sparkles, Pencil, Trash2, Plus, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TripFeedbackDialog, type TripFeedbackRecord } from "@/components/travel/TripFeedbackDialog"
import { supabase } from "@/lib/supabase"
import { motion, AnimatePresence } from "framer-motion"
import { getGalleryApiUrl, getImageApiUrl } from "@/lib/image-utils"
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer
} from "recharts"
import { TripShareDialog } from "@/components/travel/TripShareDialog"
import { Share2, ArrowLeft } from "lucide-react"
import { Header } from "@/components/header"
import { appToast as toast } from "@/components/ui/sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

export default function TripCompletedPage() {
  const searchParams = useSearchParams()
  const tripId = String(searchParams.get("tripId") || "").trim()

  const [trip, setTrip] = useState<any>(null)
  const [feedback, setFeedback] = useState<TripFeedbackRecord | null>(null)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [gallery, setGallery] = useState<string[]>([])
  const [aiStats, setAiStats] = useState<any>(null)
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditGalleryOpen, setIsEditGalleryOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadData = async () => {
    if (!tripId) return
    setIsLoading(true)
    try {
      // Fetch Trip Data
      const { data: tripData } = await supabase.from('trips').select('*').eq('id', tripId).single()
      if (tripData) {
        setTrip(tripData)
        
        // Use memory_photos if they exist
        if (tripData.memory_photos && Array.isArray(tripData.memory_photos) && tripData.memory_photos.length > 0) {
          setGallery(tripData.memory_photos.slice(0, 8))
        } else {
          // Extract gallery from itinerary fallback
          let extractedDirectUrls: string[] = []
          let extractedQueries: string[] = []

          if (tripData.itinerary && Array.isArray(tripData.itinerary)) {
             tripData.itinerary.forEach((day: any) => {
               if (day.activities && Array.isArray(day.activities)) {
                 day.activities.forEach((act: any) => {
                   if (act.imageUrl && act.imageUrl.startsWith("http") && !extractedDirectUrls.includes(act.imageUrl)) extractedDirectUrls.push(act.imageUrl)
                   else if (act.photoUrl && act.photoUrl.startsWith("http") && !extractedDirectUrls.includes(act.photoUrl)) extractedDirectUrls.push(act.photoUrl)
                   else if (act.image && act.image.startsWith("http") && !extractedDirectUrls.includes(act.image)) extractedDirectUrls.push(act.image)
                   else if (act.imageQuery && typeof act.imageQuery === 'string' && !extractedQueries.includes(act.imageQuery)) extractedQueries.push(act.imageQuery)
                   else if (act.name && typeof act.name === 'string' && !extractedQueries.includes(act.name)) extractedQueries.push(act.name)
                 })
               }
             })
          }
          
          let finalImages = [...extractedDirectUrls]
          
          if (extractedQueries.length > 0 && finalImages.length < 8) {
              const queriesToFetch = extractedQueries.slice(0, 8 - finalImages.length)
              const promises = queriesToFetch.map(q => fetch(getImageApiUrl(q)).then(r => r.json()).then(d => d.url).catch(() => null))
              const resolvedUrls = await Promise.all(promises)
              const validUrls = resolvedUrls.filter(url => typeof url === 'string' && url.startsWith("http"))
              finalImages = [...finalImages, ...validUrls]
          }
          
          if (finalImages.length > 0) {
             setGallery(finalImages.slice(0, 8))
          } else {
             const dest = tripData.destination || "travel"
             const res = await fetch(getGalleryApiUrl(dest, 8))
             if (res.ok) {
               const json = await res.json()
               if (json.images) setGallery(json.images)
             }
          }
        }
      }

      // Fetch AI Stats
      const statsRes = await fetch(`/api/trip-stats?tripId=${tripId}`)
      if (statsRes.ok) {
        const statsJson = await statsRes.json()
        setAiStats(statsJson.stats)
      }

      // Fetch Feedback
      const fbRes = await fetch(`/api/trip-feedback?tripId=${encodeURIComponent(tripId)}`)
      if (fbRes.ok) {
        const payload = await fbRes.json()
        if (payload?.feedback) {
          setFeedback(payload.feedback)
        } else if (!payload?.feedback) {
          setTimeout(() => setIsFeedbackOpen(true), 2500)
        }
      }
    } catch (e) {
      console.error("Failed to load completed trip data", e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [tripId])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !tripId) return

    if (gallery.length >= 8) {
      toast.error("Максимум 8 фотографий")
      return
    }

    setIsUploading(true)
    try {
      const file = files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${tripId}/memory-${Date.now()}.${fileExt}`
      
      const { error } = await supabase.storage
        .from('memories')
        .upload(fileName, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('memories')
        .getPublicUrl(fileName)

      const updatedGallery = [...gallery, publicUrl]
      
      const { error: updateError } = await supabase
        .from('trips')
        .update({ memory_photos: updatedGallery })
        .eq('id', tripId)

      if (updateError) throw updateError

      setGallery(updatedGallery)
      toast.success("Фотография добавлена")
    } catch (err: any) {
      toast.error("Ошибка при загрузке: " + err.message)
    } finally {
      setIsUploading(false)
    }
  }

  const removePhoto = async (url: string) => {
    try {
      const updatedGallery = gallery.filter(p => p !== url)
      const { error } = await supabase
        .from('trips')
        .update({ memory_photos: updatedGallery })
        .eq('id', tripId)

      if (error) throw error
      setGallery(updatedGallery)
      toast.success("Фотография удалена")
    } catch (err) {
      toast.error("Ошибка при удалении")
    }
  }

  const stats = useMemo(() => {
    if (!trip?.itinerary) return null
    let totalPlaces = 0
    const days = trip.itinerary.length
    trip.itinerary.forEach((day: any) => {
      const activities = day.activities?.filter((a: any) => a.type !== "transport") || []
      totalPlaces += activities.length
    })
    return { days, totalPlaces, distance: (totalPlaces * 4.2).toFixed(1) }
  }, [trip])

  const radarData = useMemo(() => {
    if (!aiStats?.profile) return [
      { subject: 'Еда', A: 50 },
      { subject: 'Природа', A: 50 },
      { subject: 'Культура', A: 50 },
      { subject: 'Шоппинг', A: 50 },
      { subject: 'Жизнь', A: 50 },
      { subject: 'Отдых', A: 50 },
    ]
    const subjects = ['Еда', 'Природа', 'Культура', 'Шоппинг', 'Жизнь', 'Отдых']
    return subjects.map((s, i) => ({
      subject: s,
      A: aiStats.profile[i] || 50,
      fullMark: 100
    }))
  }, [aiStats])

  if (isLoading && !trip) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-muted-foreground font-medium animate-pulse">Проявляем воспоминания...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen min-w-0 bg-background font-sans text-foreground selection:bg-emerald-500/30">
      <Header />
      {/* Hero Section */}
      <section className="relative overflow-hidden px-3 pb-10 pt-28 sm:px-4 sm:pb-12 sm:pt-32">
        <div className="pointer-events-none absolute left-1/2 top-0 hidden h-[500px] w-full max-w-7xl -translate-x-1/2 bg-gradient-to-b from-emerald-500/10 to-transparent blur-3xl md:block" />
        
        <div className="relative z-10 mx-auto min-w-0 max-w-6xl">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center"
          >
            <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
               <Sparkles className="w-3 h-3" />
               Путешествие завершено
            </div>
            
            <h1 className="mb-5 break-words bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text px-1 text-3xl font-black tracking-tight text-transparent dark:from-white dark:to-white/60 sm:mb-6 sm:text-4xl md:text-6xl lg:text-7xl">
               {trip?.destination ? `Воспоминания: ${trip.destination}` : "Ваше приключение"}
            </h1>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mb-8 flex w-full max-w-md flex-col gap-3 sm:mb-10 sm:max-w-none sm:flex-row sm:items-center sm:justify-center"
            >
              <Link href={`/trip/${tripId}`} className="w-full sm:w-auto">
                <Button variant="outline" className="flex h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-full border-border bg-transparent px-6 font-bold text-foreground hover:bg-muted dark:border-white/10 dark:text-white dark:hover:bg-white/10 sm:w-auto">
                  <ArrowLeft className="h-4 w-4" /> К маршруту
                </Button>
              </Link>
              <Button
                onClick={() => setIsShareOpen(true)}
                className="flex h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-full border border-border bg-muted px-6 font-bold text-foreground hover:bg-zinc-200 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 sm:w-auto"
              >
                <Share2 className="h-4 w-4" /> Поделиться
              </Button>
            </motion.div>
            
            <p className="mx-auto mb-8 max-w-2xl px-1 text-base font-medium leading-relaxed text-muted-foreground dark:text-zinc-400 sm:mb-10 sm:text-lg md:text-xl">
              Каждое путешествие оставляет след. Мы проанализировали ваши впечатления и составили уникальный портрет вашего приключения.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="mx-auto min-w-0 max-w-7xl space-y-12 px-3 pb-20 sm:space-y-20 sm:px-4 sm:pb-24">
        
        {/* Profile and Stats Grid */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
          
          {/* Personality Card */}
          <motion.div 
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             className="lg:col-span-2 relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-3xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative h-full overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-md dark:border-white/5 dark:bg-[#0a0a0a] sm:rounded-3xl sm:p-6 md:p-10 md:shadow-xl">
               <div className="grid h-full grid-cols-1 items-center gap-6 md:grid-cols-2 md:gap-8">
                  <div className="space-y-6">
                     <div>
                        <div className="text-emerald-500 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Профиль путешественника</div>
                        <h2 className="text-2xl font-black text-foreground sm:text-3xl md:text-4xl">{aiStats?.personality || "Исследователь"}</h2>
                     </div>
                     <p className="text-base italic leading-relaxed text-muted-foreground dark:text-zinc-400 sm:text-lg">
                        "{aiStats?.description || "Загружаем анализ нашего приключения..."}"
                     </p>
                     
                     {aiStats?.bestQuote && (
                        <div className="bg-muted dark:bg-white/5 border-l-2 border-emerald-500 p-4 rounded-r-xl relative">
                           <Quote className="absolute -top-2 -left-2 w-6 h-6 text-emerald-500/20 rotate-180" />
                           <p className="text-foreground dark:text-zinc-300 font-medium relative z-10">
                             {aiStats.bestQuote}
                           </p>
                        </div>
                     )}
                  </div>
                  
                  <div className="relative h-[220px] w-full sm:h-[280px]">
                     <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                           <PolarGrid stroke="currentColor" strokeOpacity={0.2} />
                           <PolarAngleAxis dataKey="subject" tick={{ fill: 'currentColor', opacity: 0.6, fontSize: 10, fontWeight: 700 }} />
                           <Radar
                              name="Stats"
                              dataKey="A"
                              stroke="#10b981"
                              fill="#10b981"
                              fillOpacity={0.4}
                           />
                        </RadarChart>
                     </ResponsiveContainer>
                  </div>
               </div>
            </div>
          </motion.div>

          {/* Quick Stats Column */}
          <div className="space-y-6">
             <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-card dark:bg-white/5 border border-border dark:border-white/10 shadow-lg rounded-3xl p-6 flex flex-col justify-between h-[160px] relative overflow-hidden group hover:border-emerald-500/30 transition-colors"
             >
                <div className="flex justify-between items-start relative z-10">
                   <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500 dark:text-emerald-400">
                      <Calendar className="w-6 h-6" />
                   </div>
                   <div className="text-right">
                      <div className="text-3xl font-black text-foreground">{stats?.days || 0}</div>
                      <div className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Дней в пути</div>
                   </div>
                </div>
                <div className="mt-auto relative z-10 text-[10px] text-muted-foreground font-medium">Отличная продолжительность отдыха.</div>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-emerald-500/5 blur-2xl group-hover:bg-emerald-500/10 transition-colors hidden md:block" />
             </motion.div>

             <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-card dark:bg-white/5 border border-border dark:border-white/10 shadow-lg rounded-3xl p-6 flex flex-col justify-between h-[160px] relative overflow-hidden group hover:border-blue-500/30 transition-colors"
             >
                <div className="flex justify-between items-start relative z-10">
                   <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500 dark:text-blue-400">
                      <MapPin className="w-6 h-6" />
                   </div>
                   <div className="text-right">
                      <div className="text-3xl font-black text-foreground">{stats?.totalPlaces || 0}</div>
                      <div className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Локаций</div>
                   </div>
                </div>
                <div className="mt-auto relative z-10 text-[10px] text-muted-foreground font-medium">Каждое место уникально по-своему.</div>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-blue-500/5 blur-2xl group-hover:bg-blue-500/10 transition-colors hidden md:block" />
             </motion.div>

             <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-card dark:bg-white/5 border border-border dark:border-white/10 shadow-lg rounded-3xl p-6 flex flex-col justify-between h-[160px] relative overflow-hidden group hover:border-violet-500/30 transition-colors"
             >
                <div className="flex justify-between items-start relative z-10">
                   <div className="p-3 bg-violet-500/10 rounded-2xl text-violet-500 dark:text-violet-400">
                      <MoveRight className="w-6 h-6" />
                   </div>
                   <div className="text-right">
                      <div className="text-3xl font-black text-foreground">{stats?.distance || 0}</div>
                      <div className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">км пройдено</div>
                   </div>
                </div>
                <div className="mt-auto relative z-10 text-[10px] text-muted-foreground font-medium">Это был насыщенный маршрут!</div>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-violet-500/5 blur-2xl group-hover:bg-violet-500/10 transition-colors hidden md:block" />
             </motion.div>
          </div>
        </div>

        {/* Gallery Section */}
        <section>
           <div className="mb-8 flex flex-col justify-between gap-4 sm:mb-12 md:flex-row md:items-end md:gap-6">
              <div className="min-w-0">
                 <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500 dark:text-emerald-400 sm:mb-3">
                    <Camera className="h-4 w-4" /> Polaroid Memories
                 </div>
                 <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl md:text-4xl lg:text-5xl">Запечатленные моменты</h2>
              </div>
              <div className="flex w-full flex-col gap-2 sm:items-end md:w-auto">
                <Button 
                  onClick={() => setIsEditGalleryOpen(true)}
                  className="flex h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-full border border-border bg-zinc-100 px-6 font-bold text-black shadow-lg hover:bg-zinc-200 dark:border-white/5 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 sm:h-10 md:w-auto"
                >
                  <Pencil className="h-4 w-4" /> Изменить галерею
                </Button>
                <p className="text-sm leading-relaxed text-muted-foreground dark:text-zinc-500 sm:max-w-sm sm:text-right">
                   Лучшие кадры вашего путешествия, бережно сохраненные в нашей цифровой галерее.
                </p>
              </div>
           </div>
           
           <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4">
              {gallery.length > 0 ? gallery.slice(0, 8).map((img, i) => (
                <motion.div
                  key={img + i}
                  initial={{ opacity: 0, y: 40, rotate: (i % 2 === 0 ? 2 : -2) }}
                  whileInView={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.05, rotate: 0, y: -10 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, type: "spring" }}
                  className="bg-card p-3 pb-12 rounded-sm shadow-md md:shadow-2xl relative border border-border cursor-zoom-in"
                >
                  <div className="w-full aspect-[4/5] bg-muted relative overflow-hidden shadow-inner border border-black/5">
                    <img src={img} alt={`Memory ${i+1}`} className="absolute inset-0 w-full h-full object-cover" />
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center overflow-hidden">
                     <span className="text-muted-foreground text-[10px] font-bold italic line-clamp-1">
                        {trip?.destination} #{i+1}
                     </span>
                     <span className="text-[10px] text-muted-foreground/30 font-bold uppercase opacity-50">Memories</span>
                  </div>
                </motion.div>
              )) : (
                 <div className="col-span-full h-64 border-2 border-dashed border-border dark:border-white/5 rounded-3xl flex items-center justify-center text-muted-foreground">
                    Галерея пуста... пока что.
                 </div>
              )}
           </div>
        </section>

        {/* Action Footer */}
        <section className="pt-12 border-t border-border dark:border-white/5">
           <div className="relative flex flex-col items-center overflow-hidden rounded-3xl border border-border bg-muted/50 p-6 dark:border-white/5 dark:bg-zinc-900/50 sm:rounded-[40px] sm:p-8 md:p-16">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
              
              <div className="relative z-10 text-center max-w-2xl">
                 <h3 className="mb-4 text-2xl font-black text-foreground sm:mb-6 sm:text-3xl md:text-4xl">Готовы к новому открытию?</h3>
                 <p className="mb-8 font-medium leading-relaxed text-muted-foreground dark:text-zinc-400 sm:mb-10">
                    Мы уже подбираем для вас следующие невероятные локации на основе вашего профиля {aiStats?.personality || "исследователя"}.
                 </p>
                 
                 <div className="flex w-full max-w-md flex-col justify-center gap-3 sm:max-w-none sm:flex-row sm:gap-4">
                    <Button 
                       onClick={() => setIsFeedbackOpen(true)}
                       className="h-14 w-full touch-manipulation rounded-2xl bg-emerald-500 px-8 text-base font-extrabold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-600 dark:text-black dark:hover:bg-emerald-400 sm:h-16 sm:w-auto sm:px-10 sm:text-lg md:shadow-xl"
                    >
                       <Star className="mr-2 h-5 w-5 fill-current sm:mr-3" />
                       {feedback?.rating ? `Оценка: ${feedback.rating}/5` : "Оценить поездку"}
                    </Button>
                    <Button 
                       asChild
                       variant="outline"
                       className="h-14 w-full touch-manipulation rounded-2xl border-border px-8 text-base font-extrabold text-foreground hover:bg-muted dark:border-white/10 dark:text-white dark:hover:bg-white/5 sm:h-16 sm:w-auto sm:px-10 sm:text-lg"
                    >
                       <Link href="/trips" className="flex items-center justify-center gap-2">
                          <Compass className="h-5 w-5" /> Все маршруты
                       </Link>
                    </Button>
                 </div>
              </div>
           </div>
        </section>
      </div>

      <Dialog open={isEditGalleryOpen} onOpenChange={setIsEditGalleryOpen}>
        <DialogContent className="w-[calc(100vw-1.25rem)] max-w-3xl rounded-3xl border border-white/10 bg-zinc-950 p-5 sm:rounded-[32px] sm:p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl font-black uppercase italic tracking-tight text-white sm:text-2xl md:text-3xl">Настройка галереи</DialogTitle>
            <DialogDescription className="text-zinc-400 font-medium">
              Добавьте до 8 своих фотографий, чтобы создать уникальный альбом воспоминаний.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {gallery.map((url, i) => (
              <div key={url + i} className="group relative aspect-[4/5] rounded-2xl overflow-hidden bg-white/5 border border-white/10 shadow-md md:shadow-xl">
                <img src={url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-2">
                  <button 
                    type="button"
                    onClick={() => removePhoto(url)}
                    className="touch-manipulation rounded-full bg-red-500/20 p-3 text-red-400 transition-colors hover:bg-red-500/40"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
            {gallery.length < 8 && (
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="group flex aspect-[4/5] touch-manipulation flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/10 text-zinc-500 transition-all hover:border-emerald-500/50 hover:bg-emerald-500/5 hover:text-emerald-400"
              >
                {isUploading ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <>
                    <div className="p-4 bg-white/5 rounded-full group-hover:scale-110 transition-transform">
                      <Plus className="w-8 h-8" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest">Добавить фото</span>
                  </>
                )}
              </button>
            )}
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/*" 
            className="hidden" 
          />

          <div className="mt-6 flex justify-stretch sm:mt-8 sm:justify-end">
            <Button 
              onClick={() => setIsEditGalleryOpen(false)}
              className="h-12 w-full touch-manipulation rounded-2xl bg-emerald-500 px-8 font-black text-black hover:bg-emerald-400 sm:h-auto sm:w-auto"
            >
              Готово
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {tripId && (
        <TripFeedbackDialog
          open={isFeedbackOpen}
          onOpenChange={setIsFeedbackOpen}
          tripId={tripId}
          tripTitle={trip?.destination ? `Поездка в ${trip.destination}` : "Завершённая поездка"}
          source="memory_board"
          initialFeedback={feedback}
          onSubmitted={(saved) => setFeedback(saved)}
        />
      )}

      {trip && aiStats && (
        <TripShareDialog
          open={isShareOpen}
          onOpenChange={setIsShareOpen}
          tripData={trip}
          aiStats={aiStats}
          radarData={radarData}
        />
      )}
    </main>
  )
}

