"use client"

import { useMemo, useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer,
} from "recharts"
import {
  Calendar, MapPin, Globe, Utensils, Compass, Plane, Hotel,
  Sparkles, Star, TrendingUp, Quote, Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslations, useLocale } from "next-intl"

interface TripStatsPanelProps {
  route: any
  tripId: string
}

export function TripStatsPanel({ route, tripId }: TripStatsPanelProps) {
  const t = useTranslations("stats")
  const locale = useLocale()

  const ACTIVITY_TYPES: { key: string; label: string; color: string; icon: any }[] = [
    { key: "activity", label: t("activityType"), color: "#60a5fa", icon: Compass },
    { key: "food",     label: t("foodType"),      color: "#34d399", icon: Utensils },
    { key: "transport",label: t("transportType"), color: "#f59e0b", icon: Plane   },
    { key: "hotel",    label: t("hotelType"),     color: "#c084fc", icon: Hotel   },
  ]

  const [aiStats, setAiStats] = useState<any>(null)
  const [aiLoading, setAiLoading] = useState(true)

  useEffect(() => {
    if (!tripId) return
    fetch(`/api/trip-stats?tripId=${tripId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.stats) setAiStats(d.stats) })
      .finally(() => setAiLoading(false))
  }, [tripId])

  // ── computed ──
  const { days, totalActivities, byType, countriesCount, totalCost } = useMemo(() => {
    if (!route?.itinerary) return { days: 0, totalActivities: 0, byType: {} as Record<string, number>, countriesCount: 0, totalCost: 0 }
    const byType: Record<string, number> = {}
    let total = 0, cost = 0
    for (const day of route.itinerary) {
      for (const act of day.activities ?? []) {
        const t = act.type || "activity"
        byType[t] = (byType[t] || 0) + 1
        total++
        const n = parseFloat((act.cost || "").replace(/[^\d.]/g, ""))
        if (!isNaN(n)) cost += n
      }
    }
    return {
      days: route.itinerary.length,
      totalActivities: total,
      byType,
      countriesCount: route.countries?.length || 1,
      totalCost: cost,
    }
  }, [route])

  const maxByType = Math.max(...Object.values(byType), 1)

  const radarData = useMemo(() => {
    const labels = [t("radarFood"), t("radarNature"), t("radarCulture"), t("radarShopping"), t("radarNightlife"), t("radarRest")]
    if (!aiStats?.profile) return labels.map(s => ({ subject: s, A: 50 }))
    return labels.map((s, i) => ({ subject: s, A: aiStats.profile[i] ?? 50, fullMark: 100 }))
  }, [aiStats, t])

  const tags = (route.tags || []).slice(0, 8) as string[]

  const statCards = [
    {
      label: t("daysOnRoad"),
      value: days,
      sub: t("richDays"),
      color: "#60a5fa",
      icon: Calendar,
    },
    {
      label: t("activities"),
      value: totalActivities,
      sub: t("uniquePlaces"),
      color: "#34d399",
      icon: MapPin,
    },
    {
      label: t("countries"),
      value: countriesCount,
      sub: (route.countries || []).map((c: any) => c.name || c).join(", ") || (countriesCount === 1 ? t("destinationSingle") : t("destinations")),
      color: "#f59e0b",
      icon: Globe,
    },
    {
      label: t("avgPerDay"),
      value: days ? (totalActivities / days).toFixed(1) : "—",
      sub: t("greatPace"),
      color: "#c084fc",
      icon: TrendingUp,
    },
  ]

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 pb-24 pt-4 space-y-6">

      {/* ── Stat cards row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="trip-glass rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col gap-3"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `${card.color}22` }}
              >
                <Icon className="w-4 h-4" style={{ color: card.color }} />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-foreground">{card.value}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">{card.label}</div>
                <div className="text-[11px] text-muted-foreground/70 mt-1 line-clamp-1">{card.sub}</div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* ── Main 2-col grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Personality + Radar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-2 trip-glass rounded-2xl sm:rounded-3xl p-5 sm:p-7"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500 mb-1">{t("travelerProfile")}</div>
                {aiLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t("analyzingRoute")}
                  </div>
                ) : (
                  <h2 className="text-2xl sm:text-3xl font-black text-foreground">
                    {aiStats?.personality || t("explorer")}
                  </h2>
                )}
              </div>
              {aiStats?.description && (
                <p className="text-sm text-muted-foreground leading-relaxed italic">
                  {aiStats.description}
                </p>
              )}
              {aiStats?.bestQuote && (
                <div className="bg-muted/50 border-l-2 border-emerald-500 p-3 rounded-r-xl relative">
                  <Quote className="absolute -top-2 -left-2 w-5 h-5 text-emerald-500/20 rotate-180" />
                  <p className="text-sm text-foreground font-medium relative z-10">{aiStats.bestQuote}</p>
                </div>
              )}
              {!aiLoading && !aiStats && (
                <p className="text-sm text-muted-foreground">{t("statsAfterTrip")}</p>
              )}
            </div>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                  <PolarGrid stroke="currentColor" strokeOpacity={0.15} />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: "currentColor", opacity: 0.6, fontSize: 10, fontWeight: 700 }}
                  />
                  <Radar name="Stats" dataKey="A" stroke="#10b981" fill="#10b981" fillOpacity={0.35} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Activity breakdown */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="trip-glass rounded-2xl sm:rounded-3xl p-5 sm:p-6 flex flex-col gap-4"
        >
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{t("activityTypes")}</div>
          {ACTIVITY_TYPES.map(({ key, label, color, icon: Icon }) => {
            const count = byType[key] || 0
            const pct = Math.round((count / maxByType) * 100)
            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                    <span className="text-xs font-bold text-foreground">{label}</span>
                  </div>
                  <span className="text-xs font-black" style={{ color }}>{count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.3, duration: 0.7, ease: "easeOut" }}
                  />
                </div>
              </div>
            )
          })}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="pt-2 border-t border-border/50">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">{t("tags")}</div>
              <div className="flex flex-wrap gap-1.5">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Budget breakdown ── */}
      {route.budgetAnalysis && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="trip-glass rounded-2xl sm:rounded-3xl p-5 sm:p-7"
        >
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">{t("tripBudget")}</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: t("accommodation"), value: route.budgetAnalysis.avgAccommodation, sub: t("perNight") },
              { label: t("food"), value: route.budgetAnalysis.avgFood, sub: t("perDay") },
              { label: t("transport"), value: route.budgetAnalysis.avgTransport, sub: t("total") },
              { label: t("totalBudget"), value: route.budgetAnalysis.totalEstimate || (totalCost > 0 ? `~${locale === "en" ? "$" : ""}${Math.round(totalCost).toLocaleString(locale === "en" ? "en-US" : "ru-RU")}${locale !== "en" ? " ₽" : ""}` : null), sub: t("estimate") },
            ].map(item => item.value && (
              <div key={item.label} className="rounded-2xl bg-muted/50 border border-border p-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{item.label}</div>
                <div className="text-lg font-black text-foreground whitespace-nowrap overflow-hidden text-ellipsis">{item.value}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{item.sub}</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Countries visited ── */}
      {(route.countries?.length || 0) > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="trip-glass rounded-2xl sm:rounded-3xl p-5 sm:p-7"
        >
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">{t("route")}</div>
          <div className="flex flex-wrap gap-3">
            {route.countries.map((c: any, i: number) => {
              const name = typeof c === "string" ? c : c.name
              const city = typeof c === "object" ? c.city : null
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-muted/60 border border-border"
                >
                  <Globe className="w-4 h-4 text-sky-500" />
                  <div>
                    <div className="text-sm font-bold text-foreground">{name}</div>
                    {city && <div className="text-[10px] text-muted-foreground">{city}</div>}
                  </div>
                  {i < route.countries.length - 1 && (
                    <Plane className="w-3.5 h-3.5 text-muted-foreground ml-1 rotate-45" />
                  )}
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* ── Safety & Visa block ── */}
      {(route.safetyInfo || route.visaAdvice) && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          {route.safetyInfo && (
            <div className="trip-glass rounded-2xl sm:rounded-3xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{t("safety")}</div>
                {route.safetyInfo.rating && (
                  <span className="ml-auto text-sm font-black text-foreground">{route.safetyInfo.rating}/10</span>
                )}
              </div>
              {Array.isArray(route.safetyInfo.tips)
                ? route.safetyInfo.tips.slice(0, 3).map((tip: string, i: number) => (
                    <p key={i} className="text-sm text-muted-foreground leading-relaxed mt-1">• {tip}</p>
                  ))
                : route.safetyInfo.tips && (
                    <p className="text-sm text-muted-foreground leading-relaxed mt-1">{String(route.safetyInfo.tips)}</p>
                  )}
            </div>
          )}
          {route.visaAdvice && (
            <div className="trip-glass rounded-2xl sm:rounded-3xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{t("visa")}</div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {typeof route.visaAdvice === "string"
                  ? route.visaAdvice
                  : route.visaAdvice?.summary || route.visaAdvice?.text || ""}
              </p>
            </div>
          )}
        </motion.div>
      )}

    </div>
  )
}
