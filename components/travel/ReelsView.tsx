"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence, useScroll, useSpring, useTransform } from "framer-motion"
import { MapPin, Clock, Star, Navigation, ChevronUp, ChevronDown, Share2, Heart, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface Activity {
  id: string
  title: string
  location: string
  time?: string
  description?: string
  imageUrl?: string
  rating?: number
  category?: string
}

interface ReelsViewProps {
  activities: Activity[]
  onClose: () => void
  initialIndex?: number
}

export function ReelsView({ activities, onClose, initialIndex = 0 }: ReelsViewProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollY = e.currentTarget.scrollTop
    const height = e.currentTarget.clientHeight
    const newIndex = Math.round(scrollY / height)
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < activities.length) {
      setCurrentIndex(newIndex)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col md:hidden">
      {/* Header overlay */}
      <div className="absolute top-0 inset-x-0 z-20 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full" onClick={onClose}>
          <ChevronDown className="h-6 w-6 rotate-90" />
        </Button>
        <div className="flex flex-col items-center leading-none">
          <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Activity</span>
          <span className="text-sm font-black text-white">{currentIndex + 1} / {activities.length}</span>
        </div>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full">
          <Share2 className="h-5 w-5" />
        </Button>
      </div>

      {/* Snap Container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto snap-y snap-mandatory no-scrollbar"
        onScroll={handleScroll}
      >
        {activities.map((activity, index) => (
          <div 
            key={activity.id || index}
            className="h-full w-full snap-start relative overflow-hidden"
          >
            {/* Background Image / Placeholder */}
            <div className="absolute inset-0 bg-neutral-900">
              {activity.imageUrl ? (
                <img 
                  src={activity.imageUrl} 
                  alt={activity.title}
                  className="w-full h-full object-cover opacity-80"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center opacity-20">
                  <MapPin className="h-24 w-24 text-white" />
                </div>
              )}
              {/* Dark overlays */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90" />
            </div>

            {/* Content Bottom Overlay */}
            <div className="absolute bottom-0 inset-x-0 p-6 pb-24 space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-2"
              >
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/80 backdrop-blur-md text-white border-none text-[10px] font-bold">
                    {activity.category || "ACTIVITY"}
                  </Badge>
                  {activity.rating && (
                    <div className="flex items-center gap-1 text-yellow-400 text-xs font-bold">
                      <Star className="h-3 w-3 fill-current" />
                      {activity.rating}
                    </div>
                  )}
                </div>
                
                <h2 className="text-3xl font-black text-white leading-tight drop-shadow-lg">
                  {activity.title}
                </h2>
                
                <div className="flex items-center gap-2 text-white/80 text-sm font-medium">
                  <MapPin className="h-4 w-4 text-primary" />
                  {activity.location}
                </div>

                {activity.description && (
                  <p className="text-white/70 text-sm line-clamp-3 font-medium leading-relaxed pt-2">
                    {activity.description}
                  </p>
                )}
              </motion.div>

              {/* Action Buttons Overlay Side */}
              <div className="absolute right-4 bottom-32 flex flex-col gap-6 items-center">
                <button className="flex flex-col items-center gap-1 group">
                  <div className="h-12 w-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 transition-transform active:scale-90">
                    <Heart className="h-6 w-6 text-white group-hover:text-rose-500 transition-colors" />
                  </div>
                  <span className="text-[10px] font-bold text-white uppercase">Like</span>
                </button>
                <button className="flex flex-col items-center gap-1 group">
                  <div className="h-12 w-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 transition-transform active:scale-90">
                    <Navigation className="h-6 w-6 text-white group-hover:text-sky-400 transition-colors" />
                  </div>
                  <span className="text-[10px] font-bold text-white uppercase">Route</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Global Navigation Hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none animate-bounce flex flex-col items-center gap-1">
        <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Swipe for next</span>
        <ChevronUp className="h-4 w-4 text-white/40" />
      </div>
    </div>
  )
}
