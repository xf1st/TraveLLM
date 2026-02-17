
"use client"

import { useEffect, useState, useMemo } from "react"
import { getWeatherForLocation, WeatherData, getWeatherDescription } from "@/lib/weather"
import { getCoordinates } from "@/lib/geocoding"
import { Cloud, CloudRain, Sun, CloudSnow, Moon, Thermometer } from "lucide-react"
import { cn } from "@/lib/utils"

interface TripWeatherWidgetProps {
  destination: string
  startDate?: string
  endDate?: string
  className?: string
}

export function TripWeatherWidget({ destination, startDate, endDate, className }: TripWeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Calculate dates only once or when props change
  const { targetStartDate, targetEndDate } = useMemo(() => {
      const start = startDate ? new Date(startDate) : new Date()
      if (!startDate) start.setDate(start.getDate() + 1)
      
      const end = endDate ? new Date(endDate) : new Date(start)
      if (!endDate) end.setDate(start.getDate() + 4)
      
      return { targetStartDate: start, targetEndDate: end }
  }, [startDate, endDate])

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
          setError("Координаты не найдены")
          return
        }

        // 2. Get Weather
        const data = await getWeatherForLocation(coords.lat, coords.lng, targetStartDate, targetEndDate)
        if (!mounted) return
        
        setWeather(data)
      } catch (err) {
        console.error(err)
        if (mounted) setError("Ошибка загрузки погоды")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchWeather()
    
    return () => { mounted = false }
  }, [destination, targetStartDate, targetEndDate])



  if (loading) return (
    <div className={cn("trip-glass p-4 rounded-2xl flex items-center justify-center min-h-[100px]", className)}>
       <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
    </div>
  )

  if (error || weather.length === 0) return null

  return (
    <div className={cn("trip-glass p-5 rounded-2xl space-y-3", className)}>
        <div className="flex items-center gap-2 mb-2">
            <Cloud className="w-5 h-5 text-sky-500" />
            <h3 className="font-bold text-lg">Погода в поездке</h3>
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-sky-200 dark:scrollbar-thumb-sky-800 scrollbar-track-transparent">
            {weather.map((day) => {
                const dateObj = new Date(day.date)
                const dayName = dateObj.toLocaleDateString('ru-RU', { weekday: 'short' })
                const dayNum = dateObj.getDate()
                
                let Icon = Sun
                if (day.weatherCode > 2) Icon = Cloud
                if (day.weatherCode > 50) Icon = CloudRain
                if (day.weatherCode > 70) Icon = CloudSnow

                return (
                    <div key={day.date} className="flex flex-col items-center min-w-[70px] bg-white/40 dark:bg-white/5 p-2 rounded-xl border border-white/20">
                        <span className="text-xs font-semibold text-muted-foreground uppercase">{dayName} {dayNum}</span>
                        <Icon className="w-6 h-6 my-2 text-sky-600 dark:text-sky-300" />
                        <div className="flex flex-col items-center text-xs font-bold">
                            <span className="text-rose-500">{Math.round(day.maxTemp)}°</span>
                            <span className="text-blue-500">{Math.round(day.minTemp)}°</span>
                        </div>
                    </div>
                )
            })}
        </div>
    </div>
  )
}
