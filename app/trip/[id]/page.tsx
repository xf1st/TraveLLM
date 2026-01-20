"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Calendar,
  Clock,
  Compass,
  Download,
  Hotel,
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
  Train
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import Image from "next/image"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TripImage } from "@/components/TripImage"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

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

export default function TripDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [route, setRoute] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [expandedDay, setExpandedDay] = useState<number | null>(1)
  const [showBudgetModal, setShowBudgetModal] = useState(false)

  useEffect(() => {
    const fetchTrip = async () => {
      setLoading(true)
      const id = params.id as string
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      const isLocal = id?.startsWith('local-')

      console.log("Fetching trip with ID:", id, "isUuid:", isUuid, "isLocal:", isLocal)

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
          countries: data.destination ? [{ name: data.destination }] : (data.countries || [])
        })
      }
      setLoading(false)
    }
    fetchTrip()
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppSidebar />
        <div className="lg:ml-64">
          <div className="lg:hidden"><Header /></div>
          <main className="flex h-[60vh] items-center justify-center">
            <div className="text-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
              <p className="text-muted-foreground animate-pulse">Загружаем детали вашего приключения...</p>
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
        <div className="lg:ml-64">
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

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />

      <div className="lg:ml-64 pb-20">
        {/* Mobile Header */}
        <div className="lg:hidden"><Header /></div>

        {/* Hero Banner */}
        <div className="relative h-[40vh] min-h-[400px] w-full overflow-hidden">
          <TripImage
            src={heroImage}
            query={destinationName}
            alt={route.title || destinationName}
            className="absolute inset-0 h-full w-full"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-black/20 to-transparent" />

          <div className="absolute inset-0 flex items-end">
            <div className="container max-w-5xl px-4 pb-12">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.back()}
                className="mb-8 rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80 border-0"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Назад
              </Button>

              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex flex-wrap gap-2">
                  {route.tags?.map((tag: string) => (
                    <Badge key={tag} className="bg-primary/20 text-primary-foreground backdrop-blur border-none">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl drop-shadow-lg">
                  {route.title}
                </h1>
                <div className="flex flex-wrap gap-6 text-white/90 font-medium">
                  <div className="flex items-center gap-2 drop-shadow">
                    <Calendar className="h-5 w-5 text-sky-400" />
                    {route.itinerary?.length || 0} дней
                  </div>
                  <div
                    className="flex items-center gap-2 drop-shadow cursor-pointer hover:text-primary transition-colors group"
                    onClick={() => setShowBudgetModal(true)}
                  >
                    <Wallet className="h-5 w-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span className="underline decoration-dotted underline-offset-4">{route.totalBudget}</span>
                  </div>
                  <div className="flex items-center gap-2 drop-shadow">
                    <Shield className="h-5 w-5 text-amber-400" />
                    Безопасность 9/10
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <main className="container max-w-5xl px-4 mt-8">
          <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
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
                    <Card key={idx} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all">
                      <button
                        onClick={() => setExpandedDay(isExpanded ? null : day.day)}
                        className="w-full flex items-center justify-between p-5 text-left bg-card group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xl font-black text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                            {day.day}
                          </div>
                          <div>
                            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">День {day.day}</div>
                            <div className="font-bold text-lg">{day.title || "Продолжение приключения"}</div>
                          </div>
                        </div>
                        <ChevronRight className={`h-6 w-6 text-muted-foreground/30 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>

                      {isExpanded && (
                        <div className="px-5 pb-6 bg-card animate-in slide-in-from-top-2 duration-300">
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

                          <div className="space-y-6 pl-2 border-l-2 border-border ml-6">
                            {(day.activities || [
                              { time: "Утро", desc: day.morning },
                              { time: "День", desc: day.daytime },
                              { time: "Вечер", desc: day.night }
                            ].filter(i => i.desc)).map((item: any, i: number) => {
                              const iconMap: Record<string, any> = { "Утро": Clock, "День": Utensils, "Вечер": Hotel };
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
                  );
                })}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
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

              <Card className="p-6 border-none shadow-sm bg-primary/5">
                <div className="flex items-center gap-4 mb-4">
                  <Avatar className="h-12 w-12 border-2 border-primary/20">
                    <AvatarImage src="https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png" alt="Guide" />
                    <AvatarFallback className="bg-primary text-white text-xs">AI</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-sm font-bold">Ваш ИИ-гид</h3>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Персональный эксперт</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed italic border-l-2 border-primary/20 pl-4 py-1">
                  "Привет! Я подготовила этот маршрут с учетом ваших предпочтений. Если захотите что-то изменить — просто напишите мне в чат ниже."
                </p>
              </Card>

              <Card className="p-6 bg-slate-900 text-white border-none shadow-xl overflow-hidden relative group">
                <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-700">
                  <TripImage
                    query="luxury hotel concierge"
                    alt="Concierge"
                    className="h-full w-full"
                  />
                </div>
                <div className="relative z-10">
                  <Sparkles className="h-8 w-8 text-sky-400 mb-4" />
                  <h3 className="text-xl font-bold mb-2">Ваш ИИ-консьерж</h3>
                  <p className="text-sm text-slate-300 mb-6">
                    Забронировать стол, найти ближайшую аптеку или перевести меню? Просто спросите меня.
                  </p>
                  <Button className="w-full bg-sky-500 hover:bg-sky-600 text-white border-none" onClick={() => router.push(`/guide/${params.id}`)}>
                    Запустить гида
                  </Button>
                </div>
              </Card>

              <Card className="p-6 border-dashed border-2 border-border bg-transparent text-center">
                <h3 className="font-bold mb-2">Понравился маршрут?</h3>
                <p className="text-sm text-muted-foreground mb-4">Сохраните его в свой профиль, чтобы вернуться к нему позже.</p>
                <Button variant="outline" className="w-full rounded-full">
                  Добавить в избранное
                </Button>
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
      </div>
    </div>
  )
}
