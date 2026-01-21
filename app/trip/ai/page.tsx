"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Sparkles, MapPin, CheckCircle2, Circle, Navigation } from "lucide-react"
import dynamic from "next/dynamic"
import { GuideChatWidget } from "@/components/GuideChatWidget"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Dynamic import for Map to avoid SSR issues with Leaflet
const TripMap = dynamic(() => import('@/components/TripMap'), { ssr: false, loading: () => <div className="h-full w-full bg-muted animate-pulse rounded-2xl" /> })

interface Place {
    id: string
    name: string
    description: string
    status: 'visited' | 'active' | 'pending'
    day: number
    time: 'morning' | 'daytime' | 'night'
}

export default function AIDetailPage() {
    const router = useRouter()
    const [route, setRoute] = useState<any>(null)
    const [activePlaceId, setActivePlaceId] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<'map' | 'list'>('map')

    useEffect(() => {
        const stored = localStorage.getItem("lastGeneratedRoute")
        if (stored) {
            setRoute(JSON.parse(stored))
        }
    }, [])

    // Transform itinerary into flat list of places for Map and Context
    const places = useMemo<Place[]>(() => {
        if (!route || !route.itinerary) return []

        const list: Place[] = []
        route.itinerary.forEach((day: any, idx: number) => {
            const dayNum = idx + 1
            // Helper to parsing place name from text (naive)
            const extractName = (text: string) => {
                const parts = text.split('.')
                return parts[0].length < 40 ? parts[0] : `День ${dayNum}: Активность`
            }

            if (day.morning) list.push({ id: `d${dayNum}-m`, name: extractName(day.morning), description: day.morning, status: 'pending', day: dayNum, time: 'morning' })
            if (day.daytime) list.push({ id: `d${dayNum}-d`, name: extractName(day.daytime), description: day.daytime, status: 'pending', day: dayNum, time: 'daytime' })
            if (day.night) list.push({ id: `d${dayNum}-n`, name: extractName(day.night), description: day.night, status: 'pending', day: dayNum, time: 'night' })
        })

        // Mark first as active by default if none selected
        if (list.length > 0) {
            list[0].status = 'active'
        }
        return list
    }, [route])

    useEffect(() => {
        if (!activePlaceId && places.length > 0) {
            setActivePlaceId(places[0].id)
        }
    }, [places, activePlaceId])

    const activePlace = places.find(p => p.id === activePlaceId)

    // Context for Chat
    const chatContext = {
        title: route?.title || "Мое путешествие",
        currentLocation: activePlace?.name,
        currentDay: activePlace?.day,
        completedSteps: places.filter(p => p.status === 'visited').map(p => p.name),
        upcomingSteps: places.filter(p => p.status === 'pending').map(p => p.name)
    }

    const handlePlaceClick = (id: string) => {
        setActivePlaceId(id)
        // Update status logic could be here (mark previous as visited)
    }

    if (!route) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header />

            <main className="flex-1 container max-w-7xl px-4 py-6 h-[calc(100vh-80px)] overflow-hidden">
                <Button variant="ghost" onClick={() => router.back()} className="mb-4 gap-2">
                    <ArrowLeft className="h-4 w-4" /> Назад к маршруту
                </Button>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full pb-4">
                    {/* Left Panel: Itinerary List & Chat */}
                    <div className="lg:col-span-4 flex flex-col gap-4 h-full overflow-hidden">
                        <Tabs defaultValue="itinerary" className="flex-1 flex flex-col overflow-hidden">
                            <TabsList className="w-full">
                                <TabsTrigger value="itinerary" className="flex-1">Маршрут</TabsTrigger>
                                <TabsTrigger value="chat" className="flex-1 gap-2"><Sparkles className="h-3 w-3" /> ИИ-Гид</TabsTrigger>
                            </TabsList>

                            <TabsContent value="itinerary" className="flex-1 overflow-auto pr-2 relative mt-4">
                                <div className="space-y-6">
                                    {route.itinerary?.map((day: any, idx: number) => (
                                        <div key={idx} className="relative pl-6 border-l-2 border-border ml-3 pb-6 last:pb-0">
                                            <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-primary ring-4 ring-background" />
                                            <h3 className="font-bold text-lg mb-3 leading-none">День {day.day}</h3>

                                            <div className="space-y-3">
                                                {['morning', 'daytime', 'night'].map((time) => {
                                                    const place = places.find(p => p.day === idx + 1 && p.time === time)
                                                    if (!place) return null
                                                    const isActive = place.id === activePlaceId

                                                    return (
                                                        <Card
                                                            key={place.id}
                                                            onClick={() => handlePlaceClick(place.id)}
                                                            className={`p-3 cursor-pointer transition-all hover:shadow-md ${isActive ? 'border-primary ring-1 ring-primary bg-primary/5' : ''}`}
                                                        >
                                                            <div className="flex justify-between items-start mb-1">
                                                                <Badge variant="outline" className="uppercase text-[10px] tracking-wider">
                                                                    {time === 'morning' ? 'Утро' : time === 'daytime' ? 'День' : 'Вечер'}
                                                                </Badge>
                                                                {isActive && <Badge className="bg-primary text-[10px]">Сейчас</Badge>}
                                                            </div>
                                                            <p className="text-sm font-medium line-clamp-2 leading-snug">{place.name}</p>
                                                            {isActive && (
                                                                <p className="text-xs text-muted-foreground mt-2 line-clamp-3">
                                                                    {place.description}
                                                                </p>
                                                            )}
                                                        </Card>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>

                            <TabsContent value="chat" className="flex-1 mt-4 h-full">
                                <GuideChatWidget tripContext={chatContext} />
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Right Panel: Interactive Map */}
                    <div className="lg:col-span-8 h-[50vh] lg:h-full rounded-2xl overflow-hidden shadow-lg border border-border relative">
                        <div className="absolute top-4 left-4 z-10 bg-background/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-medium shadow-sm border border-border flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-primary" />
                            {activePlace?.name || route.destination}
                        </div>
                        <TripMap
                            places={places}
                            activePlaceId={activePlaceId || undefined}
                            onPlaceSelect={handlePlaceClick}
                        />
                        {/* Desktop Chat Overlay (Optional - maybe too cluttered, keep in tabs for now) */}
                    </div>
                </div>
            </main>
        </div>
    )
}
