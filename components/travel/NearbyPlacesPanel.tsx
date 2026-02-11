"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { X, Coffee, Landmark, Hotel, PartyPopper, MapPin, Sparkles, RefreshCcw } from "lucide-react"

interface NearbyPlacesPanelProps {
  onClose: () => void
  onPlacesFound: (places: any[]) => void
  userLocation?: { lat: number; lng: number }
  userProfile?: any
  tripContext?: any
  activeDay?: number
}

type NearbyTheme = "food" | "culture" | "nature" | "fun" | "shopping"

type PointTemplate = {
  title: string
  description: string
  color: string
  label: string
}

type ProfileContext = {
  pace: string
  interests: string[]
  accommodation: string
}

type DayContext = {
  title: string
  activityTitles: string[]
}

const CATEGORY_META: Record<
  NearbyTheme,
  { label: string; icon: any; color: string; bg: string; why: string; pool: PointTemplate[] }
> = {
  food: {
    label: "Еда",
    icon: Coffee,
    color: "text-orange-400",
    bg: "bg-orange-500/20",
    why: "Подбор по гастро-интересам",
    pool: [
      { title: "Локальный фудмаркет", description: "Местная кухня и быстрый перекус", color: "#fb923c", label: "Еда" },
      { title: "Кофейня с видом", description: "Хорошее место для паузы и фото", color: "#fb923c", label: "Кофе" },
      { title: "Ресторан региональной кухни", description: "Подходит под маршрут дня", color: "#f97316", label: "Кухня" },
      { title: "Небольшой стрит-фуд кластер", description: "Популярно у местных, адекватные цены", color: "#f59e0b", label: "Стрит-фуд" },
    ],
  },
  culture: {
    label: "Культура",
    icon: Landmark,
    color: "text-blue-400",
    bg: "bg-blue-500/20",
    why: "Подбор по культурным точкам",
    pool: [
      { title: "Городской музей", description: "История города и ключевые экспозиции", color: "#60a5fa", label: "Музей" },
      { title: "Исторический квартал", description: "Архитектура и прогулка по старому центру", color: "#3b82f6", label: "История" },
      { title: "Арт-пространство", description: "Современные выставки и локальные авторы", color: "#2563eb", label: "Арт" },
      { title: "Смотровая культурная точка", description: "Панорама + короткий культурный визит", color: "#1d4ed8", label: "Смотровая" },
    ],
  },
  nature: {
    label: "Природа",
    icon: MapPin,
    color: "text-emerald-400",
    bg: "bg-emerald-500/20",
    why: "Подбор по спокойным прогулкам",
    pool: [
      { title: "Парк рядом", description: "Тихая прогулка и небольшой отдых", color: "#34d399", label: "Парк" },
      { title: "Набережная", description: "Удобный маршрут пешком", color: "#10b981", label: "Набережная" },
      { title: "Сквер с обзорной точкой", description: "Подходит для короткой остановки", color: "#059669", label: "Сквер" },
      { title: "Зелёная зона", description: "Спокойная точка между активностями", color: "#047857", label: "Релакс" },
    ],
  },
  fun: {
    label: "Развлечения",
    icon: PartyPopper,
    color: "text-pink-400",
    bg: "bg-pink-500/20",
    why: "Подбор по активному досугу",
    pool: [
      { title: "Интерактивный центр", description: "Подходит для вечерней активности", color: "#f472b6", label: "Активно" },
      { title: "Локальное событие", description: "Популярная точка у путешественников", color: "#ec4899", label: "Ивент" },
      { title: "Развлекательный кластер", description: "Кафе + активности в одном месте", color: "#db2777", label: "Досуг" },
      { title: "Панорамный бар/лаунж", description: "Хорошо для вечернего окна в маршруте", color: "#be185d", label: "Вечер" },
    ],
  },
  shopping: {
    label: "Шопинг",
    icon: Hotel,
    color: "text-violet-400",
    bg: "bg-violet-500/20",
    why: "Подбор по полезным местам рядом",
    pool: [
      { title: "Локальный маркет", description: "Сувениры и товары местных брендов", color: "#a78bfa", label: "Маркет" },
      { title: "ТЦ рядом", description: "Быстрые покупки по пути", color: "#8b5cf6", label: "ТЦ" },
      { title: "Дизайн-лавка", description: "Небольшие местные находки", color: "#7c3aed", label: "Лавка" },
      { title: "Мультибрендовый магазин", description: "Удобно совместить с текущим днём", color: "#6d28d9", label: "Шопинг" },
    ],
  },
}

