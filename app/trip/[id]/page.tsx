"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { Header } from "@/components/header"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Calendar,
  Clock,
  Compass,
  Download,
  Hotel as HotelIcon,
  Map,
  MapPin,
  Share2,
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
  Printer
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import Image from "next/image"
import Link from "next/link"
import { MeshGradient } from "@paper-design/shaders-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TripImage } from "@/components/TripImage"
import { ItineraryChatWidget } from "@/components/ItineraryChatWidget"
import { TripShareModal } from "@/components/TripShareModal"
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

const LightRays = dynamic(() => import('@/components/LightRays'), { ssr: false })

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

const tagColors: Record<string, string> = {
  "пляж": "text-sky-900 bg-sky-200 hover:bg-sky-300",
  "шопинг": "text-pink-900 bg-pink-200 hover:bg-pink-300",
  "аквапарк": "text-cyan-900 bg-cyan-200 hover:bg-cyan-300",
  "горы": "text-emerald-900 bg-emerald-200 hover:bg-emerald-300",
  "море": "text-blue-900 bg-blue-200 hover:bg-blue-300",
  "торговые центры": "text-purple-900 bg-purple-200 hover:bg-purple-300",
  "природа": "text-green-900 bg-green-200 hover:bg-green-300",
  "культура": "text-amber-900 bg-amber-200 hover:bg-amber-300",
  "развлечения": "text-rose-900 bg-rose-200 hover:bg-rose-300",
  "default": "text-slate-900 bg-slate-200 hover:bg-slate-300"
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
  const [showShareModal, setShowShareModal] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [user, setUser] = useState<any>(null)

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isMember, setIsMember] = useState(false)

  // Parallax hook
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 500], [0, 250])
  const opacity = useTransform(scrollY, [0, 400], [1, 0])
  const scale = useTransform(scrollY, [0, 500], [1, 1.1])

  useEffect(() => {
    const checkSidebar = () => {
      const saved = localStorage.getItem('sidebar-collapsed') === 'true'
      setIsSidebarCollapsed(saved)
    }
    checkSidebar()
    window.addEventListener('sidebar-change', checkSidebar)
    return () => window.removeEventListener('sidebar-change', checkSidebar)
  }, [])

  useEffect(() => {
    const fetchTrip = async () => {
      setLoading(true)
      const id = params.id as string
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      const isLocal = id?.startsWith('local-')

      console.log("Fetching trip with ID:", id, "isUuid:", isUuid, "isLocal:", isLocal)

      // Auth Check for UUID trips
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      setUser(currentUser)

      if (isUuid) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push(`/auth?next=/trip/${id}`)
          return
        }
      }

      let data = null
      let error = null

      if (isUuid) {
        const result = await supabase
          .from('trips')
          .select('*')
          .eq('id', id)
          .single()
        data = result.data
        error = result.error
      } else if (isLocal || id === "ai-last") {
        const key = isLocal ? `trip-${id}` : "lastGeneratedRoute"
        const stored = localStorage.getItem(key)
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
        const stored = localStorage.getItem("lastGeneratedRoute")
        if (stored) setRoute(JSON.parse(stored))
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
          invite_code: data.invite_code
        })
        setIsOwner(data.user_id === currentUser?.id)

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
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* LightRays / Mesh Background for loading */}
        <div className="absolute inset-0 z-0">
          <MeshGradient
            className="w-full h-full opacity-20"
            colors={["#10B981", "#3B82F6", "#8B5CF6", "#10B981"]}
            speed={0.1}
          />
        </div>

        <AppSidebar />
        <div className={`relative z-10 transition-[margin] duration-300 ${isSidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-64'}`}>
          <div className="lg:hidden"><Header /></div>
          <main className="flex min-h-[80vh] items-center justify-center p-6">
            <div className="text-center space-y-6">
              <div className="relative mx-auto h-20 w-20 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
                <div className="absolute inset-0 rounded-full border border-primary/40 animate-pulse" />
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-foreground tracking-tighter uppercase">Загрузка</h3>
                <p className="text-muted-foreground font-medium animate-pulse tracking-wide italic">Готовим детали вашего приключения...</p>
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
        {/* Mobile Header */}
        <div className="lg:hidden"><Header /></div>

        {/* Hero Banner */}
        <div className="relative h-[50vh] min-h-[500px] w-full overflow-hidden mt-16 lg:mt-0">
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
                    const tagKey = tag.toLowerCase();
                    const Icon = tagIcons[tagKey] || tagIcons["default"];
                    const colorClass = tagColors[tagKey] || tagColors["default"];

                    return (
                      <Badge key={tag} className={`${colorClass} rounded-full px-4 py-1.5 text-sm font-bold flex items-center gap-1.5 border-none shadow-sm transition-colors`}>
                        <Icon className="w-3.5 h-3.5" />
                        {tag}
                      </Badge>
                    )
                  })}
                </div>

                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white drop-shadow-2xl">
                  {route.title}
                </h1>

                <div className="flex flex-wrap gap-4 text-white/90 font-medium text-lg">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10">
                    <Calendar className="h-5 w-5 text-sky-400" />
                    {route.itinerary?.length || 0} дней
                  </div>
                  <div
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 cursor-pointer hover:bg-white/10 transition-colors group"
                    onClick={() => setShowBudgetModal(true)}
                  >
                    <Wallet className="h-5 w-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span className="underline decoration-dotted underline-offset-4">{route.totalBudget}</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10">
                    <Shield className="h-5 w-5 text-amber-400" />
                    Безопасность 9/10
                  </div>


                  {/* Social Actions */}
                  <div className="flex items-center gap-2 border-l border-white/10 pl-4 ml-2">
                    {!isOwner && !isMember && user && (
                      <Button
                        onClick={async () => {
                          if (!user) return
                          const { error } = await supabase.from('trip_members').insert({
                            trip_id: route.id,
                            user_id: user.id
                          })
                          if (!error) {
                            setIsMember(true)
                            toast.success("Вы присоединились к поездке!")
                          } else {
                            console.error("Join error:", error)
                            // Use alert for immediate visibility if toast specific import isn't handy or configured
                            alert(`Ошибка: ${error.message || "Не удалось присоединиться"}`)
                          }
                        }}
                        className="rounded-full bg-primary/20 text-primary hover:bg-primary/30"
                        size="sm"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Присоединиться
                      </Button>
                    )}

                    {(isOwner || isMember) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full hover:bg-white/10 relative"
                        onClick={() => setIsChatOpen(!isChatOpen)}
                      >
                        <MessageCircle className="h-5 w-5 text-white" />
                        {/* Optional: Add badge for unread */}
                      </Button>
                    )}

                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10" onClick={handlePrint} title="Экспорт в PDF">
                      <Printer className="h-5 w-5 text-white" />
                    </Button>

                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10" onClick={() => setShowShareModal(true)}>
                      <Share2 className="h-5 w-5 text-white" />
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

              <div className="space-y-4">
                {route.itinerary?.map((day: any, idx: number) => {
                  const isExpanded = expandedDay === day.day;
                  const TransportIcon = transportIcons[day.logistics?.mode] || Zap;

                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      key={idx}
                    >
                      <Card className={`overflow-hidden border border-white/10 bg-white/5 backdrop-blur-md shadow-lg transition-all duration-300 ${isModifying ? 'animate-pulse blur-[2px] opacity-70 scale-[0.98]' : ''} hover:border-primary/30`}>
                        <button
                          onClick={() => setExpandedDay(isExpanded ? null : day.day)}
                          className="w-full flex items-center justify-between p-5 text-left group bg-transparent"
                        >
                          <div className="flex items-center gap-6">
                            <div className={`flex flex-col h-14 w-14 shrink-0 items-center justify-center rounded-full transition-all duration-300 border border-white/5 ${isExpanded ? 'bg-white/10' : 'bg-white/5'}`}>
                              {isExpanded ? (
                                <span className="text-xl font-black bg-gradient-to-b from-blue-400 to-red-100 bg-clip-text text-transparent">
                                  {day.day}
                                </span>
                              ) : (
                                <span className="text-white/60 font-bold">{day.day}</span>
                              )}
                            </div>
                            <div>
                              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">День {day.day}</div>
                              <div className="font-bold text-xl md:text-2xl group-hover:text-primary transition-colors">{day.title || "Продолжение приключения"}</div>
                            </div>
                          </div>
                          <div className={`p-2 rounded-full bg-white/5 transition-transform duration-300 ${isExpanded ? 'rotate-90 bg-primary/20 text-primary' : ''}`}>
                            <ChevronRight className="h-6 w-6 text-muted-foreground" />
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
                                className="rounded-full bg-sky-500/10 border-sky-500/20 text-sky-400 hover:bg-sky-500/20 text-[10px] font-black uppercase tracking-tighter h-8"
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
                                className="rounded-full bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-black uppercase tracking-tighter h-8"
                                onClick={() => {
                                  const destination = day.logistics?.to || route.destination || ""
                                  // Remove /hotel/russia/ restriction to allow worldwide search
                                  const url = `https://ostrovok.ru/?q=${encodeURIComponent(destination)}`
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

                                          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary mb-2">
                                              <Star className="h-3 w-3 fill-primary" />
                                              AI Резюме отзывов
                                            </div>
                                            <p className="text-xs italic text-muted-foreground leading-relaxed">
                                              "Посетители отмечают потрясающую атмосферу. {item.time === 'Утро' ? 'Утром здесь особенно спокойно.' : item.time === 'Вечер' ? 'Идеальное место для заката.' : 'Днем здесь очень оживленно и красиво.'}"
                                            </p>
                                          </div>

                                        </div>

                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

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

              {/* Chat Widget - Mobile Only */}
              <div className="lg:hidden mt-6">
                <ItineraryChatWidget
                  itinerary={route}
                  onItineraryUpdate={setRoute}
                  onModifying={setIsModifying}
                  tripId={params.id as string}
                />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Chat Widget - Desktop Only */}
              <div className="hidden lg:block">
                <ItineraryChatWidget
                  itinerary={route}
                  onItineraryUpdate={setRoute}
                  onModifying={setIsModifying}
                  tripId={params.id as string}
                  className="bg-white/40 dark:bg-white/5 backdrop-blur-md rounded-[2rem] border border-white/10 dark:border-white/5 shadow-xl"
                />
              </div>
              <Card className="p-6 border border-white/10 dark:border-white/5 shadow-xl bg-white/40 dark:bg-white/5 backdrop-blur-md rounded-[2rem]">
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

              <Card className="p-1 border border-white/10 bg-gradient-to-br from-white/10 to-transparent shadow-2xl backdrop-blur-xl rounded-[1.5rem] overflow-hidden group hover:border-primary/50 transition-colors cursor-pointer" onClick={() => router.push(`/guide?tripId=${params.id}`, { scroll: true })}>
                <div className="relative h-full p-6 bg-black/20 rounded-[1.2rem] transition-colors group-hover:bg-black/30 flex flex-col justify-center">
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Ваш ИИ-Гид</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">Интерактивная карта, чеклисты и помощь ИИ в реальном времени во время поездки.</p>
                </div>
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
                  * Цены являются оценочными на основе средних показателей региона и выбранного стиля ("{route.budget_range}"). Реальная стоимость может отличаться.
                </p>
              </div>

              <Button className="w-full rounded-2xl py-6 text-lg font-bold shadow-xl shadow-primary/20" onClick={() => setShowBudgetModal(false)}>
                Понятно
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <div className="mt-20">
          <Footer />
        </div>

        {/* TripShareModal Component */}
        {
          route && (
            <TripShareModal
              isOpen={showShareModal}
              onOpenChange={setShowShareModal}
              tripId={route.id}
              tripTitle={route.title}
              inviteCode={route.invite_code}
              isOwner={isOwner}
            />
          )
        }
      </div >
      <TripChat
        tripId={params.id as string}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        currentUser={user}
      />
    </div >
  )
}
