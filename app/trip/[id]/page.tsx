"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useTranslations, useLocale } from "next-intl"
import Link from "next/link"
import { AppSidebar } from "@/components/app-sidebar"
import { Header } from "@/components/header"
import { appToast as toast } from "@/components/ui/sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Compass,
  Shield,
  Star,
  Sparkles,
  PieChart,
  Plane,
  Car,
  Train,
  Zap,
  Heart,
  Umbrella,
  ShoppingBag,
  Waves,
  Mountain,
  Ticket,
  Building,
  Globe,
  Lock,
  Eye,
  CheckCircle2,
  BarChart2,
  ExternalLink,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
const MeshGradient = dynamic(
  () => import("@paper-design/shaders-react").then(m => ({ default: m.MeshGradient })),
  { ssr: false }
)
import { TripImage } from "@/components/TripImage"
import { FlightCard } from "@/components/itinerary/FlightCard"
import { HotelCard } from "@/components/itinerary/HotelCard"
import { ItineraryChatWidget } from "@/components/ItineraryChatWidget"
import { cn, parseCostRub } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Footer } from "@/components/footer"
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion"
import dynamic from "next/dynamic"
import { TripChat } from "@/components/TripChat"
import { getPopularRoute } from "@/lib/popular-routes"
import { LottieLoader } from "@/components/ui/LottieLoader"
import { toggleFavorite } from "@/app/actions/favorites"
import { ActivityTimelineCard, getActivityColorTheme } from "@/components/trip/ActivityTimelineCard"
import { clearTripGalleryCache } from "@/components/PlaceGallery"
import { TripViralCarousel } from "@/components/trip/TripViralCarousel"
import { TripTooltips } from "@/components/trip/TripTooltips"
import { TripStatsPanel } from "@/components/trip/TripStatsPanel"
import { TripLinksPanel } from "@/components/trip/TripLinksPanel"

import { CurrentWeatherWidget } from "@/components/trip/CurrentWeatherWidget"
import { TripWeatherWidget } from "@/components/trip/TripWeatherWidget"
import { getWeatherForLocation, getWeatherEmoji, WeatherData } from "@/lib/weather"
import { getCoordinates } from "@/lib/geocoding"
import { getFlightSearchLink, getHotelSearchLink, getIataCode, parseCityIata } from "@/lib/travelpayouts"
import { addDays } from "date-fns"

import { useDebouncedTripItinerarySave } from "@/lib/hooks/useDebouncedTripItinerarySave"

import { ReelsView } from "@/components/travel/ReelsView"

// ===== Constants =====

const monthsShortRu = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"]
const monthsShortEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function formatDayDate(startDate: Date | null, dayIndex: number, locale = "ru"): string {
  if (!startDate) return ""
  const d = new Date(startDate)
  d.setDate(d.getDate() + dayIndex)
  const months = locale === "ru" ? monthsShortRu : monthsShortEn
  return `${d.getDate()} ${months[d.getMonth()]}`
}

function formatDateRange(start: Date | null, end: Date | null, locale = "ru"): string {
  if (!start || !end) return ""
  const months = locale === "ru" ? monthsShortRu : monthsShortEn
  const s = `${start.getDate()} ${months[start.getMonth()]}`
  const e = `${end.getDate()} ${months[end.getMonth()]}`
  const year = end.getFullYear()
  return `${s} — ${e} ${year}`
}

const transportIcons: Record<string, any> = {
  Flight: Plane,
  Plane: Plane,
  Train: Train,
  Taxi: Car,
  Transfer: Car,
  Car: Car,
  Walk: Compass,
  None: Zap,
}

// modeTranslations moved inside component as getModeLabel(t, mode)

const tagConfig: Record<string, { color: string; icon: any }> = {
  "пляж": { color: "bg-sky-100/80 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300 border-sky-200/50 dark:border-sky-500/30", icon: Umbrella },
  "шопинг": { color: "bg-pink-100/80 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300 border-pink-200/50 dark:border-pink-500/30", icon: ShoppingBag },
  "аквапарк": { color: "bg-cyan-100/80 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300 border-cyan-200/50 dark:border-cyan-500/30", icon: Waves },
  "горы": { color: "bg-emerald-100/80 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-500/30", icon: Mountain },
  "море": { color: "bg-blue-100/80 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border-blue-200/50 dark:border-blue-500/30", icon: Waves },
  "торговые центры": { color: "bg-purple-100/80 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border-purple-200/50 dark:border-purple-500/30", icon: ShoppingBag },
  "природа": { color: "bg-green-100/80 text-green-700 dark:bg-green-500/20 dark:text-green-300 border-green-200/50 dark:border-green-500/30", icon: Mountain },
  "культура": { color: "bg-amber-100/80 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200/50 dark:border-amber-500/30", icon: Building },
  "развлечения": { color: "bg-rose-100/80 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border-rose-200/50 dark:border-rose-500/30", icon: Ticket },
  "мероприятия": { color: "bg-fuchsia-100/80 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300 border-fuchsia-200/50 dark:border-fuchsia-500/30", icon: Sparkles },
  "гастрономия": { color: "bg-orange-100/80 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300 border-orange-200/50 dark:border-orange-500/30", icon: Sparkles },
  "еда": { color: "bg-orange-100/80 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300 border-orange-200/50 dark:border-orange-500/30", icon: Sparkles },
  "релакс": { color: "bg-teal-100/80 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300 border-teal-200/50 dark:border-teal-500/30", icon: Sparkles },
  "история": { color: "bg-yellow-100/80 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300 border-yellow-200/50 dark:border-yellow-500/30", icon: Building },
  "активный": { color: "bg-lime-100/80 text-lime-700 dark:bg-lime-500/20 dark:text-lime-300 border-lime-200/50 dark:border-lime-500/30", icon: Zap },
  "дайвинг": { color: "bg-cyan-100/80 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300 border-cyan-200/50 dark:border-cyan-500/30", icon: Waves },
  "уникальный": { color: "bg-indigo-100/80 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 border-indigo-200/50 dark:border-indigo-500/30", icon: Star },
  "premium": { color: "bg-amber-100/80 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20", icon: Star },
  "умеренный": { color: "bg-sky-100/80 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300 border-sky-200/50 dark:border-sky-500/30", icon: Sparkles },
  "вдвоём": { color: "bg-rose-100/80 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border-rose-200/50 dark:border-rose-500/30", icon: Heart },
  "вдвоем": { color: "bg-rose-100/80 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border-rose-200/50 dark:border-rose-500/30", icon: Heart },
  "компания": { color: "bg-indigo-100/80 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 border-indigo-200/50 dark:border-indigo-500/30", icon: Sparkles },
}

function getTagConfig(tag: string) {
  const clean = tag.toLowerCase().replace("#", "").trim()
  const key = Object.keys(tagConfig).find((k) => clean.includes(k))
  if (key) return tagConfig[key]
  return { color: "bg-white/60 text-slate-600 dark:bg-white/10 dark:text-white/80 border-white/40 dark:border-white/10", icon: Sparkles }
}

