"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { addDays, format } from "date-fns"
import { ru } from "date-fns/locale"
import type { DateRange } from "react-day-picker"
import { CityAutocomplete } from "@/components/ui/city-autocomplete"
import Image from "next/image"
import {
  MapPin,
  Calendar as CalendarIcon,
  CreditCard,
  Sparkles,
  Users,
  Plane,
  Mountain,
  Camera,
  Utensils,
  ShoppingBag,
  Compass,
  Bed,
  Palette,
  Gem,
  Map,
  Globe,
  Building2,
  Flag,
  Bus,
  Banknote
} from "lucide-react"
import { GeneratingModal } from "@/components/GeneratingModal"
import { ErrorModal } from "@/components/ErrorModal"
import { supabase } from "@/lib/supabase"
import dynamic from "next/dynamic"
import Stepper, { Step } from "@/components/ui/stepper"
import { FloatingIcons } from "@/components/FloatingIcons"

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
  const [companions, setCompanions] = useState("couple")
  const [paymentMethods, setPaymentMethods] = useState<string[]>([])
  const [guideLanguage, setGuideLanguage] = useState(false)
  const [loading, setLoading] = useState(false)
  const [customDestination, setCustomDestination] = useState("")
  const [profile, setProfile] = useState<any>(null)
  const [accessMode, setAccessMode] = useState<string>("active")
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [currentStep, setCurrentStep] = useState(1)

  // Error Modal State
  const [errorModal, setErrorModal] = useState<{
    open: boolean
    title?: string
    message: string
    blockers?: Array<{ code: string; message: string; suggestion?: string }>
    warnings?: Array<{ code: string; message: string; suggestion?: string }>
    details?: string
  }>({ open: false, message: "" })

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
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        if (sessionData?.session?.user) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", sessionData.session.user.id)
            .single()

          if (profileData) {
            setProfile(profileData)
            setAccessMode(profileData.access_mode || "active")
            if (profileData.access_mode === "full_blocked") {
              router.push("/blocked")
            }
          }
        }
      } catch (e) {
        console.error("Error fetching profile:", e)
      }
    }
    fetchProfile()
  }, [router])

  // Safe localStorage helpers
  const getItem = (key: string): string | null => {
    if (typeof window === 'undefined') return null
    try {
      return localStorage.getItem(key)
    } catch { return null }
  }
  const setItem = (key: string, value: string): boolean => {
    if (typeof window === 'undefined') return false
    try {
      localStorage.setItem(key, value)
      return true
    } catch {
      console.error(`Failed to set ${key} in localStorage`)
      return false
    }
  }

  // Sanitize user input to prevent prompt injection
  const sanitizeInput = (input: string): string => {
    return input
      .replace(/[<>{}[\]\\]/g, '')
      .replace(/(\r\n|\n|\r)/gm, ' ')
      .trim()
      .slice(0, 500)
  }

  // Validate form before submission
  const validateForm = (): string[] => {
    const errors: string[] = []

    if (!departureCity.trim()) {
      errors.push("Укажите город отправления")
    }
    if (!date?.from || !date?.to) {
      errors.push("Выберите даты поездки")
    } else {
      const tripDays = Math.ceil((date.to.getTime() - date.from.getTime()) / (1000 * 60 * 60 * 24)) + 1
      if (tripDays < 2) {
        errors.push("Минимальная длительность поездки — 2 дня")
      }
      if (tripDays > 30) {
        errors.push("Максимальная длительность поездки — 30 дней")
      }
    }
    if (destination === "custom" && !customDestination.trim()) {
      errors.push("Укажите направление поездки")
    }
    if (!companions) {
      errors.push("Выберите тип компании")
    }
    if (!budget) {
      errors.push("Выберите бюджет")
    }
    if (budget === "custom" && (!customBudget || parseInt(customBudget) < 10000)) {
      errors.push("Минимальный бюджет — 10 000 ₽")
    }

    return errors
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()

    const errors = validateForm()
    if (errors.length > 0) {
      setValidationErrors(errors)
      setErrorModal({
        open: true,
        title: "Проверьте данные",
        message: "Пожалуйста, заполните все обязательные поля:",
        blockers: errors.map((err, i) => ({ code: `VAL${i}`, message: err }))
      })
      return
    }
    setValidationErrors([])

    setLoading(true)

    try {
      let tripDays = 7
      if (date?.from && date?.to) {
        tripDays = Math.ceil((date.to.getTime() - date.from.getTime()) / (1000 * 60 * 60 * 24)) + 1
      }

      let effectiveBudget = budget
      if (budget === "custom" && customBudget) {
        const budgetNum = parseInt(customBudget.replace(/\D/g, ""))
        if (budgetNum < 30000) effectiveBudget = "economy"
        else if (budgetNum < 80000) effectiveBudget = "comfort"
        else effectiveBudget = "premium"
      }

      let destinationValue: string
      let destinationType: string = destination

      if (destination === "custom") {
        destinationValue = sanitizeInput(customDestination)
        destinationType = "custom"
      } else {
        const count = countryCount === "more" ? "4+" : countryCount
        if (destination === "russia") {
          destinationValue = `Россия (${count} ${parseInt(count) === 1 ? "город" : "города"})`
        } else {
          destinationValue = `Заграница (${count} ${parseInt(count) === 1 ? "страна" : "страны"})`
        }
      }

      const travelersCount = companions === "solo" ? 1 : companions === "couple" ? 2 : companions === "family" ? 4 : 3

      const requestPayload = {
        destination: destinationValue,
        destinationType,
        days: tripDays,
        budget: effectiveBudget,
        customBudget: budget === "custom" ? customBudget : undefined,
        departureCity: sanitizeInput(departureCity),
        travelStyle,
        companions,
        countryCount: destination !== "custom" ? countryCount : undefined,
        paymentMethods,
        guideLanguage,
        startDate: date?.from?.toISOString().split("T")[0],
        endDate: date?.to?.toISOString().split("T")[0],
        travelersCount
      }

      console.log("Submitting request:", requestPayload)

      const endpoint = "/api/deepseek"
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `API Error: ${response.status}`)
      }

      const routeData = await response.json()

      if (!routeData || typeof routeData !== "object") {
        throw new Error("Invalid response format")
      }

      const routeId = `trip_${Date.now()}`
      const storageSuccess = setItem(routeId, JSON.stringify(routeData))

      if (!storageSuccess) {
        console.warn("localStorage unavailable, using URL params")
      }

      router.push(`/results?id=${routeId}`)
    } catch (error: any) {
      console.error("Generation error:", error)
      setErrorModal({
        open: true,
        title: "Ошибка генерации",
        message: error.message || "Произошла ошибка при создании маршрута",
        details: error.stack
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleStyle = (style: string) => {
    setTravelStyle((prev) => prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style])
  }

  // Check if current step is valid for navigation
  const isStep1Valid = departureCity.trim() && date?.from && date?.to
  const isStep2Valid = destination === "custom" ? customDestination.trim() : true
  const isStep3Valid = budget !== ""
  const isStep4Valid = companions !== ""

  const getStepValidity = (step: number) => {
    switch (step) {
      case 1: return isStep1Valid
      case 2: return isStep2Valid
      case 3: return isStep3Valid
      case 4: return isStep4Valid
      default: return true
    }
  }

  return (
    <AppLayout>
      <GeneratingModal open={loading} />
      <ErrorModal
        open={errorModal.open}
        onClose={() => setErrorModal({ ...errorModal, open: false })}
        onRetry={() => handleSubmit()}
        title={errorModal.title}
        message={errorModal.message}
        blockers={errorModal.blockers}
        warnings={errorModal.warnings}
        details={errorModal.details}
      />

      {/* Background */}
      <div className="fixed inset-0 z-0">
        <Aurora colorStops={["#3A228A", "#181825", "#0E0E14"]} amplitude={1.2} speed={0.4} />
        <FloatingIcons />
      </div>

      <div className="container relative z-10 py-8 md:py-12 px-4 min-h-[calc(100vh-80px)] flex flex-col items-center justify-center">
        {/* Header */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Создайте идеальное путешествие
            </span>
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
            AI спланирует маршрут под ваши предпочтения за несколько секунд
          </p>
        </div>

        {/* Stepper Form */}
        <Stepper
          initialStep={1}
          onStepChange={(step) => setCurrentStep(step)}
          onFinalStepCompleted={handleSubmit}
          backButtonText="Назад"
          nextButtonText="Далее"
          finalButtonText="Создать маршрут ✨"
          showStepLabels={true}
          stepLabels={["Откуда", "Куда", "Бюджет", "Детали"]}
          isNextDisabled={!getStepValidity(currentStep)}
          className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200"
        >
          {/* Step 1: Departure & Dates */}
          <Step>
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 mb-3 border border-violet-500/10 shadow-lg shadow-violet-500/10">
                  <Plane className="h-7 w-7 text-violet-400" />
                </div>
                <h2 className="text-xl font-bold tracking-tight">Откуда и когда?</h2>
                <p className="text-sm text-muted-foreground mt-1">Укажите город вылета и даты поездки</p>
              </div>

              <div className="space-y-2 max-w-lg mx-auto">
                <Label className="text-sm font-medium flex items-center gap-2 text-muted-foreground ml-1">
                  <MapPin className="h-4 w-4 text-violet-400" />
                  Город отправления
                </Label>
                <CityAutocomplete
                  placeholder="Например: Москва"
                  value={departureCity}
                  onValueChange={setDepartureCity}
                  className="h-12 rounded-xl text-base px-4 bg-white/5 border-white/10 focus:bg-white/10 transition-all hover:bg-white/10"
                />
              </div>

              <div className="space-y-2 max-w-lg mx-auto">
                <Label className="text-sm font-medium flex items-center gap-2 text-muted-foreground ml-1">
                  <CalendarIcon className="h-4 w-4 text-violet-400" />
                  Даты поездки
                </Label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal h-12 rounded-xl bg-white/5 border-white/10 hover:bg-white/10 hover:text-white transition-all text-base",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-3 h-5 w-5 text-primary" />
                      {date?.from ? (
                        date.to ? (
                          <>
                            {format(date.from, "dd MMM", { locale: ru })} — {format(date.to, "dd MMM yyyy", { locale: ru })}
                            <span className="ml-auto text-xs text-muted-foreground bg-white/5 px-2 py-1 rounded-lg">
                              {Math.ceil((date.to.getTime() - date.from.getTime()) / (1000 * 60 * 60 * 24)) + 1} дней
                            </span>
                          </>
                        ) : format(date.from, "dd MMMM yyyy", { locale: ru })
                      ) : (
                        <span>Выберите даты</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-card border-border shadow-2xl rounded-2xl" align="center">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={date?.from}
                      selected={date}
                      onSelect={setDate}
                      numberOfMonths={isMobile ? 1 : 2}
                      disabled={{ before: new Date() }}
                      locale={ru}
                      className="rounded-2xl"
                    />
                    <div className="p-3 border-t border-border flex justify-end">
                      <Button size="sm" onClick={() => setIsCalendarOpen(false)} className="rounded-xl">
                        Готово
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </Step>

          {/* Step 2: Destination */}
          <Step>
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 mb-3 border border-emerald-500/10 shadow-lg shadow-emerald-500/10">
                  <Globe className="h-7 w-7 text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold tracking-tight">Куда едем?</h2>
                <p className="text-sm text-muted-foreground mt-1">Выберите направление путешествия</p>
              </div>

              <RadioGroup
                value={destination}
                onValueChange={(v) => {
                  if (v === 'mixed') return
                  setDestination(v as any)
                }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-lg mx-auto"
              >
                {[
                  { id: "russia", label: "Россия", icon: <MapPin className="h-5 w-5 mb-1" /> },
                  { id: "abroad", label: "Заграница", icon: <Globe className="h-5 w-5 mb-1" /> },
                  { id: "custom", label: "Свой выбор", icon: <Sparkles className="h-5 w-5 mb-1" /> }
                ].map((type) => (
                  <Label
                    key={type.id}
                    htmlFor={type.id}
                    className={cn(
                      "flex flex-col cursor-pointer items-center justify-center gap-2 rounded-2xl py-4 sm:py-6 text-sm font-medium transition-all duration-300 border",
                      destination === type.id
                        ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-lg shadow-emerald-500/10"
                        : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <RadioGroupItem value={type.id} id={type.id} className="sr-only" />
                    {type.icon}
                    <span className="font-semibold text-sm sm:text-base">{type.label}</span>
                  </Label>
                ))}
              </RadioGroup>

              {destination === "custom" ? (
                <div className="animate-in fade-in slide-in-from-top-2 max-w-lg mx-auto">
                  <CityAutocomplete
                    value={customDestination}
                    onValueChange={setCustomDestination}
                    placeholder="Укажите город или страну"
                    className="h-12 rounded-xl text-base bg-white/5 border-white/10"
                    multiselect={true}
                  />
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-top-2 max-w-lg mx-auto">
                  <Select value={countryCount} onValueChange={setCountryCount}>
                    <SelectTrigger className="h-12 w-full rounded-xl text-base px-4 bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                      <SelectValue placeholder={destination === "russia" ? "Сколько городов?" : "Количество стран"} />
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
          </Step>

          {/* Step 3: Budget & Interests */}
          <Step>
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 mb-3 border border-amber-500/10 shadow-lg shadow-amber-500/10">
                  <CreditCard className="h-7 w-7 text-amber-400" />
                </div>
                <h2 className="text-xl font-bold tracking-tight">Бюджет и интересы</h2>
                <p className="text-sm text-muted-foreground mt-1">Выберите уровень комфорта и стиль</p>
              </div>

              <div className="space-y-4 max-w-lg mx-auto w-full">
                <Label className="text-sm font-medium flex items-center gap-2 text-muted-foreground ml-1">
                  <CreditCard className="h-4 w-4 text-amber-400" />
                  Бюджет
                </Label>
                <RadioGroup value={budget} onValueChange={setBudget} className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  {[
                    { id: "economy", title: "Эконом", range: "₽5-10k", icon: ShoppingBag },
                    { id: "comfort", title: "Комфорт", range: "₽15-30k", icon: CreditCard },
                    { id: "premium", title: "Премиум", range: "₽40k+", icon: Gem },
                  ].map((b) => {
                    const Icon = b.icon
                    const isSelected = budget === b.id
                    return (
                      <Label
                        key={b.id}
                        htmlFor={b.id}
                        className={cn(
                          "flex flex-col items-center gap-2 rounded-2xl p-4 sm:p-5 cursor-pointer transition-all duration-300 border",
                          isSelected
                            ? "bg-amber-500/10 border-amber-500/50 text-amber-400 shadow-lg shadow-amber-500/10"
                            : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <RadioGroupItem value={b.id} id={b.id} className="sr-only" />
                        <Icon className="h-5 w-5 mb-1" />
                        <span className="font-bold text-sm sm:text-base">{b.title}</span>
                        <span className="text-xs opacity-70">{b.range}/день</span>
                      </Label>
                    )
                  })}
                </RadioGroup>

                {/* Custom budget */}
                <div className={cn(
                  "flex items-center gap-3 p-4 rounded-2xl transition-all",
                  budget === 'custom' ? "bg-primary/10 border border-primary/30" : "bg-white/5 border border-white/10"
                )}>
                  <Sparkles className={cn("h-5 w-5", budget === 'custom' ? 'text-primary' : 'text-muted-foreground')} />
                  <span className="text-sm font-medium">Свой:</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="100.000"
                    value={customBudget ? parseInt(customBudget.replace(/\D/g, '')).toLocaleString('ru-RU').replace(/\s/g, '.') : ''}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/\D/g, '')
                      setCustomBudget(rawValue)
                      if (rawValue) setBudget("custom")
                    }}
                    className="h-12 flex-1 text-center font-bold bg-transparent border-0 border-b-2 border-white/20 focus:border-primary rounded-none px-2 text-lg"
                  />
                  <span className="font-bold">₽</span>
                </div>
              </div>

              <div className="space-y-3 max-w-lg mx-auto w-full">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary" />
                  Интересы
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { id: "culture", label: "Культура", icon: Compass },
                    { id: "nature", label: "Природа", icon: Mountain },
                    { id: "food", label: "Еда", icon: Utensils },
                    { id: "relax", label: "Релакс", icon: Bed },
                    { id: "adventure", label: "Активный", icon: Map },
                    { id: "shopping", label: "Шоппинг", icon: ShoppingBag },
                    { id: "photo", label: "Фото", icon: Camera },
                    { id: "events", label: "Ивенты", icon: Sparkles },
                    { id: "luxury", label: "Люкс", icon: Gem },
                  ].map((style) => {
                    const Icon = style.icon
                    const isSelected = travelStyle.includes(style.id)
                    return (
                      <Label
                        key={style.id}
                        htmlFor={style.id}
                        className={cn(
                          "flex items-center gap-2 p-3 sm:p-4 rounded-xl cursor-pointer transition-all text-sm",
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                            : "bg-white/5 border border-white/10 hover:bg-white/10"
                        )}
                      >
                        <Checkbox
                          id={style.id}
                          checked={isSelected}
                          onCheckedChange={() => toggleStyle(style.id)}
                          className="sr-only"
                        />
                        <Icon className="h-4 w-4" />
                        {style.label}
                      </Label>
                    )
                  })}
                </div>
              </div>
            </div>
          </Step>

          {/* Step 4: Companions & Payment */}
          <Step>
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 mb-3 border border-pink-500/10 shadow-lg shadow-pink-500/10">
                  <Users className="h-7 w-7 text-pink-400" />
                </div>
                <h2 className="text-xl font-bold tracking-tight">Последние детали</h2>
                <p className="text-sm text-muted-foreground mt-1">С кем едете и способ оплаты</p>
              </div>

              <div className="space-y-4 max-w-lg mx-auto w-full">
                <Label className="text-sm font-medium flex items-center gap-2 text-muted-foreground ml-1">
                  <Users className="h-4 w-4 text-pink-400" />
                  Компания
                </Label>
                <RadioGroup value={companions} onValueChange={setCompanions} className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {[
                    { id: "solo", label: "Один", icon: "👤" },
                    { id: "couple", label: "Вдвоем", icon: "💑" },
                    { id: "family", label: "Семья", icon: "👨‍👩‍👧‍👦" },
                    { id: "friends", label: "Друзья", icon: "👥" },
                  ].map((c) => (
                    <Label
                      key={c.id}
                      htmlFor={`comp-${c.id}`}
                      className={cn(
                        "flex items-center gap-3 p-4 sm:p-5 rounded-2xl cursor-pointer transition-all border",
                        companions === c.id
                          ? "bg-pink-500/10 border-pink-500/50 text-pink-400 shadow-lg shadow-pink-500/10"
                          : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <RadioGroupItem value={c.id} id={`comp-${c.id}`} className="sr-only" />
                      <span className="text-xl">{c.icon}</span>
                      <span className="font-semibold text-base sm:text-lg">{c.label}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-4 max-w-lg mx-auto w-full">
                <Label className="text-sm font-medium flex items-center gap-2 text-muted-foreground ml-1">
                  <CreditCard className="h-4 w-4 text-pink-400" />
                  Способ оплаты
                </Label>
                <RadioGroup
                  value={paymentMethods[0] || ""}
                  onValueChange={(v) => setPaymentMethods([v])}
                  className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-2"
                >
                  {[
                    { id: "mir", label: "МИР", icon: <Image src="/Mir.png" alt="MIR" width={40} height={16} className="h-5 w-auto object-contain" unoptimized /> },
                    { id: "unionpay", label: "UnionPay", icon: <Image src="/union.webp" alt="UnionPay" width={40} height={20} className="h-6 w-auto object-contain" unoptimized /> },
                    { id: "foreign", label: "Visa/MC", icon: <Image src="/visa.png" alt="Visa" width={40} height={16} className="h-5 w-auto object-contain" unoptimized /> },
                    { id: "cash", label: "Налич.", icon: <Banknote className="h-6 w-6 text-green-500" /> },
                  ].map((method) => {
                    const isSelected = paymentMethods.includes(method.id)
                    return (
                      <Label
                        key={method.id}
                        htmlFor={`pay-${method.id}`}
                        className={cn(
                          "flex flex-col items-center justify-center gap-2 p-3 rounded-xl cursor-pointer transition-all",
                          isSelected
                            ? "bg-primary/10 border-2 border-primary"
                            : "bg-white/5 border border-white/10 hover:bg-white/10"
                        )}
                      >
                        <RadioGroupItem value={method.id} id={`pay-${method.id}`} className="sr-only" />
                        <div className="h-8 flex items-center justify-center">{method.icon}</div>
                        <span className="text-[10px] font-medium text-muted-foreground">{method.label}</span>
                      </Label>
                    )
                  })}
                </RadioGroup>
              </div>
            </div>
          </Step>
        </Stepper>

        <p className="mt-6 text-center text-xs text-muted-foreground animate-in fade-in duration-1000 delay-500">
          Бесплатно доступно 3 генерации маршрутов
        </p>
      </div>
    </AppLayout>
  )
}
