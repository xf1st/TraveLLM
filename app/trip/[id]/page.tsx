"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { Header } from "@/components/header"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Calendar,
  Clock,
  Compass,
  Download,
  Hotel as HotelIcon,
  Map,
  MapPin,
  Shield,
  Star,
  Utensils,
  Wallet,
  Zap,
  ChevronRight,
  ExternalLink,
  Sparkles,
  PieChart,
  Plane,
  Car,
  Train,
  Umbrella,
  ShoppingBag,
  Waves,
  Mountain,
  Ticket,
  Building,
  ArrowRight,
  MessageCircle,
  UserPlus,
  Loader2,
  CheckCircle2,
  Camera,
  Music,
  Tent,
  TreeDeciduous,
  Landmark,
  Palmtree,
  Printer,
  PenLine,
  Navigation,
  Globe,
  Layout,
  Users
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import Image from "next/image"
import Link from "next/link"
import { MeshGradient } from "@paper-design/shaders-react"
import { TripImage } from "@/components/TripImage"
import { FlightCard } from "@/components/itinerary/FlightCard"
import { HotelCard } from "@/components/itinerary/HotelCard"
import { ItineraryChatWidget } from "@/components/ItineraryChatWidget"
import { PlaceGallery } from "@/components/PlaceGallery"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Footer } from "@/components/footer"
import GradientText from "@/components/GradientText"
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion"
import dynamic from "next/dynamic"
import { TripChat } from "@/components/TripChat"
import { getPopularRoute } from "@/lib/popular-routes"
import { LottieLoader } from "@/components/ui/LottieLoader"

const LightRays = dynamic(() => import('@/components/LightRays'), { ssr: false })

// Dynamic import for TripMap to avoid SSR issues with Leaflet
const TripMap = dynamic(
  () => import('@/components/TripMap'),
  {
    ssr: false,
    loading: () => <div className="h-[300px] bg-muted/20 rounded-xl animate-pulse flex items-center justify-center"><MapPin className="h-8 w-8 text-muted-foreground/30 animate-bounce" /></div>
  }
)

const transportIcons: Record<string, any> = {
  "Flight": Plane,
  "Plane": Plane,
  "Train": Train,
  "Taxi": Car,
  "Transfer": Car,
  "Car": Car,
  "Walk": Compass,
  "None": Zap
}

const modeTranslations: Record<string, string> = {
  "Flight": "Перелет",
  "Plane": "Перелет",
  "Train": "Поезд",
  "Taxi": "Такси",
  "Transfer": "Трансфер",
  "Car": "Автомобиль",
  "Walk": "Пешком",
  "None": "Нет"
}

// Russian translations for travel preferences
const styleTranslations: Record<string, string> = {
  "nature": "Природа",
  "culture": "Культура",
  "urban": "Городской",
  "adventure": "Приключения",
  "relaxation": "Релакс",
  "luxury": "Люкс",
  "budget": "Бюджет",
  "events": "Мероприятия",
  "culinary": "Гастрономия",
  "active": "Активный",
  "romantic": "Романтик",
  "beach": "Пляжный"
}

const paceTranslations: Record<string, string> = {
  "slow": "Спокойный",
  "moderate": "Умеренный",
  "fast": "Насыщенный"
}

const companionsTranslations: Record<string, string> = {
  "solo": "Один",
  "couple": "Вдвоём",
  "family": "Семья",
  "friends": "С друзьями",
  "business": "Деловая"
}

