// Force HMR update
"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import { toast } from "sonner"
import dynamic from "next/dynamic"
import Stepper, { Step } from "@/components/ui/stepper"
import { FloatingIcons } from "@/components/FloatingIcons"




export default function PlanPage() {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const [departureCity, setDepartureCity] = useState("")
  const [destination, setDestination] = useState<"russia" | "abroad" | "mixed" | "custom">("abroad") 
  const [countryCount, setCountryCount] = useState("1")
  const [budget, setBudget] = useState("comfort")
  const [customBudget, setCustomBudget] = useState("")
  const [date, setDate] = useState<DateRange | undefined>()
  const abortControllerRef = useRef<AbortController | null>(null)
  const [travelStyle, setTravelStyle] = useState<string[]>([])
  const [travelers, setTravelers] = useState<number>(2) // Default 2 travelers
  const [companions, setCompanions] = useState("couple")
  const [paymentMethods, setPaymentMethods] = useState<string[]>([])
  const [guideLanguage, setGuideLanguage] = useState(false)
  const [loading, setLoading] = useState(false)
  const [customDestination, setCustomDestination] = useState("")
  const [profile, setProfile] = useState<any>(null)
  const [accessMode, setAccessMode] = useState<string>("active")
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [currentStep, setCurrentStep] = useState(1)
  const [aiCreativity, setAiCreativity] = useState("balanced")
  const [autoFavorites, setAutoFavorites] = useState(false)
  const [stepperKey, setStepperKey] = useState(0)
  const [filterByDocuments, setFilterByDocuments] = useState(false)
  const [tripHighlight, setTripHighlight] = useState("")
  const [highlightError, setHighlightError] = useState<string | null>(null)

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
    
    // Debounced resize handler
    let resizeTimer: NodeJS.Timeout
    const handleResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => checkMobile(), 150)
    }
    
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(resizeTimer)
    }
  }, [])

  // Page leave warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (departureCity || date?.from || destination === "custom") {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [departureCity, date, destination])

  useEffect(() => {
    let isMounted = true
    const abortController = new AbortController()
    
    const fetchProfile = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        if (sessionData?.session?.user && !abortController.signal.aborted) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", sessionData.session.user.id)
            .single()

          if (profileData && isMounted) {
            setProfile(profileData)
            const prefs = profileData.preferences || {}
            if (prefs.departureCity && !departureCity) setDepartureCity(prefs.departureCity)
            if (prefs.aiCreativity) setAiCreativity(prefs.aiCreativity)
            if (prefs.autoFavorites !== undefined) setAutoFavorites(prefs.autoFavorites)

            setAccessMode(profileData.access_mode || "active")
            if (profileData.access_mode === "full_blocked" && !abortController.signal.aborted) {
              router.push("/blocked")
            }
          }
        }
      } catch (e) {
        if (!abortController.signal.aborted) {
          console.error("Error fetching profile:", e)
        }
      }
    }
    fetchProfile()
    
    return () => {
      isMounted = false
      abortController.abort()
    }
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

  // Content filter for "Изюминка поездки"
  const FORBIDDEN_STEMS = [
    'хуй', 'хуе', 'хуи', 'хуя', 'пизд',
    'ебал', 'ебать', 'ебан', 'ёбал', 'ёбать', 'ёбан', 'наебал',
    'блять', 'блядь', 'мудак', 'залупа', 'суках', 'сукин',
    'наркотик', 'героин', 'кокаин', 'метамфет', 'амфетамин',
    'проститут', 'бордел', 'стриптиз', 'порнo', 'порно',
    'ignore previous', 'system prompt', 'jailbreak', 'dan mode',
    'забудь всё', 'забудь все', 'respond only', 'act as an ai',
  ]
  const validateHighlight = (text: string): string | null => {
    if (!text.trim()) return null
    const lower = text.toLowerCase()
    for (const stem of FORBIDDEN_STEMS) {
      if (lower.includes(stem)) {
        return "Напишите пожелание в приличной форме 😊"
      }
    }
    if (/\b(ты теперь|ты являешься|ты — это)\b/i.test(lower)) {
      return "Это похоже на попытку обмануть AI. Просто опишите своё желание!"
    }
    return null
  }

  const HIGHLIGHT_SUGGESTIONS = [
    { label: "🐱 Котики", value: "Хочу встретить котиков" },
    { label: "🍜 Стрит-фуд", value: "Найти лучший уличный стрит-фуд" },
    { label: "🌅 Рассвет", value: "Встретить рассвет в особом месте" },
    { label: "🏛️ Скрытые места", value: "Побывать в местах, куда не ходят туристы" },
    { label: "🎨 Стрит-арт", value: "Увидеть самый крутой стрит-арт и граффити" },
    { label: "🍷 Вино и виды", value: "Посетить винный бар с лучшим видом на город" },
    { label: "📸 Фотосессия", value: "Найти идеальный спот для фото в Instagram" },
    { label: "🕰️ Антиквариат", value: "Зайти на местный блошиный рынок или антикварную лавку" },
    { label: "🏃 Утренняя пробежка", value: "Маршрут для пробежки по красивым набережным" },
    { label: "🎸 Живая музыка", value: "Вечер в атмосферном месте с живой музыкой" },
    { label: "☕ Спешелти кофе", value: "Найти лучшие кофейни третьей волны" },
  ]

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
    if (tripHighlight.trim() && validateHighlight(tripHighlight)) {
      errors.push("Поле «Изюминка поездки» содержит недопустимый контент")
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
        customDestination: destination === "custom" ? sanitizeInput(customDestination) : undefined,
        days: tripDays,
        budget: effectiveBudget,
        customBudget: budget === "custom" ? customBudget : undefined,
        departureCity: sanitizeInput(departureCity),
        travelStyle,
        companions,
        countryCount: destination !== "custom" ? countryCount : undefined,
        paymentMethods,
        guideLanguage,
        startDate: date?.from ? format(date.from, "yyyy-MM-dd") : undefined,
        endDate: date?.to ? format(date.to, "yyyy-MM-dd") : undefined,
        travelers: (companions === 'family' || companions === 'friends') ? travelers : (companions === 'solo' ? 1 : 2),
        aiCreativity,
        filterByDocuments,
        tripHighlight: tripHighlight.trim() ? sanitizeInput(tripHighlight) : undefined,
        preferences: profile?.preferences ? {
          citizenship: profile.preferences.citizenship || profile.citizenship,
          languages: profile.preferences.languages || profile.languages,
          interestsDetailed: profile.preferences.interestsDetailed,
          dietaryRestrictions: profile.preferences.dietaryRestrictions,
          dietaryCustom: profile.preferences.dietaryCustom,
          pace: profile.preferences.pace,
          gender: profile.preferences.gender,
          age: profile.preferences.age,
          documents: profile.preferences.documents,
        } : undefined,
      }


      console.log("Submitting request:", requestPayload)

      // Create new AbortController
      if (abortControllerRef.current) abortControllerRef.current.abort()
      abortControllerRef.current = new AbortController()

      const endpoint = "/api/gemini"
      const response = await fetch(endpoint, {
        signal: abortControllerRef.current.signal,
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

      // Get current user session
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Authenticated user: Save to Supabase
        const tripRecord = {
          user_id: user.id,
          title: routeData.title || "Новый маршрут",
          destination: routeData.countries?.[0]?.name || customDestination || "Путешествие",
          description: routeData.description || "",
          itinerary: routeData.itinerary || [],
          total_cost: routeData.totalBudget || "",
          tags: routeData.tags || [],
          cover_image: routeData.coverImage || "",
          countries: routeData.countries || [],
          budget_analysis: routeData.budgetAnalysis || null,
          visa_advice: routeData.visaAdvice || "",
          payment_advice: routeData.paymentAdvice || "",
          safety_info: routeData.safetyInfo || null,
          restrictions: routeData.restrictions || null,
          viral_spots: routeData.viralSpots || [],
          flights: routeData.flights || [],
          hotels: routeData.hotels || [],
          token_usage: routeData.tokenUsage || null,
          travelers: requestPayload.travelers,
          start_date: requestPayload.startDate || null,
          end_date: requestPayload.endDate || null
        }

        const { data: insertedTrip, error } = await supabase
          .from('trips')
          .insert(tripRecord)
          .select()
          .single()

        if (!error && insertedTrip && autoFavorites) {
          await supabase.from('favorites').insert({ user_id: user.id, trip_id: insertedTrip.id })
        }

        if (error) {
          console.error("Failed to save trip to database:", JSON.stringify(error, null, 2))
          // Fallback to localStorage on DB error
          const localId = `local-${Date.now()}`
          localStorage.setItem(`trip-${localId}`, JSON.stringify(routeData))
          router.push(`/trip/${localId}`)
          return
        }

        // Redirect using the database-generated UUID
        router.push(`/trip/${insertedTrip.id}`)
      } else {
        // Guest user: Save to localStorage with 'local-' prefix
        const localId = `${Date.now()}`
        localStorage.setItem(`trip-local-${localId}`, JSON.stringify(routeData))
        // Also save as lastGeneratedRoute for /results page compatibility
        localStorage.setItem("lastGeneratedRoute", JSON.stringify(routeData))
        router.push(`/trip/local-${localId}`)
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log("Request aborted")
        return
      }
      console.error("Generation error:", error)
      setErrorModal({
        open: true,
        title: "Ошибка генерации",
        message: error.message || "Произошла ошибка при создании маршрута",
        details: error.stack
      })
    } finally {
      setLoading(false)
      abortControllerRef.current = null
    }
  }

  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setLoading(false)
    setStepperKey(prev => prev + 1)
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
    <AppLayout className="trip-bg">
      <div className="fixed inset-0 z-0 opacity-100 pointer-events-none">
        <FloatingIcons />
      </div>
      <GeneratingModal open={loading} onCancel={handleCancelGeneration} />
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



      <div 
        className="container relative z-10 py-8 md:py-12 px-4 min-h-[calc(100vh-80px)] flex flex-col items-center justify-center"
        style={resolvedTheme === 'dark' ? {
          '--primary': 'oklch(0.65 0.22 255)',
          '--primary-foreground': 'oklch(1 0 0)'
        } as React.CSSProperties : undefined}
      >
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 bg-white/30 dark:bg-black/10 backdrop-blur-sm p-4 sm:p-6 rounded-3xl border border-white/20 dark:border-white/5 shadow-sm">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight mb-2 sm:mb-3">
            <span className="bg-gradient-to-r from-blue-900 via-indigo-800 to-blue-900 dark:from-sky-400 dark:via-blue-500 dark:to-indigo-400 bg-clip-text text-transparent drop-shadow-sm">
              Создайте идеальное путешествие
            </span>
          </h1>
          <p className="text-slate-900 dark:text-muted-foreground text-xs sm:text-sm md:text-base max-w-md mx-auto font-medium">
            AI спланирует маршрут под ваши предпочтения за несколько секунд
          </p>
        </div>

        {/* Stepper Form */}
        <Stepper
          key={stepperKey}
          initialStep={currentStep}
          onStepChange={(step) => setCurrentStep(step)}
          onFinalStepCompleted={handleSubmit}
          backButtonText="Назад"
          nextButtonText="Далее"
          finalButtonText="Создать маршрут ✨"
          showStepLabels={true}
          stepLabels={["Откуда", "Куда", "Бюджет", "Детали"]}
          isNextDisabled={!getStepValidity(currentStep)}
          className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200"
          stepContainerClassName="py-4 px-4 md:px-16 md:py-10"
          contentClassName="px-4 md:px-16"
          footerClassName="pb-5 md:pb-12 px-4 md:px-16"
        >
          {/* Step 1: Departure & Dates */}
          <Step>
            <div className="space-y-4 sm:space-y-6">
              <div className="text-center mb-4 sm:mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 mb-2 sm:mb-3 border border-blue-500/10 shadow-lg shadow-blue-500/10">
                  <Plane className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">Откуда и когда?</h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Укажите город вылета и даты поездки</p>
              </div>

              <div className="space-y-2 max-w-lg mx-auto">
                  <Label className="text-sm font-medium flex items-center gap-2 text-muted-foreground ml-1">
                    <MapPin className="h-4 w-4 text-blue-400" />
                    Город отправления
                  </Label>
                  <CityAutocomplete
                    placeholder="Например: Москва"
                    value={departureCity}
                    onValueChange={setDepartureCity}
                    className="h-12 rounded-xl text-base px-4 bg-white/50 dark:bg-white/5 border-black/10 dark:border-white/10 focus:bg-white/80 dark:focus:bg-white/10 transition-all hover:bg-white/60 dark:hover:bg-white/10"
                  />
                </div>

              <div className="space-y-2 max-w-lg mx-auto">
                <Label className="text-sm font-medium flex items-center gap-2 text-muted-foreground ml-1">
                  <CalendarIcon className="h-4 w-4 text-blue-400" />
                  Даты поездки
                </Label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal h-12 rounded-xl bg-white/50 dark:bg-white/5 border-black/10 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10 hover:text-foreground dark:hover:text-white transition-all text-base",
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
                  <Globe className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
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
                        ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-500/10"
                        : "bg-white/50 dark:bg-white/5 border-black/10 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10 hover:border-black/20 dark:hover:border-white/20 text-muted-foreground hover:text-foreground"
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
                    className="h-12 rounded-xl text-base bg-white/50 dark:bg-white/5 border-black/10 dark:border-white/10"
                    multiselect={true}
                  />
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-top-2 max-w-lg mx-auto">
                  <Select value={countryCount} onValueChange={setCountryCount}>
                    <SelectTrigger className="h-12 w-full rounded-xl text-base px-4 bg-white/50 dark:bg-white/5 border-black/10 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10 transition-colors">
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

              {/* Documents filter — only for international trips */}
              {destination === "abroad" && profile?.preferences?.documents?.length > 0 && (
                <div className="max-w-lg mx-auto animate-in fade-in slide-in-from-top-2">
                  <button
                    type="button"
                    onClick={() => setFilterByDocuments(!filterByDocuments)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition-all ${
                      filterByDocuments
                        ? "border-primary/60 bg-primary/8 text-foreground"
                        : "border-border bg-white/30 dark:bg-white/5 text-muted-foreground hover:bg-white/50 dark:hover:bg-white/10"
                    }`}
                  >
                    <span className={`text-xl shrink-0 transition-all ${filterByDocuments ? 'scale-110' : ''}`}>🛂</span>
                    <div className="flex-1 text-left">
                      <span className="font-semibold block text-foreground">Учитывать мои документы</span>
                      <span className="text-xs text-muted-foreground">Мои документы: {profile.preferences.documents.map((d: string) => {
                        const labels: Record<string, string> = {
                          ru_passport: "🪪 РФ", foreign_passport: "📘 Загран", schengen: "🇪🇺 Шенген",
                          us_visa: "🇺🇸 США", uk_visa: "🇬🇧 UK", canada_visa: "🇨🇦 Канада",
                          australia_visa: "🇦🇺 Австралия", japan_visa: "🇯🇵 Япония", korea_visa: "🇰🇷 Корея",
                          india_evisa: "🇮🇳 Индия", thailand_evisa: "🇹🇭 Таиланд", vietnam_evisa: "🇻🇳 Вьетнам",
                          china_visa: "🇨🇳 Китай", uae_visa: "🇦🇪 ОАЭ", saudi_visa: "🇸🇦 Саудовская",
                          israel_visa: "🇮🇱 Израиль", albania_evisa: "🇦🇱 Албания",
                        }
                        if (d.startsWith('passport:')) return `🌍 ${d.split(':')[1]}`
                        if (d.startsWith('id:')) return `🆔 ${d.split(':')[1]}`
                        if (d.startsWith('visa:')) return `✈️ ${d.split(':')[1]}`
                        return labels[d] || d
                      }).join(' · ')}</span>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${filterByDocuments ? 'border-primary bg-primary' : 'border-muted-foreground/40'}`}>
                      {filterByDocuments && <span className="text-white text-[10px] font-bold">✓</span>}
                    </div>
                  </button>
                </div>
              )}
            </div>
          </Step>

          {/* Step 3: Budget & Interests */}
          <Step>
            <div className="space-y-4 sm:space-y-6">
              <div className="text-center mb-4 sm:mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 mb-2 sm:mb-3 border border-amber-500/10 shadow-lg shadow-amber-500/10">
                  <CreditCard className="h-6 w-6 sm:h-7 sm:w-7 text-amber-600 dark:text-amber-400" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">Бюджет и интересы</h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Выберите уровень комфорта и стиль</p>
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
                            ? "bg-amber-500/10 border-amber-500/50 text-amber-600 dark:text-amber-400 shadow-lg shadow-amber-500/10"
                            : "bg-white/50 dark:bg-white/5 border-black/10 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10 hover:border-black/20 dark:hover:border-white/20 text-muted-foreground hover:text-foreground"
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
                  budget === 'custom' ? "bg-primary/10 border border-primary/30" : "bg-white/50 dark:bg-white/5 border border-black/10 dark:border-white/10"
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
                            : "bg-white/50 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10"
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
            <div className="space-y-4 sm:space-y-6">
              <div className="text-center mb-4 sm:mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 mb-2 sm:mb-3 border border-pink-500/10 shadow-lg shadow-pink-500/10">
                  <Users className="h-6 w-6 sm:h-7 sm:w-7 text-pink-600 dark:text-pink-400" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">Последние детали</h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">С кем едете и способ оплаты</p>
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
                          ? "bg-pink-500/10 border-pink-500/50 text-pink-600 dark:text-pink-400 shadow-lg shadow-pink-500/10"
                          : "bg-white/50 dark:bg-white/5 border-black/10 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10 hover:border-black/20 dark:hover:border-white/20 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <RadioGroupItem value={c.id} id={`comp-${c.id}`} className="sr-only" />
                      <span className="text-xl">{c.icon}</span>
                      <span className="font-semibold text-base sm:text-lg">{c.label}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>





              {/* Travelers count input for Family/Friends */}
              {(companions === 'family' || companions === 'friends') && (
                <div className="space-y-4 max-w-lg mx-auto w-full animate-in fade-in slide-in-from-top-2">
                  <Label className="text-sm font-medium flex items-center gap-2 text-muted-foreground ml-1">
                    <Users className="h-4 w-4 text-pink-400" />
                    Количество путешественников
                  </Label>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setTravelers(Math.max(1, travelers - 1))}
                      className="h-12 w-12 rounded-xl bg-white/50 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center hover:bg-white/80 dark:hover:bg-white/10 transition-colors text-xl font-bold"
                    >
                      -
                    </button>
                    <div className="h-12 flex-1 rounded-xl bg-white/50 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center font-bold text-lg">
                      {travelers}
                    </div>
                    <button
                      type="button"
                      onClick={() => setTravelers(Math.min(10, travelers + 1))}
                      className="h-12 w-12 rounded-xl bg-white/50 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center hover:bg-white/80 dark:hover:bg-white/10 transition-colors text-xl font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

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
                            : "bg-white/50 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10"
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

              {/* ✨ Изюминка поездки */}
              <div className="space-y-4 max-w-lg mx-auto w-full pt-4">
                <div className="relative group">
                  {/* Decorative glow background */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-violet-500/20 via-fuchsia-500/20 to-blue-500/20 rounded-[2rem] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  
                  <div className={cn(
                    "relative rounded-[2rem] border transition-all duration-500 overflow-hidden shadow-sm",
                    highlightError
                      ? "border-red-400/50 bg-red-500/5"
                      : "bg-white/40 dark:bg-black/20 backdrop-blur-xl border-black/5 dark:border-white/10 group-focus-within:border-violet-400/50 group-focus-within:shadow-2xl group-focus-within:shadow-violet-500/10"
                  )}>
                    <div className="flex items-center justify-between px-5 pt-4 pb-1">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-violet-500/10 dark:bg-violet-500/20">
                          <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                        </div>
                        <Label className="text-sm font-bold tracking-tight text-foreground/80">
                          Изюминка поездки
                        </Label>
                        <div className="px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-[9px] text-white font-black uppercase tracking-wider shadow-sm animate-pulse">
                          Personal
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground/40 font-medium">необязательно</span>
                    </div>

                    <Textarea
                      placeholder="Например: 'Хочу найти лучший рамен' или 'Устроить пикник на закате'..."
                      value={tripHighlight}
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 300)
                        setTripHighlight(value)
                        setHighlightError(value.length > 0 ? validateHighlight(value) : null)
                      }}
                      className="min-h-[100px] max-h-[160px] resize-none bg-transparent border-0 text-base p-5 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/30 leading-relaxed font-medium"
                    />
                    
                    <div className="flex items-center justify-between px-5 pb-4 gap-3 bg-black/5 dark:bg-white/5 border-t border-black/5 dark:border-white/5">
                      {highlightError ? (
                        <span className="text-xs text-red-500 font-semibold flex items-center gap-1">
                          <span className="text-sm">⚠️</span> {highlightError}
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[11px] text-muted-foreground/60 font-medium">AI воплотит это в маршруте</span>
                        </div>
                      )}
                      <div className={cn(
                        "text-[10px] font-bold px-2 py-1 rounded-md transition-colors",
                        tripHighlight.length > 250 ? "bg-amber-500/20 text-amber-600" : "bg-black/5 dark:bg-white/10 text-muted-foreground/50"
                      )}>
                        {tripHighlight.length} <span className="opacity-40">/</span> 300
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick suggestion chips */}
                <div className="space-y-2 px-1">
                  {!tripHighlight && (
                    <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                      {HIGHLIGHT_SUGGESTIONS.map((s, idx) => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => setTripHighlight(s.value)}
                          className="group relative overflow-hidden text-xs px-4 py-2 rounded-2xl bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10 text-muted-foreground hover:border-violet-500/30 hover:text-foreground active:scale-95 transition-all duration-300"
                        >
                          <div className="absolute inset-0 bg-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <span className="relative flex items-center gap-1.5">
                            {s.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {tripHighlight && (
                    <button 
                      onClick={() => setTripHighlight("")}
                      className="text-[10px] font-bold text-violet-500 hover:text-violet-600 dark:hover:text-violet-400 flex items-center gap-1 transition-colors px-1"
                    >
                      <span>✕</span> Очистить пожелание
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Step>
        </Stepper>

        <p className="mt-6 text-center text-xs text-muted-foreground animate-in fade-in duration-1000 delay-500">
          Бесплатно доступна 1 генерация маршрута.
        </p>
      </div>
    </AppLayout>
  )
}
