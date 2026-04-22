"use client"

import { motion } from "framer-motion"
import { Sun, MapPin, Calendar, Info, Camera } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { TripImage } from "@/components/TripImage"

interface BentoInsightsProps {
  tripData: any
  className?: string
}

export function BentoInsights({ tripData, className }: BentoInsightsProps) {
  if (!tripData) return null

  const travelStyle = tripData.tags?.[0] || "Приключения"
  const duration = tripData.itinerary?.length || 0
  const destination = tripData.destination || tripData.countries?.[0]?.name || "Неизвестно"
  const rawTips = tripData.itinerary?.find((d: any) => d.tips)?.tips
  const proTips = (Array.isArray(rawTips) ? rawTips.join(' ') : rawTips) || "Возьмите с собой удобную обувь!"
  
  const mainImageUrl = tripData.mainImageUrl
  const foodImageUrl = tripData.foodImageUrl

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-4 p-4", className)}>
      {/* 1. Main Vibe Card (Big Hero with Image) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="md:col-span-2 md:row-span-2 relative group overflow-hidden rounded-[2.5rem] min-h-[250px] md:min-h-[350px]"
      >
        <div className="absolute inset-0 z-0">
          <TripImage 
            src={mainImageUrl}
            alt={destination}
            query={`${destination} landmark cityscape`}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />
        </div>
        
        <Card className="h-full bg-transparent border-none p-8 flex flex-col justify-between relative z-10 shadow-none">
          <div>
            <Badge variant="outline" className="mb-4 border-white/30 text-white bg-white/10 backdrop-blur-md uppercase tracking-widest text-[10px]">
              Вайб поездки
            </Badge>
            <h3 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-black mb-4 tracking-tighter leading-none text-white drop-shadow-lg">
              {travelStyle} <br /> <span className="text-sky-300">в {destination}</span>
            </h3>
            <p className="text-white/80 text-sm max-w-xs leading-relaxed font-medium drop-shadow-md">
              Ваш персональный маршрут настроен на идеальный баланс {travelStyle.toLowerCase()} и комфорта.
            </p>
          </div>
          <div className="mt-8 flex items-center gap-4">
               <div className="h-12 w-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                  <MapPin className="h-6 w-6 text-white" />
               </div>
               <div>
                  <p className="text-xs text-white/60 uppercase font-bold tracking-wider">Локация</p>
                  <p className="font-bold text-white drop-shadow-sm">{destination}</p>
               </div>
          </div>
        </Card>
      </motion.div>

      {/* 2. Weather Widget (Premium Glass) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
      >
        <Card className="h-full bg-white/10 dark:bg-black/20 backdrop-blur-md md:backdrop-blur-xl border-white/20 p-6 flex flex-col items-center justify-center text-center rounded-[2rem] hover:border-orange-500/50 transition-all shadow-lg group">
          <Sun className="h-10 w-10 text-orange-400 mb-2 animate-pulse group-hover:rotate-12 transition-transform" />
          <p className="text-4xl font-black tracking-tighter">+24°</p>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Солнечно</p>
        </Card>
      </motion.div>

      {/* 3. Aesthetic Image Block */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
        className="relative overflow-hidden rounded-[2rem] group min-h-[150px]"
      >
        <TripImage 
          src={foodImageUrl}
          alt={`${destination} food`}
          query={`${destination} local food street`}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
        <div className="absolute bottom-4 left-4">
           <Badge className="bg-white/20 backdrop-blur-md text-white border-white/10 flex items-center gap-1">
             <Camera className="w-3 h-3" />
             Местная кухня
           </Badge>
        </div>
      </motion.div>

      {/* 4. Duration & Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
      >
        <Card className="h-full bg-white/10 dark:bg-black/20 backdrop-blur-md md:backdrop-blur-xl border-white/20 p-6 flex flex-col items-center justify-center text-center rounded-[2rem] hover:border-sky-500/50 transition-all shadow-lg">
          <Calendar className="h-8 w-8 text-sky-400 mb-2" />
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black tracking-tighter">{duration}</span>
            <span className="text-lg font-bold text-muted-foreground">дн.</span>
          </div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Длительность</p>
        </Card>
      </motion.div>

      {/* 5. Pro Tip (Wide bottom) */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4 }}
      >
        <Card className="h-full bg-white/10 dark:bg-black/20 backdrop-blur-md md:backdrop-blur-xl border-white/20 p-6 flex items-start gap-4 rounded-[2rem] hover:border-emerald-500/50 transition-all shadow-lg overflow-hidden relative group">
          <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
          <div className="h-10 w-10 shrink-0 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <Info className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <h4 className="font-bold text-sm mb-1 uppercase tracking-tight text-foreground dark:text-white">Совет от TraveLLM</h4>
            <p className="text-[11px] text-muted-foreground line-clamp-2 italic leading-relaxed">
              «{proTips}»
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
