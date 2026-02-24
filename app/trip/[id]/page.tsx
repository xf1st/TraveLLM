"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { AppSidebar } from "@/components/app-sidebar"
import { Header } from "@/components/header"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Compass,
  Map,
  MapPin,
  Shield,
  Star,
  Sparkles,
  PieChart,
  Plane,
  Car,
  Train,
  Zap,
  MessageCircle,
  X,
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
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { MeshGradient } from "@paper-design/shaders-react"
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

import { CurrentWeatherWidget } from "@/components/trip/CurrentWeatherWidget"
import { getFlightSearchLink, getHotelSearchLink, getIataCode, parseCityIata } from "@/lib/travelpayouts"
import { addDays } from "date-fns"


// Dynamic import for TripMap to avoid SSR issues with Leaflet
const TripMap = dynamic(
  () => import("@/components/TripMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] bg-muted/20 rounded-xl animate-pulse flex items-center justify-center">
        <MapPin className="h-8 w-8 text-muted-foreground/30 animate-bounce" />
      </div>
    ),
  }
)

// ===== Constants =====

const monthsShort = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"]

function formatDayDate(startDate: Date | null, dayIndex: number): string {
  if (!startDate) return ""
  const d = new Date(startDate)
  d.setDate(d.getDate() + dayIndex)
  return `${d.getDate()} ${monthsShort[d.getMonth()]}`
}

