"use client"

import { useState, useEffect, Suspense, useRef } from "react"
import { useSearchParams } from "next/navigation"
import dynamic from "next/dynamic"
import Link from "next/link"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, ArrowRight, Sparkles, MapPin, Loader2, CheckCircle2, Wallet, Camera, Mountain, Music, Tent, TreeDeciduous, Utensils, Waves, Landmark, ShoppingBag, Palmtree } from "lucide-react"
import Image from "next/image"
import { TripImage } from "@/components/TripImage"
import { FadeIn } from "@/components/FadeIn"
import { RouteSearch } from "@/components/RouteSearch"
import { supabase } from "@/lib/supabase"

// Dynamic import for WebGL component (client-side only)
const LightRays = dynamic(() => import('@/components/LightRays'), { ssr: false })

const mockRecommendations = [
  {
    id: "rec-1",
    title: "Тбилиси и винные долины",
    destination: "Грузия",
    duration: "7 дней",
    tags: ["гастрономия", "культура", "вино"],
    safetyLevel: 9,
    budget: "75 000 ₽",
    image: "https://upload.wikimedia.org/wikipedia/commons/a/a2/Tbilisi_View.jpg",
    description: "Идеальный маршрут для гастрономического путешествия с винными турами в Кахетию",
    style: "Сбалансированный",
  },
  {
    id: "rec-2",
    title: "Батуми: Магия Черного моря",
    destination: "Грузия",
    duration: "7 дней",
    tags: ["море", "пляж", "релакс"],
    safetyLevel: 9,
    budget: "65 000 ₽",
    image: "https://images.unsplash.com/photo-1561338153-652ed9650058?auto=format&fit=crop&q=80&w=800",
    description: "Спокойный отдых на Черноморском побережье с морепродуктами и закатами",
    style: "Расслабленный",
  },
  {
    id: "rec-3",
    title: "Золотое кольцо России",
    destination: "Россия",
    duration: "5 дней",
    tags: ["история", "культура", "храмы"],
    safetyLevel: 10,
    budget: "45 000 ₽",
    image: "https://images.unsplash.com/photo-1547448415-e9f0b291c107?auto=format&fit=crop&q=80&w=800",
    description: "Древние города: Владимир, Суздаль, Ярославль с посещением храмов и монастырей",
    style: "Культурный",
  },
  {
    id: "rec-4",
    title: "Стамбул: Город контрастов",
    destination: "Турция",
    duration: "5 дней",
    tags: ["история", "шопинг", "еда"],
    safetyLevel: 8,
    budget: "60 000 ₽",
    image: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&q=80&w=800",
    description: "Погружение в культуру бывшей столицы Римской, Византийской и Османской империй",
    style: "Насыщенный",
  },
  {
    id: "rec-5",
    title: "Сочи: Горы и Море",
    destination: "Россия",
    duration: "7 дней",
    tags: ["природа", "активный", "горы"],
    safetyLevel: 10,
    budget: "85 000 ₽",
    image: "https://images.unsplash.com/photo-1612194600203-34e2c244b7d0?auto=format&fit=crop&q=80&w=800",
    description: "Уникальное сочетание горнолыжных курортов и морского побережья",
    style: "Активный",
  }
]

const tagColors: Record<string, string> = {
  "пляж": "bg-sky-200 text-sky-900 border-none",
  "шопинг": "bg-pink-200 text-pink-900 border-none",
  "аквапарк": "bg-cyan-200 text-cyan-900 border-none",
  "горы": "bg-emerald-200 text-emerald-900 border-none",
  "море": "bg-blue-200 text-blue-900 border-none",
  "торговые центры": "bg-purple-200 text-purple-900 border-none",
  "природа": "bg-green-200 text-green-900 border-none",
  "культура": "bg-amber-200 text-amber-900 border-none",
  "развлечения": "bg-rose-200 text-rose-900 border-none",
  "вино": "bg-purple-200 text-purple-900 border-none",
  "гастрономия": "bg-orange-200 text-orange-900 border-none",
  "еда": "bg-orange-200 text-orange-900 border-none",
  "релакс": "bg-teal-200 text-teal-900 border-none",
  "храмы": "bg-stone-200 text-stone-900 border-none",
  "история": "bg-amber-100 text-amber-900 border-none",
  "активный": "bg-lime-200 text-lime-900 border-none",
  "default": "bg-slate-200 text-slate-900 border-none"
}

