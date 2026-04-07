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
  Menu,
  Trash2,
  AlertTriangle,
  Loader2,
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
import { motion, useScroll, useTransform } from "framer-motion"
import dynamic from "next/dynamic"
import { getPopularRoute } from "@/lib/popular-routes"
import { LottieLoader } from "@/components/ui/LottieLoader"
import { toggleFavorite } from "@/app/actions/favorites"
import { ActivityTimelineCard, getActivityColorTheme } from "@/components/trip/ActivityTimelineCard"
import { clearTripGalleryCache } from "@/components/PlaceGallery"
import { TripViralCarousel } from "@/components/trip/TripViralCarousel"
import { TripTooltips } from "@/components/trip/TripTooltips"
import { TripStatsPanel } from "@/components/trip/TripStatsPanel"
import { TripLinksPanel } from "@/components/trip/TripLinksPanel"
import { TripFeedbackDialog, TripFeedbackRecord } from "@/components/travel/TripFeedbackDialog"

import { CurrentWeatherWidget } from "@/components/trip/CurrentWeatherWidget"
import { TripWeatherWidget } from "@/components/trip/TripWeatherWidget"
import { getWeatherForLocation, getWeatherEmoji, WeatherData } from "@/lib/weather"
import { getCoordinates } from "@/lib/geocoding"
import { getFlightSearchLink, getHotelSearchLink, getIataCode, parseCityIata, getYandexOnlyHotelLink, isRussianHotelDestinationSync } from "@/lib/travelpayouts"
import { addDays } from "date-fns"
import { maybeWrapPartnerAffiliateUrl } from "@/lib/tp-media"