export default function TripDetailPage() {
  const params = useParams()
  const router = useRouter()
  const t = useTranslations('trip')
  const locale = useLocale()

  const getModeLabel = (mode: string) => {
    const key = `modes.${mode}` as any
    try { return t(key) } catch { return mode }
  }
  const [route, setRoute] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeDay, setActiveDay] = useState<number>(1)
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [showTipsModal, setShowTipsModal] = useState(false)
  const [showWeatherModal, setShowWeatherModal] = useState(false)
  const [showLinksModal, setShowLinksModal] = useState(false)
  const [isModifying, setIsModifying] = useState(false)
  const prevIsModifying = useRef(false)

  // After AI finishes modifying itinerary, ensure chat FAB is visible (optional scroll to bottom of page)
  useEffect(() => {
    if (prevIsModifying.current && !isModifying) {
      window.dispatchEvent(new CustomEvent("trip-ai-open"))
    }
    prevIsModifying.current = isModifying
  }, [isModifying])
  const [user, setUser] = useState<any>(null)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)

  const [isOwner, setIsOwner] = useState(false)
  const [activeView, setActiveView] = useState<"itinerary" | "stats">("itinerary")
  const [isFavorite, setIsFavorite] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [isGeneratingExtra, setIsGeneratingExtra] = useState(false)
  const [tripWeather, setTripWeather] = useState<WeatherData[]>([])
  const [isReelsOpen, setIsReelsOpen] = useState(false)
  const [reelsStartIndex, setReelsStartIndex] = useState(0)
  const dayRefs = useRef<Record<number, HTMLButtonElement | null>>({})

  const allActivities = useMemo(() => {
    if (!route?.itinerary) return []
    const activities: any[] = []
    route.itinerary.forEach((day: any) => {
      if (Array.isArray(day.activities)) {
        day.activities.forEach((act: any) => {
          activities.push({
            ...act,
            id: act.id || `${day.day}-${act.title || act.placeName}`,
            day: day.day,
            location: act.location || act.placeName || route.destination || t('locationDefault'),
            title: act.title || act.placeName || t('activityDefault'),
            description: act.description || act.desc,
            imageUrl: act.imageUrl || act.image,
          })
        })
      }
    })
    return activities
  }, [route?.itinerary])

  useEffect(() => {
    // Auto-scroll active day into view in the horizontal selector
    const activeBtn = dayRefs.current[activeDay]
    if (activeBtn) {
      activeBtn.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      })
    }

    // Scroll page to top (beginning of the day)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [activeDay])

  // Parallax
  const { scrollY } = useScroll()
  const heroY = useTransform(scrollY, [0, 500], [0, 150])
  const heroScale = useTransform(scrollY, [0, 500], [1, 1.15])


  const { calculatedTotal, hasUnknownCosts, dayTotals } = useMemo(() => {
    if (!route?.itinerary) return { calculatedTotal: null, hasUnknownCosts: false, dayTotals: {} as Record<number, number> }
    let total = 0
    let hasUnknown = false
    const dayTotals: Record<number, number> = {}
    for (const day of route.itinerary) {
      let daySum = 0
      for (const act of day.activities ?? []) {
        const n = parseCostRub(act.cost)
        if (n === null) hasUnknown = true
        else { total += n; daySum += n }
      }
      dayTotals[day.day] = daySum
    }
    return { calculatedTotal: total, hasUnknownCosts: hasUnknown, dayTotals }
  }, [route?.itinerary])

  const currencySymbol = locale === "en" ? "$" : "₽"
  const displayBudget = calculatedTotal !== null
    ? `${hasUnknownCosts ? "≈ " : ""}${currencySymbol}${calculatedTotal.toLocaleString(locale === "en" ? "en-US" : "ru-RU")}`
    : route?.totalBudget

  useEffect(() => {
    const checkSidebar = () => {
      const saved = localStorage.getItem("sidebar-collapsed") === "true"
      setIsSidebarCollapsed(saved)
    }
    checkSidebar()
    window.addEventListener("sidebar-change", checkSidebar)
    return () => window.removeEventListener("sidebar-change", checkSidebar)
  }, [])

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Fetch per-day weather for the whole trip
  useEffect(() => {
    if (!route?.id) return
    const dest = (route.destination && route.destination !== route.title)
      ? route.destination
      : route.countries?.[0]?.name || ""
    if (!dest) return
    const start = route.start_date ? new Date(route.start_date) : null
    const days = Array.isArray(route.itinerary) ? route.itinerary.length : 0
    const end = route.end_date ? new Date(route.end_date) : (start && days > 0 ? addDays(start, days - 1) : null)
    if (!start || !end) return
    ;(async () => {
      try {
        const coords = await getCoordinates(dest)
        if (!coords) return
        const data = await getWeatherForLocation(coords.lat, coords.lng, start, end)
        setTripWeather(data)
      } catch (e) {
        console.error("[TripWeather] fetch error:", e)
      }
    })()
  }, [route?.id])

  const safeLocalStorage = {
    getItem: (key: string): string | null => {
      try {
        return typeof window !== "undefined" ? localStorage.getItem(key) : null
      } catch {
        return null
      }
    },
  }

  useEffect(() => {
    const fetchTrip = async () => {
      setLoading(true)
      try {
        const id = params.id as string
        if (!id) {
          setLoading(false)
          return
        }

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
        const isLocal = id?.startsWith("local-")
        const isPopular = id?.startsWith("pop-")

        const { data: { user: currentUser } } = await supabase.auth.getUser()
        setUser(currentUser)

        let data = null
        let error = null

        if (isPopular) {
          data = getPopularRoute(id)
        } else if (isUuid) {
          const result = await supabase
            .from("trips")
            .select("*")
            .eq("id", id)
            .single()
          data = result.data
          error = result.error

          // If access denied (RLS) and not logged in — redirect to auth
          if (error && !currentUser) {
            router.push(`/auth?next=/trip/${id}`)
            return
          }
        } else if (isLocal || id === "ai-last") {
          const key = isLocal ? `trip-${id}` : "lastGeneratedRoute"
          const stored = safeLocalStorage.getItem(key)
          if (stored) {
            try { data = JSON.parse(stored) } catch {}
          }
        }

        if (!data) {
          if (error) console.error("Error fetching trip:", error.message)
          const stored = safeLocalStorage.getItem("lastGeneratedRoute")
          if (stored) {
            try {
              clearTripGalleryCache()
              setRoute(JSON.parse(stored))
            } catch {}
          }
        } else {
          clearTripGalleryCache()
          setRoute({
            ...data,
            title: data.title,
            description: data.description,
            totalBudget: data.total_cost || data.totalBudget,
            itinerary: data.itinerary,
            countries: data.destination ? [{ name: data.destination }] : (data.countries || []),
            budgetAnalysis: data.budget_analysis || data.budgetAnalysis,
            visaAdvice: data.visa_advice || data.visaAdvice,
            paymentAdvice: data.payment_advice || data.paymentAdvice,
            safetyInfo: data.safety_info || data.safetyInfo,
            restrictions: data.restrictions,
            tags: data.tags,
            coverImage: data.cover_image || data.coverImage,
            budget_range: data.budget_range,
            flights: data.flights || [],
            hotels: data.hotels || [],
            viralSpots: data.viralSpots || data.viral_spots || [],
            start_date: data.start_date,
            end_date: data.end_date,
            travelers: data.travelers || data.passengers || 2,
            departure_city: data.departure_city ?? data.departureCity ?? null,
            travelMode: data.travel_mode || data.travelMode,
          })

          if (currentUser && data.id) {
            const tripOwner = data.user_id === currentUser.id
            setIsOwner(tripOwner)

            const { data: favData } = await supabase
              .from("favorites")
              .select("trip_id")
              .eq("trip_id", data.id)
              .eq("user_id", currentUser.id)
              .maybeSingle()
            setIsFavorite(!!favData)
          }
        }
      } catch (err) {
        console.error("Critical error fetching trip:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchTrip()
  }, [params.id, router])

  const tripIdParam = String(params.id ?? "")

  const onItinerarySaveError = useCallback(
    (message: string) => {
      toast.error(t("toast.itinerarySaveError", { message }))
    },
    [t]
  )

  useDebouncedTripItinerarySave({
    tripId: tripIdParam || undefined,
    loadedTripId: route?.id,
    itinerary: route?.itinerary,
    isOwner,
    userId: user?.id,
    loading,
    onSaveError: onItinerarySaveError,
  })

  // ============== Loading State ==============
  if (loading) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <MeshGradient
            className="w-full h-full opacity-20"
            colors={["#6366F1", "#8B5CF6", "#A78BFA", "#6366F1"]}
            speed={0.1}
          />
        </div>
        <AppSidebar />
        <div className={`relative z-10 transition-[margin] duration-300 ${isSidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-64"}`}>
          <div className="lg:hidden"><Header /></div>
          <main className="flex min-h-[80vh] items-center justify-center p-6">
            <div className="text-center space-y-6">
              <div className="relative h-48 w-48 mx-auto">
                <LottieLoader type="plane" className="h-full w-full" />
                <div className="absolute inset-0 bg-violet-500/20 blur-3xl rounded-full -z-10 animate-pulse hidden md:block" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-foreground tracking-tighter uppercase">{t('loading')}</h3>
                <p className="text-muted-foreground font-medium animate-pulse tracking-wide">{t('loadingSubtitle')}</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // ============== Not found State ==============
  if (!route) {
    return (
      <div className="min-h-screen bg-background">
        <AppSidebar />
        <div className={`transition-[margin] duration-300 ${isSidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-64"}`}>
          <div className="lg:hidden"><Header /></div>
          <main className="flex h-[60vh] items-center justify-center">
            <div className="text-center px-4">
              <h1 className="text-2xl font-bold mb-4">{t('notFound')}</h1>
              <p className="text-muted-foreground mb-8 text-balance">
                {t('notFoundDesc')}
              </p>
              <Button onClick={() => router.push("/plan")}>{t('createNew')}</Button>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // ===== Computed data =====
  const destinationName = route.destination && route.destination !== route.title 
    ? route.destination 
    : route.countries?.[0]?.name || "Travel"

  // Use simple country/city for more reliable hero images, add tags for context
  const cleanDestination = route.countries?.[0]?.name || destinationName
  const topTags = route.tags?.slice(0, 2).map((t: string) => t.replace("#", "")).join(" ") || ""
  const heroQuery = `${cleanDestination} ${topTags}`.trim()

  const heroImage = route.coverImage || route.image || "https://upload.wikimedia.org/wikipedia/commons/c/cc/Travel_022.jpg"
  const tripDurationDays = Array.isArray(route.itinerary) ? route.itinerary.length : 0

  // Active day data
  const currentDay = route.itinerary?.find((d: any) => d.day === activeDay)
  const TransportIcon = transportIcons[currentDay?.logistics?.mode] || Zap

  // Per-day destination: try to match day title against known countries/cities
  const currentDayDestination = (() => {
    if (!currentDay) return destinationName
    const dayTitle = `${currentDay.title || ""} ${currentDay.logistics?.to || ""}`.toLowerCase()
    if (route.countries?.length > 1) {
      for (const c of route.countries) {
        const cName = (c.name || "").toLowerCase()
        const cCity = (c.city || "").toLowerCase()
        if ((cName && dayTitle.includes(cName)) || (cCity && dayTitle.includes(cCity))) {
          return c.name
        }
      }
    }
    return destinationName
  })()

  // Flights for active day
  const isFirstDay = activeDay === 1
  const isLastDay = activeDay === route.itinerary?.length
  const dayFlights = route.flights?.filter((f: any) => {
    if (f.dayNumber === activeDay) return true
    if (f.direction === "outbound" && isFirstDay) return true
    if (f.direction === "return" && isLastDay) return true
    return false
  }) || []
  const showAllFlights = isFirstDay && route.flights?.length > 0 && !route.flights.some((f: any) => f.dayNumber || f.direction)
  const flightsToShow = showAllFlights ? route.flights : dayFlights

  // Hotels for active day — prefer AI-generated hotel activity over API data
  const hotelActivityForDay = (() => {
    // Find the most recent hotel activity at or before the active day
    if (!Array.isArray(route.itinerary)) return null
    for (let d = activeDay; d >= 1; d--) {
      const day = route.itinerary.find((dd: any) => dd.day === d)
      const hotelAct = day?.activities?.find((a: any) =>
        a.type === "hotel" ||
        /заселение|отель|hotel|check.?in/i.test(`${a.title || ""} ${a.desc || ""}`)
      )
      if (hotelAct) return hotelAct
    }
    return null
  })()

  const dayHotels = route.hotels?.filter((h: any) => {
    const start = Number(h.dayStart)
    const nights = Number(h.nights) || 1
    return start <= Number(activeDay) && (start + nights) > Number(activeDay)
  }) || []
  const apiHotel = dayHotels[0] || null

  // Build sidebar hotel: AI activity data takes priority, API data fills gaps
  const sidebarHotel = hotelActivityForDay ? {
    hotelName: hotelActivityForDay.placeName || hotelActivityForDay.title?.replace(/^заселение в\s*/i, "") || apiHotel?.hotelName || t('hotelDefault'),
    stars: apiHotel?.stars || (hotelActivityForDay.desc?.match(/(\d)\*/)?.[1] ? Number(hotelActivityForDay.desc.match(/(\d)\*/)[1]) : null),
    rating: apiHotel?.rating,
    checkIn: hotelActivityForDay.desc?.match(/(\d{2}:\d{2})/)?.[1] || apiHotel?.checkIn || "14:00",
    cost: hotelActivityForDay.cost,
    bookingUrl: apiHotel?.bookingUrl || hotelActivityForDay.link,
    desc: hotelActivityForDay.desc,
  } : apiHotel

  // Trip date range for calendar
  const tripStartDate = route.start_date ? new Date(route.start_date) : null
  const tripEndDate = route.end_date ? new Date(route.end_date) : null
  const currentDayWeather = tripWeather[activeDay - 1] ?? null
  const calendarSelectedDays: Date[] = []
  if (tripStartDate && tripEndDate) {
    const d = new Date(tripStartDate)
    while (d <= tripEndDate) {
      calendarSelectedDays.push(new Date(d))
      d.setDate(d.getDate() + 1)
    }
  }
  
  const itineraryTips = route.itinerary?.filter((day: any) => day?.tips?.trim()) || []

  // Activities for active day
  const rawActivities = currentDay?.activities || [
    { time: t('morningTime'), desc: currentDay?.morning, type: "activity" },
    { time: t('afternoonTime'), desc: currentDay?.daytime, type: "food" },
    { time: t('eveningTime'), desc: currentDay?.night, type: "activity" },
  ].filter((i: any) => i.desc)

  // Always append free time as the 4th activity
  const dayActivities = [
    ...rawActivities,
    {
      time: t('freeTimeTitle'),
      title: t('freeTimeTitle'),
      desc: t('freeTimeDesc'),
      type: "free",
    },
  ]

  // === ENRICH ACTIVITIES WITH FLIGHT DATA ===
  // 1. Map existing activities to add booking links if it's a transport activity
  const enrichedDayActivities = dayActivities.map((activity: any) => {
    const theme = getActivityColorTheme(activity)
    if (theme === "transport") {
      // Find matching flight for this day
      const flight = flightsToShow?.[0]

      if (flight) {
        // Use bookingUrl already computed by extractLogisticsFromItinerary (has correct IATA/dates)
        const url = flight.bookingUrl || getFlightSearchLink({
          originIata: flight.departureCode,
          destination: flight.arrivalCity || flight.arrivalCode || destinationName,
          destinationIata: flight.arrivalCode,
          departDate: flight.departureDate
            ? new Date(flight.departureDate)
            : (tripStartDate ? addDays(tripStartDate, (flight.dayNumber || 1) - 1) : undefined),
          adults: route.travelers || 2,
          subId: "timeline_btn"
        })

        return {
          ...activity,
          cost: activity.cost || (flight.price ? `${locale === "en" ? "$" : ""}${flight.price.toLocaleString(locale === "en" ? "en-US" : "ru-RU")}${locale !== "en" ? " ₽" : ""}` : undefined),
          ticketsRequired: true,
          link: url
        }
      }

      // No flight in route.flights for this day — build link from day logistics (handles old trips)
      const lg = currentDay?.logistics
      if (lg && /перелёт|перелет|самолет|самолёт|рейс|вылет|flight|авиа/i.test(lg.mode || "")) {
        const fromP = parseCityIata(lg.from || "")
        const toP = parseCityIata(lg.to || "")
        const fromIata = fromP.iata || getIataCode(fromP.city || lg.from || "") || ""
        const toIata = toP.iata || getIataCode(toP.city || lg.to || "") || ""
        const dayDate = tripStartDate ? addDays(tripStartDate, activeDay - 1) : undefined

        const url = getFlightSearchLink({
          originIata: fromIata,
          origin: fromP.city || lg.from || "",
          destination: toP.city || lg.to || destinationName,
          destinationIata: toIata,
          departDate: dayDate,
          adults: route.travelers || 2,
          subId: "logistics_day"
        })

        return { ...activity, ticketsRequired: true, link: url }
      }
    }
    return activity
  })

  // 2. If we have flights but no transport activity in the list, prepend a synthetic one
  const hasTransport = enrichedDayActivities.some((a: any) => getActivityColorTheme(a) === "transport")
  const finalDayActivities = [...enrichedDayActivities]

  if (!hasTransport && flightsToShow?.length > 0) {
    const f = flightsToShow[0]
    const fDate = f.departureDate ? new Date(f.departureDate) : (tripStartDate ? addDays(tripStartDate, (f.dayNumber || 1) - 1) : undefined)
    const origin = f.departureCode || "MOW"
    const dest = f.arrivalCode || (f.direction === "return" ? "MOW" : (route.destinationIata || getIataCode(destinationName) || ""))

    if (fDate) {
      const url = f.bookingUrl || getFlightSearchLink({
        originIata: origin,
        destination: f.arrivalCity || dest,
        destinationIata: dest,
        departDate: fDate,
        adults: route.travelers || 2,
        subId: "timeline_btn_synthetic"
      })

      finalDayActivities.unshift({
        time: f.departureTime || t('morningTime'),
        title: t('flightTitle', { from: origin, to: dest }),
        desc: `${f.airline || t('airlineDefault')} ${f.duration ? `• ${f.duration}` : ""}`,
        cost: f.price ? `${locale === "en" ? "$" : ""}${f.price.toLocaleString(locale === "en" ? "en-US" : "ru-RU")}${locale !== "en" ? " ₽" : ""}` : undefined,
        type: "transport",
        ticketsRequired: true,
        link: url
      })
    }
  } else if (!hasTransport) {
    // No route.flights for this day — try logistics for synthetic card
    const lg = currentDay?.logistics
    if (lg && /перелёт|перелет|самолет|самолёт|рейс|вылет|flight|авиа/i.test(lg.mode || "")) {
      const fromP = parseCityIata(lg.from || "")
      const toP = parseCityIata(lg.to || "")
      const fromIata = fromP.iata || getIataCode(fromP.city || lg.from || "") || ""
      const toIata = toP.iata || getIataCode(toP.city || lg.to || "") || ""
      const dayDate = tripStartDate ? addDays(tripStartDate, activeDay - 1) : undefined

      if (dayDate) {
        const url = getFlightSearchLink({
          originIata: fromIata,
          origin: fromP.city || lg.from || "",
          destination: toP.city || lg.to || destinationName,
          destinationIata: toIata,
          departDate: dayDate,
          adults: route.travelers || 2,
          subId: "logistics_synthetic"
        })

        finalDayActivities.unshift({
          time: lg.departureTime || t('morningTime'),
          title: t('flightTitle', { from: fromP.city || lg.from || fromIata, to: toP.city || lg.to || toIata }),
          desc: `${lg.airline || t('airlineDefault')} ${lg.duration ? `• ${lg.duration}` : ""}`,
          cost: undefined,
          type: "transport",
          ticketsRequired: true,
          link: url
        })
      }
    }
  }



  // ===== Handlers =====
  const handleTogglePublic = async () => {
    if (!route?.id) return
    const newValue = !route.is_public
    const { error } = await supabase
      .from("trips")
      .update({ is_public: newValue })
      .eq("id", route.id)
    if (error) {
      toast.error(t('toast.visibilityError'))
      return
    }
    setRoute((r: any) => ({ ...r, is_public: newValue }))
    toast.success(newValue ? t('toast.published') : t('toast.hidden'))
  }

  const handleShare = async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: route.title, url })
      } else {
        await navigator.clipboard.writeText(url)
        toast.success(t('toast.linkCopied'))
      }
    } catch {
      await navigator.clipboard.writeText(url)
      toast.success(t('toast.linkCopied'))
    }
  }

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      toast.error(t('toast.loginRequired'))
      router.push(`/auth?next=/trip/${route.id}`)
      return
    }
    setFavoriteLoading(true)
    const newFav = !isFavorite
    setIsFavorite(newFav)
    try {
      await toggleFavorite(route.id)
      toast.success(newFav ? t('toast.favoriteAdded') : t('toast.favoriteRemoved'))
    } catch {
      setIsFavorite(!newFav)
      toast.error(t('toast.favoriteError'))
    } finally {
      setFavoriteLoading(false)
    }
  }

  const handleGenerateExtraActivity = async (dayNumber: number) => {
    setIsGeneratingExtra(true)
    try {
      // Open AI chat with prefilled prompt
      window.dispatchEvent(
        new CustomEvent("trip-ai-prefill", {
          detail: { text: t('aiAddActivity', { day: dayNumber }) },
        })
      )
      window.dispatchEvent(new CustomEvent("trip-ai-open"))
      toast.info(t('toast.generatingAI'))
    } finally {
      setIsGeneratingExtra(false)
    }
  }

  const handleGenerateInline = async (dayNumber: number, prompt: string) => {
    try {
      const response = await fetch("/api/trip-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripData: route,
          userMessage: prompt,
          tripId: params.id,
          locale: locale === "en" ? "en" : "ru",
        }),
      })

      if (!response.ok) {
        throw new Error(t('toast.serverError', { status: response.status }))
      }

      const data = await response.json()

      if (data.error) {
        toast.error(t('toast.aiError', { message: data.error }))
        return { reply: t('errorReply', { message: data.error }), success: false }
      }

      if (data.type === "modification" && data.modifications?.length > 0) {
        setRoute((prev: any) => {
          let updatedItinerary = [...(prev.itinerary || [])]
          for (const mod of data.modifications) {
            if (mod.type === "replace_all_days") {
              updatedItinerary = mod.newItinerary
            }
          }
          return { ...prev, itinerary: updatedItinerary }
        })
        return { reply: data.reply, success: true }
      } else {
        return { reply: data.reply || t('toast.aiError', { message: 'generation failed' }), success: false }
      }
    } catch (error: any) {
      console.error("Inline generation error:", error)
      toast.error(t('toast.aiError', { message: '' }))
      return { reply: t('errorGeneral', { message: '' }), success: false }
    }
  }

  const handleRequestModifyInChat = (activity: any, dayNumber: number) => {
    window.dispatchEvent(
      new CustomEvent("trip-ai-prefill", {
        detail: { text: t('aiModifyActivity', { title: activity.title || activity.placeName || activity.desc?.slice(0, 30) || '', day: dayNumber }) },
      })
    )
    window.dispatchEvent(new CustomEvent("trip-ai-open"))
  }

  // ============== RENDER ==============
  return (
    <div className="min-h-screen trip-bg relative">
      <AppSidebar />
      <TripTooltips userId={user?.id} />

      {/* Read-only banner for non-owners viewing someone else's public trip */}
      {!isOwner && !loading && route?.id && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-sky-600/95 backdrop-blur-sm text-white text-sm py-2 px-4 flex items-center justify-center gap-2 shadow-lg">
          <Eye className="w-4 h-4 flex-shrink-0" />
          <span>{t('readOnlyBanner')}</span>
          {!user && (
            <a href={`/auth?next=/trip/${route.id}`} className="ml-2 underline font-medium hover:text-sky-200">{t('signIn')}</a>
          )}
        </div>
      )}

      <div className={`relative z-10 transition-[margin] duration-300 ${isSidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-64"}`}>
        {/* ===== HERO IMAGE SECTION ===== */}
        <div className="relative w-full min-h-[480px] sm:min-h-[600px] shrink-0 overflow-hidden">
          <motion.div style={{ y: heroY, scale: heroScale }} className="absolute inset-0 h-[130%] w-full -top-[15%]">
            <TripImage
              src={heroImage}
              query={destinationName || "travel"}
              alt={route.title || destinationName}
              className="h-full w-full object-cover"
              imgClassName="transition-transform duration-700"
              priority
            />
          </motion.div>

          {/* Gradient overlays — lighter to show image */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-transparent h-1/2" />

          {/* ===== Floating Header Bar (all screens) ===== */}
          <div className="absolute top-6 sm:top-8 left-3 sm:left-8 right-3 sm:right-8 z-50">
            <div className="trip-glass-header rounded-full px-3 sm:px-6 py-2.5 sm:py-4 flex items-center justify-between shadow-md md:shadow-2xl backdrop-blur-md md:backdrop-blur-xl bg-black/20 border-white/10 border">
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <button
                  onClick={() => router.back()}
                  className="flex-shrink-0 flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/40 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/15 transition-colors text-slate-700 dark:text-white border border-white/50 dark:border-white/10 backdrop-blur-md"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                </button>
                <div className="min-w-0 flex flex-col justify-center">
                  <h1 className="text-sm sm:text-lg lg:text-xl font-black text-white tracking-tight truncate drop-shadow-md pr-2 uppercase italic">{route.title}</h1>
                  
                  {/* Tags and Metadata Row in Header */}
                  <div className="flex items-center gap-3 sm:gap-4 mt-1.5 overflow-hidden">
                    <div className="flex items-center text-[10px] sm:text-xs text-white/80 gap-3 font-bold shrink-0">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[12px] sm:text-sm opacity-70">calendar_month</span>
                        {formatDateRange(tripStartDate, tripEndDate, locale) || t('noDates', { days: tripDurationDays })}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[12px] sm:text-sm opacity-70">person</span>
                        {route.travelers || 2}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <div className="w-px h-3 bg-white/20 mx-1" />
                      {route.tags?.slice(0, 3).map((tag: string, idx: number) => {
                        const cfg = getTagConfig(tag)
                        return (
                          <span key={idx} className={cn("px-2.5 py-1 rounded-lg border text-[10px] sm:text-[11px] font-black uppercase tracking-tight whitespace-nowrap shadow-lg backdrop-blur-md", cfg.color.replace('bg-sky-100/80', 'bg-sky-500/20').replace('text-sky-700', 'text-sky-200'))}>
                            {tag.replace("#", "")}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                <button onClick={() => setShowBudgetModal(true)} className="text-right group cursor-pointer mr-1 sm:mr-0 flex flex-col items-end">
                  <p className="hidden sm:block text-[10px] sm:text-xs text-white/70 font-medium uppercase tracking-wide leading-none mb-0.5">{t('totalBudgetLabel')}</p>
                  <p className="text-sm sm:text-xl font-bold text-white group-hover:text-sky-300 transition-colors bg-white/10 sm:bg-transparent px-2 py-0.5 sm:p-0 rounded-lg sm:rounded-none backdrop-blur-md sm:backdrop-blur-none border border-white/20 sm:border-none">{displayBudget}</p>
                </button>
                <div className="hidden sm:block h-8 sm:h-10 w-px bg-white/20" />
                <div className="flex items-center gap-1.5 sm:gap-3">
                  {isOwner && (
                    <button
                      onClick={handleTogglePublic}
                      title={route.is_public ? t('publicTitle') : t('privateTitle')}
                      className={cn(
                        "hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all backdrop-blur-md",
                        route.is_public
                          ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/30"
                          : "bg-white/10 border-white/20 text-white/70 hover:bg-white/20"
                      )}
                    >
                      {route.is_public
                        ? <><Globe className="w-3.5 h-3.5" /> {t('publicTrip')}</>
                        : <><Lock className="w-3.5 h-3.5" /> {t('privateTrip')}</>
                      }
                    </button>
                  )}
                  <button
                    onClick={handleShare}
                    className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full border border-white/20 text-white hover:bg-white/20 transition-colors bg-white/10 backdrop-blur-md"
                  >
                    <span className="material-symbols-outlined text-lg sm:text-xl">share</span>
                  </button>
                  <button
                    onClick={handleToggleFavorite}
                    disabled={favoriteLoading}
                    className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full border border-white/20 text-white hover:bg-white/20 transition-colors bg-white/10 backdrop-blur-md"
                  >
                    <Heart className={cn("h-4 w-4 sm:h-5 sm:w-5 transition-all duration-300", isFavorite ? "fill-rose-500 text-rose-500" : "")} />
                  </button>

                </div>
              </div>
            </div>
          </div>

          {/* ===== Bottom Overlay (title + description) ===== */}
          <div className="absolute bottom-6 sm:bottom-12 left-3 sm:left-8 right-3 sm:right-8 flex flex-col md:flex-row justify-between items-end gap-2 sm:gap-4 md:gap-6 z-30">
            <div className="max-w-3xl">
              {/* Star Rating & Completed Status */}
              <div className="flex items-center gap-2 mb-4">
                {route.safetyInfo?.rating && (
                  <span className="whitespace-nowrap px-3 py-1.5 bg-emerald-500/20 text-emerald-300 backdrop-blur-md text-xs font-bold rounded-full border border-emerald-500/30 flex items-center gap-1 shadow-sm">
                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                    {route.safetyInfo.rating}/10
                  </span>
                )}
                {route.status === 'completed' && (
                  <button onClick={() => setActiveView("stats")}>
                    <span className="px-3 py-1.5 cursor-pointer hover:bg-white/20 transition-colors bg-blue-500/20 text-white backdrop-blur-md text-xs font-bold rounded-full border border-blue-400/50 flex items-center gap-1.5 shadow-sm uppercase tracking-wide">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {t('completed')}
                    </span>
                  </button>
                )}
              </div>

              {/* Big Title */}
              <h2 className="text-3xl sm:text-4xl lg:text-6xl font-extrabold text-white mb-3 tracking-tight leading-tight">
                {route.title}
              </h2>

              {/* Description — subtle */}
              {route.description && (
                <p className="text-white/70 max-w-2xl text-sm sm:text-base font-medium leading-relaxed line-clamp-2">
                  {route.description}
                </p>
              )}

              {/* Hero action pills: weather + tips */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {currentDayWeather && (
                  <button
                    onClick={() => setShowWeatherModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/20 bg-white/10 hover:bg-white/20 transition-colors text-white text-xs font-bold shadow-sm"
                  >
                    <span>{getWeatherEmoji(currentDayWeather.weatherCode)}</span>
                    <span className="whitespace-nowrap">{Math.round(currentDayWeather.minTemp)}–{Math.round(currentDayWeather.maxTemp)}°C</span>
                    <span className="opacity-60 text-[10px] whitespace-nowrap">· {t('weatherTrip')}</span>
                  </button>
                )}
                <button
                  onClick={() => setShowTipsModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border border-amber-400/30 bg-amber-500/15 hover:bg-amber-500/25 transition-colors text-amber-200 text-xs font-bold shadow-sm"
                >
                  <span className="material-symbols-outlined text-sm">lightbulb</span>
                  {t('routeTips')}
                </button>
                {allActivities.length > 0 && (
                  <button
                    onClick={() => { setReelsStartIndex(0); setIsReelsOpen(true) }}
                    className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border border-indigo-400/30 bg-indigo-500/20 hover:bg-indigo-500/30 transition-colors text-indigo-200 text-xs font-bold shadow-sm"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {t('watchReels')}
                  </button>
                )}
              </div>
            </div>

            {/* Links button — bottom-right of hero */}
            <button
              onClick={() => setShowLinksModal(true)}
              className="flex-shrink-0 group relative flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-3 rounded-xl sm:rounded-2xl transition-all duration-200 hover:scale-105 overflow-hidden"
              style={{
                background: "linear-gradient(135deg, rgba(56,189,248,0.22) 0%, rgba(99,102,241,0.28) 100%)",
                border: "1px solid rgba(255,255,255,0.18)",
                backdropFilter: "blur(16px)",
                boxShadow: "0 8px 32px rgba(56,189,248,0.20), inset 0 1px 0 rgba(255,255,255,0.15)",
              }}
            >
              {/* glow spot */}
              <div className="absolute -top-4 -right-6 w-20 h-20 rounded-full opacity-50 pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(56,189,248,0.5) 0%, transparent 70%)" }} />
              <div
                className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(56,189,248,0.20)", border: "1px solid rgba(56,189,248,0.35)" }}
              >
                <ExternalLink className="text-sky-300" style={{ width: 18, height: 18 }} />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[11px] font-black text-white/90 leading-tight tracking-wider uppercase whitespace-nowrap">
                  {t('checkPrices')}
                </span>
                <span className="text-[9px] text-white/50 font-medium whitespace-nowrap">{t('ticketsHotelsMap')}</span>
              </div>
            </button>

          </div>
        </div>

        {/* ===== STICKY DAY TABS ===== */}
        <div className="sticky top-0 z-40 px-2 sm:px-4 lg:px-8 py-3">
          <div className="trip-glass rounded-full p-1.5 sm:p-2 shadow-md md:shadow-2xl max-w-7xl mx-auto flex items-center gap-1">
            {/* Left arrow */}
            {tripDurationDays > 1 && (
              <button
                onClick={() => setActiveDay(Math.max(1, activeDay - 1))}
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-slate-500 dark:text-white/60 hover:bg-white/50 dark:hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">chevron_left</span>
              </button>
            )}
            <div className="relative flex-1 overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white/20 dark:from-black/20 to-transparent pointer-events-none z-10 rounded-r-full" />
            <div className="flex space-x-1 overflow-x-auto no-scrollbar px-1">
              {route.itinerary?.map((day: any) => {
                const isActive = activeDay === day.day
                const hasFlight =
                  route.flights?.some((f: any) => f.dayNumber === day.day) ||
                  (day.day === 1 && route.flights?.some((f: any) => f.direction === "outbound")) ||
                  (day.day === route.itinerary.length && route.flights?.some((f: any) => f.direction === "return")) ||
                  day.activities?.some((a: any) => 
                    a.type === "transport" && 
                    /перелёт|перелет|рейс|вылет|прибытие|аэропорт/i.test(a.title || "")
                  )
                const isCompact = false

                return (
                  <button
                    key={day.day}
                    ref={(el) => { if (dayRefs.current) dayRefs.current[day.day] = el }}
                    onClick={() => setActiveDay(day.day)}
                    className={cn(
                      "flex-shrink-0 rounded-full transition-all flex flex-col items-center relative border",
                      isCompact ? "px-3 py-1.5 min-w-[56px]" : "px-4 sm:px-6 py-2 sm:py-3 min-w-[80px] sm:min-w-[100px]",
                      isActive
                        ? "bg-sky-500 dark:bg-blue-600 text-white shadow-lg shadow-sky-400/40 dark:shadow-blue-500/40 border-sky-400/50 dark:border-blue-400/50"
                        : "text-slate-600 dark:text-white/70 hover:bg-white/50 dark:hover:bg-white/10 hover:text-sky-700 dark:hover:text-white border-transparent hover:border-white/30 dark:hover:border-white/10 group"
                    )}
                  >
                    {hasFlight && (
                      <span className={cn(
                        "absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow-md border",
                        isActive
                          ? "bg-white text-sky-600 border-sky-300"
                          : "bg-sky-500 text-white border-sky-400 dark:bg-blue-500 dark:border-blue-400"
                      )}>
                        <Plane className="w-2.5 h-2.5" />
                      </span>
                    )}
                    <span className={cn(
                      "whitespace-nowrap font-bold uppercase tracking-widest",
                      isCompact ? "text-[9px]" : "text-[10px]",
                      isActive ? "opacity-90" : "opacity-70 group-hover:opacity-100"
                    )}>
                      {formatDayDate(tripStartDate, day.day - 1, locale) ? t('dayLabel', { day: day.day }) : ""}
                    </span>
                    <span className={cn(
                      "whitespace-nowrap font-bold",
                      isCompact ? "text-xs" : "text-base sm:text-lg",
                      isActive ? "font-extrabold" : "group-hover:text-sky-800 dark:group-hover:text-white"
                    )}>
                      {formatDayDate(tripStartDate, day.day - 1, locale) || t('dayLabel', { day: day.day })}
                    </span>
                    {tripWeather[day.day - 1] && (
                      <span className={cn(
                        "whitespace-nowrap text-[9px] font-medium leading-none mt-0.5",
                        isActive ? "text-white/80" : "text-sky-600/80 dark:text-sky-300/80"
                      )}>
                        {getWeatherEmoji(tripWeather[day.day - 1].weatherCode)} {Math.round(tripWeather[day.day - 1].maxTemp)}°
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            </div>
            {/* Right arrow */}
            {tripDurationDays > 1 && (
              <button
                onClick={() => setActiveDay(Math.min(tripDurationDays, activeDay + 1))}
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-slate-500 dark:text-white/60 hover:bg-white/50 dark:hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">chevron_right</span>
              </button>
            )}
            {/* Stats tab */}
            <div className="flex border-l border-slate-300/40 dark:border-white/10 pl-2 ml-1 shrink-0">
              <button
                onClick={() => setActiveView(v => v === "stats" ? "itinerary" : "stats")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-all",
                  activeView === "stats"
                    ? "bg-violet-500 text-white shadow-lg shadow-violet-500/30"
                    : "text-slate-500 dark:text-white/60 hover:bg-white/50 dark:hover:bg-white/10"
                )}
                title={t('stats')}
              >
                <BarChart2 className="w-4 h-4" />
                <span className="hidden sm:inline">{t('stats')}</span>
              </button>
            </div>

            <div className="hidden md:flex border-l border-slate-300/40 dark:border-white/10 pl-2 ml-1">
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <button className="p-2.5 text-slate-500 dark:text-white/70 hover:text-sky-700 dark:hover:text-white transition-colors bg-white/30 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 rounded-full backdrop-blur-md">
                    <span className="material-symbols-outlined text-xl">calendar_month</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl" align="end">
                  <div className="p-4">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">{t('tripDates')}</p>
                    {tripStartDate && tripEndDate ? (
                      <Calendar
                        mode="multiple"
                        selected={calendarSelectedDays}
                        defaultMonth={tripStartDate}
                        className="rounded-xl"
                      />
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        <p className="font-medium">{t('noDates', { days: tripDurationDays })}</p>
                        <p className="text-xs mt-1">{t('noDatesExact')}</p>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* ===== STATS VIEW ===== */}
        {activeView === "stats" && (
          <TripStatsPanel route={route} tripId={params.id as string} />
        )}

        {/* ===== MAIN CONTENT GRID ===== */}
        <div className={cn("max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 pb-20 relative z-30", activeView === "stats" && "hidden")}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 items-start mt-3 sm:mt-4">

            {/* ===== LEFT COLUMN: Timeline ===== */}
            <div className="lg:col-span-7 space-y-3 sm:space-y-4 lg:space-y-6">
              {currentDay && (
                <>
                  {/* Day title bar */}
                  <div className="flex items-center justify-between trip-glass p-3 sm:p-4 rounded-3xl shadow-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className="text-base sm:text-xl lg:text-2xl font-bold text-slate-800 dark:text-white drop-shadow-sm truncate">
                        {t('dayTitle', { day: currentDay.day, title: currentDay.title || t('dayDefaultTitle') })}
                      </h3>
                      {currentDayWeather && (
                        <span className="shrink-0 text-xs sm:text-sm font-semibold text-sky-600 dark:text-sky-300 whitespace-nowrap">
                          {getWeatherEmoji(currentDayWeather.weatherCode)} {Math.round(currentDayWeather.minTemp)}–{Math.round(currentDayWeather.maxTemp)}°C
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Activity Timeline */}
                  <div className="trip-timeline relative space-y-3 sm:space-y-4 lg:space-y-6 pl-0 sm:pl-2">
                    {finalDayActivities.map((activity: any, i: number) => (
                      <ActivityTimelineCard
                        key={`act-${activeDay}-${i}`}
                        activity={activity}
                        destination={currentDayDestination}
                        dayNumber={activeDay}
                        onGenerateExtraActivity={handleGenerateExtraActivity}
                        onGenerateInline={handleGenerateInline}
                        onRequestModifyInChat={handleRequestModifyInChat}
                        isGeneratingExtra={isGeneratingExtra}
                      />
                    ))}
                  </div>

                  {/* Day tips */}
                  {currentDay.tips && (
                    <div className="trip-glass rounded-2xl p-4 flex gap-3 text-sm text-amber-900 dark:text-amber-200 bg-amber-50/50 dark:!bg-amber-900/20 !border-amber-200/50 dark:!border-amber-900/30">
                      <Compass className="h-5 w-5 text-amber-500 dark:text-amber-400 shrink-0" />
                      <p><strong>{t('tip')}:</strong> {currentDay.tips}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ===== RIGHT COLUMN: Sticky Sidebar ===== */}
            <div className="lg:col-span-5 space-y-3 sm:space-y-4 lg:space-y-6 lg:sticky lg:top-20">

              {/* Weather Widget - REMOVED (Moved to grid below) */}

              {/* Accommodation Card (sidebar preview) */}
              {sidebarHotel && (
                <div className="trip-glass p-3 sm:p-6 rounded-[2rem] shadow-lg hover:shadow-md md:shadow-xl transition-colors">
                  <h4 className="text-[10px] sm:text-xs font-bold text-sky-700 dark:text-blue-200 uppercase tracking-widest mb-3 sm:mb-4 opacity-80">{t('accommodation')}</h4>
                  <div className="flex items-center gap-3 sm:gap-5">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0 shadow-lg border border-white/40 dark:border-white/10">
                      <TripImage
                        query={`${sidebarHotel.hotelName} ${destinationName} hotel`}
                        alt={sidebarHotel.hotelName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-800 dark:text-white text-sm sm:text-lg truncate">{sidebarHotel.hotelName}</h5>
                      <div className="flex items-center text-[10px] sm:text-xs text-yellow-500 dark:text-yellow-300 mt-0.5 sm:mt-1 font-bold">
                        <span className="material-symbols-outlined text-sm text-yellow-400 mr-1">star</span>
                        <span>{sidebarHotel.stars || sidebarHotel.rating || "5.0"}</span>
                      </div>
                      <p className="text-[10px] sm:text-xs text-slate-500 dark:text-blue-100/70 mt-1 font-medium truncate">
                        {t('checkInTime', { time: sidebarHotel.checkIn || "14:00" })}
                      </p>
                      {sidebarHotel.cost && (
                        <p className="whitespace-nowrap text-[10px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-300 mt-0.5 sm:mt-1">{sidebarHotel.cost}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 sm:mt-5 pt-3 sm:pt-4 border-t border-slate-200/60 dark:border-white/5 flex justify-between items-center">
                    <span className="px-2 sm:px-3 py-1 bg-green-100/60 dark:bg-green-500/10 text-green-700 dark:text-green-300 text-[9px] sm:text-[10px] font-bold rounded-lg backdrop-blur-sm border border-green-200/50 dark:border-green-500/20 uppercase tracking-wide shadow-sm">
                      {t('confirmed')}
                    </span>
                    <button
                      onClick={() => {
                        if (sidebarHotel.bookingUrl) {
                          window.open(sidebarHotel.bookingUrl, "_blank")
                          return
                        }
                        // Build Booking.com deep-search for the specific hotel name + city
                        const checkInDate = tripStartDate ? addDays(tripStartDate, activeDay - 1) : undefined
                        const checkOutDate = checkInDate ? addDays(checkInDate, 1) : undefined
                        const q = [sidebarHotel.hotelName, sidebarHotel.city || destinationName].filter(Boolean).join(", ")
                        const p = new URLSearchParams({ ss: q, lang: "ru", selected_currency: "RUB" })
                        if (checkInDate) p.set("checkin", checkInDate.toISOString().slice(0, 10))
                        if (checkOutDate) p.set("checkout", checkOutDate.toISOString().slice(0, 10))
                        p.set("group_adults", String(route.travelers || 2))
                        window.open(`https://www.booking.com/search.html?${p.toString()}`, "_blank")
                      }}
                      className="text-[10px] sm:text-xs font-bold text-white bg-sky-500 dark:bg-blue-600 hover:bg-sky-400 dark:hover:bg-blue-500 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full transition-colors shadow-lg shadow-sky-500/20 dark:shadow-blue-500/20"
                    >
                      {t('bookNow')}
                    </button>
                  </div>
                </div>
              )}

              {/* TikTok Places */}
              <TripViralCarousel spots={route.viralSpots || []} destination={destinationName} />

              {/* Important Info — hidden, accessible via Tips modal */}
            </div>
          </div>
        </div>

        {/* ===== Budget Analysis Modal ===== */}
        <Dialog open={showBudgetModal} onOpenChange={setShowBudgetModal}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-md rounded-3xl p-5 sm:p-7">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                <PieChart className="h-6 w-6 text-primary" />
                {t('budget_modal.title')}
              </DialogTitle>
              <DialogDescription>
                {t('budget_modal.subtitle')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 sm:p-4 rounded-2xl bg-muted/50 border border-border flex flex-col justify-between min-h-[80px]">
                  <div className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 break-words">{t('budget_modal.accommodation')}</div>
                  <div>
                    <div className="text-lg sm:text-xl font-bold break-words">{route.budgetAnalysis?.avgAccommodation || "—"}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">{t('budget_modal.accommodationPer')}</div>
                  </div>
                </div>
                <div className="p-3 sm:p-4 rounded-2xl bg-muted/50 border border-border flex flex-col justify-between min-h-[80px]">
                  <div className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 break-words">{t('budget_modal.food')}</div>
                  <div>
                    <div className="text-lg sm:text-xl font-bold break-words">{route.budgetAnalysis?.avgFood || "—"}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">{t('budget_modal.foodPer')}</div>
                  </div>
                </div>
                <div className="p-3 sm:p-4 rounded-2xl bg-muted/50 border border-border flex flex-col justify-between min-h-[80px]">
                  <div className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 break-words">{t('budget_modal.transport')}</div>
                  <div>
                    <div className="text-lg sm:text-xl font-bold break-words">{route.budgetAnalysis?.avgTransport || "—"}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">{t('budget_modal.transportPer')}</div>
                  </div>
                </div>
                <div className="p-3 sm:p-4 rounded-2xl bg-muted/50 border border-border flex flex-col justify-between min-h-[80px]">
                  <div className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 break-words">{t('budget_modal.activities')}</div>
                  <div>
                    <div className="text-lg sm:text-xl font-bold break-words">{route.budgetAnalysis?.avgActivities || "—"}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">{t('budget_modal.activitiesPer')}</div>
                  </div>
                </div>
                <div className="p-3 sm:p-4 rounded-2xl bg-muted/50 border border-border col-span-2 flex flex-col justify-between">
                  <div className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 break-words">{t('budget_modal.misc')}</div>
                  <div>
                    <div className="text-lg sm:text-xl font-bold break-words">{route.budgetAnalysis?.avgMisc || "—"}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">{t('budget_modal.miscPer')}</div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-bold">{t('budget_modal.totals')}</h4>
                <div className="flex justify-between items-center py-2 border-b border-border italic text-sm">
                  <span className="text-muted-foreground font-medium">{t('budget_modal.estimatedBudget')}</span>
                  <span className="font-bold">{displayBudget}</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  {t('budget_modal.disclaimer', { style: route.budget_range || t('budgetStyleDefault') })}
                </p>
              </div>
              <Button className="w-full rounded-xl py-2.5 font-semibold text-sm" onClick={() => setShowBudgetModal(false)}>
                {t('budget_modal.ok')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ===== Links Modal ===== */}
        <Dialog open={showLinksModal} onOpenChange={setShowLinksModal}>
          <DialogContent className="max-w-4xl w-full rounded-3xl p-0 overflow-hidden modal-dark text-white">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/[0.07]">
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
                <ExternalLink className="w-5 h-5 text-sky-400" />
                {t('links_modal.title')}
              </DialogTitle>
              <DialogDescription className="text-white/40">
                {t('links_modal.subtitle')}
              </DialogDescription>
            </DialogHeader>
            <div className="px-4 py-4 max-h-[78vh] overflow-y-auto">
              <TripLinksPanel route={route} onGoToDay={(day) => { setActiveDay(day); setShowLinksModal(false) }} />
            </div>
          </DialogContent>
        </Dialog>

        {/* ===== Weather Modal ===== */}
        <Dialog open={showWeatherModal} onOpenChange={setShowWeatherModal}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl rounded-3xl p-5 sm:p-7">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <span className="text-2xl">{currentDayWeather ? getWeatherEmoji(currentDayWeather.weatherCode) : "🌤"}</span>
                {t('weather_modal.title')}
              </DialogTitle>
              <DialogDescription>
                {t('weather_modal.subtitle')}
              </DialogDescription>
            </DialogHeader>
            <div>
              {route.start_date && route.end_date ? (
                <TripWeatherWidget
                  destination={destinationName}
                  startDate={route.start_date}
                  endDate={route.end_date}
                  showTitle={false}
                  bare
                />
              ) : (
                <CurrentWeatherWidget
                  destination={destinationName}
                  date={undefined}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* ===== Tips Modal ===== */}
        <Dialog open={showTipsModal} onOpenChange={setShowTipsModal}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-xl rounded-3xl p-5 sm:p-7">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                <Compass className="h-6 w-6 text-amber-500" />
                {t('tips_modal.title')}
              </DialogTitle>
              <DialogDescription>
                {t('tips_modal.subtitle')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="space-y-3">
                <h4 className="text-sm font-black uppercase tracking-widest text-amber-600 dark:text-amber-300">
                  {t('tips_modal.dayTips')}
                </h4>
                {itineraryTips.length > 0 ? (
                  <div className="space-y-3">
                    {itineraryTips.map((day: any) => (
                      <div
                        key={`tip-day-${day.day}`}
                        className="trip-glass rounded-2xl p-4 text-sm text-slate-700 dark:text-blue-100/90"
                      >
                        <p className="font-bold text-slate-900 dark:text-white mb-1">{t('tips_modal.dayN', { day: day.day })}</p>
                        <p className="leading-relaxed">{day.tips}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('tips_modal.noTips')}</p>
                )}
              </div>

              <div className="trip-glass rounded-2xl p-5 sm:p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
                  <Shield className="h-5 w-5 text-sky-500 dark:text-blue-400" />
                  {t('tips_modal.importantInfo')}
                </h3>
                <div className="space-y-5">
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-500 dark:text-blue-200/70 tracking-widest mb-2">{t('tips_modal.visa')}</h4>
                    <p className="text-sm text-slate-600 dark:text-blue-100/80 leading-relaxed">
                      {(typeof route.visaAdvice === "string" ? route.visaAdvice : route.visaAdvice?.summary || route.visaAdvice?.text || null) || t('visaDefault')}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-500 dark:text-blue-200/70 tracking-widest mb-2">{t('tips_modal.payment')}</h4>
                    <p className="text-sm text-slate-600 dark:text-blue-100/80 leading-relaxed">{route.paymentAdvice || t('paymentDefault')}</p>
                  </div>
                  {route.restrictions && (
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-500 dark:text-blue-200/70 tracking-widest mb-2">{t('tips_modal.restrictions')}</h4>
                      <p className="text-sm text-slate-600 dark:text-blue-100/80 leading-relaxed">{route.restrictions}</p>
                    </div>
                  )}
                  {route.safetyInfo && (
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-500 dark:text-blue-200/70 tracking-widest mb-2">{t('tips_modal.safety')}</h4>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-1">
                          {[...Array(10)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-2 h-2 rounded-full ${i < (route.safetyInfo?.rating || 0) ? "bg-emerald-500" : "bg-slate-200 dark:bg-white/10"}`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-bold text-slate-800 dark:text-white">{route.safetyInfo?.rating}/10</span>
                      </div>
                      {Array.isArray(route.safetyInfo?.tips)
                        ? <div className="space-y-1">{route.safetyInfo.tips.map((tip: string, i: number) => (
                            <p key={i} className="text-sm text-slate-600 dark:text-blue-100/80 leading-relaxed">• {tip}</p>
                          ))}</div>
                        : <p className="text-sm text-slate-600 dark:text-blue-100/80 leading-relaxed">{route.safetyInfo?.tips}</p>
                      }
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="mt-20">
          <Footer />
        </div>

        <TripChat
          tripId={params.id as string}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          currentUser={user}
        />

        {/* ===== AI trip assistant (FAB, owner only) ===== */}
        {isOwner && route && (
          <ItineraryChatWidget
            layout="fab"
            itinerary={route}
            tripDetails={route}
            activeDay={activeDay}
            onItineraryUpdate={(newItinerary) =>
              setRoute((prev: any) => ({ ...prev, itinerary: newItinerary }))
            }
            onModifying={setIsModifying}
            tripId={params.id as string}
          />
        )}


        {showScrollTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-50 h-10 w-10 rounded-full bg-primary/90 hover:bg-primary text-primary-foreground shadow-lg backdrop-blur-sm flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-md md:shadow-xl"
            aria-label={t('scrollTop')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        )}

        <AnimatePresence>
          {isReelsOpen && (
            <ReelsView
              activities={allActivities}
              initialIndex={reelsStartIndex}
              onClose={() => setIsReelsOpen(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
