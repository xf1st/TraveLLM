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
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { DateRange } from "react-day-picker"
import Image from "next/image"

import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { CityAutocomplete } from "@/components/ui/city-autocomplete"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Sparkles,
  CreditCard,
  Languages,
  MapPin,
  Calendar as CalendarIcon,
  Users,
  Palette,
  Mountain,
  Utensils,
  Bed,
  Compass,
  ShoppingBag,
  Camera,
  Laptop,
  TreePine,
  Gem,
  Map,
  Globe,
  Building2,
  Flag,
  Bus,
  Banknote
} from "lucide-react"
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
  const [date, setDate] = useState<DateRange | undefined>()
  const [travelStyle, setTravelStyle] = useState<string[]>([])
  const [paymentMethods, setPaymentMethods] = useState<string[]>([])
  const [guideLanguage, setGuideLanguage] = useState(false)
  const [loading, setLoading] = useState(false)
  const [customDestination, setCustomDestination] = useState("")
  const [profile, setProfile] = useState<any>(null)
  const [accessMode, setAccessMode] = useState<string>("active")

  // UI State
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (data) {
          setProfile(data)
          setAccessMode(data.access_mode || 'active')
          
          // Check if temporary block expired
          if (data.blocked_until) {
            const blockedUntil = new Date(data.blocked_until)
            if (blockedUntil < new Date()) {
              // Block expired, reset to active
              await supabase
                .from('profiles')
                .update({ access_mode: 'active', block_reason: null, blocked_until: null })
                .eq('id', user.id)
              setAccessMode('active')
            }
          }
        }
      } else {
        // Redirect if not logged in
        router.push("/auth")
      }
    }
    fetchProfile()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check access mode
    if (accessMode === 'ai_blocked' || accessMode === 'full_blocked') {
      alert("Генерация маршрутов временно недоступна для вашего аккаунта")
      return
    }
    
    if (!date?.from || !date?.to) {
      alert("Пожалуйста, выберите даты поездки")
      return
    }
    setLoading(true)

    try {
      const localPrefs = JSON.parse(localStorage.getItem("userPreferences") || "{}")
      const finalPreferences = profile ? { ...localPrefs, ...profile, ...profile.preferences } : localPrefs

      const response = await fetch("/api/deepseek", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departureCity,
          destinationType: destination,
          customDestination: destination === 'custom' ? customDestination : undefined,
          countryCount,
          budget,
          customBudget,
          startDate: format(date.from, "yyyy-MM-dd"),
          endDate: format(date.to, "yyyy-MM-dd"),
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

      // Validate mandatory fields
      if (!routeData.title) {
        throw new Error("AI не смог сгенерировать название маршрута. Попробуйте снова.")
      }

      const { data: { user: authUser } } = await supabase.auth.getUser()

      const { data: trip, error: dbError } = await supabase.from('trips').insert({
        user_id: authUser?.id,
        title: routeData.title,
        destination: routeData.countries?.[0]?.name || "Travel",
        description: routeData.description,
        itinerary: routeData.itinerary,
        budget_range: budget,
        total_cost: routeData.totalBudget,
        departure_city: departureCity || "Moscow",
        start_date: format(date.from, "yyyy-MM-dd"),
        end_date: format(date.to, "yyyy-MM-dd"),
        // New fields for budget analysis and important info
        budget_analysis: routeData.budgetAnalysis || null,
        visa_advice: routeData.visaAdvice || null,
        payment_advice: routeData.paymentAdvice || null,
        safety_info: routeData.safetyInfo || null,
        restrictions: routeData.restrictions || null,
        countries: routeData.countries || null,
        tags: routeData.tags || null,
        cover_image: routeData.coverImage || null,
        preferences: routeData.preferences || null // Save preferences
      }).select().single()

      let finalTripId: string | null = null

      if (dbError) {
        // Only log if it's NOT an RLS/permission issue for authenticated users
        // Guests (without user) will naturally fail DB insert, so we skip logging for them
        if (dbError.code !== '42501' && user) {
          console.error("--- DATABASE INSERT ERROR ---")
          console.error("Error Object:", dbError)
          console.error("Error Code:", dbError.code)
          console.error("Error Message:", dbError.message)
          console.error("Error Details:", dbError.details)
          console.error("Error Hint:", dbError.hint)
          console.log("Attempted Data:", {
            user_id: user?.id,
            title: routeData.title,
            destination: routeData.countries?.[0]?.name || "Travel",
            itinerary_length: routeData.itinerary?.length,
            total_cost: routeData.totalBudget
          })
          console.error("-----------------------------")
        }

        // Generate a unique ID for the guest even if DB fails
        const tempId = `local-${Math.random().toString(36).substring(2, 11)}`
        localStorage.setItem(`trip-${tempId}`, JSON.stringify(routeData))
        localStorage.setItem("lastGeneratedRoute", JSON.stringify(routeData))

        // Trigger Browser Notification
        if (typeof window !== 'undefined' && "Notification" in window && Notification.permission === "granted") {
          new Notification("Маршрут готов! 🌍", {
            body: `Ваш локальный план поездки в ${routeData.countries?.[0]?.name || "новую страну"} готов.`,
            icon: "/favicon.ico"
          });
        }
        finalTripId = tempId
      } else {
        // Successful DB insert
        // Trigger Browser Notification
        if (typeof window !== 'undefined' && "Notification" in window && Notification.permission === "granted") {
          new Notification("Маршрут готов! 🌍", {
            body: `Ваш план поездки в ${routeData.countries?.[0]?.name || "новую страну"} успешно составлен.`,
            icon: "/favicon.ico"
          });
        }
        finalTripId = trip.id
      }

      if (finalTripId) {
        router.push(`/trip/${finalTripId}`)
      } else {
        // ABSOLUTE FALLBACK
        const randomId = `local-fallback-${Date.now()}`
        localStorage.setItem(`trip-${randomId}`, JSON.stringify(routeData))
        router.push(`/trip/${randomId}`)
      }
    } catch (error: any) {
      console.error("Generation Error:", error)
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

              {/* Row 1: City & Companions */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-[75%] space-y-2">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Город отправления
                  </Label>
                  <CityAutocomplete
                    placeholder="Например: Москва"
                    value={departureCity}
                    onValueChange={setDepartureCity}
                    className="h-14 rounded-2xl text-lg px-4 transition-all focus:scale-[1.01] bg-muted/20 border-border/60"
                  />
                </div>
                <div className="w-full md:w-[25%] space-y-2">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Компания
                  </Label>
                  <Select defaultValue="couple">
                    <SelectTrigger className="h-14 rounded-2xl text-lg px-4 transition-all focus:scale-[1.01] bg-muted/20 border-border/60">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="solo" className="rounded-lg my-1">
                        <div className="flex items-center gap-2"><Users className="h-4 w-4" /> Один</div>
                      </SelectItem>
                      <SelectItem value="couple" className="rounded-lg my-1">
                        <div className="flex items-center gap-2"><Users className="h-4 w-4" /> Вдвоем</div>
                      </SelectItem>
                      <SelectItem value="family" className="rounded-lg my-1">
                        <div className="flex items-center gap-2"><Users className="h-4 w-4" /> Семья</div>
                      </SelectItem>
                      <SelectItem value="friends" className="rounded-lg my-1">
                        <div className="flex items-center gap-2"><Users className="h-4 w-4" /> Друзья</div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2: Date Range Picker (Real Shadcn Calendar) */}
              <div className="space-y-2">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  Даты поездки
                </Label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant={"outline"}
                      className={cn(
                        "w-full h-16 justify-start text-left font-normal rounded-2xl text-lg px-4 bg-muted/20 border-border/60 hover:bg-muted/40 transition-all",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-3 h-5 w-5 text-primary" />
                      {date?.from ? (
                        date.to ? (
                          <>
                            {format(date.from, "dd MMMM yyyy", { locale: ru })} - {format(date.to, "dd MMMM yyyy", { locale: ru })}
                            <span className="ml-auto text-sm text-muted-foreground font-medium bg-background/50 px-3 py-1 rounded-lg border border-border/50 hidden sm:inline-block">
                              {Math.ceil((date.to.getTime() - date.from.getTime()) / (1000 * 60 * 60 * 24))} дней
                            </span>
                          </>
                        ) : (
                          format(date.from, "dd MMMM yyyy", { locale: ru })
                        )
                      ) : (
                        <span>Выберите даты поездки</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0 bg-card border-border shadow-2xl rounded-2xl mx-auto"
                    align="center"
                    sideOffset={8}
                  >
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={date?.from}
                      selected={date}
                      onSelect={setDate}
                      numberOfMonths={isMobile ? 1 : 2}
                      locale={ru}
                      disabled={(date) => date < new Date()}
                      className="rounded-2xl bg-card"
                    />
                    <div className="p-3 border-t border-border/50 md:hidden bg-card rounded-b-2xl">
                      <Button className="w-full rounded-xl" onClick={() => setIsCalendarOpen(false)}>Готово</Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Destination Type & Logic */}
              <div className="space-y-4">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Compass className="h-4 w-4 text-primary" />
                  Куда вы хотите поехать?
                </Label>
                <RadioGroup
                  value={destination}
                  onValueChange={(v) => {
                    if (v === 'mixed') return;
                    setDestination(v as any)
                  }}
                  className="grid grid-cols-3 gap-3 p-1.5 bg-muted/40 rounded-2xl w-full"
                >
                  {[
                    { id: "russia", label: "По России", icon: <MapPin className="h-4 w-4" /> },
                    { id: "abroad", label: "За границу", icon: <Globe className="h-4 w-4" /> },
                    { id: "custom", label: "Свой выбор", icon: <Sparkles className="h-4 w-4" /> }
                  ].map((type) => (
                    <Label
                      key={type.id}
                      htmlFor={type.id}
                      className="flex cursor-pointer items-center justify-center gap-2 rounded-xl py-3 text-base font-medium transition-all duration-300 hover:bg-background/60 hover:text-foreground data-[state=checked]:bg-background data-[state=checked]:text-primary data-[state=checked]:shadow-md data-[state=checked]:scale-[1.02]"
                      data-state={destination === type.id ? "checked" : "unchecked"}
                    >
                      <RadioGroupItem value={type.id} id={type.id} className="sr-only" />
                      {type.icon}
                      {type.label}
                    </Label>
                  ))}
                </RadioGroup>

                {/* Conditional Inputs */}
                {destination === "custom" ? (
                  <div className="animate-in fade-in slide-in-from-top-2 pt-2">
                    <CityAutocomplete
                      value={customDestination}
                      onValueChange={setCustomDestination}
                      placeholder="Укажите город или страну (например: Рим)"
                      className="h-auto min-h-[56px] rounded-2xl text-lg bg-muted/20 border-border/60"
                      multiselect={true}
                    />
                  </div>
                ) : (
                  <div className="animate-in fade-in slide-in-from-top-2 pt-2">
                    <Select value={countryCount} onValueChange={setCountryCount}>
                      <SelectTrigger className="h-14 rounded-2xl text-lg px-4 bg-muted/20 border-border/60 w-full">
                        <SelectValue placeholder={destination === "russia" ? "Сколько городов посетить?" : "Количество стран"} />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {destination === "russia" ? (
                          <>
                            <SelectItem value="1" className="rounded-lg my-1"><div className="flex items-center gap-2"><Building2 className="h-4 w-4" /> 1 город</div></SelectItem>
                            <SelectItem value="2" className="rounded-lg my-1"><div className="flex items-center gap-2"><Building2 className="h-4 w-4" /> 2 города</div></SelectItem>
                            <SelectItem value="3" className="rounded-lg my-1"><div className="flex items-center gap-2"><Building2 className="h-4 w-4" /> 3 города</div></SelectItem>
                            <SelectItem value="more" className="rounded-lg my-1"><div className="flex items-center gap-2"><Bus className="h-4 w-4" /> Тур по городам (4+)</div></SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="1" className="rounded-lg my-1"><div className="flex items-center gap-2"><Flag className="h-4 w-4" /> 1 страна</div></SelectItem>
                            <SelectItem value="2" className="rounded-lg my-1"><div className="flex items-center gap-2"><Flag className="h-4 w-4" /> 2 страны</div></SelectItem>
                            <SelectItem value="3" className="rounded-lg my-1"><div className="flex items-center gap-2"><Flag className="h-4 w-4" /> 3 страны</div></SelectItem>
                            <SelectItem value="more" className="rounded-lg my-1"><div className="flex items-center gap-2"><Globe className="h-4 w-4" /> Евротур (4+ стран)</div></SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Budget Cards - Enhanced Typography & Icons */}
              <div className="space-y-4">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Бюджет
                </Label>
                <RadioGroup value={budget} onValueChange={setBudget} className="grid md:grid-cols-3 gap-4">
                  {[
                    { id: "economy", title: "Эконом", range: "₽5k - ₽10k", desc: "в день (Хостелы, автобусы)", icon: ShoppingBag, color: "text-blue-500" },
                    { id: "comfort", title: "Комфорт", range: "₽15k - ₽30k", desc: "в день (Отели, такси)", icon: CreditCard, color: "text-violet-500" },
                    { id: "premium", title: "Премиум", range: "От ₽40k", desc: "в день (Люкс сервис)", icon: Gem, color: "text-amber-500" },
                  ].map((b) => {
                    const Icon = b.icon
                    const isSelected = budget === b.id
                    return (
                      <Label
                        key={b.id}
                        htmlFor={b.id}
                        className={`relative flex flex-col justify-between gap-3 rounded-2xl border-2 p-5 cursor-pointer transition-all duration-300 hover:scale-[1.02] ${isSelected
                          ? "border-primary bg-primary/10 shadow-xl shadow-primary/10"
                          : "border-border/40 bg-card/40 hover:border-primary/30 hover:bg-muted/40"
                          }`}
                      >
                        <RadioGroupItem value={b.id} id={b.id} className="sr-only" />
                        <div className="flex justify-between items-center gap-4">
                          <span className={`font-bold text-xl leading-tight ${isSelected ? "text-foreground" : "text-muted-foreground/80"}`}>{b.title}</span>
                          <div className={`p-2 rounded-full shrink-0 ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                        </div>
                        <div>
                          <div className={`text-lg font-bold tracking-tight ${isSelected ? "text-primary" : "text-foreground/90"}`}>{b.range}</div>
                          <div className="text-xs text-muted-foreground mt-1 font-medium">{b.desc}</div>
                        </div>
                      </Label>
                    )
                  })}
                </RadioGroup>

                {/* Custom Budget Toggle - Integrated Look */}
                <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                  <div className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${budget === 'custom' ? "bg-primary/5 border border-primary/50 ring-1 ring-primary/20" : "bg-muted/30 border border-border/40"
                    }`}>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span className="p-2 bg-background rounded-full shadow-sm"><Sparkles className="h-4 w-4 text-emerald-500" /></span>
                      <span className="text-sm font-semibold whitespace-nowrap">Свой бюджет:</span>
                    </div>
                    <Input
                      type="number"
                      min="10000"
                      step="5000"
                      placeholder="150000"
                      value={customBudget}
                      onBlur={() => {
                        if (customBudget && parseInt(customBudget) < 10000) setCustomBudget("10000")
                      }}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomBudget(val);
                        if (val) setBudget("custom");
                      }}
                      className="h-12 w-24 md:w-auto min-w-[100px] text-lg font-bold bg-transparent border-0 border-b-2 border-border/50 rounded-none focus-visible:ring-0 focus-visible:border-primary px-2 text-right placeholder:text-muted-foreground/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-base font-bold text-muted-foreground">₽</span>
                  </div>
                </div>
              </div>

              {/* Travel Style Grid */}
              <div className="space-y-4">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary" />
                  Интересы
                </Label>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { id: "culture", label: "Культура", icon: Compass },
                    { id: "nature", label: "Природа", icon: Mountain },
                    { id: "food", label: "Еда", icon: Utensils },
                    { id: "relax", label: "Релакс", icon: Bed },
                    { id: "adventure", label: "Приключения", icon: Map },
                    { id: "shopping", label: "Шоппинг", icon: ShoppingBag },
                    { id: "photo", label: "Фото", icon: Camera },
                    { id: "events", label: "Ивенты", icon: Sparkles }, // Added Events
                    { id: "luxury", label: "Люкс", icon: Gem },
                    // Removed: Nomad, Hike/Trekking
                  ].map((style) => {
                    const Icon = style.icon
                    const isSelected = travelStyle.includes(style.id)
                    return (
                      <Label
                        key={style.id}
                        htmlFor={style.id}
                        className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer hover:scale-[1.02] ${isSelected
                          ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                          : "border-border/60 bg-muted/20 hover:bg-muted hover:border-primary/30"
                          }`}
                      >
                        <Checkbox
                          id={style.id}
                          checked={isSelected}
                          onCheckedChange={() => toggleStyle(style.id)}
                          className="sr-only"
                        />
                        <Icon className={`h-4 w-4 ${isSelected ? "text-primary-foreground" : "text-muted-foreground"}`} />
                        <span className="text-sm font-medium">{style.label}</span>
                      </Label>
                    )
                  })}
                </div>
              </div>

              {/* Payment Method - BRANDED IMAGES */}
              <div className="space-y-4">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Способ оплаты
                </Label>
                <RadioGroup value={paymentMethods[0]} onValueChange={(v) => setPaymentMethods([v])} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {
                      id: "mir",
                      label: "Карта МИР",
                      icon: <Image src="/Mir.png" alt="MIR" width={60} height={20} className="h-6 w-auto object-contain" unoptimized />,
                      bg: "bg-[#00783E]/5",
                      border: "border-border/60"
                    },
                    {
                      id: "unionpay",
                      label: "UnionPay",
                      icon: <Image src="/union.webp" alt="UnionPay" width={60} height={30} className="h-8 w-auto object-contain" unoptimized />,
                      bg: "bg-red-500/5",
                      border: "border-border/60"
                    },
                    {
                      id: "foreign",
                      label: "Visa/MC",
                      icon: <Image src="/visa.png" alt="Visa" width={60} height={20} className="h-6 w-auto object-contain" unoptimized />,
                      bg: "bg-blue-600/5",
                      border: "border-border/60"
                    },
                    {
                      id: "cash",
                      label: "Наличные",
                      icon: <Banknote className="h-7 w-7 text-green-600" />,
                      bg: "bg-green-500/5",
                      border: "border-border/60"
                    }
                  ].map((method) => {
                    const isSelected = paymentMethods.includes(method.id);
                    let activeBorderClass = "border-primary"; // Default

                    if (method.id === 'mir') activeBorderClass = "border-[#00783E] ring-[#00783E]";
                    if (method.id === 'unionpay') activeBorderClass = "border-red-500 ring-red-500";
                    if (method.id === 'foreign') activeBorderClass = "border-blue-600 ring-blue-600";
                    if (method.id === 'cash') activeBorderClass = "border-green-600 ring-green-600";

                    return (
                      <Label
                        key={method.id}
                        htmlFor={`pay-${method.id}`}
                        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border cursor-pointer transition-all hover:bg-muted/50 ${isSelected
                          ? `${activeBorderClass} bg-primary/5 ring-1`
                          : `${method.border} bg-transparent`
                          }`}
                      >
                        <RadioGroupItem value={method.id} id={`pay-${method.id}`} className="sr-only" />
                        <div className="flex items-center justify-center h-10 w-full">{method.icon}</div>
                        <span className="text-xs font-bold text-center mt-1 text-muted-foreground">{method.label}</span>
                      </Label>
                    )
                  })}
                </RadioGroup>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                size="lg"
                className="w-full h-16 text-xl rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.01] hover:shadow-2xl font-bold bg-gradient-to-r from-primary to-blue-600 border-0 mt-4"
                disabled={loading || accessMode === 'ai_blocked' || accessMode === 'full_blocked'}
              >
                {loading ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white mr-3" />
                    Маршрут создается...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-6 w-6 mr-3" />
                    Сгенерировать путешествие
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
