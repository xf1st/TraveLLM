"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, MessageSquare, Map as MapIcon, ChevronLeft, CheckCircle2, Plane, Hotel, ShieldCheck, MapPin, ArrowRight, PlayCircle, ExternalLink, Ticket, Building2, Sparkles, Compass, Menu, List as ListIcon, Wallet, Globe, CloudSun } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { generateTripBookingLinks, getInsuranceLink } from "@/lib/travelpayouts"
import { useBookingMarket } from "@/lib/hooks/useBookingMarket"
import { AppSidebar } from "@/components/app-sidebar"
import { Header } from "@/components/header"
import { ItineraryChatWidget } from "@/components/ItineraryChatWidget"
import { MobileDrawer } from "@/components/mobile-drawer"
import { GuideChatWidget } from "@/components/GuideChatWidget"
import { Footer } from "@/components/footer"
import dynamic from "next/dynamic"

import { PremiumLoader } from "@/components/PremiumLoader"


interface Place {
    id: string
    name: string
    description?: string
    status: 'visited' | 'active' | 'pending'
    day: number
    coords?: [number, number]
}

export default function GuidePage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-background">
                <PremiumLoader text="Загружаем ассистент..." />
            </div>
        }>
            <GuidePageContent />
        </Suspense>
    )
}

function GuidePageContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const bookingMarket = useBookingMarket()
    const tripId = searchParams.get("tripId")
    const [trip, setTrip] = useState<any>(null)
    const [tripData, setTripData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [viewMode, setViewMode] = useState<"booking" | "active">("booking")

    // Booking checklist state
    const [bookings, setBookings] = useState({
        tickets: false,
        hotel: false,
        insurance: false
    })

    // Active state
    const [completedActivities, setCompletedActivities] = useState<string[]>([])

    // Sidebar state for layout
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

    // Mobile Drawer State
    const [activeDrawer, setActiveDrawer] = useState<"none" | "itinerary" | "chat">("none")

    // Map & Guide State
    const [activePlaceId, setActivePlaceId] = useState<string | null>(null)
    const [places, setPlaces] = useState<Place[]>([])


    // Parse places when trip data changes
    useEffect(() => {
        if (!tripData?.itinerary) return

        const list: Place[] = []
        tripData.itinerary.forEach((day: any, dIdx: number) => {
            const dayNum = day.day || dIdx + 1

            // Handle NEW format (activities array)
            if (day.activities && Array.isArray(day.activities)) {
                day.activities.forEach((act: any, aIdx: number) => {
                    const id = `${dayNum}-${aIdx}` // Consistent ID generation
                    const status = completedActivities.includes(id) ? 'visited' : 'pending'
                    list.push({
                        id,
                        name: act.placeName || act.place || "Активность",
                        description: act.desc || act.description || act.activity,
                        status,
                        day: dayNum
                    })
                })
            }
            // Handle OLD format (morning/daytime/night properties)
            else {
                ['morning', 'daytime', 'night'].forEach((time, tIdx) => {
                    if (day[time]) {
                        const id = `${dayNum}-${time}`
                        // Simple heuristic for name extraction
                        const text = day[time]
                        const name = text.split('.')[0].substring(0, 40)
                        list.push({
                            id,
                            name: name,
                            description: text,
                            status: 'pending', // Old format doesn't support completion tracking easily yet
                            day: dayNum
                        })
                    }
                })
            }
        })

        setPlaces(list)
        if (list.length > 0 && !activePlaceId) {
            setActivePlaceId(list[0].id)
        }
    }, [tripData, completedActivities]) // Re-run when completed activities change

    // Update active place status in the list
    const activePlace = places.find(p => p.id === activePlaceId)

    // Context for Chat
    const chatContext = {
        title: tripData?.title || "Мое путешествие",
        currentLocation: activePlace?.name,
        currentDay: activePlace?.day,
        completedSteps: places.filter(p => p.status === 'visited').map(p => p.name),
        upcomingSteps: places.filter(p => p.status === 'pending').map(p => p.name)
    }

    const handlePlaceSelect = (id: string) => {
        setActivePlaceId(id)
    }

    useEffect(() => {
        const checkSidebar = () => {
            const saved = typeof window !== 'undefined' && localStorage.getItem('sidebar-collapsed') === 'true'
            setIsSidebarCollapsed(saved)
        }

        // Check initially
        checkSidebar()

        // Listen for changes
        window.addEventListener('sidebar-change', checkSidebar)
        return () => window.removeEventListener('sidebar-change', checkSidebar)
    }, [])

    useEffect(() => {
        if (tripId) {
            fetchTrip(tripId)
        } else {
            setLoading(false)
        }
    }, [tripId])

    const fetchTrip = async (id: string) => {
        try {
            // Check local storage first for non-saved trips
            if (id === "ai-last" || id.startsWith("local-")) {
                const key = id === "ai-last" ? "lastGeneratedRoute" : `trip-${id}`
                const localData = localStorage.getItem(key)
                if (localData) {
                    let parsed = JSON.parse(localData)
                    // Robust check for structure
                    if (Array.isArray(parsed)) {
                        parsed = { itinerary: parsed }
                    }
                    setTripData(parsed)
                    setLoading(false)
                    return
                }
            }

            // Fetch from Supabase
            const { data } = await supabase
                .from('trips')
                .select('*')
                .eq('id', id)
                .single()

            if (data) {
                setTrip(data)

                // Use itinerary column directly from DB
                let parsedRoute = data.itinerary

                // Wrap in object with itinerary key if it's an array
                if (Array.isArray(parsedRoute)) {
                    parsedRoute = { itinerary: parsedRoute }
                }
                // If it's already an object but doesn't have itinerary key, wrap it
                else if (parsedRoute && typeof parsedRoute === 'object' && !parsedRoute.itinerary) {
                    // Maybe it's a single day or malformed, check if it has 'day' property
                    if (parsedRoute.day) {
                        parsedRoute = { itinerary: [parsedRoute] }
                    }
                }
                // If null/undefined, set empty itinerary
                else if (!parsedRoute) {
                    parsedRoute = { itinerary: [] }
                }

                console.log('[Guide] Parsed trip data:', parsedRoute)
                setTripData(parsedRoute)
                if (data.status === 'active') {
                    setViewMode("active")
                }
                // Load saved bookings state
                if (data.bookings) {
                    setBookings(prev => ({ ...prev, ...data.bookings }))
                }
                // Load completed activities
                if (data.completed_activities) {
                    setCompletedActivities(data.completed_activities)
                }
            }
        } catch (error) {
            console.error("Error loading trip for guide:", error)
        } finally {
            setLoading(false)
        }
    }

    const [smartLinks, setSmartLinks] = useState({
        aviasales: "https://www.aviasales.ru",
        hotels: "https://travel.yandex.ru/hotels/",
        cherehapa: "https://www.cherehapa.ru"
    })

    useEffect(() => {
        const fetchLinks = async () => {
            try {
                // Try to get destination from trip metadata or first city in itinerary
                let destination = trip?.destination

                if (!destination && tripData?.itinerary?.length > 0) {
                    // Extract first city from title "City: Activity" or similar
                    const firstDayTitle = tripData.itinerary[0].title
                    if (firstDayTitle) {
                        destination = firstDayTitle.split(':')[0].trim()
                    }
                }

                if (!destination) return

                // Используем Travelpayouts партнёрские ссылки
                const bookingLinks = await generateTripBookingLinks({
                    origin: trip?.origin,
                    destination,
                    startDate: trip?.start_date,
                    endDate: trip?.end_date,
                    travelers: trip?.travelers || 1
                }, bookingMarket)

                setSmartLinks({
                    aviasales: bookingLinks.flights,
                    hotels: bookingLinks.hotels,
                    cherehapa: bookingLinks.insurance
                })
            } catch (error) {
                console.error("Error generating booking links:", error);
            }
        }
        
        if (trip || tripData) {
            fetchLinks()
        }
    }, [trip, tripData, bookingMarket])

    const updateBooking = async (key: keyof typeof bookings) => {
        const newStatus = !bookings[key]
        setBookings(prev => ({ ...prev, [key]: newStatus }))

        // Save to DB
        const updatedBookings = { ...bookings, [key]: newStatus }
        try {
            await supabase.from('trips').update({ bookings: updatedBookings }).eq('id', tripId)
        } catch (e) {
            console.error("Failed to save booking status", e)
        }
    }

    const startTrip = async () => {
        console.log('[Guide] Starting trip, setting status to active for tripId:', tripId)
        try {
            const { error } = await supabase.from('trips').update({ status: 'active' }).eq('id', tripId)
            if (error) {
                console.error('[Guide] Failed to update trip status:', error)
            } else {
                console.log('[Guide] Successfully set trip status to active')
            }
            setViewMode("active")
        } catch (e) {
            console.error("[Guide] Failed to start trip (exception):", e)
            setViewMode("active") // Optimistic update
        }
    }

    const toggleActivity = async (activityId: string) => {
        const isCompleted = completedActivities.includes(activityId)
        let newCompleted: string[] = []

        if (isCompleted) {
            newCompleted = completedActivities.filter(id => id !== activityId)
        } else {
            newCompleted = [...completedActivities, activityId]
        }

        setCompletedActivities(newCompleted)
        console.log('[Guide] Toggling activity:', activityId, 'New list:', newCompleted)

        // Save to DB
        try {
            const { error } = await supabase.from('trips').update({ completed_activities: newCompleted }).eq('id', tripId)
            if (error) {
                console.error('[Guide] Failed to save completed_activities:', error)
            } else {
                console.log('[Guide] Successfully saved completed_activities')
            }
        } catch (e) {
            console.error("[Guide] Failed to save activity status (exception):", e)
        }
    }

    const finishTrip = async () => {
        try {
            await supabase.from('trips').update({ status: 'completed' }).eq('id', tripId)
            router.push('/trips')
        } catch (e) {
            console.error("Failed to finish trip", e)
            router.push('/trips')
        }
    }

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <PremiumLoader text="Подбираем маршрут..." />
            </div>
        )
    }

    // --- LANDING PAGE STATE (No Trip Selected) ---
    if (!tripId) {
        return <GuideLandingPage />
    }

    // Helper component for Landing Page
    function GuideLandingPage() {
        const [trips, setTrips] = useState<any[]>([])
        const [loadingTrips, setLoadingTrips] = useState(true)

        const router = useRouter()

        useEffect(() => {
            const fetchTrips = async () => {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    setLoadingTrips(false)
                    return
                }

                const { data } = await supabase
                    .from('trips')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })

                if (data) {
                    setTrips(data)
                    const activeTrip = data.find(t => t.status === 'active')
                    if (activeTrip) {
                        router.replace(`/guide?tripId=${activeTrip.id}`)
                        return
                    }
                }
                setLoadingTrips(false)
            }
            fetchTrips()
        }, [router])

        return (
            <div className="min-h-screen bg-background flex flex-col">
                {/* Floating Header - same style as landing page */}
                <Header floating />

                {/* Desktop Sidebar */}
                <AppSidebar />

                <main className={cn(
                    "relative flex flex-1 flex-col pt-24 transition-all duration-300",
                    "lg:ml-64",
                    isSidebarCollapsed && "lg:ml-[72px]"
                )}>
                    <div className="container z-10 mx-auto mb-auto w-full min-w-0 max-w-5xl space-y-8 px-4 py-4 max-lg:pb-10 sm:space-y-12 sm:p-6">
                        <div className="space-y-3 text-center sm:space-y-4">
                            <Badge variant="secondary" className="gap-2 border-primary/20 bg-primary/10 px-3 py-1.5 text-xs text-primary backdrop-blur-sm sm:px-4 sm:text-sm">
                                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                AI Travel Companion
                            </Badge>
                            <h1 className="mb-1 text-3xl font-black tracking-tight text-white sm:mb-2 sm:text-4xl md:text-6xl">
                                Ваше умное <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">путешествие</span>
                            </h1>
                            <p className="mx-auto max-w-2xl px-1 text-base leading-relaxed text-zinc-400 sm:px-0 sm:text-lg">
                                Ассистент, который знает ваш маршрут, подскажет лучшие места и поможет в любой ситуации. Выберите поездку, чтобы начать.
                            </p>
                        </div>

                        {/* Trips Grid - Dark Glass Style */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
                            {/* Create New Trip Card */}
                            <Link href="/plan" className="group block h-full touch-manipulation">
                                <Card className="relative flex h-56 flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-dashed border-white/10 bg-white/5 text-center transition-all duration-300 hover:border-white/20 hover:bg-white/10 group-hover:scale-[1.02] sm:h-64 sm:gap-4 sm:rounded-[2rem]">
                                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                        <Sparkles className="h-8 w-8 text-white/50 group-hover:text-white transition-colors" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-1">Новое путешествие</h3>
                                        <p className="text-sm text-zinc-400">Куда отправимся?</p>
                                    </div>
                                </Card>
                            </Link>

                            {loadingTrips ? (
                                Array(3).fill(0).map((_, i) => (
                                    <Card key={i} className="h-56 animate-pulse rounded-2xl border border-white/5 bg-zinc-900 sm:h-64 sm:rounded-[2rem]" />
                                ))
                            ) : trips.length > 0 ? (
                                trips.map(trip => (
                                    <Link key={trip.id} href={`/guide?tripId=${trip.id}`} className="group block h-full touch-manipulation">
                                        <Card className="relative h-full overflow-hidden rounded-2xl border border-white/5 bg-zinc-900 shadow-md backdrop-blur-md transition-all duration-500 hover:-translate-y-1 hover:shadow-primary/10 sm:rounded-[2rem] md:shadow-2xl md:backdrop-blur-xl md:hover:-translate-y-2">
                                            {/* Status Badge */}
                                            <div className="absolute top-4 right-4 z-20">
                                                <div className={cn(
                                                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border shadow-lg flex items-center gap-1.5",
                                                    trip.status === 'active'
                                                        ? "bg-emerald-500 text-white border-green-400/20"
                                                        : "bg-black/50 text-white border-white/10"
                                                )}>
                                                    {trip.status === 'active' && <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />}
                                                    {trip.status === 'active' ? 'В пути' : 'Планируется'}
                                                </div>
                                            </div>

                                            {/* Cover Image Section */}
                                            <div className="relative h-40 w-full overflow-hidden sm:h-48">
                                                {trip.cover_image ? (
                                                    <img
                                                        src={trip.cover_image}
                                                        alt={trip.title || trip.destination}
                                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-zinc-800" />
                                                )}
                                                {/* Seamless Gradient */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />

                                                <div className="absolute bottom-4 left-6 right-6">
                                                    <h3 className="font-bold text-xl leading-tight text-white line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                                                        {trip.title || trip.destination}
                                                    </h3>
                                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                                                        <MapPin className="w-3.5 h-3.5 text-primary" />
                                                        {trip.destination}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between p-4 pt-2 sm:p-6">
                                                <span className="text-[11px] font-medium text-zinc-500 sm:text-xs">Нажмите, чтобы открыть</span>
                                                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-all group-hover:bg-primary group-hover:text-white sm:h-8 sm:w-8">
                                                    <ArrowRight className="w-4 h-4" />
                                                </div>
                                            </div>
                                        </Card>
                                    </Link>
                                ))
                            ) : (
                                <div className="col-span-full rounded-2xl border border-dashed border-white/5 bg-zinc-900/50 px-4 py-12 text-center backdrop-blur-sm sm:rounded-[2rem] sm:py-16">
                                    <div className="mx-auto h-16 w-16 bg-zinc-800/50 rounded-full flex items-center justify-center mb-6">
                                        <Compass className="w-8 h-8 text-zinc-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">У вас пока нет маршрутов</h3>
                                    <p className="text-zinc-400 mb-8 max-w-md mx-auto">Создайте свой первый идеальный маршрут, и я стану вашим личным ассистентом!</p>
                                    <Button asChild size="lg" className="mx-auto flex h-12 w-full max-w-sm touch-manipulation rounded-full bg-white px-8 font-bold text-black shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:bg-white/90 sm:h-12 sm:w-auto">
                                        <Link href="/plan" className="flex items-center justify-center gap-2"><Sparkles className="h-4 w-4 text-purple-500" /> Создать маршрут</Link>
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Feature Highlights - Clean Glass */}
                        <div className="grid grid-cols-1 gap-4 border-t border-white/5 pt-8 md:grid-cols-3 md:gap-6 md:pt-12">
                            <div className="flex flex-col items-center text-center gap-4 p-6 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400">
                                    <MessageSquare className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white mb-1">Умный Чат</h3>
                                    <p className="text-sm text-zinc-400">Задавайте любые вопросы: "где поесть?", "как доехать?", "что интересного рядом?".</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-center text-center gap-4 p-6 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white mb-1">Чек-листы</h3>
                                    <p className="text-sm text-zinc-400">Отслеживайте билеты, брони и подготовку к поездке в удобном формате.</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-center text-center gap-4 p-6 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400">
                                    <PlayCircle className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white mb-1">Живой маршрут</h3>
                                    <p className="text-sm text-zinc-400">Маршрут адаптируется под вас в реальном времени. Просто отмечайте посещенные места.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        )
    }

    // --- BOOKING STATE UI ---
    if (viewMode === "booking") {
        return (
            <div className="min-h-screen bg-background text-foreground">
                {/* Mobile Header - Visible only on small screens */}
                <div className="lg:hidden">
                    <Header />
                </div>

                {/* Desktop Sidebar - Fixed, hidden on mobile */}
                <AppSidebar />

                {/* Main Content - Offset by sidebar width on desktop */}
                <main className={cn(
                    "flex min-h-screen flex-col pt-16 transition-all duration-300 lg:pt-0",
                    isSidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-64"
                )}>
                    <header className="sticky top-0 z-30 flex shrink-0 items-center gap-3 border-b border-white/5 bg-background/80 px-4 py-3 backdrop-blur-md sm:gap-4 sm:px-6 sm:py-4 md:backdrop-blur-xl">
                        <Link href={`/trip/${tripId}`}>
                            <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0 touch-manipulation rounded-full hover:bg-white/10 sm:h-10 sm:w-10">
                                <ChevronLeft className="h-6 w-6" />
                            </Button>
                        </Link>
                        <div className="min-w-0 flex-1">
                            <h1 className="line-clamp-1 text-base font-bold leading-tight text-white sm:text-lg">{tripData?.title || "Подготовка к путешествию"}</h1>
                            <p className="text-[11px] font-medium text-zinc-400 sm:text-xs">Этап бронирования</p>
                        </div>
                    </header>

                    <div className="container mx-auto flex min-h-[min(70dvh,32rem)] flex-1 max-w-2xl flex-col items-center justify-center p-4 pb-8 max-lg:pb-10 sm:min-h-[min(80dvh,40rem)] sm:p-6">

                        <div className="mb-8 text-center sm:mb-10">
                            <h2 className="mb-2 text-2xl font-black text-white sm:mb-3 sm:text-4xl">Готовы лететь? ✈️</h2>
                            <p className="text-base text-zinc-400 sm:text-lg">Давайте проверим готовность перед стартом.</p>
                        </div>

                        <div className="w-full space-y-4 mb-10">
                            {/* Tickets Card */}
                            <div className={cn(
                                "group relative overflow-hidden rounded-3xl border transition-all duration-300",
                                bookings.tickets
                                    ? "bg-emerald-500/10 border-emerald-500/30"
                                    : "bg-zinc-900/50 border-white/5 hover:bg-zinc-900 hover:border-white/10"
                            )}>
                                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:gap-5 sm:p-6">
                                    <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-colors sm:mt-1", bookings.tickets ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-blue-500/10 text-blue-400")}>
                                        <Plane className="h-6 w-6" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <h3 className="text-lg font-bold text-white sm:text-xl">Авиабилеты</h3>
                                            {bookings.tickets && (
                                                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Куплено
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-sm text-zinc-400 mb-5 leading-relaxed">Самый важный шаг. Найдите лучшие рейсы и зафиксируйте цены.</p>

                                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
                                            <Button variant="outline" size="sm" className="h-11 w-full touch-manipulation gap-2 rounded-full border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white sm:h-10 sm:w-auto sm:px-5" asChild>
                                                <a href={smartLinks.aviasales} target="_blank" rel="noopener noreferrer">
                                                    <Ticket className="h-4 w-4 text-blue-400" />
                                                    Найти на Aviasales
                                                    <ExternalLink className="ml-1 h-3 w-3 opacity-30" />
                                                </a>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={cn(
                                                    "h-11 w-full touch-manipulation gap-2 rounded-full px-5 font-bold transition-all sm:h-10 sm:w-auto",
                                                    bookings.tickets
                                                        ? "bg-emerald-500 text-white hover:bg-emerald-600 hover:text-white"
                                                        : "bg-zinc-800 text-zinc-300 hover:bg-emerald-500 hover:text-white"
                                                )}
                                                onClick={() => updateBooking('tickets')}
                                            >
                                                {bookings.tickets ? "Готово" : "Отметить купленным"}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Hotel Card */}
                            <div className={cn(
                                "group relative overflow-hidden rounded-3xl border transition-all duration-300",
                                bookings.hotel
                                    ? "bg-emerald-500/10 border-emerald-500/30"
                                    : "bg-zinc-900/50 border-white/5 hover:bg-zinc-900 hover:border-white/10"
                            )}>
                                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:gap-5 sm:p-6">
                                    <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-colors sm:mt-1", bookings.hotel ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-purple-500/10 text-purple-400")}>
                                        <Hotel className="h-6 w-6" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <h3 className="text-lg font-bold text-white sm:text-xl">Жилье</h3>
                                            {bookings.hotel && (
                                                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Забронировано
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-sm text-zinc-400 mb-5 leading-relaxed">Забронируйте отель заранее, чтобы не переплачивать в последний момент.</p>

                                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
                                            <Button variant="outline" size="sm" className="h-11 w-full touch-manipulation gap-2 rounded-full border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white sm:h-10 sm:w-auto sm:px-5" asChild>
                                                <a href={smartLinks.hotels} target="_blank" rel="noopener noreferrer">
                                                    <Building2 className="h-4 w-4 text-purple-400" />
                                                    Яндекс Путешествия
                                                    <ExternalLink className="ml-1 h-3 w-3 opacity-30" />
                                                </a>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={cn(
                                                    "h-11 w-full touch-manipulation gap-2 rounded-full px-5 font-bold transition-all sm:h-10 sm:w-auto",
                                                    bookings.hotel
                                                        ? "bg-emerald-500 text-white hover:bg-emerald-600 hover:text-white"
                                                        : "bg-zinc-800 text-zinc-300 hover:bg-emerald-500 hover:text-white"
                                                )}
                                                onClick={() => updateBooking('hotel')}
                                            >
                                                {bookings.hotel ? "Готово" : "Отметить бронь"}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Insurance Card */}
                            <div className={cn(
                                "group relative overflow-hidden rounded-3xl border transition-all duration-300",
                                bookings.insurance
                                    ? "bg-emerald-500/10 border-emerald-500/30"
                                    : "bg-zinc-900/50 border-white/5 hover:bg-zinc-900 hover:border-white/10"
                            )}>
                                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:gap-5 sm:p-6">
                                    <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-colors sm:mt-1", bookings.insurance ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-orange-500/10 text-orange-400")}>
                                        <ShieldCheck className="h-6 w-6" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <h3 className="text-lg font-bold text-white sm:text-xl">Страховка</h3>
                                            {bookings.insurance && (
                                                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Оформлено
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-sm text-zinc-400 mb-5 leading-relaxed">Безопасность превыше всего. Оформите полис онлайн за 5 минут.</p>

                                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
                                            <Button variant="outline" size="sm" className="h-11 w-full touch-manipulation gap-2 rounded-full border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white sm:h-10 sm:w-auto sm:px-5" asChild>
                                                <a href="https://www.cherehapa.ru" target="_blank" rel="noopener noreferrer">
                                                    <ShieldCheck className="h-4 w-4 text-orange-400" />
                                                    Cherehapa
                                                    <ExternalLink className="ml-1 h-3 w-3 opacity-30" />
                                                </a>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={cn(
                                                    "h-11 w-full touch-manipulation gap-2 rounded-full px-5 font-bold transition-all sm:h-10 sm:w-auto",
                                                    bookings.insurance
                                                        ? "bg-emerald-500 text-white hover:bg-emerald-600 hover:text-white"
                                                        : "bg-zinc-800 text-zinc-300 hover:bg-emerald-500 hover:text-white"
                                                )}
                                                onClick={() => updateBooking('insurance')}
                                            >
                                                {bookings.insurance ? "Готово" : "Отметить полис"}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Button
                            size="lg"
                            className="h-14 w-full max-w-sm touch-manipulation rounded-full bg-white text-lg font-bold text-black shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all hover:scale-[1.02] hover:bg-zinc-200 sm:hover:scale-105"
                            disabled={!bookings.tickets || !bookings.hotel}
                            onClick={startTrip}
                        >
                            {bookings.tickets && bookings.hotel ? (
                                <span className="flex items-center gap-2">Поехали! <ArrowRight className="h-5 w-5" /></span>
                            ) : (
                                "Отметьте билеты и отель"
                            )}
                        </Button>
                    </div>
                </main>
            </div>
        )
    }


    // --- ACTIVE STATE UI ---
    return (
        <div className="min-h-screen bg-background">
            {/* Mobile Header - Visible only on small screens */}
            <div className="lg:hidden">
                <Header />
            </div>

            {/* Desktop Sidebar - Fixed */}
            <AppSidebar />

            {/* Main Content - Offset by sidebar width on desktop */}
            <main className={cn(
                "flex min-h-0 flex-col transition-all duration-300",
                /* Mobile: leave room for sticky header + fixed bottom nav (matches app/(main)/layout pb) */
                "max-lg:h-[calc(100dvh-10rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))]",
                "lg:h-screen",
                isSidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-64"
            )}>
                <header className="sticky top-0 z-30 flex shrink-0 flex-col gap-3 border-b bg-card/50 p-3 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <Link href={`/trip/${tripId}`}>
                            <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0 touch-manipulation rounded-full sm:h-10 sm:w-10">
                                <ChevronLeft className="h-6 w-6" />
                            </Button>
                        </Link>
                        <div className="min-w-0 flex-1">
                            <h1 className="line-clamp-1 text-base font-bold leading-tight sm:text-lg">{tripData?.title || "Путешествие"}</h1>
                            <p className="flex items-center gap-1 text-[11px] font-medium text-green-500 sm:text-xs">
                                <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                                Активный маршрут
                            </p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" className="h-11 w-full touch-manipulation rounded-full border-red-500/30 text-red-500 hover:bg-red-500/10 sm:h-9 sm:w-auto" onClick={finishTrip}>Завершить поездку</Button>
                </header>

                {/* Main Content Split */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row h-full relative">

                    {/* Left Panel: Itinerary Checklist (Desktop only, or Drawer content) */}
                    <div className="hidden lg:flex w-[25%] border-r bg-card/30 flex-col h-full z-10">
                        <div className="p-4 border-b shrink-0 bg-background/50 backdrop-blur">
                            <h2 className="font-bold text-muted-foreground text-sm uppercase tracking-wider flex items-center gap-2">
                                <ListIcon className="w-4 h-4" />
                                Маршрут
                            </h2>
                        </div>
                        <div className="overflow-y-auto p-4 custom-scrollbar flex-1 pb-20">
                            {tripData?.itinerary && tripData.itinerary.length > 0 ? (
                                <div className="space-y-6">
                                    {tripData.itinerary.map((day: any, idx: number) => (
                                        <div key={idx} className="relative pl-6 border-l-2 border-border pb-6 last:pb-0">
                                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary border-4 border-background" />
                                            <h3 className="font-bold mb-2 text-lg">День {day.day}: {day.title}</h3>
                                            <div className="space-y-3">
                                                {day.activities?.map((act: any, aIdx: number) => {
                                                    const actId = `${day.day}-${aIdx}`
                                                    const isCompleted = completedActivities.includes(actId)
                                                    return (
                                                        <div
                                                            key={aIdx}
                                                            className={cn(
                                                                "group flex items-start gap-3 p-3 rounded-xl transition-all cursor-pointer border",
                                                                activePlaceId === actId ? "border-primary bg-primary/5 ring-1 ring-primary" : (isCompleted ? "bg-green-500/10 border-green-500/20" : "hover:bg-muted/50 border-transparent hover:border-border")
                                                            )}
                                                            onClick={() => setActivePlaceId(actId)}
                                                        >
                                                            <div
                                                                className={cn(
                                                                    "mt-1 h-5 w-5 rounded border flex items-center justify-center shrink-0 transition-colors z-20",
                                                                    isCompleted ? "bg-green-500 border-green-500 text-white" : "border-primary/50 hover:bg-primary/10"
                                                                )}
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    toggleActivity(actId)
                                                                }}
                                                            >
                                                                {isCompleted && <CheckCircle2 className="h-3.5 w-3.5" />}
                                                            </div>
                                                            <div className={cn("transition-opacity flex-1", isCompleted ? "opacity-50" : "")}>
                                                                <div className={cn("font-medium text-sm", isCompleted && "line-through")}>{act.placeName || act.place || act.description}</div>
                                                                {act.desc && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{act.desc}</div>}
                                                                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                                                                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{act.time}</span>
                                                                    {act.cost && <span className="text-primary font-medium">{act.cost}</span>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
                                    <MapPin className="w-10 h-10 mb-2 opacity-20" />
                                    <p>Маршрут пуст или не загружен.</p>
                                </div>
                            )}
                        </div>
                    </div>


                    {/* Right Panel: Chat */}
                    <div className="hidden lg:flex w-[30%] border-l bg-background flex-col h-full z-10">
                        {/* Switch to GuideChatWidget for context-aware chat */}
                        <GuideChatWidget tripContext={chatContext} />
                    </div>

                    {/* Mobile Drawers */}
                    <MobileDrawer
                        isOpen={activeDrawer === "itinerary"}
                        onClose={() => setActiveDrawer('none')}
                        title="Ваш маршрут"
                        className="h-[60vh] pb-8"
                    >
                        {tripData?.itinerary && tripData.itinerary.length > 0 ? (
                            <div className="space-y-6 pb-20">
                                {tripData.itinerary.map((day: any, idx: number) => (
                                    <div key={idx} className="relative pl-6 border-l-2 border-border pb-6 last:pb-0">
                                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary border-4 border-background" />
                                        <h3 className="font-bold mb-2 text-lg">День {day.day}: {day.title}</h3>
                                        <div className="space-y-3">
                                            {day.activities?.map((act: any, aIdx: number) => {
                                                const actId = `${day.day}-${aIdx}`
                                                const isCompleted = completedActivities.includes(actId)
                                                return (
                                                    <div
                                                        key={aIdx}
                                                        className={cn(
                                                            "group flex items-start gap-3 p-3 rounded-xl transition-all cursor-pointer border",
                                                            activePlaceId === actId ? "border-primary bg-primary/5 ring-1 ring-primary" : (isCompleted ? "bg-green-500/10 border-green-500/20" : "hover:bg-muted/50 border-transparent hover:border-border")
                                                        )}
                                                        onClick={() => setActivePlaceId(actId)}
                                                    >
                                                        <div
                                                            className={cn(
                                                                "mt-1 h-5 w-5 rounded border flex items-center justify-center shrink-0 transition-colors z-20",
                                                                isCompleted ? "bg-green-500 border-green-500 text-white" : "border-primary/50 hover:bg-primary/10"
                                                            )}
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                toggleActivity(actId)
                                                            }}
                                                        >
                                                            {isCompleted && <CheckCircle2 className="h-3.5 w-3.5" />}
                                                        </div>
                                                        <div className={cn("transition-opacity flex-1", isCompleted ? "opacity-50 line-through" : "")}>
                                                            <div className="font-medium text-sm">{act.place || act.description}</div>
                                                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                                                <MapPin className="h-3 w-3" />
                                                                {act.time}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground p-10">Маршрут не найден</div>
                        )}
                    </MobileDrawer>

                    <MobileDrawer
                        isOpen={activeDrawer === "chat"}
                        onClose={() => setActiveDrawer('none')}
                        title="AI Ассистент"
                        className="h-[70vh] pb-8"
                    >
                        <GuideChatWidget tripContext={chatContext} />
                    </MobileDrawer>

                </div>
            </main>

            {tripData?.itinerary?.length > 0 && (
                <ItineraryChatWidget
                    layout="fab"
                    mode="guide"
                    itinerary={tripData}
                    tripDetails={{
                        ...tripData,
                        title: tripData.title || trip?.title || chatContext.title,
                    }}
                    tripId={
                        tripId &&
                        tripId !== "ai-last" &&
                        !tripId.startsWith("local-")
                            ? tripId
                            : undefined
                    }
                    activeDay={activePlace?.day ?? 1}
                    onItineraryUpdate={(newItinerary) => {
                        setTripData((prev: any) =>
                            prev ? { ...prev, itinerary: newItinerary } : prev
                        )
                    }}
                />
            )}
        </div>
    )
}