const tagColors: Record<string, string> = {
  "пляж": "bg-sky-100/80 text-sky-700 border-none dark:bg-sky-500/20 dark:text-sky-300",
  "шопинг": "bg-pink-100/80 text-pink-700 border-none dark:bg-pink-500/20 dark:text-pink-300",
  "аквапарк": "bg-cyan-100/80 text-cyan-700 border-none dark:bg-cyan-500/20 dark:text-cyan-300",
  "горы": "bg-emerald-100/80 text-emerald-700 border-none dark:bg-emerald-500/20 dark:text-emerald-300",
  "море": "bg-blue-100/80 text-blue-700 border-none dark:bg-blue-500/20 dark:text-blue-300",
  "торговые центры": "bg-purple-100/80 text-purple-700 border-none dark:bg-purple-500/20 dark:text-purple-300",
  "природа": "bg-green-100/80 text-green-700 border-none dark:bg-green-500/20 dark:text-green-300",
  "культура": "bg-amber-100/80 text-amber-800 border-none dark:bg-amber-500/20 dark:text-amber-300",
  "развлечения": "bg-rose-100/80 text-rose-700 border-none dark:bg-rose-500/20 dark:text-rose-300",
  "мероприятия": "bg-fuchsia-100/80 text-fuchsia-700 border-none dark:bg-fuchsia-500/20 dark:text-fuchsia-300",
  "вино": "bg-violet-100/80 text-violet-700 border-none dark:bg-violet-500/20 dark:text-violet-300",
  "гастрономия": "bg-orange-100/80 text-orange-700 border-none dark:bg-orange-500/20 dark:text-orange-300",
  "еда": "bg-orange-100/80 text-orange-700 border-none dark:bg-orange-500/20 dark:text-orange-300",
  "релакс": "bg-teal-100/80 text-teal-700 border-none dark:bg-teal-500/20 dark:text-teal-300",
  "храмы": "bg-stone-100/80 text-stone-700 border-none dark:bg-stone-500/20 dark:text-stone-300",
  "история": "bg-yellow-100/80 text-yellow-800 border-none dark:bg-yellow-500/20 dark:text-yellow-300",
  "активный": "bg-lime-100/80 text-lime-700 border-none dark:bg-lime-500/20 dark:text-lime-300",
  "дайвинг": "bg-cyan-100/80 text-cyan-700 border-none dark:bg-cyan-500/20 dark:text-cyan-300",
  "уникальный": "bg-indigo-100/80 text-indigo-700 border-none dark:bg-indigo-500/20 dark:text-indigo-300",
  "premium": "bg-amber-100/80 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  "умеренный": "bg-sky-100/80 text-sky-700 border-none dark:bg-sky-500/20 dark:text-sky-300",
  "вдвоём": "bg-rose-100/80 text-rose-700 border-none dark:bg-rose-500/20 dark:text-rose-300",
  "вдвоем": "bg-rose-100/80 text-rose-700 border-none dark:bg-rose-500/20 dark:text-rose-300",
  "компания": "bg-indigo-100/80 text-indigo-700 border-none dark:bg-indigo-500/20 dark:text-indigo-300",
  "default": "bg-muted text-muted-foreground border-none dark:bg-white/10 dark:text-white/80"
}

const tagIcons: Record<string, any> = {
  "пляж": Umbrella,
  "шопинг": ShoppingBag,
  "аквапарк": Waves,
  "горы": Mountain,
  "море": Waves,
  "торговые центры": ShoppingBag,
  "природа": Mountain,
  "культура": Building,
  "развлечения": Ticket,
  "default": Sparkles
}

