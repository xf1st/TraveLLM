"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, MessageSquare, Map as MapIcon, ChevronLeft, CheckCircle2, Plane, Hotel, ShieldCheck, MapPin, ArrowRight, PlayCircle, ExternalLink, Ticket, Building2, Sparkles, Compass, Menu, List as ListIcon, Wallet, Globe, CloudSun } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { AppSidebar } from "@/components/app-sidebar"
import { Header } from "@/components/header"
import { ItineraryChatWidget } from "@/components/ItineraryChatWidget"
import { MobileDrawer } from "@/components/mobile-drawer"
import { GuideChatWidget } from "@/components/GuideChatWidget"
import { Footer } from "@/components/footer"
import dynamic from "next/dynamic"

// Dynamic import for Map
const TripMap = dynamic(() => import('@/components/TripMap'), { ssr: false, loading: () => <div className="h-full w-full bg-muted/20 animate-pulse flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> })

interface Place {
    id: string
    name: string
    description?: string
    status: 'visited' | 'active' | 'pending'
    day: number
    coords?: [number, number]
}

export default function GuidePage() {
    const searchParams = useSearchParams()
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
            const saved = localStorage.getItem('sidebar-collapsed') === 'true'
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

    // Helper to generate smart booking links
    const getSmartLinks = () => {
        // Try to get destination from trip metadata or first city in itinerary
        let destination = trip?.destination

        if (!destination && tripData?.itinerary?.length > 0) {
            // Extract first city from title "City: Activity" or similar
            const firstDayTitle = tripData.itinerary[0].title
            if (firstDayTitle) {
                destination = firstDayTitle.split(':')[0].trim()
            }
        }

        const query = destination ? encodeURIComponent(destination) : ""

        return {
            aviasales: destination
                ? `https://www.aviasales.ru/search?origin_iata=&destination=${query}&with_request=true`
                : "https://www.aviasales.ru",
            ostrovok: destination
                ? `https://ostrovok.ru/?q=${query}`
                : "https://ostrovok.ru",
            cherehapa: "https://www.cherehapa.ru"
        }
    }

    const smartLinks = getSmartLinks()

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

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
                    <div className="container p-6 w-full max-w-4xl mx-auto z-10 space-y-12 mb-auto">
                        {/* Hero and Trips Grid ... */}
                        {/* ... existing content ... */}

                        <div className="text-center space-y-4">
                            <Badge variant="secondary" className="px-4 py-1.5 text-sm gap-2">
                                <Sparkles className="w-4 h-4 text-primary" />
                                AI Travel Companion
                            </Badge>
                            <h1 className="text-4xl md:text-6xl font-black tracking-tight bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
                                Ваше умное путешествие
                            </h1>
                            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                                Гид, который знает ваш маршрут, подскажет лучшие места и поможет в любой ситуации. Выберите поездку, чтобы начать.
                            </p>
                        </div>

                        {/* Trips Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {loadingTrips ? (
                                Array(3).fill(0).map((_, i) => (
                                    <Card key={i} className="h-48 animate-pulse bg-muted/50 border-0" />
                                ))
                            ) : trips.length > 0 ? (
                                trips.map(trip => (
                                    <Link key={trip.id} href={`/guide?tripId=${trip.id}`} className="group block h-full">
                                        <Card className="h-full overflow-hidden border-0 bg-card hover:shadow-2xl transition-all duration-300 relative group-hover:-translate-y-2 group-hover:scale-[1.02]">
                                            {/* Status Badge */}
                                            <div className="absolute top-3 right-3 z-20">
                                                <Badge
                                                    variant={trip.status === 'active' ? 'default' : 'secondary'}
                                                    className={cn(
                                                        "shadow-lg backdrop-blur-sm",
                                                        trip.status === 'active' && "bg-green-500 hover:bg-green-600"
                                                    )}
                                                >
                                                    {trip.status === 'active' ? '🚀 В пути' : 'Планируется'}
                                                </Badge>
                                            </div>

                                            {/* Cover Image */}
                                            <div className="h-40 bg-muted relative overflow-hidden">
                                                {trip.cover_image ? (
                                                    <img
                                                        src={trip.cover_image}
                                                        alt={trip.title || trip.destination}
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                    />
                                                ) : (
                                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent" />
                                                )}
                                                {/* Dark overlay for text readability */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                                                {/* Title on image */}
                                                <div className="absolute bottom-3 left-4 right-4">
                                                    <h3 className="font-bold text-lg leading-tight text-white drop-shadow-lg line-clamp-2">
                                                        {trip.title || trip.destination}
                                                    </h3>
                                                    <div className="flex items-center gap-1 text-xs text-white/80 mt-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {trip.destination}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-4 flex items-center justify-between bg-gradient-to-r from-card to-muted/30">
                                                <p className="text-sm text-muted-foreground font-medium">
                                                    {trip.status === 'active' ? 'Продолжить →' : 'Начать поездку'}
                                                </p>
                                                <Button size="icon" variant="ghost" className="rounded-full h-8 w-8 group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-sm">
                                                    <ArrowRight className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </Card>
                                    </Link>
                                ))
                            ) : (
                                <div className="col-span-full text-center py-12 bg-muted/30 rounded-3xl border-2 border-dashed">
                                    <Compass className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-semibold">У вас пока нет маршрутов</h3>
                                    <p className="text-muted-foreground mb-6">Создайте свой первый идеальный маршрут, и я стану вашим личным гидом!</p>
                                    <Button asChild size="lg" className="gap-2">
                                        <Link href="/plan"><Sparkles className="w-4 h-4" /> Создать маршрут</Link>
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Feature Highlights */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t">
                            <div className="flex flex-col items-center text-center gap-3">
                                <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                                    <MessageSquare className="w-6 h-6" />
                                </div>
                                <h3 className="font-semibold">Умный Чат</h3>
                                <p className="text-sm text-muted-foreground">Задавайте любые вопросы: "где поесть?", "как доехать?", "что интересного рядом?".</p>
                            </div>
                            <div className="flex flex-col items-center text-center gap-3">
                                <div className="p-3 rounded-2xl bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <h3 className="font-semibold">Чек-листы</h3>
                                <p className="text-sm text-muted-foreground">Отслеживайте билеты, брони и подготовку к поездке в удобном формате.</p>
                            </div>
                            <div className="flex flex-col items-center text-center gap-3">
                                <div className="p-3 rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">
                                    <PlayCircle className="w-6 h-6" />
                                </div>
                                <h3 className="font-semibold">Живой маршрут</h3>
                                <p className="text-sm text-muted-foreground">Маршрут адаптируется под вас в реальном времени. Просто отмечайте посещенные места.</p>
                            </div>
                        </div>
                    </div>
                    <Footer />
                </main>
            </div>
        )
    }

    // --- BOOKING STATE UI ---
    if (viewMode === "booking") {
        return (
            <div className="min-h-screen bg-background">
                {/* Mobile Header - Visible only on small screens */}
                <div className="lg:hidden">
                    <Header />
                </div>

                {/* Desktop Sidebar - Fixed, hidden on mobile */}
                <AppSidebar />

                {/* Main Content - Offset by sidebar width on desktop */}
                <main className={cn(
                    "min-h-screen transition-all duration-300 flex flex-col",
                    isSidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-64"
                )}>
                    {/* Header ... */}
                    {/* Content ... */}
                    {/* I will inject footer at the end of main */}
                    <header className="p-4 border-b flex items-center gap-4 bg-card/50 backdrop-blur-md sticky top-0 z-30 shrink-0">
                        <Link href={`/trip/${tripId}`}>
                            <Button variant="ghost" size="icon" className="rounded-full">
                                <ChevronLeft className="h-6 w-6" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="font-bold text-lg leading-tight line-clamp-1">{tripData?.title || "Подготовка к путешествию"}</h1>
                            <p className="text-xs text-muted-foreground">Этап бронирования</p>
                        </div>
                    </header>

                    <div className="flex-1 container max-w-2xl mx-auto p-6 flex flex-col items-center justify-center overflow-y-auto custom-scrollbar pb-20">
                        {/* Booking cards content... I'm skipping replacement of inner logic to keep it concise, just adding Footer at the end of container is tricky if I don't replace whole block */}
                        {/* Let's try to target specific lines for replacement */}

                        <div className="text-center mb-10 mt-4 lg:mt-0">
                            <h2 className="text-3xl font-bold mb-3">Готовы лететь? ✈️</h2>
                            <p className="text-muted-foreground">Давайте проверим, все ли готово перед тем как включить режим "В пути".</p>
                        </div>

                        <div className="w-full space-y-4 mb-10">
                            {/* Tickets Card */}
                            <Card className={cn(
                                "p-0 overflow-hidden transition-all border-2",
                                bookings.tickets ? "border-green-500 bg-green-500/5" : "hover:border-primary/50"
                            )}>
                                {/* ... Tickets Content ... */}
                                <div className="p-5 flex items-start gap-4">
                                    <div className={cn("mt-1 h-10 w-10 rounded-full flex items-center justify-center shrink-0", bookings.tickets ? "bg-green-500 text-white" : "bg-blue-100 text-blue-600")}>
                                        <Plane className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-semibold text-lg">Авиабилеты</h3>
                                            {bookings.tickets && <Badge variant="default" className="bg-green-500 hover:bg-green-600">Куплено</Badge>}
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-4">Найдите и купите билеты на Aviasales</p>

                                        <div className="flex gap-2 flex-wrap">
                                            <Button variant="outline" size="sm" className="gap-2" asChild>
                                                <a href={smartLinks.aviasales} target="_blank" rel="noopener noreferrer">
                                                    <Ticket className="h-4 w-4" />
                                                    Найти билеты
                                                    <ExternalLink className="h-3 w-3 opacity-50" />
                                                </a>
                                            </Button>
                                            <Button
                                                variant={bookings.tickets ? "ghost" : "secondary"}
                                                size="sm"
                                                className={cn("gap-2", bookings.tickets && "text-green-600 hover:text-green-700 hover:bg-green-100")}
                                                onClick={() => updateBooking('tickets')}
                                            >
                                                {bookings.tickets ? <CheckCircle2 className="h-4 w-4" /> : null}
                                                {bookings.tickets ? "Отмечено как купленное" : "Отметить, что купил"}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            {/* Hotel Card */}
                            <Card className={cn(
                                "p-0 overflow-hidden transition-all border-2",
                                bookings.hotel ? "border-green-500 bg-green-500/5" : "hover:border-primary/50"
                            )}>
                                {/* ... Hotel Content ... */}
                                <div className="p-5 flex items-start gap-4">
                                    <div className={cn("mt-1 h-10 w-10 rounded-full flex items-center justify-center shrink-0", bookings.hotel ? "bg-green-500 text-white" : "bg-indigo-100 text-indigo-600")}>
                                        <Hotel className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-semibold text-lg">Жилье</h3>
                                            {bookings.hotel && <Badge variant="default" className="bg-green-500 hover:bg-green-600">Забронировано</Badge>}
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-4">Забронируйте отель на Ostrovok или Booking</p>

                                        <div className="flex gap-2 flex-wrap">
                                            <Button variant="outline" size="sm" className="gap-2" asChild>
                                                <a href={smartLinks.ostrovok} target="_blank" rel="noopener noreferrer">
                                                    <Building2 className="h-4 w-4" />
                                                    Ostrovok
                                                    <ExternalLink className="h-3 w-3 opacity-50" />
                                                </a>
                                            </Button>
                                            <Button
                                                variant={bookings.hotel ? "ghost" : "secondary"}
                                                size="sm"
                                                className={cn("gap-2", bookings.hotel && "text-green-600 hover:text-green-700 hover:bg-green-100")}
                                                onClick={() => updateBooking('hotel')}
                                            >
                                                {bookings.hotel ? <CheckCircle2 className="h-4 w-4" /> : null}
                                                {bookings.hotel ? "Отмечено как забронированное" : "Отметить, что забронировал"}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            {/* Insurance Card */}
                            <Card className={cn(
                                "p-0 overflow-hidden transition-all border-2",
                                bookings.insurance ? "border-green-500 bg-green-500/5" : "hover:border-primary/50"
                            )}>
                                {/* ... Insurance Content ... */}
                                <div className="p-5 flex items-start gap-4">
                                    <div className={cn("mt-1 h-10 w-10 rounded-full flex items-center justify-center shrink-0", bookings.insurance ? "bg-green-500 text-white" : "bg-orange-100 text-orange-600")}>
                                        <ShieldCheck className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-semibold text-lg">Страховка</h3>
                                            {bookings.insurance && <Badge variant="default" className="bg-green-500 hover:bg-green-600">Оформлено</Badge>}
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-4">Медицинская страховка для безопасности</p>

                                        <div className="flex gap-2 flex-wrap">
                                            <Button variant="outline" size="sm" className="gap-2" asChild>
                                                <a href="https://www.cherehapa.ru" target="_blank" rel="noopener noreferrer">
                                                    <ShieldCheck className="h-4 w-4" />
                                                    Cherehapa
                                                    <ExternalLink className="h-3 w-3 opacity-50" />
                                                </a>
                                            </Button>
                                            <Button
                                                variant={bookings.insurance ? "ghost" : "secondary"}
                                                size="sm"
                                                className={cn("gap-2", bookings.insurance && "text-green-600 hover:text-green-700 hover:bg-green-100")}
                                                onClick={() => updateBooking('insurance')}
                                            >
                                                {bookings.insurance ? <CheckCircle2 className="h-4 w-4" /> : null}
                                                {bookings.insurance ? "Отмечено как оформленное" : "Отметить, что оформил"}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        <Button
                            size="lg"
                            className="w-full max-w-sm h-14 text-lg rounded-full font-bold shadow-lg shadow-primary/20"
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
                    <Footer />
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
                    <Button variant="outline" size="sm" className="hidden md:flex">Завершить поездку</Button>
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