const shuffle = <T,>(arr: T[]) => {
  const cloned = [...arr]
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[cloned[i], cloned[j]] = [cloned[j], cloned[i]]
  }
  return cloned
}

const offsetFrom = (lat: number, lng: number, distanceKm: number, bearingRad: number) => {
  const latOffset = (distanceKm / 111) * Math.cos(bearingRad)
  const lngOffset = (distanceKm / (111 * Math.max(Math.cos((lat * Math.PI) / 180), 0.2))) * Math.sin(bearingRad)
  return { lat: lat + latOffset, lng: lng + lngOffset }
}

const normalizeToThemes = (values: string[]): NearbyTheme[] => {
  const text = values.join(" ").toLowerCase()
  const picked: NearbyTheme[] = []

  if (/(еда|гастро|кафе|coffee|food|restaurant|кухн)/i.test(text)) picked.push("food")
  if (/(культур|музе|истори|архит|art|museum)/i.test(text)) picked.push("culture")
  if (/(природ|парк|пляж|nature|forest|sea|набереж)/i.test(text)) picked.push("nature")
  if (/(ивент|развлеч|night|party|клуб|бар|фест)/i.test(text)) picked.push("fun")
  if (/(шоп|shopping|маркет|store|сувенир|mall)/i.test(text)) picked.push("shopping")

  if (picked.length === 0) {
    picked.push("food", "culture")
  }

  return Array.from(new Set(picked))
}

const paceHint = (pace: string) => {
  if (pace === "fast") return "В активном темпе это удобно вписать в текущий день."
  if (pace === "slow") return "Подходит для спокойного ритма и короткого выхода."
  return "Подходит под сбалансированный темп поездки."
}

