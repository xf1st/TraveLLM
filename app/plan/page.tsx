"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sparkles, CreditCard, Languages } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { supabase } from "@/lib/supabase"
import { useEffect } from "react"

export default function PlanPage() {
  const router = useRouter()
  const [departureCity, setDepartureCity] = useState("")
  const [destination, setDestination] = useState<"russia" | "abroad" | "mixed">("abroad")
  const [countryCount, setCountryCount] = useState("1")
  const [budget, setBudget] = useState("comfort")
  const [customBudget, setCustomBudget] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [travelStyle, setTravelStyle] = useState<string[]>([])
  const [paymentMethods, setPaymentMethods] = useState<string[]>([])
  const [guideLanguage, setGuideLanguage] = useState(false)
  const [loading, setLoading] = useState(false)
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
      console.log("🚀 Starting route generation request...");
      
      const localPrefs = JSON.parse(localStorage.getItem("userPreferences") || "{}")
      const finalPreferences = profile ? { ...localPrefs, ...profile, ...profile.preferences } : localPrefs

      const requestData = {
        departureCity,
        destinationType: destination,
        countryCount,
        budget,
        startDate,
        endDate,
        travelStyle,
        paymentMethods,
        requireRussianGuide: guideLanguage,
        companions: "couple",
        preferences: finalPreferences
      }

      console.log("📤 Sending request data:", JSON.stringify(requestData, null, 2));

      const response = await fetch("/api/groq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
      })

      console.log("📥 Response status:", response.status);
      console.log("📥 Response headers:", Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("❌ API Error Response:", errorData);
        
        const errorMessage = errorData.error || "Failed to generate route"
        const hfError = errorData.hfError
        const groqError = errorData.groqError
        const details = errorData.details
        
        let detailedError = ""
        if (hfError || groqError || details) {
          detailedError = `\n\nДетали:\n${hfError || groqError || details}`
        }
        
        throw new Error(errorMessage + detailedError)
      }

      const routeData = await response.json()
      console.log("✅ Route generated successfully:", Object.keys(routeData));

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
        end_date: endDate || null
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
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-4xl px-4 py-12 md:py-20">
        <div className="mb-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-balance md:text-5xl">
            Спланируем вашу идеальную поездку
          </h1>
          <p className="text-lg text-muted-foreground text-balance">
            ИИ-ассистент с учётом ваших предпочтений, логистики и бюджета
          </p>
        </div>

        <Card className="p-6 md:p-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
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
              </RadioGroup>
            </div>

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
              <Label className="text-base font-semibold">Бюджет</Label>
              <RadioGroup value={budget} onValueChange={setBudget} className="grid gap-4 sm:grid-cols-3">
                <Label
                  htmlFor="economy"
                  className="flex cursor-pointer flex-col gap-1 rounded-lg border-2 border-border p-4 transition-all hover:bg-muted hover:shadow-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="economy" id="economy" />
                    <span className="font-medium">Эконом</span>
                  </div>
                  <span className="ml-7 text-sm text-muted-foreground">До ₽70к/неделя</span>
                </Label>
                <Label
                  htmlFor="comfort"
                  className="flex cursor-pointer flex-col gap-1 rounded-lg border-2 border-border p-4 transition-all hover:bg-muted hover:shadow-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="comfort" id="comfort" />
                    <span className="font-medium">Комфорт</span>
                  </div>
                  <span className="ml-7 text-sm text-muted-foreground">₽70-150к/неделя</span>
                </Label>
                <Label
                  htmlFor="premium"
                  className="flex cursor-pointer flex-col gap-1 rounded-lg border-2 border-border p-4 transition-all hover:bg-muted hover:shadow-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="premium" id="premium" />
                    <span className="font-medium">Премиум</span>
                  </div>
                  <span className="ml-7 text-sm text-muted-foreground">От ₽150к/неделя</span>
                </Label>
              </RadioGroup>

              <div className="space-y-2">
                <Label htmlFor="custom-budget" className="text-sm text-muted-foreground">
                  Или укажите свой бюджет
                </Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="custom-budget"
                    type="number"
                    placeholder="50000"
                    value={customBudget}
                    onChange={(e) => {
                      setCustomBudget(e.target.value)
                      if (e.target.value) setBudget("custom")
                    }}
                    className="transition-all focus:scale-105"
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">₽ за поездку</span>
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
              <Label className="text-base font-semibold">Стиль путешествия</Label>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { id: "culture", label: "Культура и история" },
                  { id: "nature", label: "Природа и активность" },
                  { id: "food", label: "Гастрономия" },
                  { id: "relax", label: "Отдых и релакс" },
                  { id: "adventure", label: "Приключения" },
                  { id: "shopping", label: "Шоппинг" },
                  { id: "photo", label: "Фото-тур" },
                  { id: "nomad", label: "Диджитал-номад" },
                  { id: "hike", label: "Хардкор-треккинг" },
                  { id: "luxury", label: "Люкс и премиум" },
                  { id: "hidden", label: "Секретные места" },
                ].map((style) => (
                  <Label
                    key={style.id}
                    htmlFor={style.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-all hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <Checkbox
                      id={style.id}
                      checked={travelStyle.includes(style.id)}
                      onCheckedChange={() => toggleStyle(style.id)}
                    />
                    <span className="text-sm">{style.label}</span>
                  </Label>
                ))}
              </div>
            </div>

            {/* Payment Methods */}
            <div className="space-y-4">
              <Label className="text-base font-semibold flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Способы оплаты
              </Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { id: "mir", label: "Карта Мир" },
                  { id: "unionpay", label: "UnionPay (РФ)" },
                  { id: "foreign", label: "Зарубежная карта (Visa/MC)" },
                  { id: "cash", label: "Наличные" },
                ].map((method) => (
                  <Label
                    key={method.id}
                    htmlFor={method.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-all hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <Checkbox
                      id={method.id}
                      checked={paymentMethods.includes(method.id)}
                      onCheckedChange={() =>
                        setPaymentMethods(prev =>
                          prev.includes(method.id) ? prev.filter(m => m !== method.id) : [...prev, method.id]
                        )
                      }
                    />
                    <span className="text-sm">{method.label}</span>
                  </Label>
                ))}
              </div>
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
      </main>
    </div>
  )
}
