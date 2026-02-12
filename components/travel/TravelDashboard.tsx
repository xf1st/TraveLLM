"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { MapControls } from "./MapControls"
import { RouteDrawer } from "./RouteDrawer"
import { toast } from "sonner"
import { Menu, X } from "lucide-react"
import dynamic from "next/dynamic"
import { MapChatWidget } from "./MapChatWidget"
import { MapSettings } from "./MapSettings"
import { NearbyPlacesPanel } from "./NearbyPlacesPanel"
import { fetchRoute, type RouteGeometry, type RouteResult, type RoutingProfile } from "@/lib/routing"
import { PoiDrawer, type PoiDrawerPoint } from "./PoiDrawer"
import { DEFAULT_TRAVEL_IMAGE, buildImageQuery, isProbablyBlockedImage } from "@/lib/image-utils"

const MapLibreView = dynamic(() => import("./MapLibreView"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-black flex items-center justify-center text-white font-mono text-sm">ЗАГРУЗКА КАРТЫ...</div>,
})

type DashboardState = "IDLE" | "SELECTION" | "ACTIVE"

type DisplayPoint = {
  lat: number
  lng: number
  label: number
  title: string
  desc: string
  day: number
  time: string
  color: string
  image?: string
  price?: string
  bookingLink?: string
  isNormalized?: boolean
  activityIndex: number
}

type RoutePickerItem = {
  id: string
  title: string
  destination?: string
  days: number
  createdAt?: string
  source: "db" | "local"
  raw?: any
}

type SegmentMode = "flight" | "walk" | "road" | "rail"

type StyledSegment = {
  coordinates: [number, number][]
  mode: SegmentMode
  icon: string
  lineColor: string
  fromTitle?: string
  toTitle?: string
  distanceKm?: number
  durationMin?: number
}

type ActiveRouteOverlay = {
  geometry: RouteGeometry
  mode: SegmentMode
  transportLabel: string
  distanceKm: number
  durationMin: number
  targetTitle?: string
}

type ActiveRouteRef = {
  id: string
  source: "db" | "local"
}

type DashboardRouteCache = {
  normalizedDayPoints?: Record<number, any[]>
  refinedCoordinates?: Record<string, { lat: number; lng: number }>
  resolvedImageByQuery?: Record<string, string>
  activeDay?: number
  activeActivity?: number | null
  itineraryFingerprint?: string
  updatedAt?: string
}

const DAY_COLORS = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"]
const ACTIVE_ROUTE_STORAGE_KEY = "travel-dashboard-active-route-v1"
const ROUTE_CACHE_STORAGE_PREFIX = "travel-dashboard-route-cache-v1:"

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Paris: { lat: 48.8566, lng: 2.3522 },
  "Париж": { lat: 48.8566, lng: 2.3522 },
  London: { lat: 51.5074, lng: -0.1278 },
  "Лондон": { lat: 51.5074, lng: -0.1278 },
  Dubai: { lat: 25.2048, lng: 55.2708 },
  "Дубай": { lat: 25.2048, lng: 55.2708 },
  Tokyo: { lat: 35.6762, lng: 139.6503 },
  "Токио": { lat: 35.6762, lng: 139.6503 },
  "New York": { lat: 40.7128, lng: -74.006 },
  "Нью-Йорк": { lat: 40.7128, lng: -74.006 },
  Moscow: { lat: 55.7558, lng: 37.6173 },
  "Москва": { lat: 55.7558, lng: 37.6173 },
  "Санкт-Петербург": { lat: 59.9343, lng: 30.3351 },
  Rome: { lat: 41.9028, lng: 12.4964 },
  "Рим": { lat: 41.9028, lng: 12.4964 },
  Berlin: { lat: 52.52, lng: 13.405 },
  "Берлин": { lat: 52.52, lng: 13.405 },
  Istanbul: { lat: 41.0082, lng: 28.9784 },
  "Стамбул": { lat: 41.0082, lng: 28.9784 },
  Bangkok: { lat: 13.7563, lng: 100.5018 },
  "Бангкок": { lat: 13.7563, lng: 100.5018 },
  Barcelona: { lat: 41.3874, lng: 2.1686 },
  "Барселона": { lat: 41.3874, lng: 2.1686 },
  Belgrade: { lat: 44.7866, lng: 20.4489 },
  "Белград": { lat: 44.7866, lng: 20.4489 },
}

const AIRPORT_COORDS: Record<string, { lat: number; lng: number }> = {
  SVO: { lat: 55.9726, lng: 37.4146 },
  DME: { lat: 55.4088, lng: 37.9063 },
  VKO: { lat: 55.5915, lng: 37.2615 },
  LED: { lat: 59.8003, lng: 30.2625 },
  IST: { lat: 41.2753, lng: 28.7519 },
  SAW: { lat: 40.8986, lng: 29.3092 },
  CDG: { lat: 49.0097, lng: 2.5479 },
  ORY: { lat: 48.7262, lng: 2.3652 },
  BEG: { lat: 44.8184, lng: 20.3091 },
  JFK: { lat: 40.6413, lng: -73.7781 },
  LHR: { lat: 51.47, lng: -0.4543 },
}

const safeReadJson = <T,>(key: string): T | null => {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

const safeWriteJson = (key: string, value: unknown) => {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // noop
  }
}

const safeRemove = (key: string) => {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(key)
  } catch {
    // noop
  }
}

const buildRouteCacheKey = (ref: ActiveRouteRef) => `${ROUTE_CACHE_STORAGE_PREFIX}${ref.source}:${ref.id}`

const normalizeText = (value: unknown) =>
  String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()