import { useDebouncedTripItinerarySave } from "@/lib/hooks/useDebouncedTripItinerarySave"
import { useBookingMarket } from "@/lib/hooks/useBookingMarket"

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
  const tc = useTranslations('common')
  const locale = useLocale()
  const bookingMarket = useBookingMarket()

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
  const [tripInfoMenuOpen, setTripInfoMenuOpen] = useState(false)
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

  const [isOwner, setIsOwner] = useState(false)
  const [activeView, setActiveView] = useState<"itinerary" | "stats">("itinerary")
  const [isFavorite, setIsFavorite] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [isGeneratingExtra, setIsGeneratingExtra] = useState(false)
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false)
  const [tripFeedback, setTripFeedback] = useState<TripFeedbackRecord | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [tripWeather, setTripWeather] = useState<WeatherData[]>([])
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

  // Add currency symbol to raw AI-generated budget values (e.g. "1200" → "$1200")
  const formatBudgetValue = (val: string | number | undefined | null): string | null => {
    if (!val && val !== 0) return null
    const s = String(val).trim()
    if (!s || s === "—") return s
    const hasCurrency = /[$₽€£¥]/.test(s)
    if (hasCurrency) return s
    return locale === "en" ? `$${s}` : `${s} ₽`
  }

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
    if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return
    ;(async () => {
      try {
        const coords = await getCoordinates(dest)
        if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) return
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

            if (tripOwner) {
              fetch(`/api/trip-feedback?tripId=${data.id}`)
                .then((r) => r.json())
                .then((payload) => { if (payload?.feedback) setTripFeedback(payload.feedback) })
                .catch(() => {})
            }
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
        <div className={`relative z-10 min-w-0 transition-[margin] duration-300 ${isSidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-64"}`}>
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
      const hotelAct = day?.activities?.find((a: any) => {
        if (a.type === "hotel") return true
        // If LLM failed to provide type, try to infer from title, but strictly exclude other known types
        if (!a.type || a.type === "activity") {
          return /заселение|отель|hotel|check.?in/i.test(a.title || "")
        }
        return false
      })
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
    bookingUrl: hotelActivityForDay.bookingUrl || apiHotel?.bookingUrl || hotelActivityForDay.link,
    desc: hotelActivityForDay.desc,
    city: destinationName,
  } : apiHotel
    ? { ...apiHotel, city: (apiHotel as { city?: string }).city || destinationName }
    : null

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
          subId: "timeline_btn",
          market: bookingMarket,
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
          subId: "logistics_day",
          market: bookingMarket,
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
        subId: "timeline_btn_synthetic",
        market: bookingMarket,
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
          subId: "logistics_synthetic",
          market: bookingMarket,
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

  const handleDeleteTrip = async () => {
    if (!route?.id || !isOwner) return
    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', route.id)
      if (error) {
        toast.error(t('deleteError'))
        return
      }
      toast.success(t('deleteSuccess'))
      router.push('/trips')
    } catch {
      toast.error(t('deleteError'))
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
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

  const showReadOnlyBanner = !isOwner && !loading && !!route?.id

  // ============== RENDER ==============
  return (
    <div className="min-h-screen trip-bg relative">
      {/* ── Delete Confirm Dialog ── */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isDeleting && setShowDeleteDialog(false)} />
          <div className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl p-6 shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/15 border border-red-500/20">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-foreground">{t("deleteConfirmTitle")}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{tc("noUndo") || "This action cannot be undone"}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              {t("deleteConfirmBody", { title: route.title })}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteDialog(false)}
                disabled={isDeleting}
                className="flex-1 h-11 rounded-2xl border border-white/15 bg-white/5 text-sm font-semibold text-muted-foreground hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                {tc("cancel")}
              </button>
              <button
                type="button"
                onClick={handleDeleteTrip}
                disabled={isDeleting}
                className="flex-1 h-11 rounded-2xl bg-red-500 text-sm font-bold text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> {t("deleting")}</>
                ) : (
                  <><Trash2 className="h-4 w-4" /> {tc("delete")}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      <AppSidebar />
      <TripTooltips userId={user?.id} />
      {isOwner && (
        <TripFeedbackDialog
          open={showFeedbackDialog}
          onOpenChange={setShowFeedbackDialog}
          tripId={route?.id ?? ""}
          tripTitle={route?.title}
          source="profile"
          initialFeedback={tripFeedback}
          onSubmitted={(fb) => setTripFeedback(fb)}
        />
      )}

      {/* Read-only banner for non-owners viewing someone else's public trip */}
      {showReadOnlyBanner && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-sky-600/95 backdrop-blur-sm text-white text-sm px-4 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top,0px))] flex items-center justify-center gap-2 shadow-lg">
          <Eye className="w-4 h-4 flex-shrink-0" />
          <span>{t('readOnlyBanner')}</span>
          {!user && (
            <a href={`/auth?next=/trip/${route.id}`} className="ml-2 underline font-medium hover:text-sky-200">{t('signIn')}</a>
          )}
        </div>
      )}

      <div className={`relative z-10 min-w-0 transition-[margin] duration-300 ${isSidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-64"}`}>
        {/* ===== HERO IMAGE SECTION ===== */}
        <div className="relative w-full min-h-[min(68dvh,520px)] sm:min-h-[500px] md:min-h-[600px] shrink-0 overflow-hidden">
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

          {/* ===== Floating Header Bar ===== */}
          <div
            className="absolute z-50 left-2 right-2 sm:left-8 sm:right-8"
            style={{ top: "calc(0.75rem + env(safe-area-inset-top, 0px))" }}
          >
            <div className="trip-glass-header rounded-2xl md:rounded-full px-2.5 sm:px-6 py-2 sm:py-4 flex items-center justify-between gap-2 shadow-md md:shadow-2xl backdrop-blur-md md:backdrop-blur-xl bg-black/20 border-white/10 border">
              {/* Mobile: back + menu + actions */}
              <div className="flex md:hidden items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex h-11 w-11 flex-shrink-0 touch-manipulation items-center justify-center rounded-full border border-white/50 bg-white/40 text-slate-700 backdrop-blur-md transition-colors hover:bg-white/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/15 sm:h-10 sm:w-10"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTripInfoMenuOpen(true)}
                  className="flex h-11 w-11 flex-shrink-0 touch-manipulation items-center justify-center rounded-full border border-white/40 bg-white/25 text-slate-800 backdrop-blur-md transition-colors hover:bg-white/40 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 sm:h-10 sm:w-10"
                  aria-label={t("tripAboutMenuAria")}
                >
                  <Menu className="h-5 w-5" strokeWidth={2.25} />
                </button>
              </div>

              {/* Desktop: title + meta */}
              <div className="hidden md:flex items-center gap-4 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex h-10 w-10 flex-shrink-0 touch-manipulation items-center justify-center rounded-full border border-white/50 bg-white/40 text-slate-700 backdrop-blur-md transition-colors hover:bg-white/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/15"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                </button>
                <div className="min-w-0 flex flex-col justify-center flex-1">
                  <h1 className="text-lg lg:text-xl font-black text-white tracking-tight line-clamp-2 drop-shadow-md pr-2 uppercase italic leading-tight">
                    {route.title}
                  </h1>
                  <div className="flex items-center gap-3 lg:gap-4 mt-1.5 overflow-hidden flex-wrap">
                    <div className="flex items-center text-xs text-white/80 gap-3 font-bold shrink-0">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm opacity-70">calendar_month</span>
                        {formatDateRange(tripStartDate, tripEndDate, locale) || t("noDates", { days: tripDurationDays })}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm opacity-70">person</span>
                        {t("travelersMeta", { count: route.travelers || 2 })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 overflow-hidden flex-wrap">
                      <div className="w-px h-3 bg-white/20 mx-1 hidden sm:block" />
                      {route.tags?.slice(0, 3).map((tag: string, idx: number) => {
                        const cfg = getTagConfig(tag)
                        return (
                          <span
                            key={idx}
                            className={cn(
                              "px-2.5 py-1 rounded-lg border text-[11px] font-black uppercase tracking-tight whitespace-nowrap shadow-lg backdrop-blur-md",
                              cfg.color
                                .replace("bg-sky-100/80", "bg-sky-500/20")
                                .replace("text-sky-700", "text-sky-200"),
                            )}
                          >
                            {tag.replace("#", "")}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0 md:gap-4">
                <button
                  type="button"
                  onClick={() => setShowBudgetModal(true)}
                  className="group flex touch-manipulation flex-col items-end text-right"
                >
                  <p className="hidden sm:block text-[10px] sm:text-xs text-white/70 font-medium uppercase tracking-wide leading-none mb-0.5">
                    {t("totalBudgetLabel")}
                  </p>
                  <p className="text-sm sm:text-xl font-black text-white group-hover:text-sky-300 transition-colors bg-white/20 sm:bg-transparent px-3 py-1.5 sm:p-0 rounded-full sm:rounded-none backdrop-blur-md sm:backdrop-blur-none border border-white/30 sm:border-none whitespace-nowrap">
                    {displayBudget}
                  </p>
                </button>
                <div className="hidden sm:block h-8 sm:h-10 w-px bg-white/20" />
                <div className="flex items-center gap-1 sm:gap-3">
                  {isOwner && (
                    <button
                      type="button"
                      onClick={handleTogglePublic}
                      title={route.is_public ? t("publicTitle") : t("privateTitle")}
                      className={cn(
                        "hidden touch-manipulation sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all backdrop-blur-md",
                        route.is_public
                          ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/30"
                          : "bg-white/10 border-white/20 text-white/70 hover:bg-white/20",
                      )}
                    >
                      {route.is_public ? (
                        <>
                          <Globe className="w-3.5 h-3.5" /> {t("publicTrip")}
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" /> {t("privateTrip")}
                        </>
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex h-11 w-11 touch-manipulation items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 sm:h-10 sm:w-10"
                  >
                    <span className="material-symbols-outlined text-lg sm:text-xl">share</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleFavorite}
                    disabled={favoriteLoading}
                    className="flex h-11 w-11 touch-manipulation items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 disabled:opacity-60 sm:h-10 sm:w-10"
                  >
                    <Heart
                      className={cn(
                        "h-4 w-4 sm:h-5 sm:w-5 transition-all duration-300",
                        isFavorite ? "fill-rose-500 text-rose-500" : "",
                      )}
                    />
                  </button>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => setShowDeleteDialog(true)}
                      title="Удалить маршрут"
                      className="flex h-11 w-11 touch-manipulation items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-red-400 backdrop-blur-md transition-all hover:bg-red-500/25 hover:border-red-500/50 sm:h-10 sm:w-10"
                    >
                      <Trash2 className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ===== Bottom Overlay (title + description) =====
              Mobile: clamp top so text never sits under the floating header (safe area + bar + gap). */}
          <div
            className={cn(
              "absolute z-30 left-3 right-3 sm:left-8 sm:right-8 flex gap-2 sm:gap-4 md:gap-3 lg:gap-4",
              /* Mobile: start below floating header so title isn’t clipped; scroll if needed */
              "flex-col max-md:top-0 max-md:justify-start max-md:items-stretch",
              "max-md:pt-[calc(env(safe-area-inset-top,0px)+8.25rem)] max-md:overflow-y-auto max-md:overscroll-contain max-md:[scrollbar-width:thin]",
              /* Desktop: band between header + gap and hero bottom so long titles don’t sit under the glass bar */
              "md:top-[calc(env(safe-area-inset-top,0px)+7rem)] md:bottom-6 lg:top-[calc(env(safe-area-inset-top,0px)+7.25rem)] lg:bottom-12",
              "md:flex-row md:justify-between md:items-end",
              "max-md:bottom-6 max-md:pb-3",
            )}
          >
            <div className="w-full min-w-0 max-w-3xl md:flex-1 md:max-w-none md:pr-1 lg:pr-2">
              {/* Safety score & completed status */}
              <div className="flex items-center gap-2 mb-3 md:mb-4">
                {route.safetyInfo?.rating && (
                  <span className="whitespace-nowrap px-3 py-1.5 bg-emerald-500/20 text-emerald-300 backdrop-blur-md text-xs font-bold rounded-full border border-emerald-500/30 flex items-center gap-1 shadow-sm">
                    <Shield className="w-3.5 h-3.5 shrink-0 text-emerald-200" strokeWidth={2.25} aria-hidden />
                    {route.safetyInfo.rating}/10
                  </span>
                )}
                {route.status === 'completed' && (
                  <button type="button" onClick={() => setActiveView("stats")} className="touch-manipulation text-left">
                    <span className="flex cursor-pointer items-center gap-1.5 rounded-full border border-blue-400/50 bg-blue-500/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm backdrop-blur-md transition-colors hover:bg-white/20">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {t('completed')}
                    </span>
                  </button>
                )}
              </div>

              <div className="flex md:hidden flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-white/90 mb-2">
                <span className="flex items-center gap-1 min-w-0">
                  <span className="material-symbols-outlined text-[14px] opacity-80 shrink-0">calendar_month</span>
                  <span className="truncate">
                    {formatDateRange(tripStartDate, tripEndDate, locale) || t("noDates", { days: tripDurationDays })}
                  </span>
                </span>
                <span className="flex items-center gap-1 shrink-0">
                  <span className="material-symbols-outlined text-[14px] opacity-80">person</span>
                  {t("travelersMeta", { count: route.travelers || 2 })}
                </span>
              </div>

              {/* Big Title — full lines on mobile when overlay scrolls; no top clipping */}
              <h2 className="text-2xl sm:text-4xl lg:text-6xl font-extrabold text-white mb-2 sm:mb-3 tracking-tight leading-[1.2] sm:leading-tight">
                {route.title}
              </h2>

              {/* Description — subtle */}
              {route.description && (
                <p className="text-white/70 max-w-2xl text-xs sm:text-base font-medium leading-relaxed line-clamp-3 sm:line-clamp-2">
                  {route.description}
                </p>
              )}

              {/* Hero actions: mobile = «Цены» сверху на всю ширину, снизу погода + советы; md+ = пиллы + отдельная CTA */}
              <div className="mt-2 sm:mt-3 flex w-full flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-2">
                <button
                  type="button"
                  onClick={() => setShowLinksModal(true)}
                  className="group relative flex min-h-12 w-full shrink-0 touch-manipulation flex-row items-center justify-center gap-3 overflow-hidden rounded-full border border-white/25 px-5 py-3 shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] md:hidden"
                  style={{
                    background: "linear-gradient(135deg, rgba(56,189,248,0.50) 0%, rgba(99,102,241,0.55) 100%)",
                    backdropFilter: "blur(20px)",
                    boxShadow: "0 8px 32px rgba(56,189,248,0.28), inset 0 1px 0 rgba(255,255,255,0.20)",
                  }}
                >
                  <ExternalLink className="text-white shrink-0" style={{ width: 18, height: 18 }} />
                  <div className="flex min-w-0 flex-col items-start text-left">
                    <span className="text-[12px] font-black uppercase leading-tight tracking-widest text-white">
                      {t("checkPrices")}
                    </span>
                    <span className="text-[10px] font-medium leading-tight text-white/70">{t("ticketsHotelsMap")}</span>
                  </div>
                </button>

                <div className="flex w-full flex-row gap-2 md:flex md:flex-row md:flex-wrap md:gap-2 md:[&>button]:w-auto">
                  {currentDayWeather && (
                    <button
                      type="button"
                      onClick={() => setShowWeatherModal(true)}
                      className="flex flex-1 min-h-10 touch-manipulation items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/12 px-3 py-2 text-[11px] font-bold text-white shadow-sm backdrop-blur-md hover:bg-white/20 transition-colors md:flex-none md:min-h-0 md:w-auto md:justify-start md:gap-1.5 md:px-3 md:py-1.5 md:text-xs"
                    >
                      <span className="shrink-0 text-base leading-none">{getWeatherEmoji(currentDayWeather.weatherCode)}</span>
                      <span className="whitespace-nowrap">{Math.round(currentDayWeather.minTemp)}–{Math.round(currentDayWeather.maxTemp)}°C</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowTipsModal(true)}
                    className="flex flex-1 min-h-10 touch-manipulation items-center justify-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-2 text-[11px] font-bold text-amber-200 shadow-sm backdrop-blur-md hover:bg-amber-500/25 transition-colors md:flex-none md:min-h-0 md:w-auto md:justify-start md:gap-1.5 md:px-3 md:py-1.5 md:text-xs"
                  >
                    <span className="material-symbols-outlined shrink-0 text-base leading-none">lightbulb</span>
                    <span className="whitespace-nowrap">{t("routeTips")}</span>
                  </button>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => setShowFeedbackDialog(true)}
                      className="flex flex-1 min-h-10 touch-manipulation items-center justify-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/15 px-3 py-2 text-[11px] font-bold text-violet-200 shadow-sm backdrop-blur-md hover:bg-violet-500/25 transition-colors md:flex-none md:min-h-0 md:w-auto md:justify-start md:gap-1.5 md:px-3 md:py-1.5 md:text-xs"
                    >
                      <Star className={cn("shrink-0 w-3.5 h-3.5", tripFeedback ? "fill-violet-300 text-violet-300" : "")} />
                      <span className="whitespace-nowrap">{tripFeedback ? `${tripFeedback.rating}/5` : t("rateTrip")}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Links button — desktop / lg only (на мобилке кнопка внутри колонки выше) */}
            <button
              type="button"
              onClick={() => setShowLinksModal(true)}
              className="group relative hidden shrink-0 touch-manipulation items-center gap-2 overflow-hidden rounded-2xl px-5 py-3 transition-all duration-200 hover:scale-105 md:flex sm:gap-3"
              style={{
                background: "linear-gradient(135deg, rgba(56,189,248,0.22) 0%, rgba(99,102,241,0.28) 100%)",
                border: "1px solid rgba(255,255,255,0.18)",
                backdropFilter: "blur(16px)",
                boxShadow: "0 8px 32px rgba(56,189,248,0.20), inset 0 1px 0 rgba(255,255,255,0.15)",
              }}
            >
              <div
                className="pointer-events-none absolute -top-4 -right-6 h-20 w-20 rounded-full opacity-50"
                style={{ background: "radial-gradient(circle, rgba(56,189,248,0.5) 0%, transparent 70%)" }}
              />
              <div
                className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10"
                style={{ background: "rgba(56,189,248,0.20)", border: "1px solid rgba(56,189,248,0.35)" }}
              >
                <ExternalLink className="text-sky-300" style={{ width: 18, height: 18 }} />
              </div>
              <div className="relative flex flex-col items-start">
                <span className="text-[11px] font-black uppercase leading-tight tracking-wider text-white/90">
                  {t("checkPrices")}
                </span>
                <span className="text-[9px] font-medium text-white/50">{t("ticketsHotelsMap")}</span>
              </div>
            </button>

          </div>
        </div>

        {/* ===== STICKY DAY TABS ===== */}
        <div
          className={cn(
            "sticky z-40 px-2 py-3 sm:px-4 lg:px-8",
            showReadOnlyBanner ? "top-10" : "top-0"
          )}
        >
          <div className="trip-glass mx-auto flex max-w-7xl items-center gap-1 rounded-full p-1.5 shadow-md sm:p-2 md:shadow-2xl">
            {/* Left arrow */}
            {tripDurationDays > 1 && (
              <button
                type="button"
                onClick={() => setActiveDay(Math.max(1, activeDay - 1))}
                className="flex h-10 w-10 flex-shrink-0 touch-manipulation items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-white/50 dark:text-white/60 dark:hover:bg-white/10 sm:h-9 sm:w-9"
              >
                <span className="material-symbols-outlined text-lg">chevron_left</span>
              </button>
            )}
            <div className="relative flex-1 overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white/20 dark:from-black/20 to-transparent pointer-events-none z-10 rounded-r-full" />
            <div className="flex space-x-1 overflow-x-auto px-1 [-webkit-overflow-scrolling:touch] no-scrollbar">
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
                    type="button"
                    key={day.day}
                    ref={(el) => { if (dayRefs.current) dayRefs.current[day.day] = el }}
                    onClick={() => setActiveDay(day.day)}
                    className={cn(
                      "relative flex min-h-10 flex-shrink-0 touch-manipulation flex-col items-center rounded-full border transition-all sm:min-h-0",
                      isCompact ? "min-w-[56px] px-3 py-1.5" : "min-w-[76px] px-3 py-2 sm:min-w-[100px] sm:px-6 sm:py-3",
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
                type="button"
                onClick={() => setActiveDay(Math.min(tripDurationDays, activeDay + 1))}
                className="flex h-10 w-10 flex-shrink-0 touch-manipulation items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-white/50 dark:text-white/60 dark:hover:bg-white/10 sm:h-9 sm:w-9"
              >
                <span className="material-symbols-outlined text-lg">chevron_right</span>
              </button>
            )}
            {/* Stats tab */}
            <div className="flex border-l border-slate-300/40 dark:border-white/10 pl-2 ml-1 shrink-0">
              <button
                type="button"
                onClick={() => setActiveView(v => v === "stats" ? "itinerary" : "stats")}
                className={cn(
                  "flex min-h-10 touch-manipulation items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition-all sm:min-h-0",
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
        <div
          className={cn(
            "relative z-30 mx-auto max-w-7xl px-3 pb-28 sm:px-4 sm:pb-20 lg:px-8",
            activeView === "stats" && "hidden"
          )}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 items-start mt-3 sm:mt-4">

            {/* ===== LEFT COLUMN: Timeline ===== */}
            <div className="lg:col-span-7 space-y-3 sm:space-y-4 lg:space-y-6">
              {currentDay && (
                <>
                  {/* Day title bar */}
                  <div className="flex items-center justify-between trip-glass p-3 sm:p-4 rounded-3xl shadow-lg">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <h3 className="text-sm sm:text-xl lg:text-2xl font-bold text-slate-800 dark:text-white drop-shadow-sm line-clamp-2 sm:line-clamp-2 md:truncate break-words">
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
                        activityIndex={i}
                        bookingMarket={bookingMarket}
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
                  <div className="mt-3 sm:mt-5 pt-3 sm:pt-4 border-t border-slate-200/60 dark:border-white/5 flex flex-col gap-2 relative">
                    <div className="flex justify-between items-center">
                      <span className="px-2 sm:px-3 py-1 bg-green-100/60 dark:bg-green-500/10 text-green-700 dark:text-green-300 text-[9px] sm:text-[10px] font-bold rounded-lg backdrop-blur-sm border border-green-200/50 dark:border-green-500/20 uppercase tracking-wide shadow-sm">
                        {t('confirmed')}
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          // Priority: 1. bookingUrl from AI, 2. link from AI, 3. Generated search link
                          const directUrl = sidebarHotel.bookingUrl || sidebarHotel.link
                          if (directUrl && directUrl.startsWith("http") && !directUrl.includes("google.com/maps")) {
                            window.open(maybeWrapPartnerAffiliateUrl(directUrl, { market: bookingMarket }), "_blank")
                            return
                          }

                          const destCity = (sidebarHotel as { city?: string }).city || destinationName
                          try {
                            const url = await getHotelSearchLink({
                              destination: destCity || "Москва",
                              hotelName: sidebarHotel.title,
                              checkIn: route.start_date || undefined,
                              checkOut: route.end_date || undefined,
                              adults: route.travelers || 2,
                              market: bookingMarket,
                            })
                            window.open(url, "_blank")
                          } catch {
                            const m = process.env.NEXT_PUBLIC_TRAVELPAYOUTS_MARKER || ""
                            const p = new URLSearchParams()
                            if (m) p.set("marker", m)
                            window.open(`https://travel.yandex.ru/hotels/?${p.toString()}`, "_blank")
                          }
                        }}
                        className="min-h-9 touch-manipulation rounded-full bg-sky-500 px-3 py-1.5 text-[10px] font-bold text-white shadow-lg shadow-sky-500/20 transition-colors hover:bg-sky-400 dark:bg-blue-600 dark:shadow-blue-500/20 dark:hover:bg-blue-500 sm:min-h-0 sm:px-4 sm:py-2 sm:text-xs"
                      >
                        {t('bookNow')}
                      </button>
                    </div>

                    {/* Fallback to Yandex if user is RU but destination is potentially international */}
                    {bookingMarket === "ru" && !isRussianHotelDestinationSync((sidebarHotel as { city?: string }).city || destinationName) && (
                      <div className="flex justify-end mt-1">
                        <button
                          type="button"
                          className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-300 transition-colors underline underline-offset-2"
                          onClick={async () => {
                            // Similar priority for "fallback" Yandex link
                            if (sidebarHotel.bookingUrl?.includes("travel.yandex.ru")) {
                               window.open(maybeWrapPartnerAffiliateUrl(sidebarHotel.bookingUrl, { market: bookingMarket }), "_blank")
                               return
                            }

                            const destCity = (sidebarHotel as { city?: string }).city || destinationName
                            try {
                              const yandexUrl = await getYandexOnlyHotelLink({
                                destination: destCity || "Москва",
                                hotelName: sidebarHotel.title,
                                checkIn: route.start_date || undefined,
                                checkOut: route.end_date || undefined,
                                adults: route.travelers || 2,
                              })
                              window.open(yandexUrl, "_blank")
                            } catch {
                              window.open("https://travel.yandex.ru/hotels/", "_blank")
                            }
                          }}
                        >
                          Нет мест? Искать на Яндекс.Путешествиях
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TikTok Places */}
              <TripViralCarousel spots={route.viralSpots || []} destination={destinationName} />

              {/* Important Info — hidden, accessible via Tips modal */}
            </div>
          </div>
        </div>

        {/* ===== Mobile: trip details (burger) ===== */}
        <Dialog open={tripInfoMenuOpen} onOpenChange={setTripInfoMenuOpen}>
          <DialogContent className="z-[10050] w-[calc(100vw-1.25rem)] max-w-md max-h-[min(88dvh,100svh)] overflow-y-auto rounded-2xl gap-3">
            <DialogHeader>
              <DialogTitle className="text-left text-lg pr-8">{t("tripAboutTitle")}</DialogTitle>
            </DialogHeader>
            <p className="text-base font-semibold text-foreground leading-snug -mt-1">{route.title}</p>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2 text-muted-foreground">
                <span className="material-symbols-outlined text-lg shrink-0">calendar_month</span>
                <span>{formatDateRange(tripStartDate, tripEndDate, locale) || t("noDates", { days: tripDurationDays })}</span>
              </div>
              <div className="flex items-start gap-2 text-muted-foreground">
                <span className="material-symbols-outlined text-lg shrink-0">person</span>
                <span>{t("travelersMeta", { count: route.travelers || 2 })}</span>
              </div>
              {route.tags && route.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {route.tags.map((tag: string, idx: number) => {
                    const cfg = getTagConfig(tag)
                    return (
                      <span
                        key={idx}
                        className={cn(
                          "px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase",
                          cfg.color,
                        )}
                      >
                        {tag.replace("#", "")}
                      </span>
                    )
                  })}
                </div>
              )}
              {isOwner && (
                <button
                  type="button"
                  onClick={() => {
                    handleTogglePublic()
                    setTripInfoMenuOpen(false)
                  }}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all",
                    route.is_public
                      ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-700 dark:text-emerald-200"
                      : "bg-muted/50 border-border text-foreground",
                  )}
                >
                  {route.is_public ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  {route.is_public ? t("publicTrip") : t("privateTrip")}
                </button>
              )}
              <Button
                type="button"
                variant="secondary"
                className="w-full rounded-xl"
                onClick={() => {
                  setTripInfoMenuOpen(false)
                  setShowBudgetModal(true)
                }}
              >
                {t("totalBudgetLabel")}: {displayBudget}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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
                    <div className="text-lg sm:text-xl font-bold break-words">{formatBudgetValue(route.budgetAnalysis?.avgAccommodation) || "—"}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">{t('budget_modal.accommodationPer')}</div>
                  </div>
                </div>
                <div className="p-3 sm:p-4 rounded-2xl bg-muted/50 border border-border flex flex-col justify-between min-h-[80px]">
                  <div className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 break-words">{t('budget_modal.food')}</div>
                  <div>
                    <div className="text-lg sm:text-xl font-bold break-words">{formatBudgetValue(route.budgetAnalysis?.avgFood) || "—"}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">{t('budget_modal.foodPer')}</div>
                  </div>
                </div>
                <div className="p-3 sm:p-4 rounded-2xl bg-muted/50 border border-border flex flex-col justify-between min-h-[80px]">
                  <div className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 break-words">{t('budget_modal.transport')}</div>
                  <div>
                    <div className="text-lg sm:text-xl font-bold break-words">{formatBudgetValue(route.budgetAnalysis?.avgTransport) || "—"}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">{t('budget_modal.transportPer')}</div>
                  </div>
                </div>
                <div className="p-3 sm:p-4 rounded-2xl bg-muted/50 border border-border flex flex-col justify-between min-h-[80px]">
                  <div className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 break-words">{t('budget_modal.activities')}</div>
                  <div>
                    <div className="text-lg sm:text-xl font-bold break-words">{formatBudgetValue(route.budgetAnalysis?.avgActivities) || "—"}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">{t('budget_modal.activitiesPer')}</div>
                  </div>
                </div>
                <div className="p-3 sm:p-4 rounded-2xl bg-muted/50 border border-border col-span-2 flex flex-col justify-between">
                  <div className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 break-words">{t('budget_modal.misc')}</div>
                  <div>
                    <div className="text-lg sm:text-xl font-bold break-words">{formatBudgetValue(route.budgetAnalysis?.avgMisc) || "—"}</div>
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

      </div>
    </div>
  )
}