export function NearbyPlacesPanel({ onClose, onPlacesFound, userLocation, userProfile, tripContext, activeDay }: NearbyPlacesPanelProps) {
  const [selectedTheme, setSelectedTheme] = useState<NearbyTheme | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [generated, setGenerated] = useState<any[]>([])

  const profileContext = useMemo<ProfileContext>(() => {
    const preferences = userProfile?.preferences || {}
    const interests = Array.isArray(preferences?.interestsDetailed)
      ? preferences.interestsDetailed
      : Array.isArray(preferences?.interests)
        ? preferences.interests
        : []

    return {
      pace: String(preferences?.pace || "moderate"),
      interests,
      accommodation: String(preferences?.accommodation || "hotel"),
    }
  }, [userProfile])

  const dayContext = useMemo<DayContext>(() => {
    const dayIdx = Math.max((activeDay || 1) - 1, 0)
    const dayData = tripContext?.itinerary?.[dayIdx] || {}
    const activities = Array.isArray(dayData?.activities) ? dayData.activities : []

    return {
      title: String(dayData?.title || ""),
      activityTitles: activities
        .map((a: any) => String(a?.title || a?.placeName || a?.place_name || "").trim())
        .filter(Boolean)
        .slice(0, 5),
    }
  }, [activeDay, tripContext])

  const themesFromProfile = useMemo(() => {
    const routeTags = Array.isArray(tripContext?.tags) ? tripContext.tags : []
    const routeMeta = [tripContext?.title || "", tripContext?.description || "", tripContext?.destination || ""]

    return normalizeToThemes([
      ...profileContext.interests,
      ...routeTags,
      dayContext.title,
      ...dayContext.activityTitles,
      ...routeMeta,
    ])
  }, [tripContext, profileContext.interests, dayContext.title, dayContext.activityTitles])

  const buildNearbyPoints = useCallback(
    (theme?: NearbyTheme) => {
      const centerLat = userLocation?.lat || 55.7558
      const centerLng = userLocation?.lng || 37.6173
      const pickedTheme = theme || themesFromProfile[0] || "food"
      const basePool = CATEGORY_META[pickedTheme].pool
      const minCount = profileContext.pace === "fast" ? 3 : 2
      const maxCount = profileContext.pace === "slow" ? 3 : 4
      const count = minCount + Math.floor(Math.random() * (maxCount - minCount + 1))
      const selected = shuffle(basePool).slice(0, count)

      const points = selected.map((item, idx) => {
        const distanceKm = Number((0.25 + Math.random() * 2.75).toFixed(1))
        const bearing = Math.random() * Math.PI * 2
        const offset = offsetFrom(centerLat, centerLng, distanceKm, bearing)
        const routeHint = dayContext.activityTitles[idx % Math.max(dayContext.activityTitles.length, 1)]
        const destination = tripContext?.destination ? `в районе направления ${tripContext.destination}` : "рядом с вашим маршрутом"
        const whyProfile = profileContext.interests.length > 0 ? `Подбор по интересам профиля: ${profileContext.interests.slice(0, 2).join(", ")}.` : "Подбор по вашему профилю."
        const whyRoute = routeHint ? `Логично совместить с активностью: ${routeHint}.` : `Точка выбрана ${destination}.`
        const whyPace = paceHint(profileContext.pace)

        return {
          lat: Number(offset.lat.toFixed(6)),
          lng: Number(offset.lng.toFixed(6)),
          title: item.title,
          label: item.label,
          desc: `${item.description}. ~${distanceKm} км от вас. ${CATEGORY_META[pickedTheme].why}. ${whyProfile} ${whyRoute} ${whyPace}`,
          type: pickedTheme,
          distanceKm,
          color: item.color,
          day: activeDay || 1,
          time: "Сейчас рядом",
          transportHint: profileContext.accommodation === "hostel" ? "Пешком/транспорт" : "Пешком или такси",
        }
      })

      setGenerated(points)
      onPlacesFound(points)
      return points
    },
    [
      activeDay,
      dayContext.activityTitles,
      onPlacesFound,
      profileContext.accommodation,
      profileContext.interests,
      profileContext.pace,
      themesFromProfile,
      tripContext?.destination,
      userLocation?.lat,
      userLocation?.lng,
    ],
  )

  const fetchRealPoi = useCallback(
    async (theme: NearbyTheme) => {
      const centerLat = userLocation?.lat || 55.7558
      const centerLng = userLocation?.lng || 37.6173
      const preferredLimit = profileContext.pace === "slow" ? 3 : 4

      const response = await fetch("/api/nearby-poi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: centerLat,
          lng: centerLng,
          theme,
          limit: preferredLimit,
          radiusKm: 3.5,
          activeDay: activeDay || 1,
          profile: {
            pace: profileContext.pace,
            interests: profileContext.interests,
            accommodation: profileContext.accommodation,
          },
          tripContext: {
            destination: tripContext?.destination || "",
            title: tripContext?.title || "",
            dayTitle: dayContext.title,
          },
        }),
      })

      if (!response.ok) return []
      const payload = await response.json()
      return Array.isArray(payload?.places) ? payload.places : []
    },
    [
      activeDay,
      dayContext.title,
      profileContext.accommodation,
      profileContext.interests,
      profileContext.pace,
      tripContext?.destination,
      tripContext?.title,
      userLocation?.lat,
      userLocation?.lng,
    ],
  )

  const handleGenerate = useCallback(
    async (theme?: NearbyTheme) => {
      setIsLoading(true)
      if (theme) setSelectedTheme(theme)
      const targetTheme = theme || selectedTheme || themesFromProfile[0] || "food"

      try {
        const realPlaces = await fetchRealPoi(targetTheme)
        if (realPlaces.length >= 2) {
          setGenerated(realPlaces)
          onPlacesFound(realPlaces)
          return
        }
        buildNearbyPoints(targetTheme)
      } catch (error) {
        // Silent fallback to local synthetic points.
        buildNearbyPoints(targetTheme)
      } finally {
        // Keep a tiny delay so loading state does not "flash" on very fast responses.
        await new Promise((r) => setTimeout(r, 120))
        setIsLoading(false)
      }
    },
    [buildNearbyPoints, fetchRealPoi, onPlacesFound, selectedTheme, themesFromProfile],
  )

  useEffect(() => {
    if (!generated.length) {
      const defaultTheme = themesFromProfile[0] || "food"
      setSelectedTheme(defaultTheme)
      handleGenerate(defaultTheme)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedTheme || !themesFromProfile.includes(selectedTheme)) {
      setSelectedTheme(themesFromProfile[0] || "food")
    }
  }, [selectedTheme, themesFromProfile])

  return (
    <div className="fixed left-4 bottom-24 md:left-6 md:top-24 md:bottom-auto w-[calc(100%-32px)] md:w-[360px] bg-black/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-5 animate-in slide-in-from-left-10 duration-300 z-50">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Рядом с вами</h3>
            <p className="text-[10px] text-white/50 font-medium tracking-wide uppercase">Персональные точки по интересам</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-colors border border-white/5">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="text-xs text-zinc-300 mb-3">
        Подобрано по профилю и маршруту:{" "}
        <span className="text-emerald-300 font-semibold">
          {themesFromProfile.map((t) => CATEGORY_META[t].label).join(", ")}
        </span>
      </div>

      <div className="text-[11px] text-zinc-400 mb-3 leading-relaxed">
        Генерируем 2-4 точки рядом с вами на основе интересов профиля, темпа поездки и активностей выбранного дня.
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {themesFromProfile.slice(0, 4).map((theme) => {
          const cat = CATEGORY_META[theme]
          return (
            <button
              key={theme}
              onClick={() => handleGenerate(theme)}
              disabled={isLoading}
              className={`group flex items-center gap-2 p-2.5 rounded-xl border transition-all duration-200 ${
                selectedTheme === theme ? "bg-white/10 border-emerald-500/40 text-white" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
              }`}
            >
              <div className={`p-1.5 rounded-lg ${cat.bg}`}>
                <cat.icon className={`w-4 h-4 ${cat.color}`} />
              </div>
              <span className="text-xs font-semibold truncate">{cat.label}</span>
            </button>
          )
        })}
      </div>

      <button
        onClick={() => handleGenerate(selectedTheme || themesFromProfile[0] || "food")}
        disabled={isLoading}
        className="w-full mb-3 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
      >
        <RefreshCcw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        {isLoading ? "Обновляю точки..." : "Подобрать 2-4 точки"}
      </button>

      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {generated.map((place, idx) => (
          <div key={`${place.title}-${idx}`} className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-white line-clamp-1">{place.title}</div>
              <div className="text-[10px] px-2 py-0.5 rounded-full bg-black/40 border border-white/10 text-zinc-300 whitespace-nowrap">{place.distanceKm} км</div>
            </div>
            <div className="text-xs text-zinc-400 mt-1 line-clamp-2">{place.desc}</div>
            <div className="mt-2">
              <button
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("map-open-poi", {
                      detail: {
                        source: "nearby",
                        category: place.type || "nearby",
                        title: place.title,
                        description: place.desc || "",
                        day: activeDay || 1,
                        time: place.time || "Сейчас рядом",
                        lat: place.lat,
                        lng: place.lng,
                        distanceKm: Number.isFinite(Number(place.distanceKm)) ? Number(place.distanceKm) : null,
                      },
                    }),
                  )
                }}
                className="w-full h-7 rounded-lg border border-white/10 bg-white/10 hover:bg-white/15 text-[11px] font-semibold text-zinc-200 transition-colors"
              >
                Открыть в POI Drawer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
