"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight, BookOpen, Quote } from "lucide-react"
import { TripImage } from "@/components/TripImage"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface JournalMoment {
  title: string
  description: string
  imageQuery: string
  imageUrl?: string
  day: number
}

interface TravelJournalProps {
  moments?: JournalMoment[]
  itinerary?: any[]
  className?: string
}

export function TravelJournal({ moments, itinerary, className }: TravelJournalProps) {
  // If no moments provided, try to extract from itinerary
  const displayMoments: JournalMoment[] = moments || (itinerary?.slice(0, 5).map((day: any) => ({
    title: `День ${day.day}: ${day.activities?.[0]?.placeName || "Открытия"}`,
    description: day.activities?.[0]?.desc || "Новые впечатления и незабываемые моменты вашей поездки.",
    imageQuery: day.activities?.[0]?.placeName || "travel landscape",
    day: day.day
  }))) || []

  const [currentIndex, setCurrentIndex] = useState(0)

  if (displayMoments.length === 0) return null

  const next = () => setCurrentIndex((prev) => (prev + 1) % displayMoments.length)
  const prev = () => setCurrentIndex((prev) => (prev - 1 + displayMoments.length) % displayMoments.length)

  const current = displayMoments[currentIndex]

  return (
    <div className={cn("w-full py-12 px-4 max-w-6xl mx-auto", className)}>
      <div className="flex items-center justify-between mb-8">
        <div>
           <h3 className="text-2xl md:text-4xl font-black flex items-center gap-3 tracking-tighter uppercase italic text-primary">
             <BookOpen className="h-8 w-8" />
             Дневник путешественника
           </h3>
           <p className="text-muted-foreground mt-2 font-medium">Ваши лучшие моменты, собранные нейросетью</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={prev} className="rounded-full border-primary/20 hover:bg-primary/10">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button variant="outline" size="icon" onClick={next} className="rounded-full border-primary/20 hover:bg-primary/10">
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
      </div>

      <div className="relative h-[400px] md:h-[500px] w-full overflow-hidden rounded-[3rem] shadow-2xl group">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <TripImage
              src={current.imageUrl}
              alt={current.title}
              query={current.imageQuery}
              className="w-full h-full object-cover"
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            {/* Content Container */}
            <div className="absolute inset-x-0 bottom-0 p-8 md:p-12">
               <motion.div
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.3 }}
                 className="max-w-xl"
               >
                  <div className="flex items-center gap-3 mb-4">
                     <div className="h-px w-12 bg-primary" />
                     <span className="text-primary font-bold tracking-widest uppercase text-xs">Миг дня {current.day}</span>
                  </div>
                  <h4 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tighter leading-tight">
                    {current.title}
                  </h4>
                  <div className="relative">
                    <Quote className="absolute -left-6 -top-2 h-10 w-10 text-white/10" />
                    <p className="text-white/80 text-lg leading-relaxed italic">
                      {current.description}
                    </p>
                  </div>
               </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Progress bars */}
        <div className="absolute top-6 inset-x-0 flex justify-center gap-1.5 px-4 z-20">
          {displayMoments.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 rounded-full transition-all duration-300",
                i === currentIndex ? "w-12 bg-white" : "w-4 bg-white/30"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
