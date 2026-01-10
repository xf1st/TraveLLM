"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, ArrowRight, Sparkles, Map } from "lucide-react"
import Image from "next/image"

import { supabase } from "@/lib/supabase"

const mockRecommendations = [
  {
    id: "rec-1",
    title: "Тбилиси и винные долины",
    destination: "Грузия",
    duration: "7 дней",
    tags: ["#уютно", "#гастрономия", "#русскиеговорят"],
    safetyLevel: 9,
    budget: "75 000 ₽",
    image: "https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&q=80&w=800",
    description: "Идеальный маршрут для гастрономического путешествия с винными турами в Кахетию",
    style: "Сбалансированный",
  },
  {
    id: "rec-2",
    title: "Батуми: Магия Черного моря",
    destination: "Грузия",
    duration: "7 дней",
    tags: ["#море", "#тихо", "#расслабленно"],
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
    tags: ["#история", "#православие", "#культура"],
    safetyLevel: 10,
    budget: "45 000 ₽",
    image: "https://images.unsplash.com/photo-1547448415-e9f0b291c107?auto=format&fit=crop&q=80&w=800",
    description: "Древние города: Владимир, Суздаль, Ярославль с посещением храмов и монастырей",
    style: "Культурный",
  },
]

function ResultsContent() {
  const searchParams = useSearchParams()
  const source = searchParams.get("source")
  const [userRoutes, setUserRoutes] = useState<any[]>([])
  const [aiRoute, setAiRoute] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"all" | "my">("my")

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      // Fetch user trips
      if (user) {
        const { data } = await supabase
          .from('trips')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        if (data) setUserRoutes(data)
      }

      // Check for last generated (even for guests)
      const stored = localStorage.getItem("lastGeneratedRoute")
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          // Avoid double-counting if recently synced
          setAiRoute(parsed)
        } catch (e) {
          console.error("Failed to parse local route")
        }
      }

      setLoading(false)
    }
    fetchData()
  }, [])

  // Combine DB routes with locally stored one as a "Recent" route
  const localTrip = aiRoute ? [{
    id: "ai-last",
    title: aiRoute.title,
    destination: aiRoute.countries?.[0]?.name || "Travel",
    duration: `${aiRoute.itinerary?.length || 0} дней`,
    tags: ["#недавний", "#черновик"],
    safetyLevel: 10,
    budget: aiRoute.totalBudget || "Индивидуально",
    image: `https://loremflickr.com/800/600/travel,${encodeURIComponent(aiRoute.countries?.[0]?.name || "city")}/all`,
    description: aiRoute.description,
    style: "Недавний"
  }] : []

  const displayRoutes = view === "my"
    ? [
      ...userRoutes.map(r => ({
        id: r.id,
        title: r.title,
        destination: r.destination,
        duration: `${r.itinerary?.length || 0} дней`,
        tags: ["#личный", "#сохраненный"],
        safetyLevel: 10,
        budget: r.total_cost || "Индивидуально",
        image: `https://loremflickr.com/800/600/travel,${encodeURIComponent(r.destination || "city")}/all`,
        description: r.description,
        style: "Персональный"
      })),
      ...localTrip.filter(lt => !userRoutes.some(ur => ur.title === lt.title)) // Simple dedupe by title
    ]
    : mockRecommendations

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="mb-12 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20" variant="secondary">
            <Sparkles className="mr-1 h-3 w-3" />
            © 2026 TraveLM AI. Все права защищены.
          </Badge>
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight md:text-5xl">
            {view === "my" ? "Ваша коллекция маршрутов" : "Откройте новые горизонты"}
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground font-medium">
            {view === "my"
              ? "Все маршруты, сгенерированные вами и сохраненные в профиле."
              : "Проверенные маршруты от наших экспертов и популярные направления сообщества."}
          </p>

          <div className="mt-8 flex gap-2 rounded-xl bg-card p-1 shadow-sm border border-border/50">
            <Button
              variant={view === "all" ? "default" : "ghost"}
              onClick={() => setView("all")}
              className="px-8 rounded-lg"
            >
              Каталог
            </Button>
            <Button
              variant={view === "my" ? "default" : "ghost"}
              onClick={() => setView("my")}
              className="px-8 rounded-lg"
            >
              Мои маршруты
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {displayRoutes.length > 0 ? (
              displayRoutes.map((trip, index) => (
                <Card
                  key={trip.id}
                  className="group flex flex-col overflow-hidden border-none bg-card shadow-md transition-all hover:shadow-2xl hover:-translate-y-2 animate-in fade-in slide-in-from-bottom-8 duration-700"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <Image
                      src={trip.image}
                      alt={trip.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                    <div className="absolute bottom-4 left-4 text-white">
                      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                        <Shield className="h-3 w-3 text-sky-400" />
                        Безопасность {trip.safetyLevel}/10
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-6">
                    <div className="mb-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-widest text-primary">
                          {trip.destination}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground">{trip.duration}</span>
                      </div>
                      <h3 className="text-xl font-bold transition-colors group-hover:text-primary">
                        {trip.title}
                      </h3>
                    </div>

                    <p className="mb-6 flex-1 text-sm leading-relaxed text-muted-foreground font-medium line-clamp-3">
                      {trip.description}
                    </p>

                    <div className="mb-6 flex flex-wrap gap-2">
                      {trip.tags.map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="bg-primary/5 text-[10px] font-semibold text-primary hover:bg-primary/10 border-none">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center justify-between border-t border-border/50 pt-6">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-tighter text-muted-foreground">Бюджет от</span>
                        <span className="text-xl font-black">{trip.budget}</span>
                      </div>
                      <Button asChild className="rounded-full px-6 transition-all hover:shadow-lg hover:shadow-primary/20">
                        <Link href={`/trip/${trip.id}`}>
                          Открыть
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="col-span-full py-20 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                  <Map className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Пока нет маршрутов</h3>
                <p className="mt-2 text-slate-500">
                  {view === "my"
                    ? "Вы еще не создали ни одного маршрута. Самое время начать!"
                    : "Рекомендации скоро появятся."}
                </p>
                {view === "my" && (
                  <Button asChild className="mt-6 rounded-full" variant="outline">
                    <Link href="/plan">Спланировать поездку</Link>
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    }>
      <ResultsContent />
    </Suspense>
  )
}