const tagIcons: Record<string, any> = {
  "пляж": Palmtree,
  "море": Waves,
  "горы": Mountain,
  "природа": TreeDeciduous,
  "гастрономия": Utensils,
  "еда": Utensils,
  "вино": Utensils, // Generic for food/drink
  "шопинг": ShoppingBag,
  "торговые центры": ShoppingBag,
  "культура": Landmark,
  "история": Landmark,
  "храмы": Landmark,
  "развлечения": Music, // Party/Music
  "активный": Tent, // Camping/Active
  "релакс": Sparkles,
  "default": Sparkles
}

function ResultsContent() {
  const searchParams = useSearchParams()
  const source = searchParams.get("source")
  const [userRoutes, setUserRoutes] = useState<any[]>([])
  const [aiRoute, setAiRoute] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"all" | "my">("my")

  // Lazy Loading State
  const [visibleCount, setVisibleCount] = useState(9)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const observerTarget = useRef(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const authUser = session?.user || null

        // Fetch user trips
        if (authUser) {
          const { data, error } = await supabase
            .from('trips')
            .select('*')
            .eq('user_id', authUser.id)
            .order('created_at', { ascending: false })

          if (error) {
            console.warn("Supabase fetch warning:", error.message)
          }
          if (data) setUserRoutes(data)
        }
      } catch (err) {
        console.warn("Network/Supabase connection issue:", err)
      }

      // Check for last generated (even for guests or if offline)
      const stored = localStorage.getItem("lastGeneratedRoute")
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setAiRoute(parsed)
        } catch (e) {
          console.error("Failed to parse local route")
        }
      }

      setLoading(false)
    }

    fetchData()
  }, [])

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current)
      }
    }
  }, [observerTarget])

  const loadMore = () => {
    setIsLoadingMore(true)
    // Simulate network request if needed, or just increase count
    setTimeout(() => {
      setVisibleCount(prev => prev + 6)
      setIsLoadingMore(false)
    }, 500)
  }

  // Combine DB routes with locally stored one as a "Recent" route
  const localTrip = aiRoute ? [{
    id: "ai-last",
    title: aiRoute.title,
    destination: aiRoute.countries?.[0]?.name || "Travel",
    duration: `${aiRoute.itinerary?.length || 0} дней`,
    tags: aiRoute.tags || ["черновик"],
    safetyLevel: 10,
    budget: aiRoute.totalBudget || "Индивидуально",
    image: `https://loremflickr.com/800/600/travel,${encodeURIComponent(aiRoute.countries?.[0]?.name || "city")}/all`,
    description: aiRoute.description,
    style: "Недавний"
  }] : []

  const allRoutes = view === "my"
    ? [
      ...userRoutes.map(r => ({
        id: r.id,
        title: r.title,
        destination: r.destination,
        duration: `${r.itinerary?.length || 0} дней`,
        tags: r.tags || ["личный"],
        safetyLevel: 10, // Mock for now if not in DB
        budget: r.total_cost || "Индивидуально",
        image: `https://loremflickr.com/800/600/travel,${encodeURIComponent(r.destination || "city")}/all`,
        description: r.description,
        style: "Персональный"
      })),
      ...localTrip.filter(lt => !userRoutes.some(ur => ur.title === lt.title)) // Simple dedupe by title
    ]
    : mockRecommendations

  const displayRoutes = allRoutes.slice(0, visibleCount)
  const hasMore = visibleCount < allRoutes.length

  const title = view === "my" ? "Ваша коллекция" : "Вдохновение"
  const description = view === "my"
    ? "Маршруты, которые вы создали или сохранили."
    : "Лучшие направления, отобранные нашими экспертами."

  return (
    <AppLayout title={title} description={description}>
      {/* Background Effects */}
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

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Controls Layout: Search + Toggle */}
        <div className="mb-10 flex flex-col-reverse md:flex-row md:items-center justify-between gap-6">
          <div className="bg-muted/30 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md inline-flex">
            <Button
              variant={view === "all" ? "default" : "ghost"}
              onClick={() => setView("all")}
              className={`px-8 rounded-xl transition-all ${view === 'all' ? 'bg-primary shadow-lg shadow-primary/25' : 'hover:bg-white/5'}`}
            >
              Популярные
            </Button>
            <Button
              variant={view === "my" ? "default" : "ghost"}
              onClick={() => setView("my")}
              className={`px-8 rounded-xl transition-all ${view === 'my' ? 'bg-primary shadow-lg shadow-primary/25' : 'hover:bg-white/5'}`}
            >
              Мои маршруты
            </Button>
          </div>

          <div className="w-full md:w-auto">
            <RouteSearch className="w-full md:w-[400px] shadow-lg border border-primary/20 bg-background/80 rounded-full" />
          </div>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
              {displayRoutes.length > 0 ? (
                displayRoutes.map((trip, index) => (
                  <FadeIn key={trip.id} delay={index * 50} className="h-full">
                    <Card
                      className="group relative flex flex-col h-full overflow-hidden border border-white/5 bg-zinc-900 shadow-2xl backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:shadow-primary/10 rounded-[2rem]"
                    >
                      {/* Image Section - Full bleed with gradient mask */}
                      <div className="relative h-72 w-full shrink-0 overflow-hidden rounded-t-[2rem]">
                        <TripImage
                          src={trip.image}
                          query={trip.destination || "travel"}
                          alt={trip.title}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        {/* Gradient that matches the card background exactly */}
                        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-zinc-900 via-zinc-900/80 to-transparent" />

                        {/* Safety Badge */}
                        <div className="absolute top-4 right-4 relative z-20 scale-90 origin-top-right">
                          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/90 text-white px-2 py-0.5 shadow-lg border border-emerald-400/30">
                            <Shield className="h-3 w-3" />
                            <div className="flex flex-col leading-none">
                              <span className="text-[7px] uppercase font-black opacity-90 tracking-tighter">Безопасность</span>
                              <span className="text-[10px] font-black text-white">{trip.safetyLevel}/10</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex flex-1 flex-col p-6 pt-0 relative z-10 -mt-20">
                        {/* Destination Flag/Name */}
                        <div className="mb-3 flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-muted-foreground/90">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-primary" />
                            {trip.destination}
                          </div>
                          <div className="h-1 w-1 rounded-full bg-white/20" />
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                            {trip.duration}
                          </div>
                        </div>

                        <h3 className="text-2xl font-bold text-white mb-3 leading-tight group-hover:text-primary transition-colors">
                          {trip.title}
                        </h3>

                        <p className="mb-6 text-sm leading-relaxed text-zinc-400 line-clamp-3 font-medium">
                          {trip.description}
                        </p>

                        <div className="mb-8 flex flex-wrap gap-2 mt-auto">
                          {trip.tags?.map((tag: string) => {
                            const cleanTag = tag.toLowerCase().replace('#', '').trim();
                            // Find matching key for icons/colors
                            const matchKey = Object.keys(tagIcons).find(key => cleanTag.includes(key)) || "default";
                            const colorKey = Object.keys(tagColors).find(key => cleanTag.includes(key)) || "default";

                            const TagIcon = tagIcons[matchKey];
                            const colorClass = tagColors[colorKey];

                            return (
                              <span key={tag} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide shadow-sm transition-transform hover:scale-105 ${colorClass}`}>
                                <TagIcon className="h-3 w-3" />
                                {tag.replace('#', '')}
                              </span>
                            )
                          })}
                        </div>

                        <div className="flex items-center justify-between pt-0 mt-auto">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                              <Wallet className="h-5 w-5 text-blue-400" />
                            </div>
                            <span className="text-xl font-black text-white tracking-tight">
                              {typeof trip.budget === 'number' ? new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(trip.budget) : trip.budget.replace ? trip.budget.replace('₽', ' ₽') : trip.budget}
                            </span>
                          </div>

                          <Button asChild className="rounded-full bg-white text-black hover:bg-white/90 font-bold px-8 h-12 shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all hover:scale-105 group/btn">
                            <Link href={`/trip/${trip.id}`}>
                              Открыть
                              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </FadeIn>
                ))
              ) : (
                <div className="col-span-full py-20 text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/5 border border-white/10">
                    <MapPin className="h-10 w-10 text-muted-foreground opacity-50" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Пока нет маршрутов</h3>
                  <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                    {view === "my"
                      ? "Вы еще не создали ни одного маршрута. Самое время начать свое приключение!"
                      : "Рекомендации скоро появятся."}
                  </p>
                  {view === "my" && (
                    <Button asChild className="mt-8 rounded-full px-8 py-6 text-lg shadow-glow" variant="default">
                      <Link href="/plan">Спланировать поездку</Link>
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Observer Target for Infinite Scroll */}
            {hasMore && (
              <div ref={observerTarget} className="flex justify-center py-8">
                {isLoadingMore && <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    }>
      <ResultsContent />
    </Suspense>
  )
}

