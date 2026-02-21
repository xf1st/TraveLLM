"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, MessageSquare, Map as MapIcon, ChevronLeft, CheckCircle2, Plane, Hotel, ShieldCheck, MapPin, ArrowRight, PlayCircle, ExternalLink, Ticket, Building2, Sparkles, Compass, Menu, List as ListIcon, Wallet, Globe, CloudSun, Pause, Play } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { generateTripBookingLinks, getInsuranceLink } from "@/lib/travelpayouts"
import { AppSidebar } from "@/components/app-sidebar"
import { Header } from "@/components/header"
import { ItineraryChatWidget } from "@/components/ItineraryChatWidget"
import { MobileDrawer } from "@/components/mobile-drawer"
import { GuideChatWidget } from "@/components/GuideChatWidget"
import { Footer } from "@/components/footer"
import dynamic from "next/dynamic"

import { PremiumLoader } from "@/components/PremiumLoader"

// Dynamic import for Map
const TripMap = dynamic(() => import('@/components/TripMap'), { ssr: false, loading: () => <div className="h-full w-full bg-muted/20 flex items-center justify-center"><PremiumLoader text="Загрузка карты..." /></div> })

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
                <PremiumLoader text="Загружаем гид..." />
            </div>
        }>
            <GuidePageContent />
        </Suspense>
    )
}

function GuidePageContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
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

    // Demo Mode State
    const [isDemoPlaying, setIsDemoPlaying] = useState(false)
    const [userLocation, setUserLocation] = useState<[number, number] | undefined>(undefined)
    const [demoTargetIndex, setDemoTargetIndex] = useState(0)

    // Demo Integration in TripMap
    // We need to inject coords into 'places' from TripMap logic first, but TripMap handles that internally.
    // So we will rely on mapped places in TripMap? No, we need coords here.
    // For this demo, let's assume TripMap will effectively give us coords or we mock them the same way.
    // Actually, we can just use the same CITY_COORDS logic here or let TripMap drive.
    // Better: We will start the demo only if places have coordinates.
    // Since TripMap mocks coords internally, we should duplicate that simple logic here or expose it.
    // To be quick and robust, let's copy the mock logic to 'places' state effects.

    const CITY_COORDS_MOCK: Record<string, [number, number]> = {
        "Москва": [55.7558, 37.6173], "Санкт-Петербург": [59.9343, 30.3351], "Казань": [55.7963, 49.1088],
        "Сочи": [43.6028, 39.7342], "Париж": [48.8566, 2.3522], "Рим": [41.9028, 12.4964],
        "Лондон": [51.5074, -0.1278], "Токио": [35.6762, 139.6503], "Дубай": [25.2048, 55.2708],
        "Нью-Йорк": [40.7128, -74.0060], "Бангкок": [13.7563, 100.5018], "Бали": [-8.3405, 115.0920]
    }

    // Effect for Demo Loop - optimized with requestAnimationFrame
    useEffect(() => {
        if (!isDemoPlaying || places.length < 2) return

        let animationFrameId: number
        let lastTime = performance.now()
        const interval = 200 // 5 FPS instead of 10 - better mobile performance

        const updatePosition = (currentTime: number) => {
            if (currentTime - lastTime >= interval) {
                lastTime = currentTime
                
                // Find current target place
                const target = places[demoTargetIndex]
                if (!target) {
                    setDemoTargetIndex(0) // Loop back
                    animationFrameId = requestAnimationFrame(updatePosition)
                    return
                }

                // Get target coords (mock if missing)
                let targetCoords = target.coords
                if (!targetCoords) {
                    // Try to find
                    const foundCity = Object.keys(CITY_COORDS_MOCK).find(c => target.name.includes(c) || target.description?.includes(c))
                    if (foundCity) targetCoords = CITY_COORDS_MOCK[foundCity]
                    else targetCoords = [55.7558 + (Math.random() * 0.1), 37.6173 + (Math.random() * 0.1)] // Random near Moscow default
                }

                if (!userLocation) {
                    setUserLocation(targetCoords)
                    animationFrameId = requestAnimationFrame(updatePosition)
                    return
                }

                // Move towards target
                const [lat, lng] = userLocation
                const [tLat, tLng] = targetCoords!

                const dist = Math.sqrt(Math.pow(tLat - lat, 2) + Math.pow(tLng - lng, 2))

                if (dist < 0.005) { // Arrived
                    setActivePlaceId(target.id) // UI Update
                    setDemoTargetIndex(prev => (prev + 1) % places.length) // Next target
                } else {
                    // Interpolate
                    const step = 0.02 // Speed
                    const angle = Math.atan2(tLng - lng, tLat - lat)
                    setUserLocation([
                        lat + Math.cos(angle) * step,
                        lng + Math.sin(angle) * step
                    ])
                }
            }
            animationFrameId = requestAnimationFrame(updatePosition)
        }

        animationFrameId = requestAnimationFrame(updatePosition)

        return () => {
            cancelAnimationFrame(animationFrameId)
        }
    }, [isDemoPlaying, places, demoTargetIndex, userLocation])

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
        ostrovok: "https://ostrovok.ru",
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
                })

                setSmartLinks({
                    aviasales: bookingLinks.flights,
                    ostrovok: bookingLinks.hotels,
                    cherehapa: bookingLinks.insurance
                })
            } catch (error) {
                console.error("Error generating booking links:", error);
            }
        }
        
        if (trip || tripData) {
            fetchLinks()
        }
    }, [trip, tripData])

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
            router.push('/results')
        } catch (e) {
            console.error("Failed to finish trip", e)
            router.push('/results')
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
                    "flex-1 transition-all duration-300 flex flex-col pt-24 relative",
                    "lg:ml-64",
                    isSidebarCollapsed && "lg:ml-[72px]"
                )}>
                    <div className="container p-6 w-full max-w-5xl mx-auto z-10 space-y-12 mb-auto">
                        <div className="text-center space-y-4">
                            <Badge variant="secondary" className="px-4 py-1.5 text-sm gap-2 bg-primary/10 text-primary border-primary/20 backdrop-blur-sm">
                                <Sparkles className="w-4 h-4" />
                                AI Travel Companion
                            </Badge>
                            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white mb-2">
                                Ваше умное <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">путешествие</span>
                            </h1>
                            <p className="text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                                Гид, который знает ваш маршрут, подскажет лучшие места и поможет в любой ситуации. Выберите поездку, чтобы начать.
                            </p>
                        </div>

                        {/* Trips Grid - Dark Glass Style */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Create New Trip Card */}
                            <Link href="/plan" className="group block h-full">
                                <Card className="h-64 relative overflow-hidden border border-dashed border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-300 rounded-[2rem] flex flex-col items-center justify-center text-center gap-4 group-hover:scale-[1.02]">
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
                                    <Card key={i} className="h-64 animate-pulse bg-zinc-900 border-white/5 rounded-[2rem]" />
                                ))
                            ) : trips.length > 0 ? (
                                trips.map(trip => (
                                    <Link key={trip.id} href={`/guide?tripId=${trip.id}`} className="group block h-full">
                                        <Card className="h-full relative overflow-hidden border border-white/5 bg-zinc-900 shadow-2xl backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:shadow-primary/10 rounded-[2rem]">
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
                                            <div className="relative h-48 w-full overflow-hidden">
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

                                            <div className="p-6 pt-2 flex items-center justify-between">
                                                <span className="text-xs font-medium text-zinc-500">Нажмите, чтобы открыть</span>
                                                <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-primary group-hover:text-white transition-all">
                                                    <ArrowRight className="w-4 h-4" />
                                                </div>
                                            </div>
                                        </Card>
                                    </Link>
                                ))
                            ) : (
                                <div className="col-span-full text-center py-16 bg-zinc-900/50 rounded-[2rem] border border-white/5 border-dashed backdrop-blur-sm">
                                    <div className="mx-auto h-16 w-16 bg-zinc-800/50 rounded-full flex items-center justify-center mb-6">
                                        <Compass className="w-8 h-8 text-zinc-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">У вас пока нет маршрутов</h3>
                                    <p className="text-zinc-400 mb-8 max-w-md mx-auto">Создайте свой первый идеальный маршрут, и я стану вашим личным гидом!</p>
                                    <Button asChild size="lg" className="rounded-full bg-white text-black hover:bg-white/90 font-bold px-8 h-12 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                                        <Link href="/plan"><Sparkles className="w-4 h-4 mr-2 text-purple-500" /> Создать маршрут</Link>
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Feature Highlights - Clean Glass */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 border-t border-white/5">
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
                    "min-h-screen transition-all duration-300 flex flex-col pt-16 lg:pt-0",
                    isSidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-64"
                )}>
                    <header className="px-6 py-4 flex items-center gap-4 bg-background/80 backdrop-blur-xl sticky top-0 z-30 shrink-0 border-b border-white/5">
                        <Link href={`/trip/${tripId}`}>
                            <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10">
                                <ChevronLeft className="h-6 w-6" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="font-bold text-lg leading-tight line-clamp-1 text-white">{tripData?.title || "Подготовка к путешествию"}</h1>
                            <p className="text-xs text-zinc-400 font-medium">Этап бронирования</p>
                        </div>
                    </header>

                    <div className="flex-1 container max-w-2xl mx-auto p-6 flex flex-col items-center justify-center min-h-[80vh]">

                        <div className="text-center mb-10">
                            <h2 className="text-4xl font-black mb-3 text-white">Готовы лететь? ✈️</h2>
                            <p className="text-zinc-400 text-lg">Давайте проверим готовность перед стартом.</p>
                        </div>

                        <div className="w-full space-y-4 mb-10">
                            {/* Tickets Card */}
                            <div className={cn(
                                "group relative overflow-hidden rounded-3xl border transition-all duration-300",
                                bookings.tickets
                                    ? "bg-emerald-500/10 border-emerald-500/30"
                                    : "bg-zinc-900/50 border-white/5 hover:bg-zinc-900 hover:border-white/10"
                            )}>
                                <div className="p-6 flex items-start gap-5">
                                    <div className={cn("mt-1 h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors", bookings.tickets ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-blue-500/10 text-blue-400")}>
                                        <Plane className="h-6 w-6" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-bold text-xl text-white">Авиабилеты</h3>
                                            {bookings.tickets && (
                                                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Куплено
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-sm text-zinc-400 mb-5 leading-relaxed">Самый важный шаг. Найдите лучшие рейсы и зафиксируйте цены.</p>

                                        <div className="flex gap-3 flex-wrap">
                                            <Button variant="outline" size="sm" className="gap-2 rounded-full border-white/10 bg-white/5 hover:bg-white/10 hover:text-white text-zinc-300 h-10 px-5" asChild>
                                                <a href={smartLinks.aviasales} target="_blank" rel="noopener noreferrer">
                                                    <Ticket className="h-4 w-4 text-blue-400" />
                                                    Найти на Aviasales
                                                    <ExternalLink className="h-3 w-3 opacity-30 ml-1" />
                                                </a>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={cn(
                                                    "gap-2 rounded-full h-10 px-5 font-bold transition-all",
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
                                <div className="p-6 flex items-start gap-5">
                                    <div className={cn("mt-1 h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors", bookings.hotel ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-purple-500/10 text-purple-400")}>
                                        <Hotel className="h-6 w-6" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-bold text-xl text-white">Жилье</h3>
                                            {bookings.hotel && (
                                                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Забронировано
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-sm text-zinc-400 mb-5 leading-relaxed">Забронируйте отель заранее, чтобы не переплачивать в последний момент.</p>

                                        <div className="flex gap-3 flex-wrap">
                                            <Button variant="outline" size="sm" className="gap-2 rounded-full border-white/10 bg-white/5 hover:bg-white/10 hover:text-white text-zinc-300 h-10 px-5" asChild>
                                                <a href={smartLinks.ostrovok} target="_blank" rel="noopener noreferrer">
                                                    <Building2 className="h-4 w-4 text-purple-400" />
                                                    Ostrovok
                                                    <ExternalLink className="h-3 w-3 opacity-30 ml-1" />
                                                </a>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={cn(
                                                    "gap-2 rounded-full h-10 px-5 font-bold transition-all",
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
                                <div className="p-6 flex items-start gap-5">
                                    <div className={cn("mt-1 h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors", bookings.insurance ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-orange-500/10 text-orange-400")}>
                                        <ShieldCheck className="h-6 w-6" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-bold text-xl text-white">Страховка</h3>
                                            {bookings.insurance && (
                                                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Оформлено
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-sm text-zinc-400 mb-5 leading-relaxed">Безопасность превыше всего. Оформите полис онлайн за 5 минут.</p>

                                        <div className="flex gap-3 flex-wrap">
                                            <Button variant="outline" size="sm" className="gap-2 rounded-full border-white/10 bg-white/5 hover:bg-white/10 hover:text-white text-zinc-300 h-10 px-5" asChild>
                                                <a href="https://www.cherehapa.ru" target="_blank" rel="noopener noreferrer">
                                                    <ShieldCheck className="h-4 w-4 text-orange-400" />
                                                    Cherehapa
                                                    <ExternalLink className="h-3 w-3 opacity-30 ml-1" />
                                                </a>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={cn(
                                                    "gap-2 rounded-full h-10 px-5 font-bold transition-all",
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
                            className="w-full max-w-sm h-14 text-lg rounded-full font-bold shadow-[0_0_20px_rgba(255,255,255,0.2)] bg-white text-black hover:bg-zinc-200 transition-all hover:scale-105"
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
                "h-[calc(100vh-57px)] lg:h-screen transition-all duration-300 flex flex-col",
                isSidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-64"
            )}>
                <header className="p-4 border-b flex items-center gap-4 bg-card/50 backdrop-blur-md sticky top-0 z-30 justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <Link href={`/trip/${tripId}`}>
                            <Button variant="ghost" size="icon" className="rounded-full">
                                <ChevronLeft className="h-6 w-6" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="font-bold text-lg leading-tight line-clamp-1">{tripData?.title || "Путешествие"}</h1>
                            <p className="text-xs text-green-500 font-medium flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                Активный маршрут
                            </p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" className="hidden md:flex rounded-full border-red-500/30 text-red-500 hover:bg-red-500/10" onClick={finishTrip}>Завершить поездку</Button>
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

                    {/* Middle Panel: Interactive Map + Info Cards */}
                    <div className="flex-1 relative h-full bg-muted/10 flex flex-col overflow-hidden">
                        <div className="flex-1 relative min-h-0">
                            <TripMap
                                places={places}
                                activePlaceId={activePlaceId || undefined}
                                onPlaceSelect={handlePlaceSelect}
                            />
                            {/* Current Place Overlay */}
                            {activePlace && (
                                <div className="absolute top-4 left-4 z-[400] bg-background/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-medium shadow-sm border border-border flex items-center gap-2 max-w-[80%]">
                                    <MapPin className="h-3 w-3 text-primary" />
                                    <span className="truncate">День {activePlace.day}: {activePlace.name}</span>
                                </div>
                            )}

                            {/* Mobile Controls Overlay */}
                            <div className="absolute bottom-6 left-4 right-4 flex gap-4 lg:hidden z-[400]">
                                <Button
                                    size="lg"
                                    className="flex-1 shadow-xl"
                                    variant={activeDrawer === "itinerary" ? "default" : "secondary"}
                                    onClick={() => setActiveDrawer(activeDrawer === "itinerary" ? "none" : "itinerary")}
                                >
                                    <ListIcon className="w-4 h-4 mr-2" />
                                    Маршрут
                                </Button>
                                <Button
                                    size="lg"
                                    className="flex-1 shadow-xl"
                                    variant={activeDrawer === "chat" ? "default" : "secondary"}
                                    onClick={() => setActiveDrawer(activeDrawer === "chat" ? "none" : "chat")}
                                >
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    Гид
                                </Button>
                            </div>

                            {/* Demo Mode Toggle */}
                            <div className="absolute top-4 right-4 z-[400]">
                                <Button
                                    size="sm"
                                    variant={isDemoPlaying ? "destructive" : "secondary"}
                                    className="shadow-xl rounded-full font-bold backdrop-blur-md bg-background/80 hover:bg-background"
                                    onClick={() => {
                                        if (!isDemoPlaying) {
                                            // Start from current active or first
                                            const startIdx = places.findIndex(p => p.id === activePlaceId)
                                            setDemoTargetIndex(startIdx !== -1 ? (startIdx + 1) % places.length : 0)
                                            if (!userLocation && places.length > 0) {
                                                // Initialize loc approx
                                                setUserLocation([55.75, 37.61])
                                            }
                                        }
                                        setIsDemoPlaying(!isDemoPlaying)
                                    }}
                                >
                                    {isDemoPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2 text-primary" />}
                                    {isDemoPlaying ? "Стоп демо" : "Демо поездки"}
                                </Button>
                            </div>
                        </div>

                        {/* Info Cards (Bottom Panel) */}
                        <div className="h-48 shrink-0 bg-background border-t p-4 overflow-x-auto custom-scrollbar">
                            <div className="flex gap-4 h-full min-w-max">
                                {/* Budget Card */}
                                <Card className="w-64 p-4 flex flex-col justify-between hover:border-primary/50 transition-colors cursor-pointer group">
                                    <div className="flex items-start justify-between">
                                        <div className="p-2 bg-green-500/10 text-green-600 rounded-lg group-hover:bg-green-500 group-hover:text-white transition-colors">
                                            <Wallet className="h-5 w-5" />
                                        </div>
                                        <Badge variant="outline">Финансы</Badge>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-sm mb-1">Бюджет поездки</h4>
                                        <p className="text-xs text-muted-foreground">Примерные расходы: $120/день. Карты принимают везде.</p>
                                    </div>
                                </Card>

                                {/* Safety Card */}
                                <Card className="w-64 p-4 flex flex-col justify-between hover:border-primary/50 transition-colors cursor-pointer group">
                                    <div className="flex items-start justify-between">
                                        <div className="p-2 bg-red-500/10 text-red-600 rounded-lg group-hover:bg-red-500 group-hover:text-white transition-colors">
                                            <ShieldCheck className="h-5 w-5" />
                                        </div>
                                        <Badge variant="outline">Безопасно</Badge>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-sm mb-1">Экстренные номера</h4>
                                        <p className="text-xs text-muted-foreground">Полиция: 112. Скорая: 103. Район спокойный.</p>
                                    </div>
                                </Card>

                                {/* Weather Card */}
                                <Card className="w-64 p-4 flex flex-col justify-between hover:border-primary/50 transition-colors cursor-pointer group">
                                    <div className="flex items-start justify-between">
                                        <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                            <CloudSun className="h-5 w-5" />
                                        </div>
                                        <Badge variant="outline">Прогноз</Badge>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-sm mb-1">Погода</h4>
                                        <p className="text-xs text-muted-foreground">Ожидается +20°C, солнечно. Возьмите головной убор.</p>
                                    </div>
                                </Card>

                                {/* Visa/Docs Card */}
                                <Card className="w-64 p-4 flex flex-col justify-between hover:border-primary/50 transition-colors cursor-pointer group">
                                    <div className="flex items-start justify-between">
                                        <div className="p-2 bg-purple-500/10 text-purple-600 rounded-lg group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                            <Globe className="h-5 w-5" />
                                        </div>
                                        <Badge variant="outline">Документы</Badge>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-sm mb-1">Виза и въезд</h4>
                                        <p className="text-xs text-muted-foreground">Проверьте срок действия паспорта. Виза не требуется.</p>
                                    </div>
                                </Card>
                            </div>
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
                        title="AI Гид"
                        className="h-[70vh] pb-8"
                    >
                        <GuideChatWidget tripContext={chatContext} />
                    </MobileDrawer>

                </div>
            </main>
        </div>
    )
}