const extractCoordsFromMapLink = (rawLink: unknown): { lat: number; lng: number } | null => {
  const link = String(rawLink || "")
  if (!link) return null

  const atMatch = link.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
  if (atMatch) {
    const lat = Number(atMatch[1])
    const lng = Number(atMatch[2])
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
  }

  const queryMatch = link.match(/[?&](?:q|query)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
  if (queryMatch) {
    const lat = Number(queryMatch[1])
    const lng = Number(queryMatch[2])
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
  }

  return null
}

const buildItineraryFingerprint = (routeData: any): string => {
  if (!Array.isArray(routeData?.itinerary)) return "no-itinerary"
  return JSON.stringify(
    routeData.itinerary.map((day: any) => ({
      day: Number(day?.day) || null,
      title: String(day?.title || ""),
      logistics: String(day?.logistics?.to || day?.logistics?.from || ""),
      activities: Array.isArray(day?.activities)
        ? day.activities.map((act: any) => ({
            t: String(act?.time || ""),
            n: String(act?.title || act?.placeName || act?.place_name || ""),
            m: String(act?.mapLink || act?.map_link || ""),
          }))
        : [],
    })),
  )
}

export default function TravelDashboard() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tripId = searchParams.get("tripId")

  const [viewState, setViewState] = useState<DashboardState>("IDLE")
  const [activePanel, setActivePanel] = useState<"none" | "ai" | "route" | "nearby" | "settings" | "route-picker" | "poi">("none")
  const [trip, setTrip] = useState<any>(null)
  const [activeRouteRef, setActiveRouteRef] = useState<ActiveRouteRef | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [isCompletingTrip, setIsCompletingTrip] = useState(false)
  const [routePickerItems, setRoutePickerItems] = useState<RoutePickerItem[]>([])
  const [isLoadingRoutePicker, setIsLoadingRoutePicker] = useState(false)

  const [mapSettings, setMapSettings] = useState({
    showTraffic: false,
    showLabels: true,
    show3DBuildings: false,
    showSocialLayer: true,
    showGlobe: true,
    mapStyle: "satellite" as "dark" | "satellite" | "street",
  })

  const [nearbyPoints, setNearbyPoints] = useState<any[]>([])
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | undefined>(undefined)
  const [notification, setNotification] = useState<{ title: string; desc?: string; day?: number; time?: string } | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const [activeDay, setActiveDay] = useState<number>(1)
  const [activeActivity, setActiveActivity] = useState<number | null>(0)

  const [normalizedDayPoints, setNormalizedDayPoints] = useState<Record<number, any[]>>({})
  const [normalizingDay, setNormalizingDay] = useState<number | null>(null)
  const [refinedCoordinates, setRefinedCoordinates] = useState<Record<string, { lat: number; lng: number }>>({})
  const [flyToCoords, setFlyToCoords] = useState<{ lat: number; lng: number; altitude?: number } | null>(null)
  const [fitToPointsRequest, setFitToPointsRequest] = useState<{
    token: string
    points: Array<{ lat: number; lng: number }>
    padding?: number
    maxZoom?: number
  } | null>(null)
  const [routingLine, setRoutingLine] = useState<ActiveRouteOverlay | null>(null)
  const [routeSegments, setRouteSegments] = useState<StyledSegment[]>([])
  const [isBuildingSegments, setIsBuildingSegments] = useState(false)
  const [selectedPoi, setSelectedPoi] = useState<PoiDrawerPoint | null>(null)
  const [resolvedImageByQuery, setResolvedImageByQuery] = useState<Record<string, string>>({})

  const toastShownRef = useRef(false)
  const segmentCacheRef = useRef<Map<string, RouteResult>>(new Map())
  const cacheSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {
          // Silent: user can still use map without precise route-from-current-position.
        },
      )
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const loadProfile = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        const userId = session?.user?.id
        if (!userId) {
          if (!cancelled) setUserProfile(null)
          return
        }

        const { data } = await supabase.from("profiles").select("*").eq("id", userId).single()
        if (!cancelled) setUserProfile(data || null)
      } catch (error) {
        console.warn("Failed to load profile for nearby recommendations:", error)
        if (!cancelled) setUserProfile(null)
      }
    }

    loadProfile()
    return () => {
      cancelled = true
    }
  }, [])

  const loadRoutePickerItems = useCallback(async () => {
    setIsLoadingRoutePicker(true)
    try {
      const picked: RoutePickerItem[] = []

      const { data: authData } = await supabase.auth.getSession()
      const userId = authData?.session?.user?.id
      if (userId) {
        const { data: trips } = await supabase
          .from("trips")
          .select("id,title,destination,created_at,itinerary")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(100)

        if (Array.isArray(trips)) {
          trips.forEach((item: any) => {
            picked.push({
              id: String(item.id),
              title: item.title || "Маршрут без названия",
              destination: item.destination || "",
              days: Array.isArray(item.itinerary) ? item.itinerary.length : 0,
              createdAt: item.created_at,
              source: "db",
            })
          })
        }
      }

      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("lastGeneratedRoute")
        if (stored) {
          try {
            const parsed = JSON.parse(stored)
            if (parsed && Array.isArray(parsed.itinerary)) {
              picked.push({
                id: "ai-last",
                title: parsed.title || "Последний сгенерированный маршрут",
                destination: parsed.destination || parsed.countries?.[0]?.name || "",
                days: parsed.itinerary.length,
                source: "local",
                raw: parsed,
              })
            }
          } catch {
            // ignore malformed local data
          }
        }
      }

      const dedup = new Map<string, RoutePickerItem>()
      picked.forEach((item) => {
        if (!dedup.has(item.id)) dedup.set(item.id, item)
      })

      setRoutePickerItems(Array.from(dedup.values()))
    } catch (error) {
      console.error("Failed to load routes for picker:", error)
      toast.error("Не удалось загрузить список маршрутов")
      setRoutePickerItems([])
    } finally {
      setIsLoadingRoutePicker(false)
    }
  }, [])

  const openRoutePicker = useCallback(() => {
    setActivePanel("route-picker")
    loadRoutePickerItems()
  }, [loadRoutePickerItems])

  const resetToIdle = useCallback((clearRememberedRoute: boolean = false) => {
    setTrip(null)
    setViewState("IDLE")
    setRoutingLine(null)
    setRouteSegments([])
    setNormalizedDayPoints({})
    setRefinedCoordinates({})
    setResolvedImageByQuery({})
    setActiveDay(1)
    setActiveActivity(0)
    setActiveRouteRef(null)
    if (clearRememberedRoute) {
      const remembered = safeReadJson<ActiveRouteRef>(ACTIVE_ROUTE_STORAGE_KEY)
      if (remembered) {
        safeRemove(buildRouteCacheKey(remembered))
      }
      safeRemove(ACTIVE_ROUTE_STORAGE_KEY)
      setActiveRouteRef(null)
    }
  }, [])

  const applyTripWithCache = useCallback(
    (routeData: any, routeRef: ActiveRouteRef | null) => {
      const dayCount = Array.isArray(routeData?.itinerary) ? routeData.itinerary.length : 0
      const itineraryFingerprint = buildItineraryFingerprint(routeData)
      const cachedRaw = routeRef ? safeReadJson<DashboardRouteCache>(buildRouteCacheKey(routeRef)) : null
      const cached = cachedRaw?.itineraryFingerprint === itineraryFingerprint ? cachedRaw : null
      if (routeRef && cachedRaw && !cached) {
        safeRemove(buildRouteCacheKey(routeRef))
      }
      const rawCachedDay = Number(cached?.activeDay)
      const nextDay =
        dayCount > 0 ? Math.min(Math.max(Number.isFinite(rawCachedDay) && rawCachedDay > 0 ? rawCachedDay : 1, 1), dayCount) : 1

      setTrip(routeData)
      setViewState("ACTIVE")
      setRoutingLine(null)
      setRouteSegments([])
      setNormalizedDayPoints(cached?.normalizedDayPoints || {})
      setRefinedCoordinates(cached?.refinedCoordinates || {})
      setResolvedImageByQuery(cached?.resolvedImageByQuery || {})
      setActiveDay(nextDay)
      setActiveActivity(typeof cached?.activeActivity === "number" ? Math.max(0, cached.activeActivity) : 0)

      if (routeRef) {
        setActiveRouteRef(routeRef)
        safeWriteJson(ACTIVE_ROUTE_STORAGE_KEY, { ...routeRef, updatedAt: new Date().toISOString() })
      } else {
        setActiveRouteRef(null)
      }
    },
    [],
  )

  const haversineDistanceKm = useCallback((fromLat: number, fromLng: number, toLat: number, toLng: number) => {
    const toRad = (d: number) => (d * Math.PI) / 180
    const earthRadiusKm = 6371
    const dLat = toRad(toLat - fromLat)
    const dLng = toRad(toLng - fromLng)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return earthRadiusKm * c
  }, [])

  const buildCurvedFlightLine = useCallback((fromLat: number, fromLng: number, toLat: number, toLng: number) => {
    const dx = toLng - fromLng
    const dy = toLat - fromLat
    const distanceDeg = Math.sqrt(dx * dx + dy * dy)
    if (distanceDeg < 0.0012) {
      return [
        [fromLng, fromLat] as [number, number],
        [toLng, toLat] as [number, number],
      ]
    }

    const points: [number, number][] = []
    const steps = 42
    const curveAmplitude = Math.min(1.2, distanceDeg * 0.22)

    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps
      const lng = fromLng + dx * t
      const lat = fromLat + dy * t + Math.sin(Math.PI * t) * curveAmplitude
      points.push([lng, lat])
    }

    return points
  }, [])

  const detectSegmentMode = useCallback(
    (fromActivity: any, toActivity: any, fromPoint: DisplayPoint, toPoint: DisplayPoint): SegmentMode => {
      const distanceKm = haversineDistanceKm(fromPoint.lat, fromPoint.lng, toPoint.lat, toPoint.lng)
      const hintText = [
        fromActivity?.transport,
        fromActivity?.transportType,
        fromActivity?.transfer,
        fromActivity?.logistics?.transport,
        fromActivity?.logistics?.type,
        toActivity?.transport,
        toActivity?.transportType,
        toActivity?.transfer,
        toActivity?.logistics?.transport,
        toActivity?.logistics?.type,
        fromActivity?.title,
        toActivity?.title,
        fromActivity?.desc,
        toActivity?.desc,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      const hasFlightHint = /(flight|plane|airport|рейс|самолет|перелет|airline|svo|dme|vko|ist|aeroflot)/i.test(hintText)
      const hasWalkHint = /(walk|walking|пеш|прогул)/i.test(hintText)
      const hasRailHint = /(train|rail|поезд|жд|ржд)/i.test(hintText)
      const hasRoadHint = /(taxi|uber|car|drive|bus|metro|авто|такси|машин|трансфер|метро|автобус)/i.test(hintText)

      if (distanceKm < 1.8) return "walk"
      if (hasWalkHint && distanceKm < 8) return "walk"
      if (hasRailHint && distanceKm >= 25) return "rail"
      if (hasFlightHint && distanceKm >= 180) return "flight"
      if (hasRoadHint) return "road"

      if (distanceKm > 220) return "flight"
      if (distanceKm < 90) return "road"
      return "road"
    },
    [haversineDistanceKm],
  )

  const getSegmentVisual = useCallback((mode: SegmentMode) => {
    switch (mode) {
      case "flight":
        return { icon: "✈", lineColor: "#38bdf8", profile: null as RoutingProfile | null, transportLabel: "Перелет" }
      case "walk":
        return { icon: "🚶", lineColor: "#a16207", profile: "foot" as RoutingProfile, transportLabel: "Пешком" }
      case "rail":
        return { icon: "🚆", lineColor: "#facc15", profile: "car" as RoutingProfile, transportLabel: "Поезд/ЖД" }
      case "road":
      default:
        return { icon: "🚗", lineColor: "#facc15", profile: "car" as RoutingProfile, transportLabel: "Такси/авто" }
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const fetchTrip = async () => {
      try {
        if (tripId) {
          setLoading(true)
          const { data, error } = await supabase.from("trips").select("*").eq("id", tripId).single()
          if (error) throw error
          if (!data || cancelled) return

          const routeRef: ActiveRouteRef = { id: String(data.id || tripId), source: "db" }
          if (String(data.status || "").toLowerCase() !== "completed") {
            applyTripWithCache(data, routeRef)
          } else {
            applyTripWithCache(data, null)
            safeRemove(ACTIVE_ROUTE_STORAGE_KEY)
            safeRemove(buildRouteCacheKey(routeRef))
          }

          if (!toastShownRef.current) {
            setNotification({
              title: "Маршрут загружен",
              desc: data.title,
              time: "Сейчас",
            })
            toastShownRef.current = true
          }
          return
        }

        const remembered = safeReadJson<ActiveRouteRef>(ACTIVE_ROUTE_STORAGE_KEY)
        if (!remembered) {
          if (!cancelled) resetToIdle(false)
          return
        }

        if (remembered.source === "db") {
          setLoading(true)
          const { data, error } = await supabase.from("trips").select("*").eq("id", remembered.id).single()
          if (error) throw error
          if (!data || cancelled) return

          if (String(data.status || "").toLowerCase() === "completed") {
            resetToIdle(true)
            return
          }

          applyTripWithCache(data, { id: String(data.id || remembered.id), source: "db" })
          return
        }

        const stored = safeReadJson<any>("lastGeneratedRoute")
        if (stored && Array.isArray(stored.itinerary)) {
          applyTripWithCache(stored, { id: remembered.id || "ai-last", source: "local" })
          return
        }

        resetToIdle(true)
      } catch (error: any) {
        console.error("Error loading trip:", error)
        if (!toastShownRef.current) toast.error("Не удалось загрузить маршрут")
        if (!cancelled) resetToIdle(false)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchTrip()
    return () => {
      cancelled = true
    }
  }, [tripId, applyTripWithCache, resetToIdle])

  useEffect(() => {
    if (!notification) return
    const timer = setTimeout(() => setNotification(null), 5000)
    return () => clearTimeout(timer)
  }, [notification])

  useEffect(() => {
    if (!trip || !trip.itinerary || !trip.id) return

    const autoRefined: Record<string, { lat: number; lng: number }> = {}
    let updates = 0

    if (Array.isArray(trip.itinerary)) {
      trip.itinerary.forEach((day: any) => {
        if (!Array.isArray(day.activities)) return
        day.activities.forEach((act: any) => {
          if (!act.coordinates?.lat) return
          const title = act.title || act.placeName || act.place_name || ""
          const key = `${title}-${act.place_name || title}`
          if (!refinedCoordinates[key]) {
            autoRefined[key] = act.coordinates
            autoRefined[`${title}-`] = act.coordinates
            updates += 1
          }
        })
      })
    }

    if (updates > 0) {
      setRefinedCoordinates((prev) => ({ ...prev, ...autoRefined }))
    }
  }, [trip?.id, trip?.itinerary, refinedCoordinates])

  const normalizeDayIfNeeded = useCallback(
    async (dayNum: number) => {
      if (!trip?.itinerary || !Array.isArray(trip.itinerary)) return
      if (normalizedDayPoints[dayNum]) return

      const day = trip.itinerary[dayNum - 1]
      if (!day?.activities?.length) return

      setNormalizingDay(dayNum)
      try {
        const res = await fetch("/api/trip-assistant/normalize-points", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            activities: day.activities,
            destination: trip.destination,
            tripId: trip.id,
            day: dayNum,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.points)) {
            setNormalizedDayPoints((prev) => ({ ...prev, [dayNum]: data.points }))
          }
        }
      } catch (e) {
        console.error(`Failed to normalize day ${dayNum}:`, e)
      } finally {
        setNormalizingDay(null)
      }
    },
    [trip?.itinerary, trip?.destination, normalizedDayPoints],
  )

  useEffect(() => {
    if (!trip?.itinerary?.length) return
    normalizeDayIfNeeded(activeDay)
  }, [activeDay, trip?.itinerary, normalizeDayIfNeeded])

  const findDayCenter = useCallback(
    (day: any) => {
      const activityWithCoords = Array.isArray(day?.activities)
        ? day.activities.find((act: any) => Number.isFinite(act?.coordinates?.lat) && Number.isFinite(act?.coordinates?.lng))
        : null
      if (activityWithCoords) {
        return { lat: activityWithCoords.coordinates.lat, lng: activityWithCoords.coordinates.lng }
      }

      const rawSearch = [
        day?.title,
        day?.endCity,
        day?.logistics?.from,
        day?.logistics?.to,
        trip?.destination,
      ]
        .filter(Boolean)
        .join(" ")
      const normalizedSearch = normalizeText(rawSearch)
      const foundCity = Object.keys(CITY_COORDS).find((city) => normalizedSearch.includes(normalizeText(city)))

      if (foundCity) return CITY_COORDS[foundCity]
      return { lat: 48.8566, lng: 2.3522 }
    },
    [trip?.destination],
  )

  const resolveCoords = useCallback(
    (act: any, actIdx: number, dayNum: number, centerLat: number, centerLng: number) => {
      const title = act.title || act.placeName || act.place_name || "Активность"
      let lat = centerLat
      let lng = centerLng
      let foundNormalized = false

      const normalizedPoints = normalizedDayPoints[dayNum]
      if (normalizedPoints) {
        const norm =
          normalizedPoints.find((p: any) => p.title === title) ||
          normalizedPoints.find((p: any) => p.title?.includes(title) || title.includes(p.title)) ||
          normalizedPoints[actIdx]
        if (norm && Number.isFinite(norm.lat) && Number.isFinite(norm.lng)) {
          lat = norm.lat
          lng = norm.lng
          foundNormalized = true
        }
      }

      if (!foundNormalized) {
        const placeKey = `${title}-${act.place_name || title}`
        const refined = refinedCoordinates[placeKey] || refinedCoordinates[`${title}-`]
        if (refined && Number.isFinite(refined.lat) && Number.isFinite(refined.lng)) {
          lat = refined.lat
          lng = refined.lng
          foundNormalized = true
        }
      }

      if (!foundNormalized && Number.isFinite(act.coordinates?.lat) && Number.isFinite(act.coordinates?.lng)) {
        lat = act.coordinates.lat
        lng = act.coordinates.lng
        foundNormalized = true
      }

      if (!foundNormalized) {
        const fromMapLink =
          extractCoordsFromMapLink(act.mapLink) || extractCoordsFromMapLink(act.map_link) || extractCoordsFromMapLink(act.link)
        if (fromMapLink) {
          lat = fromMapLink.lat
          lng = fromMapLink.lng
          foundNormalized = true
        }
      }

      if (!foundNormalized) {
        const iata = String(title).match(/\(([A-Z]{3})\)/)?.[1]
        if (iata && AIRPORT_COORDS[iata]) {
          lat = AIRPORT_COORDS[iata].lat
          lng = AIRPORT_COORDS[iata].lng
          foundNormalized = true
        }
      }

      if (!foundNormalized) {
        const angle = actIdx * 0.8
        const radius = 0.008 + actIdx * 0.003
        lat += Math.sin(angle) * radius
        lng += Math.cos(angle) * radius
      }

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
      return { lat, lng, foundNormalized }
    },
    [normalizedDayPoints, refinedCoordinates],
  )

  const buildDayPoints = useCallback(
    (dayNum: number): DisplayPoint[] => {
      if (!trip?.itinerary || !Array.isArray(trip.itinerary)) return []
      const dayIndex = dayNum - 1
      const day = trip.itinerary[dayIndex]
      if (!day || !Array.isArray(day.activities)) return []

      const center = findDayCenter(day)
      const dayColor = DAY_COLORS[dayIndex % DAY_COLORS.length]
      const tripCoverImage = !isProbablyBlockedImage(trip?.cover_image || trip?.coverImage || trip?.image) ? trip?.cover_image || trip?.coverImage || trip?.image : null

      return day.activities
        .map((act: any, actIdx: number) => {
          const title = act.title || act.placeName || act.place_name || "Активность"
          const imageQuery = buildImageQuery(act.visual_query, act.placeName, act.place_name, title, trip?.destination, "travel landmark")
          const directImage = !isProbablyBlockedImage(act.image || act.photo) ? act.image || act.photo : null
          const resolved = resolveCoords(act, actIdx, dayNum, center.lat, center.lng)
          if (!resolved) return null

          return {
            lat: resolved.lat,
            lng: resolved.lng,
            label: actIdx + 1,
            title,
            desc: act.desc || act.description || "Интересное место",
            day: dayNum,
            time: act.time || "Днём",
            color: dayColor,
            image: directImage || resolvedImageByQuery[imageQuery] || tripCoverImage || DEFAULT_TRAVEL_IMAGE,
            price: act.price || act.cost,
            bookingLink: act.bookingLink || act.booking_link || act.link,
            isNormalized: resolved.foundNormalized,
            activityIndex: actIdx,
          } as DisplayPoint
        })
        .filter(Boolean) as DisplayPoint[]
    },
    [trip?.itinerary, trip?.destination, resolvedImageByQuery, findDayCenter, resolveCoords],
  )

  useEffect(() => {
    if (!trip?.itinerary || !Array.isArray(trip.itinerary)) return

    let cancelled = false
    const missingQueries = new Set<string>()

    trip.itinerary.forEach((day: any) => {
      if (!Array.isArray(day?.activities)) return
      day.activities.forEach((act: any) => {
        if (!isProbablyBlockedImage(act.image || act.photo)) return
        const title = act.title || act.placeName || act.place_name || "travel landmark"
        const query = buildImageQuery(act.visual_query, act.placeName, act.place_name, title, trip?.destination)
        if (!resolvedImageByQuery[query]) missingQueries.add(query)
      })
    })

    if (missingQueries.size === 0) return

    const resolveImages = async () => {
      for (const query of missingQueries) {
        try {
          const response = await fetch(`/api/image?query=${encodeURIComponent(query)}`)
          if (!response.ok) continue
          const payload = await response.json()
          const url = String(payload?.url || "")
          if (!url) continue
          if (cancelled) return
          setResolvedImageByQuery((prev) => (prev[query] ? prev : { ...prev, [query]: url }))
          await new Promise((r) => setTimeout(r, 80))
        } catch {
          // silent fallback to default image
        }
      }
    }

    void resolveImages()
    return () => {
      cancelled = true
    }
  }, [trip?.id, trip?.itinerary, trip?.destination, resolvedImageByQuery])

  const { displayPoints, displayArcs } = useMemo(() => {
    const points = buildDayPoints(activeDay)
    const arcs: any[] = []

    for (let i = 1; i < points.length; i += 1) {
      const prev = points[i - 1]
      const curr = points[i]
      arcs.push({
        startLat: prev.lat,
        startLng: prev.lng,
        endLat: curr.lat,
        endLng: curr.lng,
        color: curr.color,
        animateTime: 1000,
      })
    }

    return { displayPoints: points, displayArcs: arcs }
  }, [activeDay, buildDayPoints])

  const itineraryFingerprint = useMemo(() => buildItineraryFingerprint(trip), [trip?.id, trip?.itinerary])

  const focusActivityOnMap = useCallback(
    (dayNum: number, activityIndex: number) => {
      const dayPoints = buildDayPoints(dayNum)
      const point = dayPoints.find((p) => p.activityIndex === activityIndex)
      if (!point) return false
      setFlyToCoords({ lat: point.lat, lng: point.lng, altitude: 420 })
      return true
    },
    [buildDayPoints],
  )

  const fitDayOnMap = useCallback(
    (dayNum: number) => {
      const dayPoints = buildDayPoints(dayNum).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
      if (dayPoints.length === 0) return false
      setFitToPointsRequest({
        token: `day-${dayNum}-${Date.now()}`,
        points: dayPoints.map((p) => ({ lat: p.lat, lng: p.lng })),
        padding: dayPoints.length === 1 ? 180 : 90,
        maxZoom: dayPoints.length === 1 ? 14 : 13,
      })
      return true
    },
    [buildDayPoints],
  )

  useEffect(() => {
    let cancelled = false

    const buildStyledSegments = async () => {
      if (viewState !== "ACTIVE" || !trip || displayPoints.length < 2) {
        setRouteSegments([])
        setIsBuildingSegments(false)
        return
      }

      const dayActivities = Array.isArray(trip?.itinerary?.[activeDay - 1]?.activities) ? trip.itinerary[activeDay - 1].activities : []

      setIsBuildingSegments(true)
      const nextSegments: StyledSegment[] = []

      for (let i = 1; i < displayPoints.length; i += 1) {
        if (cancelled) return

        const fromPoint = displayPoints[i - 1]
        const toPoint = displayPoints[i]
        const fromActivity = dayActivities[fromPoint.activityIndex]
        const toActivity = dayActivities[toPoint.activityIndex]
        const mode = detectSegmentMode(fromActivity, toActivity, fromPoint, toPoint)
        const visual = getSegmentVisual(mode)

        if (mode === "flight") {
          const coordinates = buildCurvedFlightLine(fromPoint.lat, fromPoint.lng, toPoint.lat, toPoint.lng)
          const distanceKm = haversineDistanceKm(fromPoint.lat, fromPoint.lng, toPoint.lat, toPoint.lng)
          const durationMin = Math.max(30, (distanceKm / 780) * 60)
          nextSegments.push({
            coordinates,
            mode,
            icon: visual.icon,
            lineColor: visual.lineColor,
            fromTitle: fromPoint.title,
            toTitle: toPoint.title,
            distanceKm,
            durationMin,
          })
          continue
        }

        const profile = visual.profile || "car"
        const cacheKey = `${profile}:${fromPoint.lat.toFixed(5)}:${fromPoint.lng.toFixed(5)}:${toPoint.lat.toFixed(5)}:${toPoint.lng.toFixed(5)}`

        try {
          const cached = segmentCacheRef.current.get(cacheKey)
          const routeResult =
            cached ||
            (await fetchRoute(fromPoint.lat, fromPoint.lng, toPoint.lat, toPoint.lng, profile).then((result) => {
              segmentCacheRef.current.set(cacheKey, result)
              return result
            }))
          if (!routeResult?.geometry?.coordinates?.length) {
            throw new Error("Empty route geometry")
          }

          nextSegments.push({
            coordinates: routeResult.geometry.coordinates,
            mode,
            icon: visual.icon,
            lineColor: visual.lineColor,
            fromTitle: fromPoint.title,
            toTitle: toPoint.title,
            distanceKm: routeResult.distanceKm,
            durationMin: routeResult.durationMin,
          })
        } catch (error) {
          const distanceKm = haversineDistanceKm(fromPoint.lat, fromPoint.lng, toPoint.lat, toPoint.lng)
          nextSegments.push({
            coordinates: [
              [fromPoint.lng, fromPoint.lat],
              [toPoint.lng, toPoint.lat],
            ],
            mode,
            icon: visual.icon,
            lineColor: visual.lineColor,
            fromTitle: fromPoint.title,
            toTitle: toPoint.title,
            distanceKm,
            durationMin: mode === "walk" ? (distanceKm / 4.5) * 60 : (distanceKm / 38) * 60,
          })
          console.warn("Segment route fallback used:", error)
        }
      }

      if (!cancelled) {
        setRouteSegments(nextSegments)
        setIsBuildingSegments(false)
      }
    }

    buildStyledSegments()

    return () => {
      cancelled = true
    }
  }, [
    activeDay,
    buildCurvedFlightLine,
    detectSegmentMode,
    displayPoints,
    getSegmentVisual,
    haversineDistanceKm,
    trip,
    viewState,
  ])

  useEffect(() => {
    if (viewState !== "ACTIVE" || !activeRouteRef || !trip?.itinerary) return

    if (cacheSaveTimerRef.current) clearTimeout(cacheSaveTimerRef.current)
    cacheSaveTimerRef.current = setTimeout(() => {
      safeWriteJson(buildRouteCacheKey(activeRouteRef), {
        normalizedDayPoints,
        refinedCoordinates,
        resolvedImageByQuery,
        activeDay,
        activeActivity,
        itineraryFingerprint,
        updatedAt: new Date().toISOString(),
      } as DashboardRouteCache)
    }, 220)

    return () => {
      if (cacheSaveTimerRef.current) {
        clearTimeout(cacheSaveTimerRef.current)
        cacheSaveTimerRef.current = null
      }
    }
  }, [viewState, activeRouteRef, trip?.id, trip?.itinerary, normalizedDayPoints, refinedCoordinates, resolvedImageByQuery, activeDay, activeActivity, itineraryFingerprint])

  const findActivityIndexByTitle = useCallback(
    (dayNum: number, title?: string) => {
      if (!dayNum || !title || !trip?.itinerary?.[dayNum - 1]?.activities) return 0
      const activities = trip.itinerary[dayNum - 1].activities
      const normalizedTarget = String(title).toLowerCase()
      const idx = activities.findIndex((a: any) => {
        const activityTitle = (a.title || a.placeName || a.place_name || "").toLowerCase()
        return activityTitle === normalizedTarget || activityTitle.includes(normalizedTarget) || normalizedTarget.includes(activityTitle)
      })
      return idx >= 0 ? idx : 0
    },
    [trip?.itinerary],
  )

  const routeToPoint = useCallback(
    async (lat: number, lng: number, title?: string) => {
      setFlyToCoords({ lat, lng, altitude: 500 })
      setRoutingLine(null)

      if (!userLocation) {
        toast.info(`Точка: ${title || "место"}. Включите геолокацию для построения маршрута.`)
        return
      }

      try {
        const straightDistance = haversineDistanceKm(userLocation.lat, userLocation.lng, lat, lng)
        const profile: RoutingProfile = straightDistance <= 2.2 ? "foot" : "car"
        const result = await fetchRoute(userLocation.lat, userLocation.lng, lat, lng, profile)

        setRoutingLine({
          geometry: result.geometry,
          mode: profile === "foot" ? "walk" : "road",
          transportLabel: profile === "foot" ? "Пешком" : "Такси/авто",
          distanceKm: result.distanceKm,
          durationMin: result.durationMin,
          targetTitle: title,
        })
        toast.success(`Маршрут построен${title ? `: ${title}` : ""}`)
      } catch (error) {
        console.error("Routing error:", error)
        toast.error("Не удалось построить маршрут")
      }
    },
    [haversineDistanceKm, userLocation],
  )

  const handleGoToPoint = useCallback(
    async (dayNum: number, activityIndex: number, title?: string) => {
      if (dayNum !== activeDay) {
        setActiveDay(dayNum)
        await normalizeDayIfNeeded(dayNum)
      }
      setActiveActivity(activityIndex)

      const points = buildDayPoints(dayNum)
      const point = points.find((p) => p.activityIndex === activityIndex)
      if (!point) {
        toast.error("Координаты точки не найдены")
        return
      }

      await routeToPoint(point.lat, point.lng, title || point.title)
    },
    [activeDay, normalizeDayIfNeeded, buildDayPoints, routeToPoint],
  )

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail || {}
      const dayNum = Number(detail.day) || 1
      const title = detail.title
      const activityIdx = findActivityIndexByTitle(dayNum, title)
      setActiveDay(dayNum)
      setActiveActivity(activityIdx)
      setRoutingLine(null)
      focusActivityOnMap(dayNum, activityIdx)
      setActivePanel("route")
      normalizeDayIfNeeded(dayNum)
    }

    window.addEventListener("map-show-detail", handler)
    return () => window.removeEventListener("map-show-detail", handler)
  }, [findActivityIndexByTitle, normalizeDayIfNeeded, focusActivityOnMap])

  useEffect(() => {
    const handler = async (e: Event) => {
      const { lat, lng, title } = (e as CustomEvent).detail || {}
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
      await routeToPoint(lat, lng, title)
    }

    window.addEventListener("map-route-to", handler)
    return () => window.removeEventListener("map-route-to", handler)
  }, [routeToPoint])

  useEffect(() => {
    const clearHandler = () => setRoutingLine(null)
    window.addEventListener("map-clear-route", clearHandler)
    return () => window.removeEventListener("map-clear-route", clearHandler)
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail || {}
      const lat = Number(detail.lat)
      const lng = Number(detail.lng)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return

      const source = detail.source === "nearby" ? "nearby" : "social"
      const parsedDistance = Number(detail.distanceKm)
      const poi: PoiDrawerPoint = {
        title: String(detail.title || "Точка интереса"),
        description: String(detail.description || "Описание точки недоступно."),
        category: String(detail.category || ""),
        source,
        lat,
        lng,
        day: Number.isFinite(Number(detail.day)) ? Number(detail.day) : null,
        time: String(detail.time || "Рядом"),
        distanceKm: Number.isFinite(parsedDistance) ? parsedDistance : null,
      }

      setSelectedPoi(poi)
      setFlyToCoords({ lat, lng, altitude: 700 })
      setActivePanel("poi")
    }

    window.addEventListener("map-open-poi", handler)
    return () => window.removeEventListener("map-open-poi", handler)
  }, [])

  const handleCompleteTrip = useCallback(async () => {
    if (!trip?.id) return
    setIsCompletingTrip(true)
    try {
      const { error } = await supabase.from("trips").update({ status: "completed" }).eq("id", trip.id)
      if (error) throw error
      const completedRef: ActiveRouteRef = activeRouteRef || { id: String(trip.id), source: "db" }
      safeRemove(ACTIVE_ROUTE_STORAGE_KEY)
      safeRemove(buildRouteCacheKey(completedRef))
      setActiveRouteRef(null)
      toast.success("Путешествие завершено")
      router.push(`/trip/completed?tripId=${trip.id}`)
    } catch (error: any) {
      console.error("Complete trip error:", error)
      const message = String(error?.message || "")
      if (message.toLowerCase().includes("status")) {
        toast.error("Невозможно изменить статус маршрута. Сначала выполните миграцию add_trip_status.sql.")
      } else {
        toast.error("Не удалось завершить путешествие")
      }
    } finally {
      setIsCompletingTrip(false)
    }
  }, [trip?.id, router, activeRouteRef])

  const handleSelectRouteFromPicker = useCallback(
    (item: RoutePickerItem) => {
      setActivePanel("none")

      if (item.source === "db") {
        const routeRef: ActiveRouteRef = { id: item.id, source: "db" }
        setActiveRouteRef(routeRef)
        safeWriteJson(ACTIVE_ROUTE_STORAGE_KEY, { ...routeRef, updatedAt: new Date().toISOString() })
        router.push(`/dashboard?tripId=${item.id}`)
        return
      }

      if (item.source === "local" && item.raw) {
        applyTripWithCache(item.raw, { id: item.id, source: "local" })
        toast.success("Маршрут загружен на карту")
      }
    },
    [router, applyTripWithCache],
  )

  const handleOpenRoutePanel = useCallback(() => {
    if (viewState === "ACTIVE" && trip) {
      setActivePanel("route")
      return
    }
    openRoutePicker()
  }, [viewState, trip, openRoutePicker])

  const selectedDayActivities =
    trip?.itinerary?.[activeDay - 1] && Array.isArray(trip.itinerary[activeDay - 1].activities) ? trip.itinerary[activeDay - 1].activities : []
  const boundedActivityIndex =
    activeActivity === null ? 0 : Math.min(Math.max(activeActivity, 0), Math.max(selectedDayActivities.length - 1, 0))
  const currentActivityData = selectedDayActivities[boundedActivityIndex] || null

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black text-white">
      <div
        className={`absolute top-24 left-1/2 -translate-x-1/2 z-[60] transition-all duration-500 ${
          notification ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
        }`}
      >
        {notification && (
          <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-start gap-4 max-w-[90vw] md:max-w-md">
            <div className={`w-2 h-full min-h-[50px] rounded-full self-stretch ${notification.day ? "bg-gradient-to-b from-emerald-400 to-blue-500" : "bg-white/20"}`} />
            <div>
              {notification.day && (
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">
                  День {notification.day} | {notification.time}
                </p>
              )}
              <h3 className="text-lg font-bold text-white leading-tight">{notification.title}</h3>
              {notification.desc && <p className="text-sm text-white/70 mt-1 line-clamp-2">{notification.desc}</p>}
            </div>
            <button onClick={() => setNotification(null)} className="opacity-50 hover:opacity-100 p-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="absolute inset-0 z-0 bg-black">
        <MapLibreView
          points={viewState === "ACTIVE" ? displayPoints : []}
          arcs={viewState === "ACTIVE" ? (routeSegments.length ? routeSegments : displayArcs) : []}
          flyTo={flyToCoords}
          fitToPoints={fitToPointsRequest}
          routingLine={routingLine}
          settings={mapSettings}
          nearbyPoints={viewState === "ACTIVE" || activePanel === "nearby" ? nearbyPoints : []}
          refreshToken={`${activePanel}:${activeDay}:${trip?.id || activeRouteRef?.id || "none"}`}
        />
      </div>

      <div className="absolute inset-0 pointer-events-none z-20">
        <div className="absolute top-6 left-6 z-50 pointer-events-auto">
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="bg-black/40 backdrop-blur-xl border border-white/10 p-3 rounded-full shadow-2xl hover:bg-white/10 transition-all text-white active:scale-95"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {isMenuOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 p-2 origin-top-left">
                <div className="px-4 py-2 text-xs font-semibold text-white/40 uppercase tracking-widest">Меню сайта</div>
                <div className="h-px bg-white/10 my-1 mx-2" />
                <button className="w-full text-left px-4 py-3 hover:bg-white/10 rounded-xl transition-colors flex items-center gap-3" onClick={() => router.push("/")}>
                  <span className="text-xl">Главная</span>
                </button>
                <button className="w-full text-left px-4 py-3 hover:bg-white/10 rounded-xl transition-colors flex items-center gap-3" onClick={() => router.push("/results")}>
                  <span className="text-xl">Маршруты</span>
                </button>
                <button className="w-full text-left px-4 py-3 hover:bg-white/10 rounded-xl transition-colors flex items-center gap-3" onClick={() => trip?.id && router.push(`/trip/${trip.id}`)}>
                  <span className="text-xl">Страница маршрута</span>
                </button>
                <div className="h-px bg-white/10 my-1 mx-2" />
                <button className="w-full text-left px-4 py-3 hover:bg-white/10 rounded-xl transition-colors flex items-center gap-3" onClick={() => router.push("/profile")}>
                  <span className="text-xl">Профиль</span>
                </button>
                <button className="w-full text-left px-4 py-3 hover:bg-white/10 rounded-xl transition-colors flex items-center gap-3" onClick={() => setActivePanel("settings")}>
                  <span className="text-xl">Настройки</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto flex flex-col items-center gap-2">
          <div className="bg-black/30 backdrop-blur-md border border-white/10 rounded-full px-6 py-2.5 shadow-2xl hover:bg-black/50 transition-all cursor-pointer" onClick={() => router.push("/")}>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70 flex items-center gap-2 whitespace-nowrap">
              <span className="leading-none">TraveLM Map</span>
              <span className="text-[10px] font-medium text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full bg-emerald-500/10">β</span>
            </h1>
          </div>

          {viewState === "ACTIVE" && trip?.itinerary?.length > 0 && (
            <div className="bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 rounded-full px-4 py-1.5 shadow-lg">
              <span className="text-sm font-bold text-emerald-400 uppercase tracking-widest">День {activeDay}</span>
            </div>
          )}

          {viewState === "ACTIVE" && normalizingDay !== null && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1 text-xs text-blue-300 font-medium">Уточняю точки для дня {normalizingDay}...</div>
          )}

          {viewState === "ACTIVE" && isBuildingSegments && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1 text-xs text-amber-300 font-medium">
              Строю реальные линии перемещения...
            </div>
          )}
        </div>

        <MapControls
          viewState={viewState}
          onOpenAI={() => setActivePanel("ai")}
          onOpenRoute={handleOpenRoutePanel}
          onOpenNearby={() => setActivePanel("nearby")}
          onOpenSettings={() => setActivePanel("settings")}
        />

        <div className="absolute left-4 bottom-20 md:bottom-4 pointer-events-auto z-50">
          <button
            onClick={() => {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  const { latitude, longitude } = pos.coords
                  setUserLocation({ lat: latitude, lng: longitude })
                  setFlyToCoords({ lat: latitude, lng: longitude, altitude: 5000 })
                  toast.success("Текущее местоположение обновлено")
                },
                () => {
                  toast.error("Не удалось определить местоположение")
                },
              )
            }}
            className="bg-black/40 backdrop-blur-md border border-white/10 p-3 rounded-full text-white hover:bg-white/10 hover:scale-110 transition-all shadow-lg group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 group-hover:text-white transition-colors">
              <line x1="12" x2="12" y1="2" y2="5" />
              <line x1="12" x2="12" y1="19" y2="22" />
              <line x1="2" x2="5" y1="12" y2="12" />
              <line x1="19" x2="22" y1="12" y2="12" />
              <circle cx="12" cy="12" r="7" />
            </svg>
          </button>
        </div>

        {routingLine && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-4 md:bottom-6 pointer-events-auto z-50 w-[min(92vw,420px)]">
            <div className="rounded-2xl border border-white/10 bg-black/70 backdrop-blur-xl p-4 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-emerald-300 font-semibold">Маршрут до точки</div>
                  <div className="text-sm text-white font-semibold mt-1 line-clamp-1">{routingLine.targetTitle || "Выбранная точка"}</div>
                </div>
                <button onClick={() => setRoutingLine(null)} className="h-7 w-7 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white">
                  <X size={14} className="mx-auto" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="rounded-xl bg-white/5 border border-white/10 p-2">
                  <div className="text-[10px] uppercase text-zinc-400">Км</div>
                  <div className="text-sm font-semibold text-white mt-0.5">{routingLine.distanceKm.toFixed(1)}</div>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-2">
                  <div className="text-[10px] uppercase text-zinc-400">Мин</div>
                  <div className="text-sm font-semibold text-white mt-0.5">{Math.max(1, Math.round(routingLine.durationMin))}</div>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-2">
                  <div className="text-[10px] uppercase text-zinc-400">Транспорт</div>
                  <div className="text-sm font-semibold text-white mt-0.5 line-clamp-1">{routingLine.transportLabel}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activePanel === "ai" && (
          <MapChatWidget
            onClose={() => setActivePanel("none")}
            userLocation={userLocation}
            currentActivity={currentActivityData}
            currentDay={activeDay}
            tripContext={trip}
            className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-50 w-full md:w-[380px] h-[50vh] md:h-[500px] pointer-events-auto"
          />
        )}
      </div>

      {activePanel === "settings" && (
        <MapSettings onClose={() => setActivePanel("none")} settings={mapSettings} onUpdateSettings={(newSettings) => setMapSettings((prev) => ({ ...prev, ...newSettings }))} />
      )}

      {activePanel === "nearby" && (
        <NearbyPlacesPanel
          onClose={() => setActivePanel("none")}
          onPlacesFound={(places) => setNearbyPoints(places)}
          userLocation={userLocation}
          userProfile={userProfile}
          tripContext={trip}
          activeDay={activeDay}
        />
      )}

      {activePanel === "route-picker" && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto">
          <div className="w-full max-w-2xl max-h-[85vh] bg-zinc-950/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Выберите маршрут для карты</h2>
                <p className="text-sm text-zinc-400 mt-1">Список маршрутов из раздела «Мои маршруты»</p>
              </div>
              <button onClick={() => setActivePanel("none")} className="h-9 w-9 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition-colors">
                <X size={18} className="mx-auto" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[65vh] space-y-3">
              {isLoadingRoutePicker && <div className="text-sm text-zinc-300">Загрузка маршрутов...</div>}

              {!isLoadingRoutePicker && routePickerItems.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-zinc-200 font-medium">Маршруты не найдены</p>
                  <p className="text-sm text-zinc-400 mt-1">Создайте маршрут или откройте список маршрутов.</p>
                  <div className="mt-3">
                    <button
                      onClick={() => router.push("/results")}
                      className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors text-sm font-medium"
                    >
                      Открыть /results
                    </button>
                  </div>
                </div>
              )}

              {!isLoadingRoutePicker &&
                routePickerItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectRouteFromPicker(item)}
                    className="w-full text-left rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-white font-semibold truncate">{item.title}</div>
                        <div className="text-xs text-zinc-400 mt-1">
                          {item.destination || "Без направления"} | {item.days || 0} дн.
                        </div>
                      </div>
                      <div className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full border border-white/20 text-zinc-300 whitespace-nowrap">
                        {item.source === "local" ? "Черновик" : "Маршрут"}
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      <PoiDrawer
        isOpen={activePanel === "poi"}
        onClose={() => setActivePanel("none")}
        poi={selectedPoi}
        onFlyTo={(lat, lng) => {
          setFlyToCoords({ lat, lng, altitude: 650 })
        }}
        onBuildRoute={(lat, lng, title) => {
          void routeToPoint(lat, lng, title)
        }}
      />

      {trip && (
        <RouteDrawer
          isOpen={activePanel === "route"}
          onClose={() => setActivePanel("none")}
          route={trip}
          activeDay={activeDay}
          onSelectDay={(day) => {
            setActiveDay(day)
            setActiveActivity(0)
            setRoutingLine(null)
            void normalizeDayIfNeeded(day).finally(() => {
              fitDayOnMap(day)
            })
          }}
          activeActivity={boundedActivityIndex}
          onSelectActivity={(idx, mode) => {
            setActiveActivity(idx)
            setRoutingLine(null)
            if (mode === "focus") {
              focusActivityOnMap(activeDay, idx)
            }
          }}
          onGoToPoint={(day, activityIndex, title) => handleGoToPoint(day, activityIndex, title)}
          onCompleteTrip={trip?.id ? handleCompleteTrip : undefined}
          isCompletingTrip={isCompletingTrip}
        />
      )}
    </div>
  )
}

