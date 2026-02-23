"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, Star, MapPin, Calendar, Camera, Compass, Quote, MoveRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TripFeedbackDialog, type TripFeedbackRecord } from "@/components/travel/TripFeedbackDialog"
import { supabase } from "@/lib/supabase"
import { motion } from "framer-motion"
import { getGalleryApiUrl } from "@/lib/image-utils"
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer
} from "recharts"
import { TripShareDialog } from "@/components/travel/TripShareDialog"
import { Share2 } from "lucide-react"

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

  useEffect(() => {
    if (!tripId) return
    let isMounted = true

    const loadData = async () => {
      setIsLoading(true)
      try {
        // Fetch Trip Data
        const { data: tripData } = await supabase.from('trips').select('*').eq('id', tripId).single()
        if (tripData && isMounted) {
          setTrip(tripData)
          // Extract gallery from itinerary if possible
          let extractedImages: string[] = []
          if (tripData.itinerary && Array.isArray(tripData.itinerary)) {
             tripData.itinerary.forEach((day: any) => {
               if (day.activities && Array.isArray(day.activities)) {
                 day.activities.forEach((act: any) => {
                   if (act.image && !extractedImages.includes(act.image)) extractedImages.push(act.image)
                   else if (act.photoUrl && !extractedImages.includes(act.photoUrl)) extractedImages.push(act.photoUrl)
                   else if (act.imageUrl && !extractedImages.includes(act.imageUrl)) extractedImages.push(act.imageUrl)
                 })
               }
             })
          }
          
          if (extractedImages.length > 0 && isMounted) {
             setGallery(extractedImages)
          } else {
             // Fallback to Unsplash
             const dest = tripData.destination || "travel"
             const res = await fetch(getGalleryApiUrl(dest, 8))
             if (res.ok) {
               const json = await res.json()
               if (json.images && isMounted) setGallery(json.images)
             }
          }
        }

        // Fetch AI Stats
        const statsRes = await fetch(`/api/trip-stats?tripId=${tripId}`)
        if (statsRes.ok) {
          const statsJson = await statsRes.json()
          if (isMounted) setAiStats(statsJson.stats)
        }

        // Fetch Feedback
        const fbRes = await fetch(`/api/trip-feedback?tripId=${encodeURIComponent(tripId)}`)
        if (fbRes.ok) {
          const payload = await fbRes.json()
          if (isMounted && payload?.feedback) {
            setFeedback(payload.feedback)
          } else if (isMounted && !payload?.feedback) {
            setTimeout(() => setIsFeedbackOpen(true), 2500)
          }
        }
      } catch (e) {
        console.error("Failed to load completed trip data", e)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadData()
    return () => { isMounted = false }
  }, [tripId])

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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-zinc-500 font-medium animate-pulse">Проявляем воспоминания...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-emerald-500/30 font-sans">
      {/* Hero Section */}
      <section className="relative pt-20 pb-12 overflow-hidden px-4">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-gradient-to-b from-emerald-500/10 to-transparent blur-3xl pointer-events-none" />
        
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center"
          >
            <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
               <Sparkles className="w-3 h-3" />
               Путешествие завершено
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
               {trip?.destination ? `Воспоминания: ${trip.destination}` : "Ваше приключение"}
            </h1>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center gap-3 mb-10"
            >
              <Button
                onClick={() => setIsShareOpen(true)}
                className="bg-white/10 hover:bg-white/20 text-white rounded-full h-12 px-6 font-bold border border-white/10 flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" /> Поделиться
              </Button>
            </motion.div>
            
            <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
              Каждое путешествие оставляет след. Мы проанализировали ваши впечатления и составили уникальный портрет вашего приключения.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 pb-24 space-y-20">
        
        {/* Profile and Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Personality Card */}
          <motion.div 
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             className="lg:col-span-2 relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-3xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative h-full bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 md:p-10 overflow-hidden">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center h-full">
                  <div className="space-y-6">
                     <div>
                        <div className="text-emerald-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Профиль путешественника</div>
                        <h2 className="text-3xl md:text-4xl font-black text-white">{aiStats?.personality || "Исследователь"}</h2>
                     </div>
                     <p className="text-zinc-400 leading-relaxed text-lg italic">
                        "{aiStats?.description || "Загружаем анализ нашего приключения..."}"
                     </p>
                     
                     {aiStats?.bestQuote && (
                        <div className="bg-white/5 border-l-2 border-emerald-500 p-4 rounded-r-xl relative">
                           <Quote className="absolute -top-2 -left-2 w-6 h-6 text-emerald-500/20 rotate-180" />
                           <p className="text-zinc-300 font-medium relative z-10">
                             {aiStats.bestQuote}
                           </p>
                        </div>
                     )}
                  </div>
                  
                  <div className="h-[280px] w-full relative">
                     <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                           <PolarGrid stroke="#333" />
                           <PolarAngleAxis dataKey="subject" tick={{ fill: '#666', fontSize: 10, fontWeight: 700 }} />
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
                className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col justify-between h-[160px] relative overflow-hidden group hover:border-emerald-500/30 transition-colors"
             >
                <div className="flex justify-between items-start relative z-10">
                   <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
                      <Calendar className="w-6 h-6" />
                   </div>
                   <div className="text-right">
                      <div className="text-3xl font-black text-white">{stats?.days || 0}</div>
                      <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Дней в пути</div>
                   </div>
                </div>
                <div className="mt-auto relative z-10 text-[10px] text-zinc-400 font-medium">Отличная продолжительность отдыха.</div>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-emerald-500/5 blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
             </motion.div>

             <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col justify-between h-[160px] relative overflow-hidden group hover:border-blue-500/30 transition-colors"
             >
                <div className="flex justify-between items-start relative z-10">
                   <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
                      <MapPin className="w-6 h-6" />
                   </div>
                   <div className="text-right">
                      <div className="text-3xl font-black text-white">{stats?.totalPlaces || 0}</div>
                      <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Локаций</div>
                   </div>
                </div>
                <div className="mt-auto relative z-10 text-[10px] text-zinc-400 font-medium">Каждое место уникально по-своему.</div>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-blue-500/5 blur-2xl group-hover:bg-blue-500/10 transition-colors" />
             </motion.div>

             <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col justify-between h-[160px] relative overflow-hidden group hover:border-violet-500/30 transition-colors"
             >
                <div className="flex justify-between items-start relative z-10">
                   <div className="p-3 bg-violet-500/10 rounded-2xl text-violet-400">
                      <MoveRight className="w-6 h-6" />
                   </div>
                   <div className="text-right">
                      <div className="text-3xl font-black text-white">{stats?.distance || 0}</div>
                      <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">км пройдено</div>
                   </div>
                </div>
                <div className="mt-auto relative z-10 text-[10px] text-zinc-400 font-medium">Это был насыщенный маршрут!</div>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-violet-500/5 blur-2xl group-hover:bg-violet-500/10 transition-colors" />
             </motion.div>
          </div>
        </div>

        {/* Gallery Section */}
        <section>
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div>
                 <div className="text-emerald-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                    <Camera className="w-4 h-4" /> Polaroid Memories
                 </div>
                 <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">Запечатленные моменты</h2>
              </div>
              <p className="text-zinc-500 max-w-sm text-sm">
                 Лучшие кадры вашего путешествия, бережно сохраненные в нашей цифровой галерее.
              </p>
           </div>
           
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {gallery.length > 0 ? gallery.slice(0, 8).map((img, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 40, rotate: (i % 2 === 0 ? 2 : -2) }}
                  whileInView={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.05, rotate: 0, y: -10 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, type: "spring" }}
                  className="bg-white p-3 pb-12 rounded-sm shadow-2xl relative border border-zinc-200 cursor-zoom-in"
                >
                  <div className="w-full aspect-[4/5] bg-zinc-200 relative overflow-hidden shadow-inner border border-black/5">
                    <img src={img} alt={`Memory ${i+1}`} className="absolute inset-0 w-full h-full object-cover" />
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center overflow-hidden">
                     <span className="text-zinc-400 text-[10px] font-bold italic line-clamp-1">
                        {trip?.destination} #{i+1}
                     </span>
                     <span className="text-[10px] text-zinc-200 font-bold uppercase opacity-30">Memories</span>
                  </div>
                </motion.div>
              )) : (
                 <div className="col-span-full h-64 border-2 border-dashed border-white/5 rounded-3xl flex items-center justify-center text-zinc-600">
                    Галерея пуста... пока что.
                 </div>
              )}
           </div>
        </section>

        {/* Action Footer */}
        <section className="pt-12 border-t border-white/5">
           <div className="flex flex-col items-center bg-zinc-900/50 rounded-[40px] p-8 md:p-16 border border-white/5 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
              
              <div className="relative z-10 text-center max-w-2xl">
                 <h3 className="text-3xl md:text-4xl font-black mb-6">Готовы к новому открытию?</h3>
                 <p className="text-zinc-400 mb-10 leading-relaxed font-medium">
                    Мы уже подбираем для вас следующие невероятные локации на основе вашего профиля {aiStats?.personality || "исследователя"}.
                 </p>
                 
                 <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button 
                       onClick={() => setIsFeedbackOpen(true)}
                       className="bg-emerald-500 text-black hover:bg-emerald-400 font-extrabold rounded-2xl h-16 px-10 text-lg shadow-xl shadow-emerald-500/20"
                    >
                       <Star className="w-5 h-5 mr-3 fill-current" />
                       {feedback?.rating ? `Оценка: ${feedback.rating}/5` : "Оценить поездку"}
                    </Button>
                    <Button 
                       asChild
                       variant="outline"
                       className="border-white/10 h-16 px-10 rounded-2xl font-extrabold text-lg hover:bg-white/5 text-white"
                    >
                       <Link href="/results">
                          <Compass className="w-5 h-5 mr-3" /> Все маршруты
                       </Link>
                    </Button>
                 </div>
              </div>
           </div>
        </section>
      </div>

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