function formatDateRange(start: Date | null, end: Date | null): string {
  if (!start || !end) return ""
  const s = `${start.getDate()} ${monthsShort[start.getMonth()]}`
  const e = `${end.getDate()} ${monthsShort[end.getMonth()]}`
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

const modeTranslations: Record<string, string> = {
  Flight: "Перелёт",
  Plane: "Перелёт",
  Train: "Поезд",
  Taxi: "Такси",
  Transfer: "Трансфер",
  Car: "Автомобиль",
  Walk: "Пешком",
  None: "Нет",
}

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
  const [route, setRoute] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeDay, setActiveDay] = useState<number>(1)
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [showTipsModal, setShowTipsModal] = useState(false)
  const [isModifying, setIsModifying] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isMapOpen, setIsMapOpen] = useState(false)
  const [isMobileAIChatOpen, setIsMobileAIChatOpen] = useState(false)
  const [isAIChatOpen, setIsAIChatOpen] = useState(false)
  const [isMember, setIsMember] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [isGeneratingExtra, setIsGeneratingExtra] = useState(false)
  const dayRefs = useRef<Record<number, HTMLButtonElement | null>>({})

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

  // Memoized places for map — includes all fields needed by MapLibreView popup
  const mapPlaces = useMemo(
    () =>
      route?.itinerary?.flatMap((day: any, dayIdx: number) =>
        day.activities?.map((activity: any, actIdx: number) => {
          // Try to extract IATA codes for transport activities from logistics
          const lg = day.logistics
          let lat: number | undefined
          let lng: number | undefined
          let originIata: string | undefined
          let destIata: string | undefined

          if (activity.type === "transport" && lg?.from) {
            const fromMatch = String(lg.from).match(/\(([A-Z]{3})\)/)
            if (fromMatch) originIata = fromMatch[1]
          }
          if (activity.type === "transport" && lg?.to) {
            const toMatch = String(lg.to).match(/\(([A-Z]{3})\)/)
            if (toMatch) destIata = toMatch[1]
          }
          // Also parse IATA from activity title: "Перелёт Москва (SVO) → Вена (VIE)"
          if (activity.type === "transport") {
            const titleOrigin = String(activity.title || "").match(/^[^→]+\(([A-Z]{3})\)/)
            if (titleOrigin && !originIata) originIata = titleOrigin[1]
            const titleDest = String(activity.title || "").match(/→[^(]+\(([A-Z]{3})\)/)
            if (titleDest && !destIata) destIata = titleDest[1]
          }

          // Explicit coords from activity (if geocoded) — skip for transport (AI puts destination coords)
          const isTransport = activity.type === "transport"
          if (!isTransport && activity.lat && activity.lng) {
            lat = Number(activity.lat)
            lng = Number(activity.lng)
          }

          return {
            id: `${dayIdx}-${actIdx}`,
            name: activity.title || activity.placeName || activity.desc?.split(".")[0] || `День ${day.day}`,
            description: activity.desc,
            status: activeDay === day.day ? "active" : dayIdx === 0 ? "visited" : "pending",
            day: day.day,
            // Fields for popup
            image: activity.image || activity.photo || (Array.isArray(activity.photos) ? activity.photos[0] : undefined),
            time: activity.time,
            price: activity.cost,
            bookingLink: activity.link,
            type: activity.type,
            // Explicit coords (if available)
            lat,
            lng,
            // IATA data for TripMap coordinate resolution
            originIata,
            destIata,
          }
        }) || []
      ) || [],
    [route, activeDay]
  )

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

  const displayBudget = calculatedTotal !== null
    ? `${hasUnknownCosts ? "≈ " : ""}${calculatedTotal.toLocaleString("ru-RU")} ₽`
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
            invite_code: data.invite_code,
            flights: data.flights || [],
            hotels: data.hotels || [],
            viralSpots: data.viralSpots || data.viral_spots || [],
            start_date: data.start_date,
            end_date: data.end_date,
            travelers: data.travelers || data.passengers || 2,
          })

          if (currentUser && data.id) {
            const tripOwner = data.user_id === currentUser.id
            setIsOwner(tripOwner)

            const { data: memberData } = await supabase
              .from("trip_members")
              .select("id")
              .eq("trip_id", data.id)
              .eq("user_id", currentUser.id)
              .maybeSingle()
            setIsMember(!!memberData)

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
                <div className="absolute inset-0 bg-violet-500/20 blur-3xl rounded-full -z-10 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-foreground tracking-tighter uppercase">Загрузка маршрута</h3>
                <p className="text-muted-foreground font-medium animate-pulse tracking-wide">Готовим детали вашего приключения...</p>
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
              <h1 className="text-2xl font-bold mb-4">Маршрут не найден</h1>
              <p className="text-muted-foreground mb-8 text-balance">
                Мы не смогли найти указанный маршрут. Попробуйте создать новый или проверьте ссылку.
              </p>
              <Button onClick={() => router.push("/plan")}>Создать новый маршрут</Button>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // ===== Computed data =====
  const destinationName = route.countries?.[0]?.name || route.destination || "Travel"
  const heroImage = route.coverImage || route.image || "https://upload.wikimedia.org/wikipedia/commons/c/cc/Travel_022.jpg"
  const tripDurationDays = Array.isArray(route.itinerary) ? route.itinerary.length : 0

  // Active day data
  const currentDay = route.itinerary?.find((d: any) => d.day === activeDay)
  const TransportIcon = transportIcons[currentDay?.logistics?.mode] || Zap

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
    hotelName: hotelActivityForDay.placeName || hotelActivityForDay.title?.replace(/^заселение в\s*/i, "") || apiHotel?.hotelName || "Отель",
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
    { time: "Утро", desc: currentDay?.morning, type: "activity" },
    { time: "День", desc: currentDay?.daytime, type: "food" },
    { time: "Вечер", desc: currentDay?.night, type: "activity" },
  ].filter((i: any) => i.desc)

  // Always append free time as the 4th activity
  const dayActivities = [
    ...rawActivities,
    {
      time: "Свободное время",
      title: "Свободное время",
      desc: "Свободное время для отдыха, прогулки по городу или собственных планов.",
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
          cost: activity.cost || (flight.price ? `${flight.price.toLocaleString("ru-RU")} ₽` : undefined),
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
        time: f.departureTime || "Утро",
        title: `Перелёт ${origin} → ${dest}`,
        desc: `${f.airline || "Авиаперелет"} ${f.duration ? `• ${f.duration}` : ""}`,
        cost: f.price ? `${f.price.toLocaleString("ru-RU")} ₽` : undefined,
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
          time: lg.departureTime || "Утро",
          title: `Перелёт ${fromP.city || lg.from || fromIata} → ${toP.city || lg.to || toIata}`,
          desc: `${lg.airline || "Авиаперелет"} ${lg.duration ? `• ${lg.duration}` : ""}`,
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
      toast.error("Не удалось изменить видимость поездки")
      return
    }
    setRoute((r: any) => ({ ...r, is_public: newValue }))
    toast.success(newValue ? "Поездка опубликована — доступна по ссылке" : "Поездка скрыта")
  }

  const handleShare = async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: route.title, url })
      } else {
        await navigator.clipboard.writeText(url)
        toast.success("Ссылка скопирована!")
      }
    } catch {
      await navigator.clipboard.writeText(url)
      toast.success("Ссылка скопирована!")
    }
  }

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      toast.error("Войдите, чтобы добавить маршрут в избранное")
      router.push(`/auth?next=/trip/${route.id}`)
      return
    }
    setFavoriteLoading(true)
    const newFav = !isFavorite
    setIsFavorite(newFav)
    try {
      await toggleFavorite(route.id)
      toast.success(newFav ? "Маршрут добавлен в избранное" : "Маршрут удалён из избранного")
    } catch {
      setIsFavorite(!newFav)
      toast.error("Не удалось обновить избранное")
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
          detail: { text: `Добавь ещё одну интересную активность в день ${dayNumber}. Что-нибудь уникальное и местное.` },
        })
      )
      // On mobile open the AI chat sheet, on desktop open sidebar chat
      if (window.innerWidth < 1024) {
        setIsMobileAIChatOpen(true)
      } else {
        setIsAIChatOpen(true)
      }
      toast.info("Генерируем активность через AI...")
    } finally {
      setIsGeneratingExtra(false)
    }
  }

  const handleRequestModifyInChat = (activity: any, dayNumber: number) => {
    window.dispatchEvent(
      new CustomEvent("trip-ai-prefill", {
        detail: { text: `Измени активность "${activity.title || activity.placeName || activity.desc?.slice(0, 30)}" в день ${dayNumber}.` },
      })
    )
    if (window.innerWidth < 1024) {
      setIsMobileAIChatOpen(true)
    } else {
      setIsAIChatOpen(true)
    }
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
          <span>Вы просматриваете чужую поездку в режиме чтения</span>
          {!user && (
            <a href={`/auth?next=/trip/${route.id}`} className="ml-2 underline font-medium hover:text-sky-200">Войти</a>
          )}
        </div>
      )}

      <div className={`relative z-10 transition-[margin] duration-300 ${isSidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-64"}`}>
        {/* ===== HERO IMAGE SECTION ===== */}
        <div className="relative w-full min-h-[480px] sm:min-h-[600px] shrink-0 overflow-hidden">
          <motion.div style={{ y: heroY, scale: heroScale }} className="absolute inset-0 h-[130%] w-full -top-[15%]">
            <TripImage
              src={heroImage}
              query={destinationName}
              alt={route.title || destinationName}
              className="h-full w-full object-cover"
              priority
            />
          </motion.div>

          {/* Gradient overlays — lighter to show image */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-transparent h-1/2" />

          {/* ===== Floating Header Bar (all screens) ===== */}
          <div className="absolute top-6 sm:top-8 left-3 sm:left-8 right-3 sm:right-8 z-50">
            <div className="trip-glass-header rounded-full px-3 sm:px-6 py-2.5 sm:py-4 flex items-center justify-between shadow-2xl backdrop-blur-xl bg-black/20 border-white/10 border">
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <button
                  onClick={() => router.back()}
                  className="flex-shrink-0 flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/40 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/15 transition-colors text-slate-700 dark:text-white border border-white/50 dark:border-white/10 backdrop-blur-md"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                </button>
                <div className="min-w-0 flex flex-col justify-center">
                  <h1 className="text-sm sm:text-xl lg:text-2xl font-bold text-white tracking-tight truncate drop-shadow-md pr-2">{route.title}</h1>
                  <div className="hidden sm:flex items-center text-xs sm:text-sm text-white/90 gap-4 mt-0.5 font-medium drop-shadow-sm">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm sm:text-base">calendar_month</span>
                      {formatDateRange(tripStartDate, tripEndDate) || `${tripDurationDays} дней`}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm sm:text-base">person</span>
                      {route.travelers || 2} путешественника
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                <button onClick={() => setShowBudgetModal(true)} className="hidden sm:block text-right group cursor-pointer">
                  <p className="text-[10px] sm:text-xs text-white/70 font-medium uppercase tracking-wide">Общий бюджет</p>
                  <p className="text-base sm:text-xl font-bold text-white group-hover:text-sky-300 transition-colors">{displayBudget}</p>
                </button>
                <div className="hidden sm:block h-8 sm:h-10 w-px bg-white/20" />
                <div className="flex items-center gap-1.5 sm:gap-3">
                  {isOwner && (
                    <button
                      onClick={handleTogglePublic}
                      title={route.is_public ? "Публичная поездка — нажмите чтобы скрыть" : "Приватная поездка — нажмите чтобы опубликовать"}
                      className={cn(
                        "hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all backdrop-blur-md",
                        route.is_public
                          ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/30"
                          : "bg-white/10 border-white/20 text-white/70 hover:bg-white/20"
                      )}
                    >
                      {route.is_public
                        ? <><Globe className="w-3.5 h-3.5" /> Публичная</>
                        : <><Lock className="w-3.5 h-3.5" /> Приватная</>
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

          {/* ===== Bottom Overlay (tags + title + description) ===== */}
          <div className="absolute bottom-8 sm:bottom-12 left-4 sm:left-8 right-4 sm:right-8 flex flex-col md:flex-row justify-between items-end gap-6 z-30">
            <div className="max-w-3xl">
              {/* Colored Tags with icons */}
              <div className="flex items-center flex-wrap gap-2 mb-4">
                {route.tags?.map((tag: string, idx: number) => {
                  const cfg = getTagConfig(tag)
                  const TagIcon = cfg.icon
                  return (
                    <span
                      key={idx}
                      className={cn(
                        "px-3 py-1.5 backdrop-blur-md text-[10px] font-bold rounded-full border uppercase tracking-wide shadow-sm flex items-center gap-1.5",
                        cfg.color
                      )}
                    >
                      <TagIcon className="w-3 h-3" />
                      {tag.replace("#", "")}
                    </span>
                  )
                })}
                {route.safetyInfo?.rating && (
                  <span className="px-3 py-1.5 bg-emerald-100/80 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 backdrop-blur-md text-xs font-bold rounded-full border border-emerald-200/50 dark:border-emerald-500/30 flex items-center gap-1 shadow-sm">
                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                    {route.safetyInfo.rating}/10
                  </span>
                )}
                {route.status === 'completed' && (
                  <Link href={`/trip/completed?tripId=${route.id}`}>
                    <span className="px-3 py-1.5 cursor-pointer hover:bg-white/20 transition-colors bg-blue-500/20 text-white backdrop-blur-md text-[10px] xl:text-xs font-bold rounded-full border border-blue-400/50 flex items-center gap-1.5 shadow-sm uppercase tracking-wide">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Завершен
                    </span>
                  </Link>
                )}
              </div>

              {/* Big Title */}
              <h2 className="text-3xl sm:text-4xl lg:text-6xl font-extrabold text-white mb-3 tracking-tight drop-shadow-xl leading-tight">
                {route.title}
              </h2>

              {/* Description — subtle */}
              {route.description && (
                <p className="text-white/70 max-w-2xl text-sm sm:text-base drop-shadow-md font-medium leading-relaxed line-clamp-2">
                  {route.description}
                </p>
              )}
            </div>

            {/* 3D Map Button */}
            <button
              onClick={() => router.push(`/dashboard?tripId=${route.id}`)}
              className="bg-blue-600 hover:bg-blue-500 backdrop-blur-xl text-white px-6 sm:px-8 py-3 sm:py-4 rounded-3xl text-sm font-bold transition-all shadow-[0_0_30px_rgba(37,99,235,0.6)] flex items-center gap-3 transform hover:-translate-y-1 border border-blue-400/50 hover:shadow-blue-500/50 shrink-0"
            >
              <span className="material-symbols-outlined text-2xl">view_in_ar</span>
              <span className="text-base">3D-карта</span>
            </button>
          </div>
        </div>

        {/* ===== STICKY DAY TABS ===== */}
        <div className="sticky top-0 z-40 px-2 sm:px-4 lg:px-8 py-3">
          <div className="trip-glass rounded-full p-1.5 sm:p-2 shadow-2xl max-w-7xl mx-auto flex items-center gap-1">
            {/* Left arrow */}
            {tripDurationDays > 1 && (
              <button
                onClick={() => setActiveDay(Math.max(1, activeDay - 1))}
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-slate-500 dark:text-white/60 hover:bg-white/50 dark:hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">chevron_left</span>
              </button>
            )}
            <div className="flex space-x-1 overflow-x-auto no-scrollbar flex-1 px-1">
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
                      "font-bold uppercase tracking-widest",
                      isCompact ? "text-[9px]" : "text-[10px]",
                      isActive ? "opacity-90" : "opacity-70 group-hover:opacity-100"
                    )}>
                      {formatDayDate(tripStartDate, day.day - 1) ? `День ${day.day}` : ""}
                    </span>
                    <span className={cn(
                      "font-bold",
                      isCompact ? "text-xs" : "text-base sm:text-lg",
                      isActive ? "font-extrabold" : "group-hover:text-sky-800 dark:group-hover:text-white"
                    )}>
                      {formatDayDate(tripStartDate, day.day - 1) || `День ${day.day}`}
                    </span>
                  </button>
                )
              })}
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
            <div className="hidden md:flex border-l border-slate-300/40 dark:border-white/10 pl-2 ml-1">
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <button className="p-2.5 text-slate-500 dark:text-white/70 hover:text-sky-700 dark:hover:text-white transition-colors bg-white/30 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 rounded-full backdrop-blur-md">
                    <span className="material-symbols-outlined text-xl">calendar_month</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl" align="end">
                  <div className="p-4">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Даты поездки</p>
                    {tripStartDate && tripEndDate ? (
                      <Calendar
                        mode="multiple"
                        selected={calendarSelectedDays}
                        defaultMonth={tripStartDate}
                        className="rounded-xl"
                      />
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        <p className="font-medium">{tripDurationDays} дней</p>
                        <p className="text-xs mt-1">Точные даты не указаны</p>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* ===== MAIN CONTENT GRID ===== */}
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 pb-20 relative z-30">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 items-start mt-3 sm:mt-4">

            {/* ===== LEFT COLUMN: Timeline ===== */}
            <div className="lg:col-span-7 space-y-3 sm:space-y-4 lg:space-y-6">
              {currentDay && (
                <>
                  {/* Day title bar */}
                  <div className="flex items-center justify-between trip-glass p-3 sm:p-4 rounded-3xl shadow-lg">
                    <h3 className="text-base sm:text-xl lg:text-2xl font-bold text-slate-800 dark:text-white drop-shadow-sm">
                      День {currentDay.day}: {currentDay.title || "Продолжение приключения"}
                    </h3>
                    <button
                      onClick={() => router.push(`/dashboard?tripId=${route.id}`)}
                      className="text-xs font-bold text-white bg-sky-500 dark:bg-blue-600 hover:bg-sky-400 dark:hover:bg-blue-500 px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-full transition-all flex items-center gap-1.5 sm:gap-2 shadow-lg shadow-sky-500/30 dark:shadow-blue-600/30 border border-sky-400/20 dark:border-blue-400/50 shrink-0"
                    >
                      <span className="material-symbols-outlined text-sm">view_in_ar</span> <span className="hidden sm:inline">3D-карта</span>
                    </button>
                  </div>

                  {/* Logistics bar */}
                  {currentDay.logistics && currentDay.logistics.mode !== "None" && (
                    <div className="trip-glass rounded-2xl p-3 sm:p-4 flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-slate-600 dark:text-blue-100/80 font-medium">
                      <TransportIcon className="h-4 w-4 sm:h-5 sm:w-5 text-sky-500 dark:text-blue-400" />
                      <span className="truncate">
                        {modeTranslations[currentDay.logistics.mode] || currentDay.logistics.mode}: {currentDay.logistics.from} → {currentDay.logistics.to}
                        {currentDay.logistics.distance && ` (${currentDay.logistics.distance}`}
                        {currentDay.logistics.duration && `, ~${currentDay.logistics.duration})`}
                      </span>
                      {currentDay.logistics.price && (
                        <Badge variant="secondary" className="ml-auto text-xs">{currentDay.logistics.price}</Badge>
                      )}
                    </div>
                  )}

                  {/* Flight cards — hidden by design */}



                  {/* Hotel cards — hidden by design */}

                  {/* ===== Activity Timeline ===== */}
                  <div className="trip-timeline relative space-y-3 sm:space-y-4 lg:space-y-6 pl-0 sm:pl-2">
                    {finalDayActivities.map((activity: any, i: number) => (
                      <ActivityTimelineCard
                        key={`act-${activeDay}-${i}`}
                        activity={activity}
                        destination={destinationName}
                        dayNumber={activeDay}
                        onGenerateExtraActivity={handleGenerateExtraActivity}
                        onRequestModifyInChat={handleRequestModifyInChat}
                        isGeneratingExtra={isGeneratingExtra}
                      />
                    ))}
                  </div>

                  {/* Day tips */}
                  {currentDay.tips && (
                    <div className="trip-glass rounded-2xl p-4 flex gap-3 text-sm text-amber-900 dark:text-amber-200 bg-amber-50/50 dark:!bg-amber-900/20 !border-amber-200/50 dark:!border-amber-900/30">
                      <Compass className="h-5 w-5 text-amber-500 dark:text-amber-400 shrink-0" />
                      <p><strong>Совет:</strong> {currentDay.tips}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ===== RIGHT COLUMN: Sticky Sidebar ===== */}
            <div className="lg:col-span-5 space-y-3 sm:space-y-4 lg:space-y-6 lg:sticky lg:top-20">

              {/* Weather Widget - REMOVED (Moved to grid below) */}

              {/* AI Assistant Button — owner only */}
              {isOwner && <div className="hidden lg:block trip-glass rounded-[2rem] shadow-2xl relative group border-white/60 dark:border-white/10 transition-transform hover:scale-[1.02] p-4">
                <button
                  onClick={() => setIsAIChatOpen(!isAIChatOpen)}
                  className="w-full bg-white/80 dark:bg-[#0B1121]/80 backdrop-blur-xl px-5 py-4 rounded-3xl shadow-xl border border-white/50 dark:border-white/10 flex items-center justify-between group/btn hover:bg-white dark:hover:bg-[#0B1121]/90 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-500 dark:from-blue-600 dark:to-blue-600 flex items-center justify-center text-white border border-white/40 dark:border-white/20 shadow-md dark:shadow-[0_0_15px_rgba(37,99,235,0.5)]">
                      <span className="material-symbols-outlined text-lg">smart_toy</span>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-slate-800 dark:text-white group-hover/btn:text-sky-600 dark:group-hover/btn:text-blue-300 transition-colors">AI помощник</p>
                      <p className="text-[10px] text-slate-500 dark:text-gray-400 uppercase tracking-wide">вопросы и изменения</p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center group-hover/btn:bg-sky-500 dark:group-hover/btn:bg-blue-600 group-hover/btn:text-white transition-all text-slate-400 dark:text-white/70">
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </div>
                </button>
              </div>}

              {/* AI Chat Widget (toggleable on desktop) — owner only */}
              {isOwner && <AnimatePresence>
                {isAIChatOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden hidden lg:block"
                  >
                    <ItineraryChatWidget
                      itinerary={route}
                      tripDetails={route}
                      onItineraryUpdate={(newItinerary) => setRoute((prev: any) => ({ ...prev, itinerary: newItinerary }))}
                      onModifying={setIsModifying}
                      tripId={params.id as string}
                      embedded
                      className="trip-glass rounded-[2rem] min-h-[500px]"
                    />
                  </motion.div>
                )}
              </AnimatePresence>}

              {/* Weather + Tips Grid */}
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 gap-2 sm:gap-4">
                {/* Weather Card */}
                <CurrentWeatherWidget
                    destination={destinationName}
                    date={undefined}
                />

                {/* Tips Card */}
                <div className="trip-glass bg-gradient-to-br from-amber-100/60 dark:from-transparent to-white/60 dark:to-transparent p-3 sm:p-5 rounded-[2rem] shadow-lg flex flex-col justify-between h-28 sm:h-32 lg:h-36 hover:bg-white/80 dark:hover:bg-amber-900/30 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="bg-white/60 dark:bg-white/5 p-2.5 rounded-2xl shadow-sm dark:shadow-inner backdrop-blur-md border border-white/40 dark:border-white/5">
                      <span className="material-symbols-outlined text-amber-500 dark:text-amber-300">lightbulb</span>
                    </div>
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-200/70 uppercase tracking-wide">Советы</span>
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-800 dark:text-white line-clamp-2 leading-tight drop-shadow-sm">
                      {currentDay?.tips || "Важная информация по маршруту"}
                    </span>
                    <button
                      onClick={() => setShowTipsModal(true)}
                      className="text-[10px] font-bold text-amber-600 dark:text-amber-300 hover:text-amber-800 dark:hover:text-white mt-1 block uppercase tracking-wide transition-colors"
                    >
                      Все советы
                    </button>
                  </div>
                </div>
              </div>

              {/* Accommodation Card (sidebar preview) */}
              {sidebarHotel && (
                <div className="trip-glass p-3 sm:p-6 rounded-[2rem] shadow-lg hover:shadow-xl transition-colors">
                  <h4 className="text-[10px] sm:text-xs font-bold text-sky-700 dark:text-blue-200 uppercase tracking-widest mb-3 sm:mb-4 opacity-80">Проживание</h4>
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
                        Заселение: {sidebarHotel.checkIn || "14:00"}
                      </p>
                      {sidebarHotel.cost && (
                        <p className="text-[10px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-300 mt-0.5 sm:mt-1">{sidebarHotel.cost}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 sm:mt-5 pt-3 sm:pt-4 border-t border-slate-200/60 dark:border-white/5 flex justify-between items-center">
                    <span className="px-2 sm:px-3 py-1 bg-green-100/60 dark:bg-green-500/10 text-green-700 dark:text-green-300 text-[9px] sm:text-[10px] font-bold rounded-lg backdrop-blur-sm border border-green-200/50 dark:border-green-500/20 uppercase tracking-wide shadow-sm">
                      Подтверждено
                    </span>
                    <button
                      onClick={async () => {
                        const checkInDate = tripStartDate ? addDays(tripStartDate, activeDay - 1) : undefined
                        const checkOutDate = checkInDate ? addDays(checkInDate, 1) : undefined

                        const link = sidebarHotel.bookingUrl || await getHotelSearchLink({
                             destination: sidebarHotel.city || destinationName,
                             checkIn: checkInDate,
                             checkOut: checkOutDate,
                             adults: route.travelers || 2,
                             subId: "sidebar_card"
                        })
                        window.open(link, "_blank")
                      }}
                      className="text-[10px] sm:text-xs font-bold text-white bg-sky-500 dark:bg-blue-600 hover:bg-sky-400 dark:hover:bg-blue-500 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full transition-colors shadow-lg shadow-sky-500/20 dark:shadow-blue-500/20"
                    >
                      Бронирование
                    </button>
                  </div>
                </div>
              )}

              {/* TikTok Places */}
              <TripViralCarousel spots={route.viralSpots || []} />

              {/* Important Info — hidden, accessible via Tips modal */}
            </div>
          </div>
        </div>

        {/* ===== Budget Analysis Modal ===== */}
        <Dialog open={showBudgetModal} onOpenChange={setShowBudgetModal}>
          <DialogContent className="max-w-md rounded-3xl p-8">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                <PieChart className="h-6 w-6 text-primary" />
                Аналитика бюджета
              </DialogTitle>
              <DialogDescription>
                Детальный разбор расходов на вашу поездку
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-muted/50 border border-border">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Проживание</div>
                  <div className="text-xl font-bold">{route.budgetAnalysis?.avgAccommodation || "—"}</div>
                  <div className="text-[10px] text-muted-foreground">в среднем за ночь</div>
                </div>
                <div className="p-4 rounded-2xl bg-muted/50 border border-border">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Питание</div>
                  <div className="text-xl font-bold">{route.budgetAnalysis?.avgFood || "—"}</div>
                  <div className="text-[10px] text-muted-foreground">в среднем за день</div>
                </div>
                <div className="p-4 rounded-2xl bg-muted/50 border border-border">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Транспорт</div>
                  <div className="text-xl font-bold">{route.budgetAnalysis?.avgTransport || "—"}</div>
                  <div className="text-[10px] text-muted-foreground">всего за маршрут</div>
                </div>
                <div className="p-4 rounded-2xl bg-muted/50 border border-border">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Развлечения</div>
                  <div className="text-xl font-bold">{route.budgetAnalysis?.avgActivities || "—"}</div>
                  <div className="text-[10px] text-muted-foreground">в среднем за день</div>
                </div>
                <div className="p-4 rounded-2xl bg-muted/50 border border-border col-span-2">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Прочее</div>
                  <div className="text-xl font-bold">{route.budgetAnalysis?.avgMisc || "—"}</div>
                  <div className="text-[10px] text-muted-foreground">чаевые, сувениры и т.д.</div>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-bold">Общие итоги</h4>
                <div className="flex justify-between items-center py-2 border-b border-border italic text-sm">
                  <span className="text-muted-foreground font-medium">Предполагаемый бюджет:</span>
                  <span className="font-bold">{displayBudget}</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  * Цены являются оценочными на основе средних показателей региона и выбранного стиля &quot;{route.budget_range || "Комфорт"}&quot;. Реальная стоимость может отличаться.
                </p>
              </div>
              <Button className="w-full rounded-2xl py-6 text-lg font-bold shadow-xl shadow-primary/20" onClick={() => setShowBudgetModal(false)}>
                Понятно
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ===== Tips Modal ===== */}
        <Dialog open={showTipsModal} onOpenChange={setShowTipsModal}>
          <DialogContent className="max-w-2xl rounded-3xl p-6 sm:p-8">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                <Compass className="h-6 w-6 text-amber-500" />
                Советы по маршруту
              </DialogTitle>
              <DialogDescription>
                Рекомендации по дням и важная информация по поездке.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="space-y-3">
                <h4 className="text-sm font-black uppercase tracking-widest text-amber-600 dark:text-amber-300">
                  Советы по дням
                </h4>
                {itineraryTips.length > 0 ? (
                  <div className="space-y-3">
                    {itineraryTips.map((day: any) => (
                      <div
                        key={`tip-day-${day.day}`}
                        className="trip-glass rounded-2xl p-4 text-sm text-slate-700 dark:text-blue-100/90"
                      >
                        <p className="font-bold text-slate-900 dark:text-white mb-1">День {day.day}</p>
                        <p className="leading-relaxed">{day.tips}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Советы по дням пока не добавлены.</p>
                )}
              </div>

              <div className="trip-glass rounded-2xl p-5 sm:p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
                  <Shield className="h-5 w-5 text-sky-500 dark:text-blue-400" />
                  Важная информация
                </h3>
                <div className="space-y-5">
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-500 dark:text-blue-200/70 tracking-widest mb-2">Виза</h4>
                    <p className="text-sm text-slate-600 dark:text-blue-100/80 leading-relaxed">{route.visaAdvice || "Информация о визе будет доступна после генерации"}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-500 dark:text-blue-200/70 tracking-widest mb-2">Оплата</h4>
                    <p className="text-sm text-slate-600 dark:text-blue-100/80 leading-relaxed">{route.paymentAdvice || "Информация об оплате будет доступна после генерации"}</p>
                  </div>
                  {route.restrictions && (
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-500 dark:text-blue-200/70 tracking-widest mb-2">Ограничения</h4>
                      <p className="text-sm text-slate-600 dark:text-blue-100/80 leading-relaxed">{route.restrictions}</p>
                    </div>
                  )}
                  {route.safetyInfo && (
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-500 dark:text-blue-200/70 tracking-widest mb-2">Безопасность</h4>
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
                      <p className="text-sm text-slate-600 dark:text-blue-100/80 leading-relaxed">{route.safetyInfo?.tips}</p>
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

        {/* ===== MOBILE FAB BUTTON (chat only) ===== */}
        <div className="lg:hidden fixed bottom-6 right-4 z-50">
          <button
            onClick={() => { setIsMobileAIChatOpen(true); setIsMapOpen(false) }}
            className="w-14 h-14 rounded-full bg-blue-600 text-white shadow-xl shadow-blue-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform border-2 border-white/20"
          >
            <MessageCircle className="w-6 h-6" />
          </button>
        </div>

        {/* ===== MOBILE MAP BOTTOM SHEET ===== */}
        <AnimatePresence>
          {isMapOpen && (
            <motion.div
              className="lg:hidden fixed inset-0 z-[60]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMapOpen(false)} />
              <motion.div
                className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl shadow-2xl overflow-hidden"
                style={{ maxHeight: "75vh" }}
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
              >
                <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <Map className="h-5 w-5 text-primary" />
                    Карта маршрута
                  </h3>
                  <button onClick={() => setIsMapOpen(false)} className="p-2 rounded-full hover:bg-muted transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="h-[60vh]">
                  <TripMap
                    places={mapPlaces}
                    activePlaceId={activeDay ? `${activeDay - 1}-0` : undefined}
                    onPlaceSelect={(placeId: string) => {
                      const [dayIdx] = placeId.split("-").map(Number)
                      setActiveDay(dayIdx + 1)
                      setIsMapOpen(false)
                    }}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== MOBILE AI CHAT BOTTOM SHEET — owner only ===== */}
        {isOwner && <AnimatePresence>
          {isMobileAIChatOpen && (
            <motion.div
              className="lg:hidden fixed inset-0 z-[60]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileAIChatOpen(false)} />
              <motion.div
                className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl shadow-2xl overflow-hidden"
                style={{ maxHeight: "85vh" }}
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
              >
                <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-blue-500" />
                    AI Ассистент
                  </h3>
                  <button onClick={() => setIsMobileAIChatOpen(false)} className="p-2 rounded-full hover:bg-muted transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="h-[75vh] overflow-y-auto">
                  <ItineraryChatWidget
                    itinerary={route}
                    tripDetails={route}
                    onItineraryUpdate={(newItinerary) => setRoute((prev: any) => ({ ...prev, itinerary: newItinerary }))}
                    onModifying={setIsModifying}
                    tripId={params.id as string}
                    embedded
                    className="h-full"
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>}

        {/* ===== DESKTOP MAP MODAL ===== */}
        <AnimatePresence>
          {isMapOpen && (
            <motion.div
              className="hidden lg:flex fixed inset-0 z-50 items-center justify-center p-4 sm:p-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setIsMapOpen(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
              <motion.div
                className="relative w-full max-w-4xl h-[50vh] sm:h-[60vh] lg:h-[70vh] bg-card rounded-3xl overflow-hidden shadow-2xl border border-border/50 dark:border-white/10"
                initial={{ scale: 0.9, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 50 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
              >
                <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5 py-4 bg-gradient-to-b from-card via-card/95 to-transparent">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Карта маршрута
                  </h3>
                  <Button variant="ghost" size="icon" onClick={() => setIsMapOpen(false)} className="rounded-full hover:bg-muted h-9 w-9">
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <div className="h-full w-full">
                  {mapPlaces?.length > 0 ? (
                    <TripMap places={mapPlaces} />
                  ) : (
                    <div className="h-full flex items-center justify-center bg-muted/20">
                      <div className="text-center">
                        <MapPin className="h-12 w-12 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Нет данных о локациях</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {showScrollTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-50 h-10 w-10 rounded-full bg-primary/90 hover:bg-primary text-primary-foreground shadow-lg backdrop-blur-sm flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-xl"
            aria-label="Наверх"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
