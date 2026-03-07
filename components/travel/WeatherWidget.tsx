"use client"
import { useEffect, useState } from "react"
import { Cloud, CloudDrizzle, CloudLightning, CloudRain, CloudSnow, Sun } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface WeatherWidgetProps {
  lat?: number | null
  lng?: number | null
  city?: string
  className?: string
}

export function WeatherWidget({ lat, lng, city, className = "" }: WeatherWidgetProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (lat == null || lng == null) return
    let isMounted = true

    const fetchWeather = async () => {
      setLoading(true)
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${Math.round(lat*100)/100}&longitude=${Math.round(lng*100)/100}&current_weather=true`)
        if (res.ok) {
          const json = await res.json()
          if (isMounted) setData(json.current_weather)
        }
      } catch (e) {
        console.error("Weather fetch failed", e)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    const timer = setTimeout(fetchWeather, 400)
    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [lat, lng])

  if ((!lat || !lng) && !data && !loading) return null

  const renderIcon = (code: number) => {
    // WMO Weather interpretation codes
    if (code === 0) return <Sun className="text-yellow-400" size={18} />
    if (code >= 1 && code <= 3) return <Cloud className="text-gray-300" size={18} />
    if (code >= 51 && code <= 67) return <CloudRain className="text-blue-400" size={18} />
    if (code >= 71 && code <= 77) return <CloudSnow className="text-white" size={18} />
    if (code >= 80 && code <= 82) return <CloudRain className="text-blue-500" size={18} />
    if (code >= 95 && code <= 99) return <CloudLightning className="text-yellow-300" size={18} />
    return <Cloud className="text-gray-400" size={18} />
  }

  return (
    <AnimatePresence>
      {(loading || data) && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -10 }}
          className={`pointer-events-auto flex items-center gap-2.5 bg-black/50 backdrop-blur-md md:backdrop-blur-xl border border-white/10 px-3 py-1.5 rounded-2xl shadow-md md:shadow-xl transition-all ${className}`}
        >
          {loading && !data ? (
            <div className="flex items-center gap-2 animate-pulse w-[80px]">
              <div className="w-5 h-5 bg-white/20 rounded-full" />
              <div className="w-8 h-3 bg-white/20 rounded" />
            </div>
          ) : data ? (
            <>
              <div className="flex items-center justify-center p-1 bg-white/10 rounded-full shadow-inner">
                {renderIcon(data.weathercode)}
              </div>
              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-0.5">
                  <span className="text-sm font-extrabold text-white leading-none tracking-tight">{Math.round(data.temperature)}°</span>
                </div>
                {city && <span className="text-[9px] text-zinc-300 line-clamp-1 max-w-[80px] font-medium leading-none mt-0.5 tracking-wide">{city}</span>}
              </div>
            </>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
