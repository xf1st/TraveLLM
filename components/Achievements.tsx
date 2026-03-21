"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Lock, Map, Compass, Plane, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

export type Achievement = {
  id: string
  titleKey: string
  descKey: string
  icon: any
  condition: (stats: { countries: number; trips: number; weeks: number }) => boolean
  color: string
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_step",
    titleKey: "firstStep",
    descKey: "firstStepDesc",
    icon: Compass,
    condition: (stats) => stats.countries >= 1,
    color: "bg-blue-500",
  },
  {
    id: "explorer",
    titleKey: "explorer",
    descKey: "explorerDesc",
    icon: Map,
    condition: (stats) => stats.countries >= 5,
    color: "bg-emerald-500",
  },
  {
    id: "globetrotter",
    titleKey: "globetrotter",
    descKey: "globetrotterDesc",
    icon: Plane,
    condition: (stats) => stats.countries >= 10,
    color: "bg-purple-500",
  },
  {
    id: "traveler",
    titleKey: "traveler",
    descKey: "travelerDesc",
    icon: Plane,
    condition: (stats) => stats.trips >= 3,
    color: "bg-orange-500",
  },
  {
    id: "expert",
    titleKey: "expert",
    descKey: "expertDesc",
    icon: Star,
    condition: (stats) => stats.trips >= 10,
    color: "bg-yellow-500",
  },
]

interface AchievementsProps {
  visitedCountries: string[]
  completedTripsCount: number
}

export default function Achievements({ visitedCountries, completedTripsCount }: AchievementsProps) {
  const t = useTranslations("profile.achievement")
  const stats = {
    countries: visitedCountries.length,
    trips: completedTripsCount,
    weeks: 0,
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {ACHIEVEMENTS.map((achievement) => {
        const isUnlocked = achievement.condition(stats)
        const Icon = achievement.icon

        return (
          <Card
            key={achievement.id}
            className={cn(
              "p-4 relative overflow-hidden transition-all duration-300 border-2",
              isUnlocked ? "bg-gradient-to-br from-white/10 to-transparent border-primary/20 hover:border-primary/50" : "bg-zinc-900/10 border-transparent opacity-60 grayscale",
            )}
          >
            <div className="flex items-start gap-4">
              <div className={cn("p-3 rounded-xl flex items-center justify-center shrink-0 shadow-lg", isUnlocked ? achievement.color : "bg-zinc-800")}>
                {isUnlocked ? <Icon className="h-6 w-6 text-white" /> : <Lock className="h-6 w-6 text-zinc-500" />}
              </div>
              <div>
                <h3 className={cn("font-bold mb-1 transition", isUnlocked ? "text-foreground" : "text-muted-foreground blur-[3px] select-none")}>{t(achievement.titleKey)}</h3>
                <p className={cn("text-xs text-muted-foreground leading-snug transition", !isUnlocked && "blur-[3px] select-none")}>{t(achievement.descKey)}</p>
                {isUnlocked && (
                  <Badge variant="secondary" className="mt-2 text-[10px] h-5 bg-primary/10 text-primary border-primary/20">
                    {t("unlocked")}
                  </Badge>
                )}
              </div>
            </div>

            {isUnlocked && <div className={cn("absolute -top-10 -right-10 w-32 h-32 blur-3xl rounded-full opacity-20 pointer-events-none", achievement.color)} />}
          </Card>
        )
      })}
    </div>
  )
}
