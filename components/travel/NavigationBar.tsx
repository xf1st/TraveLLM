"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, LocateFixed, Square } from "lucide-react"

interface NavigationBarProps {
  currentDay: number
  totalDays: number
  currentActivityIndex: number
  totalActivities: number
  activityTitle?: string
  onPrevDay: () => void
  onNextDay: () => void
  onPrevActivity: () => void
  onNextActivity: () => void
  onFlyToActivity: () => void
  onStop: () => void
}

export function NavigationBar({
  currentDay,
  totalDays,
  currentActivityIndex,
  totalActivities,
  activityTitle,
  onPrevDay,
  onNextDay,
  onPrevActivity,
  onNextActivity,
  onFlyToActivity,
  onStop,
}: NavigationBarProps) {
  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[70] w-[calc(100%-24px)] md:w-auto md:min-w-[920px] max-w-[1200px] pointer-events-auto">
      <div className="rounded-2xl border border-white/15 bg-black/60 backdrop-blur-xl p-3 md:p-4 shadow-2xl">
        <div className="flex flex-wrap items-center gap-3 md:gap-4 md:flex-nowrap">
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onPrevDay} className="rounded-full">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Пред. день
            </Button>
            <span className="text-xs md:text-sm font-bold text-emerald-300 uppercase tracking-wider whitespace-nowrap">
              День {currentDay} из {Math.max(totalDays, 1)}
            </span>
            <Button variant="secondary" size="sm" onClick={onNextDay} className="rounded-full">
              След. день
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <div className="flex-1 min-w-[200px] md:min-w-[280px]">
            <div className="text-[10px] md:text-xs text-white/50 uppercase tracking-wider">Активность</div>
            <div className="text-sm md:text-base font-semibold text-white truncate">{activityTitle || "Выберите точку"}</div>
            <div className="text-[10px] md:text-xs text-cyan-300 font-mono">
              {Math.max(currentActivityIndex + 1, 1)}/{Math.max(totalActivities, 1)}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button variant="secondary" size="icon" onClick={onPrevActivity} className="rounded-full h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" onClick={onNextActivity} className="rounded-full h-9 w-9">
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button onClick={onFlyToActivity} size="sm" className="rounded-full bg-blue-500 hover:bg-blue-400 text-white">
              <LocateFixed className="h-4 w-4 mr-1" />
              На карте
            </Button>
            <Button onClick={onStop} size="sm" variant="destructive" className="rounded-full">
              <Square className="h-4 w-4 mr-1" />
              Стоп
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