export default function TripDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [route, setRoute] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [expandedDay, setExpandedDay] = useState<number | null>(1)
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [isModifying, setIsModifying] = useState(false)
  const [user, setUser] = useState<any>(null)

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isMember, setIsMember] = useState(false)

  // Parallax hook
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 500], [0, 250])
  const opacity = useTransform(scrollY, [0, 400], [1, 0])
  const scale = useTransform(scrollY, [0, 500], [1, 1.1])

  // Memoized places for map
  const mapPlaces = useMemo(() => route?.itinerary?.flatMap((day: any, dayIdx: number) =>
    day.activities?.map((activity: any, actIdx: number) => ({
      id: `${dayIdx}-${actIdx}`,
      name: activity.placeName || activity.desc?.split('.')[0] || `День ${day.day}`,
      description: activity.desc,
      status: expandedDay === day.day ? 'active' : dayIdx === 0 ? 'visited' : 'pending',
      day: day.day
    })) || []
  ) || [], [route, expandedDay])

  useEffect(() => {
    const checkSidebar = () => {
      const saved = localStorage.getItem('sidebar-collapsed') === 'true'
      setIsSidebarCollapsed(saved)
    }
    checkSidebar()
    window.addEventListener('sidebar-change', checkSidebar)
    return () => window.removeEventListener('sidebar-change', checkSidebar)
  }, [])

  // Safe localStorage helper
  const safeLocalStorage = {
    getItem: (key: string): string | null => {
      try {
        return typeof window !== 'undefined' ? localStorage.getItem(key) : null
      } catch {
        return null
      }
    }
  }

  useEffect(() => {
    const fetchTrip = async () => {
      setLoading(true)
      const id = params.id as string

      // Validate ID exists
      if (!id) {
        console.error("No trip ID provided")
        setLoading(false)
        return
      }

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      const isLocal = id?.startsWith('local-')
      const isPopular = id?.startsWith('pop-')

      console.log("Fetching trip with ID:", id, "isUuid:", isUuid, "isLocal:", isLocal, "isPopular:", isPopular)

      // Single auth check
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      setUser(currentUser)

      if (isUuid && !currentUser) {
        router.push(`/auth?next=/trip/${id}`)
        return
      }

      let data = null
      let error = null

      // Handle popular routes (pop-1, pop-2, etc.)
      if (isPopular) {
        data = getPopularRoute(id)
        if (!data) {
          console.error("Popular route not found:", id)
        }
      } else if (isUuid) {
        const result = await supabase
          .from('trips')
          .select('*')
          .eq('id', id)
          .single()
        data = result.data
        error = result.error
      } else if (isLocal || id === "ai-last") {
        const key = isLocal ? `trip-${id}` : "lastGeneratedRoute"
        const stored = safeLocalStorage.getItem(key)
        if (stored) {
          try {
            data = JSON.parse(stored)
          } catch (e) {
            console.error("Failed to parse local trip data")
          }
        }
      }

      if (!data) {
        if (error) console.error("Error fetching trip:", error.message)
        const stored = safeLocalStorage.getItem("lastGeneratedRoute")
        if (stored) {
          try {
            setRoute(JSON.parse(stored))
          } catch (e) {
            console.error("Failed to parse fallback trip data")
          }
        }
      } else {
        console.log("Trip data loaded successfully")
        setRoute({
          ...data,
          title: data.title,
          description: data.description,
          totalBudget: data.total_cost || data.totalBudget,
          itinerary: data.itinerary,
          countries: data.destination ? [{ name: data.destination }] : (data.countries || []),
          // Map snake_case DB fields to camelCase for frontend
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
          viralSpots: data.viralSpots || data.viral_spots || []
        })

        // Check if member
        if (currentUser && data.id) {
          const { data: memberData } = await supabase
            .from('trip_members')
            .select('id')
            .eq('trip_id', data.id)
            .eq('user_id', currentUser.id)
            .single()
          setIsMember(!!memberData)
        }
      }
      setLoading(false)
    }
    fetchTrip()
  }, [params.id, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Purple Mesh Background for loading */}
        <div className="absolute inset-0 z-0">
          <MeshGradient
            className="w-full h-full opacity-20"
            colors={["#6366F1", "#8B5CF6", "#A78BFA", "#6366F1"]}
            speed={0.1}
          />
        </div>

        <AppSidebar />
        <div className={`relative z-10 transition-[margin] duration-300 ${isSidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-64'}`}>
          <div className="lg:hidden"><Header /></div>
          <main className="flex min-h-[80vh] items-center justify-center p-6">
            <div className="text-center space-y-6">
              {/* Airplane Lottie Animation */}
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

  if (!route) {
    return (
      <div className="min-h-screen bg-background">
        <AppSidebar />
        <div className={`transition-[margin] duration-300 ${isSidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-64'}`}>
          <div className="lg:hidden"><Header /></div>
          <main className="flex h-[60vh] items-center justify-center">
            <div className="text-center px-4">
              <h1 className="text-2xl font-bold mb-4">Маршрут не найден</h1>
              <p className="text-muted-foreground mb-8 text-balance">
                Мы не смогли найти указанный маршрут. Попробуйте создать новый или проверьте ссылку.
              </p>
              <Button onClick={() => router.push('/plan')}>Создать новый маршрут</Button>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // Generate a dynamic image URL based on destination
  const destinationName = route.countries?.[0]?.name || route.destination || "Travel"
  // Prioritize Pexels image from generation, fallback to placeholder
  const heroImage = route.coverImage || route.image || "https://upload.wikimedia.org/wikipedia/commons/c/cc/Travel_022.jpg"

  const tripDurationDays = Array.isArray(route.itinerary) ? route.itinerary.length : 0
  const tripDestinationLabel = route.destination || route.countries?.[0]?.name || destinationName

  const handleOpenMap = (searchQuery: string) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}`, "_blank")
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-transparent">
      <AppSidebar />

      {/* LightRays Background */}
      <div className="fixed inset-0 z-0 opacity-100 pointer-events-none">
        <LightRays
          raysOrigin="top-center"
          raysColor="#ffffff"
          raysSpeed={0.5}
          lightSpread={0.6}
          rayLength={4}
          followMouse={true}
          mouseInfluence={0.2}
          className="custom-rays"
          pulsating={true}
        />
      </div>

      <div className={`relative z-10 transition-[margin] duration-300 pb-20 ${isSidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-64'}`}>
        {/* Mobile Header - Floating Overlay */}
        <div className="lg:hidden"><Header floating /></div>

        {/* Hero Banner */}
        <div className="relative h-[50vh] min-h-[500px] w-full overflow-hidden lg:mt-0">
          <motion.div style={{ y, scale }} className="absolute inset-0 h-full w-full">
            <TripImage
              src={heroImage}
              query={destinationName}
              alt={route.title || destinationName}
              className="h-full w-full object-cover"
              priority
            />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-background/20 to-background" />

          <div className="absolute inset-x-0 bottom-0 p-8 pb-12 bg-gradient-to-t from-background via-background/80 to-transparent">
            <div className="container max-w-7xl px-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.back()}
                className="mb-6 rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 border-0"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Назад
              </Button>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="space-y-6"
              >
                <div className="flex flex-wrap gap-2">
                  {route.tags?.map((tag: string) => {
                    const cleanTag = tag.toLowerCase().replace('#', '').trim();
                    const matchKey = Object.keys(tagIcons).find(key => cleanTag.includes(key.toLowerCase())) || "default";
                    const colorKey = Object.keys(tagColors).find(key => cleanTag.includes(key.toLowerCase())) || "default";

                    const Icon = tagIcons[matchKey] || tagIcons["default"];
                    const colorClass = tagColors[colorKey] || tagColors["default"];

                    return (
                      <Badge key={tag} className={`${colorClass} rounded-full px-4 py-1.5 text-sm font-bold flex items-center gap-1.5 border-none shadow-sm transition-colors`}>
                        <Icon className="w-3.5 h-3.5" />
                        {tag}
                      </Badge>
                    )
                  })}
                </div>

                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground dark:text-white drop-shadow-2xl">
                  {route.title}
                </h1>

                <div className="flex flex-wrap gap-2 text-foreground/80 dark:text-white/90 font-medium text-sm md:text-lg">
                  <div className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-muted/80 dark:bg-white/5 backdrop-blur-sm border border-border/50 dark:border-white/10">
                    <Calendar className="h-4 w-4 md:h-5 md:w-5 text-sky-600 dark:text-sky-400" />
                    {route.itinerary?.length || 0} дней
                  </div>
                  <div
                    className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-muted/80 dark:bg-white/5 backdrop-blur-sm border border-border/50 dark:border-white/10 cursor-pointer hover:bg-muted dark:hover:bg-white/10 transition-colors group"
                    onClick={() => setShowBudgetModal(true)}
                  >
                    <Wallet className="h-4 w-4 md:h-5 md:w-5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span className="underline decoration-dotted underline-offset-4">{route.totalBudget}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-muted/80 dark:bg-white/5 backdrop-blur-sm border border-border/50 dark:border-white/10">
                    <Shield className="h-4 w-4 md:h-5 md:w-5 text-amber-600 dark:text-amber-400" />
                    Безопасность {route.safetyInfo?.rating || 8}/10
                  </div>


                  {/* Social Actions - Print & Share Only */}
                  <div className="flex items-center gap-1 border-l border-border/50 dark:border-white/10 pl-3 ml-2">
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted dark:hover:bg-white/10 h-8 w-8 md:h-10 md:w-10" onClick={handlePrint} title="Экспорт в PDF">
                      <Printer className="h-4 w-4 md:h-5 md:w-5 text-foreground dark:text-white" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        <main className="container max-w-7xl px-4 mt-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
            {/* Main Itinerary */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Map className="h-6 w-6 text-primary" />
                План путешествия
              </h2>

              <div className="space-y-8">
                <h3 className="text-xl font-bold flex items-center gap-2 pt-4">
                  <Calendar className="h-5 w-5 text-primary" />
                  Программа по дням
                </h3>

                <div className="space-y-4">
                  {route.itinerary?.map((day: any, idx: number) => {
                    const isExpanded = expandedDay === day.day;
                    const TransportIcon = transportIcons[day.logistics?.mode] || Zap;
                    const isFirstDay = day.day === 1;
                    const isLastDay = day.day === route.itinerary.length;
                    const logisticsIsFlightMode = day.logistics?.mode && (day.logistics.mode.toLowerCase().includes('самол') || day.logistics.mode.toLowerCase().includes('flight') || day.logistics.mode.toLowerCase().includes('plane') || day.logistics.mode.toLowerCase().includes('перелёт') || day.logistics.mode.toLowerCase().includes('перелет'));

                    // Find flights associated with this day
                    const dayFlights = route.flights?.filter((f: any) => {
                      if (f.dayNumber === day.day) return true;
                      // For outbound: show on first day or day with flight logistics
                      if (f.direction === 'outbound' && isFirstDay) return true;
                      if (f.direction === 'return' && isLastDay) return true;
                      return false;
                    }) || [];

                    // Find hotels for this day
                    const dayHotels = route.hotels?.filter((h: any) => {
                      if (h.dayStart === day.day) return true;
                      // If no dayStart, show on first day
                      if (!h.dayStart && isFirstDay) return true;
                      return false;
                    }) || [];

                    // If no explicit day assignments, show all flights on first day and all hotels on first day
                    const showAllFlights = isFirstDay && route.flights?.length > 0 && !route.flights.some((f: any) => f.dayNumber || f.direction);
                    const showAllHotels = isFirstDay && route.hotels?.length > 0 && !route.hotels.some((h: any) => h.dayStart);

                    const flightsToShow = showAllFlights ? route.flights : dayFlights;
                    const hotelsToShow = showAllHotels ? route.hotels : dayHotels;

                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        key={idx}
                      >
                        {/* Flight cards BEFORE day card (inline in timeline) */}
                        {isExpanded && flightsToShow.length > 0 && (
                          <div className="mb-4 space-y-3 animate-in slide-in-from-top duration-300">
                            <div className="flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-400 ml-1">
                              <Plane className="h-4 w-4" />
                              {isFirstDay ? 'Перелёт туда' : isLastDay ? 'Обратный перелёт' : 'Перелёт'}
                            </div>
                            {flightsToShow.map((flight: any, i: number) => (
                              <FlightCard key={`flight-${day.day}-${i}`} {...flight} />
                            ))}
                          </div>
                        )}

                        <Card className={`overflow-hidden border border-border/50 dark:border-white/10 bg-card dark:bg-white/5 backdrop-blur-md shadow-lg transition-all duration-300 ${isModifying ? 'animate-pulse blur-[2px] opacity-70 scale-[0.98]' : ''} hover:border-primary/30`}>
                          <button
                            onClick={() => setExpandedDay(isExpanded ? null : day.day)}
                            className="w-full flex items-center justify-between p-5 text-left group bg-transparent"
                          >
                            <div className="flex items-center gap-6">
                              <div className={`flex flex-col h-14 w-14 shrink-0 items-center justify-center rounded-full transition-all duration-300 border border-border/30 dark:border-white/5 ${isExpanded ? 'bg-primary/10 dark:bg-white/10' : 'bg-muted/50 dark:bg-white/5'}`}>
                                {isExpanded ? (
                                  <span className="text-xl font-black bg-gradient-to-b from-blue-400 to-red-100 bg-clip-text text-transparent">
                                    {day.day}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground dark:text-white/60 font-bold">{day.day}</span>
                                )}
                              </div>
                              <div>
                                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">День {day.day}</div>
                                <div className="font-bold text-xl md:text-2xl group-hover:text-primary transition-colors">{day.title || "Продолжение приключения"}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* Inline indicators for flights/hotels on this day */}
                              {flightsToShow.length > 0 && (
                                <Badge variant="outline" className="rounded-full border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold px-2 py-0.5">
                                  <Plane className="h-3 w-3 mr-1" /> Перелёт
                                </Badge>
                              )}
                              {hotelsToShow.length > 0 && (
                                <Badge variant="outline" className="rounded-full border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5">
                                  <HotelIcon className="h-3 w-3 mr-1" /> Отель
                                </Badge>
                              )}
                              <div className={`p-2 rounded-full bg-muted/50 dark:bg-white/5 transition-transform duration-300 ${isExpanded ? 'rotate-90 bg-primary/20 text-primary' : ''}`}>
                                <ChevronRight className="h-6 w-6 text-muted-foreground" />
                              </div>
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="px-5 pb-6 bg-transparent animate-in slide-in-from-top-2 duration-300">
                              {/* Logistics Bar */}
                              {day.logistics && (day.logistics.mode !== "None") && (
                                <div className="mb-6 flex items-center gap-4 p-3 rounded-xl bg-muted/30 border border-border/50 italic text-sm text-muted-foreground">
                                  <TransportIcon className="h-5 w-5 text-primary" />
                                  <span>
                                    {day.logistics.mode}: {day.logistics.from} → {day.logistics.to}
                                    ({day.logistics.distance}, ~{day.logistics.duration})
                                  </span>
                                  {day.logistics.price && <Badge variant="secondary" className="ml-auto">{day.logistics.price}</Badge>}
                                </div>
                              )}

                              {/* Booking Bar (Aviasales/Ostrovok) */}
                              <div className="mb-6 flex flex-wrap gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-full bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 text-[10px] font-black uppercase tracking-tighter h-8"
                                  onClick={() => {
                                    const destination = day.logistics?.to || route.destination || ""
                                    const url = day.logistics?.bookingLink || `https://www.aviasales.ru/?destination=${encodeURIComponent(destination)}`
                                    window.open(url, '_blank')
                                  }}
                                >
                                  <Plane className="mr-2 h-3.5 w-3.5" /> {day.logistics?.bookingLink?.includes('aviasales') ? 'Билеты' : 'Найти билеты'}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-full bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-black uppercase tracking-tighter h-8"
                                  onClick={() => {
                                    const destination = day.logistics?.to || route.destination || ""
                                    const url = `https://ostrovok.ru/search/?q=${encodeURIComponent(destination)}`
                                    window.open(url, '_blank')
                                  }}
                                >
                                  <HotelIcon className="mr-2 h-3.5 w-3.5" /> Отели: {day.logistics?.to || route.destination || 'Поиск'}
                                </Button>
                              </div>

                              <div className="space-y-6 pl-2 border-l-2 border-border ml-6">
                                {(day.activities || [
                                  { time: "Утро", desc: day.morning },
                                  { time: "День", desc: day.daytime },
                                  { time: "Вечер", desc: day.night }
                                ].filter(i => i.desc)).map((item: any, i: number) => {
                                  const iconMap: Record<string, any> = { "Утро": Clock, "День": Utensils, "Вечер": HotelIcon };
                                  const Icon = iconMap[item.time] || Sparkles;

                                  return (
                                    <div key={i} className="relative">
                                      <div className="absolute -left-[1.65rem] top-0 h-4 w-4 rounded-full bg-background border-4 border-primary shadow-sm" />
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-tighter text-primary/60">
                                            <Icon className="h-3 w-3" />
                                            {item.time}
                                          </div>
                                          {item.cost && <span className="text-xs font-bold text-muted-foreground/60">{item.cost}</span>}
                                        </div>
                                        {item.placeName && (
                                          <h4 className="font-semibold text-foreground mb-1">{item.placeName}</h4>
                                        )}
                                        <p className="text-sm leading-relaxed text-foreground/80 font-medium">
                                          {item.desc}
                                        </p>
                                        <div className="flex items-center gap-4 mt-2">
                                          <Button
                                            variant="link"
                                            size="sm"
                                            className="h-auto p-0 text-xs text-slate-400 hover:text-primary"
                                            onClick={() => {
                                              const mapUrl = item.mapLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.placeName || item.desc.split('.')[0])}`
                                              window.open(mapUrl, "_blank")
                                            }}
                                          >
                                            <MapPin className="mr-1 h-3 w-3" /> На карте
                                          </Button>
                                          {item.link && item.ticketsRequired && (
                                            <Link href={item.link} target="_blank" className="flex items-center text-xs text-primary hover:underline">
                                              <ExternalLink className="mr-1 h-3 w-3" /> Купить билеты
                                            </Link>
                                          )}
                                        </div>

                                        {/* Place Gallery, AI Reviews & Social Proof */}
                                        {item.placeName && (
                                          <div className="mt-4 pt-4 border-t border-white/5 space-y-6">
                                            <PlaceGallery query={`${item.placeName} ${route.destination || ""}`} count={5} />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Hotel cards INSIDE day card (after activities) */}
                              {hotelsToShow.length > 0 && (
                                <div className="mt-6 space-y-3 animate-in slide-in-from-bottom duration-300">
                                  <div className="flex items-center gap-2 text-sm font-bold text-amber-600 dark:text-amber-400 ml-1">
                                    <HotelIcon className="h-4 w-4" />
                                    Проживание
                                  </div>
                                  {hotelsToShow.map((hotel: any, i: number) => (
                                    <HotelCard key={`hotel-${day.day}-${i}`} {...hotel} />
                                  ))}
                                </div>
                              )}

                              {day.tips && (
                                <div className="mt-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 flex gap-3 text-sm text-amber-900 dark:text-amber-200 shadow-inner">
                                  <Compass className="h-5 w-5 text-amber-500 dark:text-amber-400 shrink-0" />
                                  <p><strong>Совет:</strong> {day.tips}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Chat Widget - Mobile Only */}
              <div className="lg:hidden mt-6">
                <ItineraryChatWidget
                  itinerary={route}
                  tripDetails={route}
                  onItineraryUpdate={(newItinerary) => setRoute((prev: any) => ({ ...prev, itinerary: newItinerary }))}
                  onModifying={setIsModifying}
                  tripId={params.id as string}
                />
              </div>

              {/* Viral Spots (Ghost Points) */}
              {route.viralSpots && route.viralSpots.length > 0 && (
                <div className="mt-12 mb-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                  <h2 className="text-2xl font-bold flex items-center gap-3 mb-6">
                    <Camera className="h-6 w-6 text-pink-500" />
                    <GradientText className="from-pink-500 to-purple-600">TikTok Trends & Viral Spots</GradientText>
                  </h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {route.viralSpots.map((spot: any, idx: number) => (
                      <Card key={idx} className="p-4 bg-black/40 border border-white/10 backdrop-blur-md hover:border-pink-500/50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-lg leading-tight text-white/90">{spot.name}</h3>
                          <Badge variant="outline" className="text-[10px] text-pink-400 border-pink-500/30 whitespace-nowrap ml-2">Viral</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{spot.desc || spot.description}</p>
                        <Button size="sm" variant="secondary" className="w-full text-xs font-bold rounded-lg" onClick={() => window.open(spot.mapLink, '_blank')}>
                          <MapPin className="h-3 w-3 mr-2 text-pink-500" /> Показать на карте
                        </Button>
                      </Card>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-3 italic text-center opacity-60">
                    * Локации, популярные в социальных сетях в 2025-2026 году. Не входят в основной маршрут.
                  </p>
                </div>
              )}

              {/* --- SOCIAL LAYER REMOVED BY USER REQUEST --- */}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="hidden lg:block">
                <ItineraryChatWidget
                  itinerary={route}
                  tripDetails={route}
                  onItineraryUpdate={(newItinerary) => setRoute((prev: any) => ({ ...prev, itinerary: newItinerary }))}
                  onModifying={setIsModifying}
                  tripId={params.id as string}
                  className="bg-card/80 dark:bg-white/5 backdrop-blur-md rounded-[2rem] border border-border/50 dark:border-white/5 shadow-xl"
                />
              </div>

              <Card className="p-6 border border-border/50 dark:border-white/5 shadow-xl bg-card/80 dark:bg-white/5 backdrop-blur-md rounded-[2rem]">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Важная информация
                </h3>
                <div className="space-y-5">
                  <div>
                    <h4 className="text-xs font-black uppercase text-muted-foreground tracking-widest mb-2">Виза</h4>
                    <p className="text-sm text-foreground/80 leading-relaxed">{route.visaAdvice || "Информация о визе будет доступна после генерации"}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-muted-foreground tracking-widest mb-2">Оплата</h4>
                    <p className="text-sm text-foreground/80 leading-relaxed">{route.paymentAdvice || "Информация об оплате будет доступна после генерации"}</p>
                  </div>
                  {route.restrictions && (
                    <div>
                      <h4 className="text-xs font-black uppercase text-muted-foreground tracking-widest mb-2">Ограничения</h4>
                      <p className="text-sm text-foreground/80 leading-relaxed">{route.restrictions}</p>
                    </div>
                  )}
                  {route.safetyInfo && (
                    <div>
                      <h4 className="text-xs font-black uppercase text-muted-foreground tracking-widest mb-2">Безопасность</h4>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-1">
                          {[...Array(10)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-2 h-2 rounded-full ${i < (route.safetyInfo?.rating || 0) ? 'bg-emerald-500' : 'bg-muted'}`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-bold">{route.safetyInfo?.rating}/10</span>
                      </div>
                      <p className="text-sm text-foreground/80 leading-relaxed">{route.safetyInfo?.tips}</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Interactive Map Card - Replaced AI Guide */}
              <Card className="p-4 border border-border/50 dark:border-white/10 bg-card/80 dark:bg-white/5 backdrop-blur-md rounded-[2rem] shadow-xl">
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <Map className="h-5 w-5 text-primary" />
                  Карта маршрута
                </h3>
                <div className="h-[300px] rounded-xl overflow-hidden">
                  <TripMap
                    places={mapPlaces}
                    activePlaceId={expandedDay ? `${expandedDay - 1}-0` : undefined}
                    onPlaceSelect={(placeId: string) => {
                      const [dayIdx] = placeId.split('-').map(Number);
                      setExpandedDay(dayIdx + 1);
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Нажмите на маркер, чтобы открыть день
                </p>
              </Card>
            </div>
          </div>
        </main>

        {/* Budget Analysis Modal */}
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
                  <span className="font-bold">{route.totalBudget}</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  * Цены являются оценочными на основе средних показателей региона и выбранного стиля ("{route.budget_range || "Комфорт"}"). Реальная стоимость может отличаться.
                </p>
              </div>

              <Button className="w-full rounded-2xl py-6 text-lg font-bold shadow-xl shadow-primary/20" onClick={() => setShowBudgetModal(false)}>
                Понятно
              </Button>
            </div>
          </DialogContent>
        </Dialog >

        <div className="container max-w-4xl mx-auto px-4 mt-12 mb-24">
          <div className="p-6 rounded-2xl border border-border/50 dark:border-white/10 bg-card/80 dark:bg-white/5 backdrop-blur-md flex flex-wrap gap-3 justify-center items-center shadow-xl">
            {/* Main info badges */}
            <Badge className="rounded-full px-4 py-1.5 text-sm font-bold bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-foreground dark:text-white border border-border/50 dark:border-white/10 flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
              {tripDestinationLabel}
            </Badge>
            <Badge className="rounded-full px-4 py-1.5 text-sm font-bold bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-foreground dark:text-white border border-border/50 dark:border-white/10 flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
              {tripDurationDays} дней
            </Badge>
            <Badge className="rounded-full px-4 py-1.5 text-sm font-bold bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-foreground dark:text-white border border-border/50 dark:border-white/10 flex items-center gap-2">
              <Wallet className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
              {route.budget_range || route.totalBudget}
            </Badge>

            {/* Preferences badges with translations */}
            {(() => {
              const prefs = route.preferences || {};
              const tStyle = prefs.travel_style || route.travel_style;
              const tPace = prefs.pace || route.pace;
              const tCompanions = prefs.companions || route.companions;

              // Helper to translate style values
              const translateStyle = (s: string) => styleTranslations[s.toLowerCase()] || s;
              const translatePace = (p: string) => paceTranslations[p.toLowerCase()] || p;
              const translateCompanions = (c: string) => companionsTranslations[c.toLowerCase()] || c;

              return (
                <>
                  {tStyle && (Array.isArray(tStyle) ? tStyle.length > 0 : tStyle) && (
                    <>
                      {(Array.isArray(tStyle) ? tStyle : [tStyle]).map((style: string, idx: number) => (
                        <Badge key={idx} className="rounded-full px-3 py-1 text-xs font-bold bg-pink-500/20 text-pink-200 border border-pink-500/20 flex items-center gap-1.5">
                          <Sparkles className="h-3 w-3" />
                          {translateStyle(style)}
                        </Badge>
                      ))}
                    </>
                  )}

                  {tPace && (
                    <Badge className="rounded-full px-3 py-1 text-xs font-bold bg-sky-500/20 text-sky-200 border border-sky-500/20 flex items-center gap-1.5">
                      <Zap className="h-3 w-3" />
                      {translatePace(tPace)}
                    </Badge>
                  )}

                  {tCompanions && (
                    <Badge className="rounded-full px-3 py-1 text-xs font-bold bg-purple-500/20 text-purple-200 border border-purple-500/20 flex items-center gap-1.5">
                      <Users className="h-3 w-3" />
                      {translateCompanions(tCompanions)}
                    </Badge>
                  )}
                </>
              )
            })()}
          </div>
        </div>

        <div className="mt-20">
          <Footer />
        </div>

        {/* TripShareModal Component */}


        <TripChat
          tripId={params.id as string}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          currentUser={user}
        />
      </div >
    </div >
  )
}
