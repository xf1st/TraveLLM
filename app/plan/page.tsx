"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sparkles, CreditCard, Languages, MapPin, Calendar, Users, Palette, Mountain, Utensils, Bed, Compass, ShoppingBag, Camera, Laptop, TreePine, Gem, Map } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { GeneratingModal } from "@/components/GeneratingModal"
import { supabase } from "@/lib/supabase"
import { useEffect } from "react"
import dynamic from "next/dynamic"

// Dynamic import for WebGL component
const Aurora = dynamic(() => import('@/components/Aurora'), { ssr: false })

export default function PlanPage() {
  const router = useRouter()
  const [departureCity, setDepartureCity] = useState("")
  const [destination, setDestination] = useState<"russia" | "abroad" | "mixed" | "custom">("abroad")
  const [countryCount, setCountryCount] = useState("1")
  const [budget, setBudget] = useState("comfort")
  const [customBudget, setCustomBudget] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [travelStyle, setTravelStyle] = useState<string[]>([])
  const [paymentMethods, setPaymentMethods] = useState<string[]>([])
  const [guideLanguage, setGuideLanguage] = useState(false)
  const [loading, setLoading] = useState(false)
  const [customDestination, setCustomDestination] = useState("")
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (data) {
          setProfile(data)
        }
      }
    }
    fetchProfile()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const localPrefs = JSON.parse(localStorage.getItem("userPreferences") || "{}")
      const finalPreferences = profile ? { ...localPrefs, ...profile, ...profile.preferences } : localPrefs

      const response = await fetch("/api/groq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departureCity,
          destinationType: destination,
          customDestination: destination === 'custom' ? customDestination : undefined,
          countryCount,
          budget,
          startDate,
          endDate,
          travelStyle,
          paymentMethods,
          requireRussianGuide: guideLanguage,
          companions: "couple",
          preferences: finalPreferences
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || "Failed to generate route"
        const detailedError = errorData.hfError || errorData.groqError
          ? `\n\nДетали:\nHF: ${errorData.hfError || "n/a"}\nGroq: ${errorData.groqError || "n/a"}`
          : ""
        throw new Error(errorMessage + detailedError)
      }

      const routeData = await response.json()

      // Save to Supabase for all users (persistence requirement)
      const { data: { user } } = await supabase.auth.getUser()

      const { data: trip, error: dbError } = await supabase.from('trips').insert({
        user_id: user?.id || null, // Allow NULL for guest trips
        title: routeData.title,
        destination: routeData.countries?.[0]?.name || "Travel",
        description: routeData.description,
        itinerary: routeData.itinerary,
        budget_range: budget,
        total_cost: routeData.totalBudget,
        departure_city: departureCity,
        start_date: startDate || null,
        end_date: endDate || null,
        // New fields for budget analysis and important info
        budget_analysis: routeData.budgetAnalysis || null,
        visa_advice: routeData.visaAdvice || null,
        payment_advice: routeData.paymentAdvice || null,
        safety_info: routeData.safetyInfo || null,
        restrictions: routeData.restrictions || null,
        countries: routeData.countries || null,
        tags: routeData.tags || null,
        cover_image: routeData.coverImage || null
      }).select().single()

      if (dbError) {
        // Only log if it's not a common RLS/permission issue for guests
        if (dbError.code !== '42501' && user) {
          console.error("Database insert error:", dbError)
        }

        // Generate a unique ID for the guest even if DB fails
        const tempId = `local-${Math.random().toString(36).substring(2, 11)}`
        localStorage.setItem(`trip-${tempId}`, JSON.stringify(routeData))
        localStorage.setItem("lastGeneratedRoute", JSON.stringify(routeData))
        router.push(`/trip/${tempId}`)
        return
      }

      const tripId = trip.id
      router.push(`/trip/${tripId}`)
    } catch (error: any) {
      console.error(error)
      alert(`Ошибка при генерации маршрута: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const toggleStyle = (style: string) => {
    setTravelStyle((prev) => (prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]))
  }

  return (
    <AppLayout
      title="Спланируем вашу идеальную поездку"
      description="ИИ-ассистент с учётом ваших предпочтений, логистики и бюджета"
    >
      {/* Aurora Background */}
      <div className="fixed inset-0 z-0 opacity-40 pointer-events-none">
        <Aurora
          colorStops={["#ab66ff", "#4b7cdd", "#8df7a2"]}
          blend={0.76}
          amplitude={1.0}
          speed={0.4}
        />
      </div>

      <div className="relative z-10">
        <GeneratingModal open={loading} destination={customDestination || departureCity} />
        <div className="max-w-4xl mx-auto">
          <Card className="p-6 md:p-8 animate-in fade-in slide-in-from-bottom-8 duration-700 bg-card/60 backdrop-blur-md border-primary/20 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Departure */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Ваш город отправления</Label>
                <Input
                  placeholder="Например: Москва"
                  value={departureCity}
                  onChange={(e) => setDepartureCity(e.target.value)}
                  required
                  className="max-w-md transition-all focus:scale-105"
                />
              </div>

              {/* Destination */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Куда планируете поехать?</Label>
                <RadioGroup
                  value={destination}
                  onValueChange={(v) => setDestination(v as any)}
                  className="grid gap-4 sm:grid-cols-3"
                >
                  <Label
                    htmlFor="russia"
                    className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-border p-4 transition-all hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <RadioGroupItem value="russia" id="russia" />
                    <span>По России</span>
                  </Label>
                  <Label
                    htmlFor="abroad"
                    className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-border p-4 transition-all hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <RadioGroupItem value="abroad" id="abroad" />
                    <span>За границу</span>
                  </Label>
                  <Label
                    htmlFor="mixed"
                    className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-border p-4 transition-all hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <RadioGroupItem value="mixed" id="mixed" />
                    <span>Смешанный</span>
                  </Label>
                  <Label
                    htmlFor="custom"
                    className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-border p-4 transition-all hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <RadioGroupItem value="custom" id="custom" />
                    <span>Свой выбор</span>
                  </Label>
                </RadioGroup>
              </div>

              {/* Custom Destination Input */}
              {destination === "custom" && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <Label className="text-base font-semibold">Укажите страны или города</Label>
                  <Input
                    value={customDestination}
                    onChange={(e) => setCustomDestination(e.target.value)}
                    placeholder="Например: Италия, Франция, Токио или 'Тур по Скандинавии'"
                    className="transition-all focus:scale-105"
                  />
                </div>
              )}

              {/* Country Count */}
              {destination !== "russia" && (
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Количество стран</Label>
                  <Select value={countryCount} onValueChange={setCountryCount}>
                    <SelectTrigger className="max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 страна</SelectItem>
                      <SelectItem value="2">2 страны</SelectItem>
                      <SelectItem value="3">3 страны</SelectItem>
                      <SelectItem value="more">Более 3 стран</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-4">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Бюджет на поездку
                </Label>
                <RadioGroup value={budget} onValueChange={setBudget} className="grid gap-4 sm:grid-cols-3">
                  <Label
                    htmlFor="economy"
                    className="flex cursor-pointer flex-col gap-1 rounded-xl border-2 border-border p-4 transition-all hover:bg-muted hover:shadow-sm has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="economy" id="economy" />
                      <span className="font-semibold">Эконом</span>
                    </div>
                    <span className="ml-7 text-sm text-muted-foreground">До ₽100 000</span>
                    <span className="ml-7 text-xs text-muted-foreground/70">Хостелы, общ. транспорт</span>
                  </Label>
                  <Label
                    htmlFor="comfort"
                    className="flex cursor-pointer flex-col gap-1 rounded-xl border-2 border-border p-4 transition-all hover:bg-muted hover:shadow-sm has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="comfort" id="comfort" />
                      <span className="font-semibold">Комфорт</span>
                    </div>
                    <span className="ml-7 text-sm text-muted-foreground">₽100к — ₽300к</span>
                    <span className="ml-7 text-xs text-muted-foreground/70">Отели 3-4*, такси</span>
                  </Label>
                  <Label
                    htmlFor="premium"
                    className="flex cursor-pointer flex-col gap-1 rounded-xl border-2 border-border p-4 transition-all hover:bg-muted hover:shadow-sm has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="premium" id="premium" />
                      <span className="font-semibold">Премиум</span>
                    </div>
                    <span className="ml-7 text-sm text-muted-foreground">От ₽300 000</span>
                    <span className="ml-7 text-xs text-muted-foreground/70">5*, бизнес-класс</span>
                  </Label>
                </RadioGroup>

                <div className="space-y-2 p-4 rounded-xl bg-muted/30 border border-border/50">
                  <Label htmlFor="custom-budget" className="text-sm font-medium">
                    💡 Или укажите точный бюджет
                  </Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="custom-budget"
                      type="number"
                      placeholder="150000"
                      value={customBudget}
                      onChange={(e) => {
                        setCustomBudget(e.target.value)
                        if (e.target.value) setBudget("custom")
                      }}
                      className="flex-1 transition-all focus:scale-[1.02]"
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap font-medium">₽ за всю поездку</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Дата начала</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="transition-all focus:scale-105"
                  />
                </div>
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Дата окончания</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    min={startDate}
                    className="transition-all focus:scale-105"
                  />
                </div>
              </div>

              {/* Travel Style */}
              <div className="space-y-4">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  Стиль путешествия
                </Label>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { id: "culture", label: "Культура и история", icon: Compass },
                    { id: "nature", label: "Природа и активность", icon: Mountain },
                    { id: "food", label: "Гастрономия", icon: Utensils },
                    { id: "relax", label: "Отдых и релакс", icon: Bed },
                    { id: "adventure", label: "Приключения", icon: Map },
                    { id: "shopping", label: "Шоппинг", icon: ShoppingBag },
                    { id: "photo", label: "Фото-тур", icon: Camera },
                    { id: "nomad", label: "Диджитал-номад", icon: Laptop },
                    { id: "hike", label: "Треккинг", icon: TreePine },
                    { id: "luxury", label: "Люкс", icon: Gem },
                  ].map((style) => {
                    const IconComponent = style.icon
                    return (
                      <Label
                        key={style.id}
                        htmlFor={style.id}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-border p-3 transition-all hover:bg-muted hover:border-primary/30 has-[:checked]:border-primary has-[:checked]:bg-primary/10"
                      >
                        <Checkbox
                          id={style.id}
                          checked={travelStyle.includes(style.id)}
                          onCheckedChange={() => toggleStyle(style.id)}
                        />
                        <IconComponent className="h-4 w-4 text-primary/70" />
                        <span className="text-sm font-medium">{style.label}</span>
                      </Label>
                    )
                  })}
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-4">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Основной способ оплаты
                </Label>
                <RadioGroup
                  value={paymentMethods[0] || ""}
                  onValueChange={(value) => setPaymentMethods([value])}
                  className="grid gap-3 sm:grid-cols-2"
                >
                  {[
                    { id: "mir", label: "Карта Мир" },
                    { id: "unionpay", label: "UnionPay (РФ)" },
                    { id: "foreign", label: "Зарубежная карта (Visa/MC)" },
                    { id: "cash", label: "Наличные" },
                  ].map((method) => (
                    <Label
                      key={method.id}
                      htmlFor={`payment-${method.id}`}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-all hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                    >
                      <RadioGroupItem value={method.id} id={`payment-${method.id}`} />
                      <span className="text-sm">{method.label}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              {/* Guide Language */}
              <div className="space-y-4 rounded-lg border border-border p-4 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <Languages className="h-5 w-5 text-primary" />
                      Русскоговорящий гид
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Искать экскурсии и активности с поддержкой русского языка
                    </p>
                  </div>
                  <Switch checked={guideLanguage} onCheckedChange={setGuideLanguage} />
                </div>
              </div>

              {/* Companions */}
              <div className="space-y-4">
                <Label htmlFor="companions" className="text-base font-semibold">
                  С кем едете?
                </Label>
                <Select defaultValue="couple">
                  <SelectTrigger id="companions" className="transition-all hover:shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solo">Один/одна</SelectItem>
                    <SelectItem value="couple">Вдвоём</SelectItem>
                    <SelectItem value="family">Семья с детьми</SelectItem>
                    <SelectItem value="friends">С друзьями</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                size="lg"
                className="w-full transition-all hover:scale-105"
                disabled={loading || travelStyle.length === 0}
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    <span>Генерируем маршруты...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    <span>Создать маршруты</span>
                  </>
                )}
              </Button>
            </form>
          </Card>

          <p className="mt-6 text-center text-sm text-muted-foreground animate-in fade-in duration-1000">
            Бесплатно доступно 3 генерации маршрутов
          </p>
        </div>
      </div>
    </AppLayout>
  )
}
