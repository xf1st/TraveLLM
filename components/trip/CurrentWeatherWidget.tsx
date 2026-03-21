"use client"

import { useEffect, useState, useMemo } from "react"
import { getWeatherForLocation, WeatherData, getWeatherDescription } from "@/lib/weather"
import { getCoordinates } from "@/lib/geocoding"
import { Cloud, CloudRain, Sun, CloudSnow, Moon, Thermometer, Wind } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

interface CurrentWeatherWidgetProps {
  destination: string
  date?: string | Date
  className?: string
}

export function CurrentWeatherWidget({ destination, date, className }: CurrentWeatherWidgetProps) {
  const t = useTranslations("weather")
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const targetDate = useMemo(() => date ? new Date(date) : new Date(), [date])

  useEffect(() => {
    let mounted = true

    async function fetchWeather() {
      if (!destination) return

      try {
        setLoading(true)
        setError(null)
        
        // 1. Get Coordinates
        const coords = await getCoordinates(destination)
        if (!mounted) return
        
        if (!coords) {
          setError(t("coordsNotFound"))
          return
        }

        // 3. Get Weather for that single day
        // We pass same start and end date to get 1 day
        const data = await getWeatherForLocation(coords.lat, coords.lng, targetDate, targetDate)
        if (!mounted) return
        
        if (data && data.length > 0) {
            setWeather(data[0])
        } else {
            setError(t("noData"))
        }
      } catch (err) {
        console.error(err)
        if (mounted) setError(t("error"))
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchWeather()
    
    return () => { mounted = false }
  }, [destination, targetDate])

  // Loading State
  if (loading) return (
    <div className={cn("trip-glass bg-gradient-to-br from-sky-100/60 dark:from-sky-900/20 to-white/60 dark:to-white/5 p-5 rounded-[2rem] shadow-lg flex flex-col justify-between h-36 backdrop-blur-md md:backdrop-blur-xl border border-white/60 dark:border-white/10", className)}>
       <div className="flex justify-between items-start">
            <div className="bg-white/60 dark:bg-white/10 p-2.5 rounded-2xl shadow-sm backdrop-blur-md border border-white/40 dark:border-white/5">
                <Cloud className="w-5 h-5 text-sky-500/50 dark:text-sky-300/50 animate-pulse" />
            </div>
            <span className="text-xs font-bold text-sky-700/50 dark:text-sky-400/50 uppercase tracking-wide">{t("loading")}</span>
       </div>
       <div className="animate-pulse space-y-2">
           <div className="h-8 w-20 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
           <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
       </div>
    </div>
  )

  // Error State or No Data
  if (error || !weather) return (
    <div className={cn("trip-glass bg-gradient-to-br from-red-50/60 dark:from-red-900/20 to-white/60 dark:to-white/5 p-5 rounded-[2rem] shadow-lg flex flex-col justify-between h-36 backdrop-blur-md md:backdrop-blur-xl border border-white/60 dark:border-white/10", className)}>
        <div className="flex justify-between items-start">
            <div className="bg-white/60 dark:bg-white/10 p-2.5 rounded-2xl shadow-sm backdrop-blur-md border border-white/40 dark:border-white/5">
                <Cloud className="w-5 h-5 text-red-400" />
            </div>
            <span className="text-xs font-bold text-red-400 uppercase tracking-wide">{t("error")}</span>
        </div>
        <div>
            <span className="text-sm font-bold text-slate-800 dark:text-white">{t("noData")}</span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">{t("couldNotLoad")}</p>
        </div>
    </div>
  )

  // Determine Icon and Description
  let Icon = Sun
  const code = weather.weatherCode
  if (code > 2) Icon = Cloud
  if (code > 45 && code < 50) Icon = Moon // Fog? or just Cloudy
  if (code > 50) Icon = CloudRain
  if (code > 70) Icon = CloudSnow
  if (code > 95) Icon = Wind // Thunderstorm

  const description = getWeatherDescription(code)

  return (
    <div className={cn("trip-glass bg-gradient-to-br from-sky-100/60 dark:from-sky-900/20 to-white/60 dark:to-white/5 p-5 rounded-[2rem] shadow-lg flex flex-col justify-between h-36 hover:bg-white/80 dark:hover:bg-sky-900/30 transition-colors backdrop-blur-md md:backdrop-blur-xl border border-white/60 dark:border-white/10", className)}>
        <div className="flex justify-between items-start">
            <div className="bg-white/60 dark:bg-white/10 p-2.5 rounded-2xl shadow-sm backdrop-blur-md border border-white/40 dark:border-white/5">
                <Icon className="w-5 h-5 text-sky-500 dark:text-sky-300" />
            </div>
            <span className="text-xs font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wide">{t("label")}</span>
        </div>
        <div>
            <span className="text-3xl font-bold text-slate-800 dark:text-white">{Math.round(weather.currentTemp ?? weather.maxTemp)}°C</span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium capitalize">{description}</p>
        </div>
    </div>
  )
}
