// Force HMR update
"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ru, enUS } from "date-fns/locale"
import type { DateRange } from "react-day-picker"
import { CityAutocomplete } from "@/components/ui/city-autocomplete"
import {
  MapPin,
  Calendar as CalendarIcon,
  Sparkles,
  Mountain,
  Camera,
  Utensils,
  ShoppingBag,
  Compass,
  Bed,
  Gem,
  Map,
  Palette,
  RotateCcw,
  ArrowRightLeft,
  GripVertical,
  Route,
  Navigation,
  Plane,
  Train,
  Car,
  Zap,
  Clock,
  ChevronUp,
  ChevronDown,
  Plus,
  Minus,
  AlertTriangle,
} from "lucide-react"
import { ErrorModal } from "@/components/ErrorModal"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"
import { PlanTooltips } from "@/components/plan/PlanTooltips"
import { PLAN_PENDING_GENERATION_KEY } from "@/lib/trip-generation-stream"
import { appToast as toast } from "@/components/ui/sonner"

// ─── Budget donut helpers ────────────────────────────────────────────────────
const CIRC = 2 * Math.PI * 60 // r=60, ≈376.99
function getBudgetOffset(budget: string, customBudget: string): number {
  let pct = 0.62
  if (budget === "economy") pct = 0.30
  else if (budget === "comfort") pct = 0.62
  else if (budget === "premium") pct = 0.88
  else if (budget === "custom") {
    const val = parseInt(customBudget || "0")
    pct = val > 0 ? Math.min(val / 1000000, 1) : 0.10
  }
  return CIRC * (1 - pct)
}
const BUDGET_COLORS: Record<string, string> = {
  economy: "#10b981",
  comfort: "#007AFF",
  premium: "#f59e0b",
  custom: "#8b5cf6",
}

export default function PlanPage() {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('plan')
  const dateFnsLocale = locale === 'ru' ? ru : enUS

  const BUDGET_LABELS: Record<string, string> = {
    economy: t('budgets.economy'),
    comfort: t('budgets.comfort'),
    premium: t('budgets.premium'),
    custom: t('budgets.custom'),
  }
  const BUDGET_DAILY: Record<string, string> = {
    economy: t('budgets.economyDaily'),
    comfort: t('budgets.comfortDaily'),
    premium: t('budgets.premiumDaily'),
    custom: "",
  }

  // ── Core form state ──────────────────────────────────────────────────────
  const [departureCity, setDepartureCity] = useState("")
  const [returnToOrigin, setReturnToOrigin] = useState(true)
  const [returnCity, setReturnCity] = useState("")
  const [travelMode, setTravelMode] = useState<"flight" | "train" | "car">("flight")
  const [destination, setDestination] = useState<"russia" | "abroad" | "mixed" | "custom">("custom")
  const [customDestination, setCustomDestination] = useState("")
  const [budget, setBudget] = useState("comfort")
  const [customBudget, setCustomBudget] = useState("")
  const [date, setDate] = useState<DateRange | undefined>()
  const [travelStyle, setTravelStyle] = useState<string[]>([])
  const [travelers, setTravelers] = useState<number>(2)
  const [companions, setCompanions] = useState("couple")
  const [paymentMethods, setPaymentMethods] = useState<string[]>([])
  const [tripHighlight, setTripHighlight] = useState("")
  const [highlightError, setHighlightError] = useState<string | null>(null)
  const [aiCreativity, setAiCreativity] = useState("balanced")
  const [autoFavorites, setAutoFavorites] = useState(false)

  // ── UI state ─────────────────────────────────────────────────────────────
  const [profile, setProfile] = useState<any>(null)
  const [accessMode, setAccessMode] = useState<string>("active")
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isMobile, setIsMobile] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [highlightFocused, setHighlightFocused] = useState(false)

  // ── Route builder ─────────────────────────────────────────────────────────
  const [showRouteModal, setShowRouteModal] = useState(false)
  const [cityDays, setCityDays] = useState<Record<string, number | "auto">>({})
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  // ── Error modal ───────────────────────────────────────────────────────────
  const [errorModal, setErrorModal] = useState<{
    open: boolean
    title?: string
    message: string
    blockers?: Array<{ code: string; message: string; suggestion?: string }>
    warnings?: Array<{ code: string; message: string; suggestion?: string }>
    details?: string
  }>({ open: false, message: "" })

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    let t: NodeJS.Timeout
    const onResize = () => { clearTimeout(t); t = setTimeout(check, 150) }
    window.addEventListener("resize", onResize)
    return () => { window.removeEventListener("resize", onResize); clearTimeout(t) }
  }, [])

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (departureCity || date?.from) { e.preventDefault(); e.returnValue = "" }
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [departureCity, date])

  useEffect(() => {
    let mounted = true
    const ac = new AbortController()
    const fetch = async () => {
      try {
        const { data: sd } = await supabase.auth.getSession()
        if (sd?.session?.user && !ac.signal.aborted) {
          const { data: pd } = await supabase.from("profiles").select("*").eq("id", sd.session.user.id).single()
          if (pd && mounted) {
            setProfile(pd)
            const prefs = pd.preferences || {}
            if (prefs.departureCity && !departureCity) setDepartureCity(prefs.departureCity)
            if (prefs.aiCreativity) setAiCreativity(prefs.aiCreativity)
            if (prefs.autoFavorites !== undefined) setAutoFavorites(prefs.autoFavorites)
            setAccessMode(pd.access_mode || "active")
            if (pd.access_mode === "full_blocked" && !ac.signal.aborted) router.push("/blocked")
          }
        }
      } catch (e) { if (!ac.signal.aborted) console.error(e) }
    }
    fetch()
    return () => { mounted = false; ac.abort() }
  }, [router])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const sanitizeInput = (s: string) =>
    s.replace(/[<>{}[\]\\]/g, "").replace(/(\r\n|\n|\r)/gm, " ").trim().slice(0, 500)

  const FORBIDDEN_STEMS = [
    "хуй","хуе","хуи","хуя","пизд","ебал","ебать","ебан","ёбал","ёбать","ёбан","наебал",
    "блять","блядь","мудак","залупа","суках","сукин","наркотик","героин","кокаин","метамфет",
    "амфетамин","проститут","бордел","стриптиз","порнo","порно",
    "ignore previous","system prompt","jailbreak","dan mode",
    "забудь всё","забудь все","respond only","act as an ai",
  ]
  const validateHighlight = (text: string): string | null => {
    if (!text.trim()) return null
    const lower = text.toLowerCase()
    for (const stem of FORBIDDEN_STEMS) if (lower.includes(stem)) return t('validation.highlightInvalid')
    if (/\b(ты теперь|ты являешься|ты — это)\b/i.test(lower)) return t('validation.aiJailbreak')
    return null
  }

  const HIGHLIGHT_KEYS = ['cats','streetFood','sunrise','hiddenPlaces','streetArt','wineViews','photoshoot','liveMusic','coffee'] as const
  const HIGHLIGHT_SUGGESTIONS = HIGHLIGHT_KEYS.map(k => ({
    label: t(`highlightSuggestions.${k}`),
    value: t(`highlightValues.${k}`),
  }))

  const validateForm = (): string[] => {
    const errors: string[] = []
    if (!departureCity.trim()) errors.push(t('validation.departureRequired'))
    if (!date?.from || !date?.to) {
      errors.push(t('validation.datesRequired'))
    } else {
      const days = Math.ceil((date.to.getTime() - date.from.getTime()) / 86400000) + 1
      if (days < 2) errors.push(t('validation.minDays'))
      if (days > 30) errors.push(t('validation.maxDays'))
    }
    if (!customDestination.trim()) errors.push(t('validation.destinationRequired'))
    if (!companions) errors.push(t('validation.companionsRequired'))
    if (!budget) errors.push(t('validation.budgetRequired'))
    if (budget === "custom") {
      const val = parseInt(customBudget || "0")
      if (!customBudget || val < 10000) errors.push(t('validation.minBudget'))
      else if (val > 10000000) errors.push(t('validation.maxBudget'))
    }
    if (tripHighlight.trim() && validateHighlight(tripHighlight)) errors.push(t('validation.highlightInvalid'))
    return errors
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const errors = validateForm()
    if (errors.length > 0) {
      setValidationErrors(errors)
      setErrorModal({ open: true, title: t('validation.checkTitle'), message: t('errors.fillRequired'), blockers: errors.map((err, i) => ({ code: `VAL${i}`, message: err })) })
      return
    }
    setValidationErrors([])
    const tripDays = date?.from && date?.to ? Math.ceil((date.to.getTime() - date.from.getTime()) / 86400000) + 1 : 7
    const requestPayload = {
      destination: sanitizeInput(customDestination),
      destinationType: "custom",
      customDestination: sanitizeInput(customDestination),
      days: tripDays,
      budget,
      customBudget: budget === "custom" ? customBudget : undefined,
      departureCity: sanitizeInput(departureCity),
      returnToOrigin,
      returnCity: returnToOrigin ? undefined : sanitizeInput(returnCity),
      travelStyle,
      companions,
      startDate: date?.from ? format(date.from, "yyyy-MM-dd") : undefined,
      endDate: date?.to ? format(date.to, "yyyy-MM-dd") : undefined,
      travelers: companions === "family" || companions === "friends" ? travelers : companions === "solo" ? 1 : 2,
      aiCreativity,
      locale,
      tripHighlight: tripHighlight.trim() ? sanitizeInput(tripHighlight) : undefined,
      preferences: profile ? {
        citizenship: profile.preferences?.citizenship || profile.citizenship,
        languages: profile.languages || profile.preferences?.languages,
        visitedCountries: profile.preferences?.visitedCountries,
        interestsDetailed: profile.preferences?.interestsDetailed,
        dietaryRestrictions: profile.preferences?.dietaryRestrictions,
        dietaryCustom: profile.preferences?.dietaryCustom,
        pace: profile.preferences?.pace,
        gender: profile.preferences?.gender,
        age: profile.preferences?.age,
      } : undefined,
      autoFavorites,
      travelMode,
      /** Только города из формы; снятие — диалог Economy «гибкий маршрут» на /plan/vibe */
      strictDestinations: true,
    }
    try {
      sessionStorage.setItem(PLAN_PENDING_GENERATION_KEY, JSON.stringify(requestPayload))
    } catch {
      setErrorModal({ open: true, title: t('validation.checkTitle'), message: t('errors.storageFailed'), details: undefined })
      return
    }
    router.push("/plan/vibe")
  }

  const toggleStyle = (style: string) =>
    setTravelStyle(prev => prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style])

  // ── Donut chart values ────────────────────────────────────────────────────
  const donutOffset = getBudgetOffset(budget, customBudget)
  const donutColor = BUDGET_COLORS[budget] || "#007AFF"
  const budgetDailyText = budget === "custom" && customBudget
    ? `${parseInt(customBudget).toLocaleString(locale === 'ru' ? "ru-RU" : "en-US")} ${locale === 'ru' ? '₽' : '$'}`
    : BUDGET_DAILY[budget] || t('budgets.comfortDaily')
  // font size shrinks for long custom budget strings
  const budgetFontSize = budget === "custom" && customBudget && parseInt(customBudget) >= 1000000
    ? "text-sm"
    : budget === "custom" && customBudget && parseInt(customBudget) >= 100000
    ? "text-base"
    : "text-xl"

  // ── Lucky destinations ────────────────────────────────────────────────────
  const handleLucky = () => {
    const isRu = locale === 'ru'
    const SINGLES = isRu ? [
      "Бали, Индонезия","Токио, Япония","Тбилиси, Грузия","Стамбул, Турция","Барселона, Испания",
      "Прага, Чехия","Дубай, ОАЭ","Бангкок, Таиланд","Лиссабон, Португалия","Амстердам, Нидерланды",
      "Будапешт, Венгрия","Берлин, Германия","Краков, Польша","Дубровник, Хорватия","Ереван, Армения",
      "Баку, Азербайджан","Самарканд, Узбекистан","Марракеш, Марокко","Вена, Австрия","Афины, Греция",
      "Рим, Италия","Париж, Франция","Пхукет, Таиланд","Ханой, Вьетнам","Сингапур","Сеул, Корея",
      "Санкт-Петербург, Россия","Казань, Россия","Сочи, Россия","Калининград, Россия",
    ] : [
      "Bali, Indonesia","Tokyo, Japan","Tbilisi, Georgia","Istanbul, Turkey","Barcelona, Spain",
      "Prague, Czech Republic","Dubai, UAE","Bangkok, Thailand","Lisbon, Portugal","Amsterdam, Netherlands",
      "Budapest, Hungary","Berlin, Germany","Krakow, Poland","Dubrovnik, Croatia","Yerevan, Armenia",
      "Baku, Azerbaijan","Samarkand, Uzbekistan","Marrakech, Morocco","Vienna, Austria","Athens, Greece",
      "Rome, Italy","Paris, France","Phuket, Thailand","Hanoi, Vietnam","Singapore","Seoul, South Korea",
    ]
    const COMBOS = isRu ? [
      "Тбилиси, Грузия; Ереван, Армения; Баку, Азербайджан",
      "Рим, Италия; Флоренция, Италия; Венеция, Италия",
      "Стамбул, Турция; Каппадокия, Турция",
      "Токио, Япония; Киото, Япония; Осака, Япония",
      "Прага, Чехия; Будапешт, Венгрия",
      "Дубровник, Хорватия; Котор, Черногория",
    ] : [
      "Tbilisi, Georgia; Yerevan, Armenia; Baku, Azerbaijan",
      "Rome, Italy; Florence, Italy; Venice, Italy",
      "Istanbul, Turkey; Cappadocia, Turkey",
      "Tokyo, Japan; Kyoto, Japan; Osaka, Japan",
      "Prague, Czech Republic; Budapest, Hungary",
      "Dubrovnik, Croatia; Kotor, Montenegro",
    ]
    const pool = Math.random() < 0.75 ? SINGLES : COMBOS
    setCustomDestination(pool[Math.floor(Math.random() * pool.length)])
    setDestination("custom")
  }

  // ── Route optimization helpers ────────────────────────────────────────────
  const CITY_COORDS: Record<string, [number, number]> = {
    "москва":[55.75,37.62],"санкт-петербург":[59.93,30.32],"питер":[59.93,30.32],"спб":[59.93,30.32],
    "казань":[55.79,49.12],"сочи":[43.60,39.73],"калининград":[54.71,20.51],"екатеринбург":[56.84,60.60],
    "новосибирск":[54.99,82.90],"краснодар":[45.04,38.98],"уфа":[54.74,55.97],"нижний новгород":[56.33,44.00],
    "токио":[35.68,139.69],"киото":[35.01,135.77],"осака":[34.69,135.50],"нара":[34.69,135.83],
    "бали":[-8.34,115.09],"убуд":[-8.51,115.26],"семиньяк":[-8.69,115.16],
    "тбилиси":[41.69,44.83],"батуми":[41.64,41.64],"кутаиси":[42.27,42.71],
    "ереван":[40.18,44.51],"баку":[40.41,49.87],"самарканд":[39.65,66.97],"ташкент":[41.30,69.24],
    "стамбул":[41.01,28.97],"каппадокия":[38.65,34.83],"анталья":[36.90,30.71],"бодрум":[37.03,27.43],
    "барселона":[41.39,2.15],"мадрид":[40.42,-3.70],"севилья":[37.39,-5.99],"валенсия":[39.47,-0.37],
    "рим":[41.90,12.50],"флоренция":[43.77,11.26],"венеция":[45.44,12.33],"милан":[45.46,9.19],"неаполь":[40.85,14.27],
    "прага":[50.08,14.44],"будапешт":[47.50,19.05],"вена":[48.21,16.37],"краков":[50.06,19.94],"варшава":[52.23,21.01],
    "берлин":[52.52,13.40],"мюнхен":[48.14,11.58],"гамбург":[53.55,10.00],"кёльн":[50.94,6.96],
    "лондон":[51.51,-0.13],"эдинбург":[55.95,-3.19],
    "париж":[48.85,2.35],"ницца":[43.71,7.26],"лион":[45.75,4.85],"марсель":[43.30,5.37],
    "амстердам":[52.37,4.90],"брюссель":[50.85,4.35],"брюгге":[51.21,3.22],
    "лиссабон":[38.72,-9.14],"порту":[41.15,-8.61],"фару":[37.02,-7.93],
    "афины":[37.98,23.73],"салоники":[40.64,22.94],"ираклион":[35.34,25.13],
    "дубровник":[42.65,18.09],"сплит":[43.51,16.44],"загреб":[45.81,15.98],"котор":[42.42,18.77],
    "вильнюс":[54.69,25.28],"рига":[56.95,24.11],"таллин":[59.44,24.75],
    "стокгольм":[59.33,18.07],"осло":[59.91,10.75],"копенгаген":[55.68,12.57],"хельсинки":[60.17,24.94],
    "цюрих":[47.38,8.54],"женева":[46.20,6.15],"берн":[46.95,7.44],
    "дубай":[25.20,55.27],"абу-даби":[24.47,54.37],"доха":[25.29,51.53],
    "марракеш":[31.63,-7.99],"касабланка":[33.59,-7.62],"фес":[34.04,-5.00],
    "каир":[30.06,31.25],"луксор":[25.69,32.64],"хургада":[27.26,33.84],"шарм-эль-шейх":[27.91,34.33],
    "найроби":[-1.29,36.82],"занзибар":[-6.16,39.20],"кейптаун":[-33.93,18.42],
    "бангкок":[13.75,100.52],"пхукет":[8.00,98.30],"чиангмай":[18.79,98.98],"паттайя":[12.93,100.88],
    "ханой":[21.03,105.85],"хошимин":[10.82,106.63],"хой ан":[15.88,108.34],"да нанг":[16.07,108.22],
    "сингапур":[1.35,103.82],"куала-лумпур":[3.14,101.69],"пенанг":[5.42,100.33],
    "сеул":[37.57,126.98],"пусан":[35.18,129.07],
    "пекин":[39.91,116.39],"шанхай":[31.23,121.47],"гуанчжоу":[23.13,113.26],
    "гонконг":[22.33,114.19],"макао":[22.19,113.54],
    "тайпей":[25.04,121.56],
    "дели":[28.61,77.21],"мумбаи":[19.08,72.88],"гоа":[15.30,74.00],"джайпур":[26.92,75.79],
    "катманду":[27.72,85.32],"покхара":[28.21,83.99],
    "коломбо":[6.93,79.85],"канди":[7.29,80.63],
    "мале":[4.17,73.51],
    "реюньон":[-21.11,55.53],
    "алматы":[43.23,76.88],"бишкек":[42.87,74.59],
    "нью-йорк":[40.71,-74.01],"лос-анджелес":[34.05,-118.24],"майами":[25.77,-80.19],
    "торонто":[43.65,-79.38],"ванкувер":[49.28,-123.12],
    "мехико":[19.43,-99.13],"канкун":[21.16,-86.85],
    "рио-де-жанейро":[-22.91,-43.17],"буэнос-айрес":[-34.61,-58.38],
    "сидней":[-33.87,151.21],"мельбурн":[-37.81,144.96],
    "окленд":[-36.85,174.76],
    "белград":[44.80,20.47],"сараево":[43.85,18.36],"скопье":[41.99,21.43],"тирана":[41.33,19.83],
    "бухарест":[44.43,26.10],"софия":[42.70,23.32],
    "одесса":[46.48,30.73],"киев":[50.45,30.52],"львов":[49.84,24.03],
  }

  /** Латиница / англ. названия → ключ в CITY_COORDS (частые вводы в автокомплите) */
  const CITY_COORD_ALIASES: Record<string, string> = {
    tokyo: "токио", kyoto: "киото", osaka: "осака", nara: "нара", seoul: "сеул", busan: "пусан",
    istanbul: "стамбул", cappadocia: "каппадокия", antalya: "анталья", bodrum: "бодрум",
    tbilisi: "тбилиси", batumi: "батуми", kutaisi: "кутаиси",
    barcelona: "барселона", madrid: "мадрид", seville: "севилья", valencia: "валенсия",
    vienna: "вена", prague: "прага", budapest: "будапешт", krakow: "краков", warsaw: "варшава",
    berlin: "берлин", munich: "мюнхен", hamburg: "гамбург", cologne: "кёльн",
    london: "лондон", edinburgh: "эдинбург", paris: "париж", nice: "ницца", lyon: "лион", marseille: "марсель",
    amsterdam: "амстердам", brussels: "брюссель", bruges: "брюгге",
    rome: "рим", florence: "флоренция", venice: "венеция", milan: "милан", naples: "неаполь",
    bali: "бали", ubud: "убуд", seminyak: "семиньяк",
    moscow: "москва", "saint petersburg": "санкт-петербург", "st petersburg": "санкт-петербург",
    dubrovnik: "дубровник", split: "сплит", zagreb: "загреб", kotor: "котор",
    athens: "афины", dubai: "дубай", bangkok: "бангкок", singapore: "сингапур",
    "new york": "нью-йорк", "los angeles": "лос-анджелес", miami: "майами",
    sydney: "сидней", melbourne: "мельбурн",
  }

  /** Multiselect и автокомплит склеивают города через `;`. Запятые внутри строки — часть одного места (город, регион, страна из геокодера). */
  const parseDestinations = (s: string): string[] =>
    s.split(/[;\n]+/).map((c) => c.trim()).filter(Boolean)

  const getCityCoords = (city: string): [number, number] | null => {
    const name = city.split(",")[0].trim().toLowerCase()
    if (CITY_COORDS[name]) return CITY_COORDS[name]
    const mapped = CITY_COORD_ALIASES[name]
    if (mapped && CITY_COORDS[mapped]) return CITY_COORDS[mapped]
    return null
  }

  const haversine = ([lat1, lng1]: [number, number], [lat2, lng2]: [number, number]): number => {
    const R = 6371, toRad = (d: number) => d * Math.PI / 180
    const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1)
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  const optimizeOrder = (cities: string[], fromCity: string): string[] => {
    if (cities.length <= 1) return cities
    const remaining = [...cities]
    const result: string[] = []
    const startLabel = fromCity.trim() || cities[0] || ""
    let cur = getCityCoords(startLabel)
    if (!cur) {
      for (const c of cities) {
        const p = getCityCoords(c)
        if (p) { cur = p; break }
      }
    }
    while (remaining.length > 0) {
      if (!cur) {
        result.push(...remaining)
        break
      }
      let bestIdx = -1
      let bestDist = Infinity
      remaining.forEach((c, i) => {
        const coords = getCityCoords(c)
        if (coords) {
          const d = haversine(cur!, coords)
          if (d < bestDist) {
            bestDist = d
            bestIdx = i
          }
        }
      })
      if (bestIdx < 0 || bestDist === Infinity) {
        result.push(...remaining)
        break
      }
      const city = remaining.splice(bestIdx, 1)[0]
      result.push(city)
      cur = getCityCoords(city) ?? cur
    }
    return result
  }

  const destinations = parseDestinations(customDestination)

  const isSuboptimal =
    destinations.length > 1 &&
    optimizeOrder(destinations, departureCity.trim() || destinations[0] || "").join("|") !== destinations.join("|")

  const handleOptimize = () => {
    if (destinations.length <= 1) return
    const anchor = departureCity.trim() || destinations[0]
    const opt = optimizeOrder(destinations, anchor)
    if (opt.join("|") === destinations.join("|")) {
      toast.info(t("routeBuilder.optimizeNoChange"))
      return
    }
    setCustomDestination(opt.join("; "))
  }

  const handleMoveCity = (from: number, to: number) => {
    const arr = [...destinations]
    const [removed] = arr.splice(from, 1)
    arr.splice(to, 0, removed)
    setCustomDestination(arr.join("; "))
  }

  const handleRemoveCity = (idx: number) => {
    const arr = [...destinations]
    arr.splice(idx, 1)
    setCustomDestination(arr.join("; "))
    setCityDays(prev => {
      const next = { ...prev }
      delete next[destinations[idx]]
      return next
    })
  }

  const getCityDays = (city: string): number | "auto" => cityDays[city] ?? "auto"

  const totalTripDays = date?.from && date?.to
    ? Math.ceil((date.to.getTime() - date.from.getTime()) / 86400000) + 1
    : null

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <AppLayout className="trip-bg">
      {/* Background orbs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-500/10 dark:bg-blue-500/5 blur-[120px] animate-pulse" style={{ animationDuration: "8s" }} />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-emerald-500/8 dark:bg-emerald-500/4 blur-[100px] animate-pulse" style={{ animationDuration: "12s", animationDelay: "2s" }} />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-violet-500/6 dark:bg-violet-500/4 blur-[80px] animate-pulse" style={{ animationDuration: "10s", animationDelay: "4s" }} />
      </div>

      <PlanTooltips />
      <ErrorModal
        open={errorModal.open}
        onClose={() => setErrorModal({ ...errorModal, open: false })}
        onRetry={handleSubmit}
        title={errorModal.title}
        message={errorModal.message}
        blockers={errorModal.blockers}
        warnings={errorModal.warnings}
        details={errorModal.details}
      />

      {/* Route Builder Modal */}
      <Dialog open={showRouteModal} onOpenChange={setShowRouteModal}>
        <DialogContent
          className={cn(
            "flex max-h-[min(100dvh,100svh)] flex-col gap-0 p-0 overflow-hidden modal-dark text-white",
            "w-[calc(100vw-1rem)] max-w-2xl sm:w-full",
            "max-sm:!inset-x-0 max-sm:!left-0 max-sm:!right-0 max-sm:!top-0 max-sm:!translate-x-0 max-sm:!translate-y-0 max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:rounded-none max-sm:border-0",
            "sm:max-h-[90vh]",
          )}
        >
          <DialogTitle className="sr-only">{t('routeBuilder.title')}</DialogTitle>
          <div className="shrink-0 border-b border-white/10 px-4 pb-4 pt-[calc(3.25rem+env(safe-area-inset-top,0px))] sm:p-6 sm:pt-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(16,185,129,0.15)" }}>
                <Route className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-white sm:text-lg leading-tight">{t('routeBuilder.title')}</h2>
                <p className="text-[11px] sm:text-xs text-white/50 mt-0.5">{t('routeBuilder.subtitle')}</p>
              </div>
            </div>
          </div>

          {/* Day budget bar */}
          {totalTripDays && (() => {
            const totalAssigned = destinations.reduce((s, c) => { const d = getCityDays(c); return d !== "auto" ? s + d : s }, 0)
            const overflow = totalAssigned > totalTripDays
            const pct = Math.min(100, (totalAssigned / totalTripDays) * 100)
            return (
              <div className="shrink-0 px-4 pb-3 sm:px-6">
                <div className="flex items-center justify-between gap-2 text-[10px] mb-1.5">
                  <span className="text-white/45 shrink-0">{t('routeBuilder.distributed')}</span>
                  <span className={cn("text-right leading-tight", overflow ? "text-red-400 font-bold" : "text-white/55")}>
                    {totalAssigned} / {totalTripDays} {t('routeBuilder.d')}
                    {overflow && ` · ${t('routeBuilder.overflowBy')} ${totalAssigned - totalTripDays}${t('routeBuilder.d')}`}
                    {!overflow && totalAssigned < totalTripDays && ` · ${totalTripDays - totalAssigned}${t('routeBuilder.d')} ${t('routeBuilder.aiAssigned')}`}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${pct}%`, background: overflow ? "#f87171" : pct >= 100 ? "#34d399" : "#6366f1" }} />
                </div>
              </div>
            )
          })()}

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-4 pb-3 sm:px-6 [scrollbar-width:thin]">
            {destinations.length === 0 ? (
              <div className="text-center py-10 text-white/30 text-sm">{t('routeBuilder.empty')}</div>
            ) : destinations.map((city, idx) => {
              const days = getCityDays(city)
              // Days already assigned to OTHER cities
              const otherAssigned = destinations.reduce((s, c, i2) => {
                if (i2 === idx) return s
                const d = getCityDays(c)
                return d !== "auto" ? s + d : s
              }, 0)
              // Max allowed for this city
              const maxDays = totalTripDays ? Math.max(1, totalTripDays - otherAssigned) : 999
              const isAtMax = days !== "auto" && days >= maxDays
              const isDragging = dragIdx === idx
              const isDragOver = dragOverIdx === idx && dragIdx !== null && dragIdx !== idx
              return (
                <div
                  key={city + idx}
                  draggable
                  onDragStart={() => { setDragIdx(idx) }}
                  onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx) }}
                  onDrop={() => {
                    if (dragIdx !== null && dragIdx !== idx) handleMoveCity(dragIdx, idx)
                    setDragIdx(null); setDragOverIdx(null)
                  }}
                  onDragEnd={() => { setDragIdx(null); setDragOverIdx(null) }}
                  className="flex flex-col gap-2.5 rounded-2xl p-3 transition-all cursor-grab active:cursor-grabbing select-none sm:flex-row sm:items-center sm:gap-3 sm:p-3.5"
                  style={{
                    background: isDragOver ? "rgba(16,185,129,0.12)" : isDragging ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.05)",
                    border: isDragOver ? "1px solid rgba(16,185,129,0.4)" : isDragging ? "1px dashed rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.08)",
                    opacity: isDragging ? 0.5 : 1,
                  }}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-2 sm:items-center">
                    <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-white/30 sm:mt-0" />

                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      style={{ background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(52,211,153,0.2)" }}
                    >
                      {idx + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-snug text-white sm:truncate">{city}</p>
                      <p
                        className="mt-0.5 text-[11px] leading-snug sm:text-[10px]"
                        style={{ color: getCityCoords(city) ? "rgba(255,255,255,0.5)" : "rgba(251,191,36,0.85)" }}
                      >
                        {getCityCoords(city) ? t('routeBuilder.maxDaysHint', { max: maxDays }) : t('routeBuilder.unknownCoords')}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveCity(idx)}
                      className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg text-white/35 transition-all hover:bg-red-500/15 hover:text-red-400 sm:ml-0 sm:hidden"
                      aria-label="Remove"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pl-0 sm:contents sm:pl-0">
                  {/* Days control */}
                  <div className="flex shrink-0 items-center gap-1">
                    {/* Minus */}
                    <button
                      type="button"
                      onClick={() => {
                        if (days === "auto") {
                          const def = Math.min(Math.max(1, Math.ceil((totalTripDays || 7) / destinations.length)), maxDays)
                          setCityDays(prev => ({ ...prev, [city]: Math.max(1, def - 1) }))
                        } else if (days <= 1) {
                          setCityDays(prev => { const n = { ...prev }; delete n[city]; return n })
                        } else {
                          setCityDays(prev => ({ ...prev, [city]: days - 1 }))
                        }
                      }}
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
                    ><Minus className="h-3 w-3" /></button>

                    {/* Badge — click toggles auto/explicit */}
                    <button
                      type="button"
                      title={days === "auto" ? t('routeBuilder.autoTitle') : t('routeBuilder.manualTitle')}
                      onClick={() => {
                        if (days === "auto") {
                          const def = Math.min(Math.max(1, Math.ceil((totalTripDays || 7) / destinations.length)), maxDays)
                          setCityDays(prev => ({ ...prev, [city]: def }))
                        } else {
                          setCityDays(prev => { const n = { ...prev }; delete n[city]; return n })
                        }
                      }}
                      className="min-w-[42px] h-7 rounded-lg px-2 text-center transition-all"
                      style={{
                        background: days === "auto" ? "rgba(99,102,241,0.15)" : isAtMax ? "rgba(248,113,113,0.15)" : "rgba(255,255,255,0.08)",
                        border: days === "auto" ? "1px solid rgba(99,102,241,0.3)" : isAtMax ? "1px solid rgba(248,113,113,0.4)" : "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      <span className="whitespace-nowrap text-xs font-bold" style={{ color: days === "auto" ? "#a5b4fc" : isAtMax ? "#f87171" : "#fff" }}>
                        {days === "auto" ? "AI" : `${days}${t('routeBuilder.d')}`}
                      </span>
                    </button>

                    {/* Plus — capped at maxDays */}
                    <button
                      type="button"
                      disabled={isAtMax}
                      onClick={() => {
                        const cur = days === "auto"
                          ? Math.min(Math.max(1, Math.ceil((totalTripDays || 7) / destinations.length)), maxDays)
                          : days
                        setCityDays(prev => ({ ...prev, [city]: Math.min(cur + 1, maxDays) }))
                      }}
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                    ><Plus className="h-3 w-3" /></button>
                  </div>

                  {/* Up/Down reorder */}
                  <div className="flex shrink-0 flex-col gap-0.5">
                    <button type="button" onClick={() => idx > 0 && handleMoveCity(idx, idx - 1)}
                      className="flex h-8 w-9 items-center justify-center rounded-lg text-white/40 transition-all hover:bg-white/10 hover:text-white/80 disabled:opacity-25 sm:h-5 sm:w-6"
                      disabled={idx === 0}><ChevronUp className="h-4 w-4 sm:h-3 sm:w-3" /></button>
                    <button type="button" onClick={() => idx < destinations.length - 1 && handleMoveCity(idx, idx + 1)}
                      className="flex h-8 w-9 items-center justify-center rounded-lg text-white/40 transition-all hover:bg-white/10 hover:text-white/80 disabled:opacity-25 sm:h-5 sm:w-6"
                      disabled={idx === destinations.length - 1}><ChevronDown className="h-4 w-4 sm:h-3 sm:w-3" /></button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveCity(idx)}
                    className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white/35 transition-all hover:bg-red-500/15 hover:text-red-400 sm:flex"
                  >
                    ✕
                  </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Algorithm info */}
          <div className="shrink-0 px-4 pb-2 sm:px-6">
            <details className="group">
              <summary className="flex cursor-pointer list-none select-none items-center gap-1.5 text-[11px] text-white/45 transition-colors hover:text-white/70 sm:text-[10px]">
                <Navigation className="h-3 w-3 shrink-0" />
                {t('routeBuilder.howWorks')}
                <ChevronDown className="h-3 w-3 ml-auto group-open:rotate-180 transition-transform" />
              </summary>
              <p className="mt-2 border-l border-white/10 pl-4 text-[11px] leading-relaxed text-white/50 sm:text-[10px] sm:text-white/40">
                {t('routeBuilder.explanation')}
              </p>
            </details>
          </div>

          {/* Footer — mobile: primary action first; pl clears common bottom-left chat widgets */}
          <div className="flex shrink-0 flex-col gap-3 border-t border-white/10 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-3 max-sm:pl-14 sm:flex-row sm:items-center sm:justify-between sm:p-5 sm:pb-5 sm:pl-5">
            <div className="order-1 flex w-full flex-col gap-2 sm:order-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-2">
              <button
                type="button"
                onClick={() => setShowRouteModal(false)}
                disabled={!!totalTripDays && destinations.reduce((s, c) => { const d = getCityDays(c); return d !== "auto" ? s + d : s }, 0) > totalTripDays}
                className="h-11 w-full rounded-xl text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-auto sm:px-6"
                style={{ background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)" }}
              >
                {t('routeBuilder.apply')}
              </button>
              {totalTripDays ? (
                <span className="flex items-center justify-center gap-1 text-center text-[11px] text-white/55 sm:justify-start sm:text-xs sm:text-white/45">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  {totalTripDays} {t('routeBuilder.d')} · {destinations.length}
                </span>
              ) : null}
            </div>
            <div className="order-2 flex min-w-0 flex-col gap-2 sm:order-1 sm:flex-row sm:items-center sm:gap-3">
              <button
                type="button"
                onClick={handleOptimize}
                disabled={destinations.length <= 1}
                className="flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-400/50 bg-emerald-500/25 px-4 text-sm font-bold text-emerald-50 transition-all hover:bg-emerald-500/35 disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-auto"
              >
                <Zap className="h-4 w-4 shrink-0 text-emerald-200" />
                {t('routeBuilder.optimize')}
              </button>
              {!departureCity.trim() ? (
                <span className="text-center text-[11px] leading-snug text-white/50 sm:text-left sm:text-[10px] sm:text-white/45">
                  {t("routeBuilder.optimizeFallbackStart")}
                </span>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Page ─────────────────────────────────────────────────────────── */}
      {/* Horizontal padding from AppLayout only — aligns with /trips; extra bottom for mobile bottom nav */}
      <div className="relative z-10 mx-auto w-full min-w-0 max-w-7xl px-0 pt-16 pb-28 sm:pt-24 md:pb-16">

        {/* Header */}
        <header className="mb-8 sm:mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="font-black text-3xl sm:text-4xl md:text-5xl tracking-tight text-foreground dark:text-white mb-2">
            {t('heroTitle')}{" "}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600 dark:from-sky-400 dark:via-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
              {t('heroWord')}
            </span>
          </h1>
          <p className="text-muted-foreground max-w-xl text-sm sm:text-base">
            {t('heroSubtitle')}
          </p>
        </header>

        {/* ── Bento grid ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr_1fr] gap-4 sm:gap-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150">

          {/* ╔══════════════════════════════╗
              ║  01 — ХАБ МАРШРУТА           ║
              ╚══════════════════════════════╝ */}
          <section className="lg:row-span-1 rounded-3xl p-5 sm:p-8 bg-white/70 dark:bg-white/[0.03] backdrop-blur-2xl border border-white/60 dark:border-white/[0.07] shadow-[0_8px_32px_rgba(0,122,255,0.08)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
            <div className="flex items-center gap-3 mb-6">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/30">01</span>
              <h2 className="font-bold text-lg tracking-tight">{t('sections.routeHub')}</h2>
            </div>

            <div className="space-y-5">
              {/* Departure city */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-blue-500 ml-1">{t('fieldLabels.departureCity')}</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 z-0 h-4 w-4 -translate-y-1/2 text-blue-400 pointer-events-none" aria-hidden />
                  <CityAutocomplete
                    placeholder={t('placeholders.departure')}
                    value={departureCity}
                    onValueChange={setDepartureCity}
                    className="relative z-[1] h-12 !pl-12 rounded-xl border-blue-100 bg-blue-50/95 text-base dark:border-blue-500/20 dark:bg-blue-950/50 focus:bg-white dark:focus:bg-blue-500/15 transition-colors"
                  />
                </div>
              </div>

              {/* Return destination toggle */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-blue-500 ml-1">{t('fieldLabels.returnTo')}</label>
                <div className="grid grid-cols-2 gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => setReturnToOrigin(true)}
                    className={cn(
                      "flex min-w-0 items-center justify-center gap-1.5 sm:gap-2 h-12 sm:h-11 rounded-xl px-2 text-xs sm:text-sm font-semibold transition-all duration-200 border touch-manipulation",
                      returnToOrigin
                        ? "bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/25"
                        : "bg-blue-50/50 dark:bg-blue-500/5 border-blue-100 dark:border-blue-500/20 text-muted-foreground hover:border-blue-300 dark:hover:border-blue-500/40"
                    )}
                  >
                    <RotateCcw className="h-4 w-4" />
                    {t('fieldLabels.returnSame')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReturnToOrigin(false)}
                    className={cn(
                      "flex min-w-0 items-center justify-center gap-1.5 sm:gap-2 h-12 sm:h-11 rounded-xl px-2 text-xs sm:text-sm font-semibold transition-all duration-200 border touch-manipulation",
                      !returnToOrigin
                        ? "bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/25"
                        : "bg-blue-50/50 dark:bg-blue-500/5 border-blue-100 dark:border-blue-500/20 text-muted-foreground hover:border-blue-300 dark:hover:border-blue-500/40"
                    )}
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                    {t('fieldLabels.returnOther')}
                  </button>
                </div>

                {!returnToOrigin && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <CityAutocomplete
                      placeholder={t('placeholders.returnCity')}
                      value={returnCity}
                      onValueChange={setReturnCity}
                      className="h-12 rounded-xl text-base bg-blue-50/50 dark:bg-blue-500/5 border-blue-100 dark:border-blue-500/20 focus:bg-white dark:focus:bg-blue-500/10 transition-all"
                    />
                  </div>
                )}
              </div>

              {/* Primary transport (hub-to-hub) */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-blue-500 ml-1">{t('fieldLabels.travelMode')}</label>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 min-w-0">
                  {(
                    [
                      { id: "flight" as const, icon: Plane, label: t("travelMode.flight") },
                      { id: "train" as const, icon: Train, label: t("travelMode.train") },
                      { id: "car" as const, icon: Car, label: t("travelMode.car") },
                    ]
                  ).map(({ id, icon: Icon, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTravelMode(id)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-0.5 sm:gap-1 min-h-[3.75rem] sm:min-h-0 sm:h-[4.25rem] h-full py-2 rounded-xl text-[10px] sm:text-xs font-semibold transition-all duration-200 border touch-manipulation px-0.5",
                        travelMode === id
                          ? "bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/25"
                          : "bg-blue-50/50 dark:bg-blue-500/5 border-blue-100 dark:border-blue-500/20 text-muted-foreground hover:border-blue-300 dark:hover:border-blue-500/40",
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" aria-hidden />
                      <span className="leading-tight text-center px-1">{label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">{t("travelMode.hint")}</p>
              </div>

              {/* Date picker */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-blue-500 ml-1">{t('fieldLabels.travelDates')}</label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "w-full min-w-0 flex items-center h-12 px-3 sm:px-4 rounded-xl text-sm border transition-all touch-manipulation",
                        "bg-blue-50/50 dark:bg-blue-500/5 border-blue-100 dark:border-blue-500/20",
                        "hover:bg-white dark:hover:bg-blue-500/10 hover:border-blue-300 dark:hover:border-blue-500/40",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 sm:mr-3 h-4 w-4 text-blue-400 shrink-0" />
                      {date?.from ? (
                        date.to ? (
                          <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                            <span className="font-semibold truncate text-left text-xs sm:text-sm">
                              {format(date.from, locale === 'ru' ? "dd MMM" : "MMM dd", { locale: dateFnsLocale })} — {format(date.to, locale === 'ru' ? "dd MMM yyyy" : "MMM dd, yyyy", { locale: dateFnsLocale })}
                            </span>
                            <span className="text-[10px] sm:text-xs text-blue-500 dark:text-blue-400 bg-blue-500/10 px-1.5 sm:px-2 py-0.5 rounded-full font-bold shrink-0">
                              {t("fieldLabels.durationDaysBadge", {
                                count: Math.ceil((date.to.getTime() - date.from.getTime()) / 86400000) + 1,
                              })}
                            </span>
                          </span>
                        ) : <span className="font-semibold">{format(date.from, locale === 'ru' ? "dd MMMM yyyy" : "MMMM dd, yyyy", { locale: dateFnsLocale })}</span>
                      ) : (
                        <span>{t('placeholders.dates')}</span>
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-card border-border shadow-2xl rounded-2xl" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={date?.from}
                      selected={date}
                      onSelect={setDate}
                      numberOfMonths={isMobile ? 1 : 2}
                      disabled={{ before: new Date() }}
                      locale={dateFnsLocale}
                      className="rounded-2xl"
                    />
                    <div className="p-3 border-t border-border flex justify-end">
                      <Button size="sm" onClick={() => setIsCalendarOpen(false)} className="rounded-xl">{t('actions.done')}</Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </section>

          {/* ╔══════════════════════════════╗
              ║  02 — ВДОХНОВЕНИЕ            ║
              ╚══════════════════════════════╝ */}
          <section className="lg:row-span-1 rounded-3xl p-5 sm:p-8 bg-white/55 dark:bg-white/[0.025] backdrop-blur-2xl border border-white/50 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/30 shrink-0">02</span>
                <h2 className="font-bold text-base sm:text-lg tracking-tight">{t('sections.inspiration')}</h2>
              </div>
              <button
                type="button"
                onClick={handleLucky}
                className="flex w-full sm:w-auto items-center justify-center gap-1.5 px-3 py-2.5 sm:py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all touch-manipulation"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {t('actions.lucky')}
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 ml-1">{t('fieldLabels.whereTo')}</label>
                <CityAutocomplete
                  value={customDestination}
                  onValueChange={(v) => { setCustomDestination(v); setDestination("custom") }}
                  placeholder={t('placeholders.destination')}
                  className="bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/20 focus:bg-white dark:focus:bg-emerald-500/10"
                  multiselect={true}
                />
              </div>

              {/* Route optimization toolbar — shown when 2+ cities */}
              {destinations.length >= 2 && (
                <div className="flex flex-wrap items-stretch gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <button
                    type="button"
                    onClick={() => setShowRouteModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                    style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#34d399" }}
                  >
                    <Route className="h-3.5 w-3.5" />
                    {t('routeBuilder.constructor', { count: destinations.length })}
                  </button>
                  {isSuboptimal && (
                    <button
                      type="button"
                      onClick={handleOptimize}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all animate-in fade-in duration-300"
                      style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", color: "#fbbf24" }}
                    >
                      <Zap className="h-3.5 w-3.5" />
                      {t('actions.optimizeOrder')}
                    </button>
                  )}
                </div>
              )}

              {/* Popular chips — multi-select */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">{t('fieldLabels.popular')}</label>
                <div className="flex flex-wrap gap-1.5">
                  {(t.raw('popularCities') as string[]).map(city => {
                    const parts = customDestination.split(";").map(s => s.trim()).filter(Boolean)
                    const active = parts.some(p => p.toLowerCase().startsWith(city.toLowerCase()))
                    return (
                      <button
                        key={city}
                        type="button"
                        onClick={() => {
                          setDestination("custom")
                          if (active) {
                            // remove
                            const next = parts.filter(p => !p.toLowerCase().startsWith(city.toLowerCase()))
                            setCustomDestination(next.join("; "))
                          } else {
                            // add
                            setCustomDestination(parts.length > 0 ? `${parts.join("; ")}; ${city}` : city)
                          }
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                          active
                            ? "bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/30"
                            : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
                        )}
                      >
                        {city}
                      </button>
                    )
                  })}
                </div>
              </div>

            </div>
          </section>

          {/* ╔══════════════════════════════════╗
              ║  03 — МАТРИЦА БЮДЖЕТА (tall)     ║
              ╚══════════════════════════════════╝ */}
          <section className="lg:row-span-2 rounded-3xl p-5 sm:p-8 bg-white/70 dark:bg-white/[0.03] backdrop-blur-2xl border border-white/60 dark:border-white/[0.07] shadow-[0_8px_32px_rgba(0,122,255,0.06)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
            <div className="flex items-center gap-3 mb-6">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-500/30">03</span>
              <h2 className="font-bold text-lg tracking-tight">{t('sections.budgetMatrix')}</h2>
            </div>

            {/* Donut chart */}
            <div className="relative w-36 h-36 mx-auto mb-6 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 140 140">
                <circle cx="70" cy="70" r="60" fill="transparent" stroke="currentColor" strokeWidth="10" className="text-muted/20" />
                <circle
                  cx="70" cy="70" r="60" fill="transparent"
                  stroke={donutColor}
                  strokeWidth="10"
                  strokeDasharray={CIRC}
                  strokeDashoffset={donutOffset}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.4,0,0.2,1), stroke 400ms ease" }}
                />
              </svg>
              <div className="text-center z-10 px-2 max-w-[120px]">
                <span className={cn("block font-extrabold leading-tight break-all", budgetFontSize)} style={{ color: donutColor }}>{budgetDailyText}</span>
                <span className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground mt-0.5 block">{BUDGET_LABELS[budget]}</span>
              </div>
            </div>

            {/* Budget options */}
            <div className="space-y-2 mb-6">
              {[
                { id: "economy", label: t('budgets.economy'), sub: t('budgets.economyDaily'), color: "emerald" },
                { id: "comfort", label: t('budgets.comfort'), sub: t('budgets.comfortDaily'), color: "blue" },
                { id: "premium", label: t('budgets.premium'), sub: t('budgets.premiumDaily'), color: "amber" },
              ].map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBudget(b.id)}
                  className={cn(
                    "w-full flex flex-col items-stretch gap-1.5 sm:flex-row sm:items-center sm:justify-between px-3 sm:px-4 py-3 rounded-xl border text-sm transition-all duration-200 text-left touch-manipulation min-w-0",
                    budget === b.id
                      ? `border-${b.color}-500/60 bg-${b.color}-500/8 ring-1 ring-${b.color}-500/20`
                      : "border-border bg-white/30 dark:bg-white/5 hover:bg-white/50 dark:hover:bg-white/10"
                  )}
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className={cn("w-2.5 h-2.5 rounded-full shrink-0 transition-all", budget === b.id ? `bg-${b.color}-500` : "bg-muted-foreground/30")} />
                    <span className="font-bold truncate">{b.label}</span>
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground sm:text-right sm:shrink-0">{b.sub}</span>
                </button>
              ))}

              {/* Custom budget */}
              <div className={cn(
                "flex flex-wrap items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 rounded-xl border transition-all min-w-0",
                budget === "custom" ? "border-violet-500/60 bg-violet-500/8 ring-1 ring-violet-500/20" : "border-border bg-white/30 dark:bg-white/5"
              )}>
                <div className={cn("w-2.5 h-2.5 rounded-full shrink-0 transition-all", budget === "custom" ? "bg-violet-500" : "bg-muted-foreground/30")} />
                <span className="font-bold text-sm shrink-0">{t('fieldLabels.customBudget')}</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="100.000"
                  value={customBudget ? parseInt(customBudget.replace(/\D/g, "")).toLocaleString(locale === 'ru' ? "ru-RU" : "en-US").replace(/\s/g, ".") : ""}
                  onChange={(e) => {
                    let raw = e.target.value.replace(/\D/g, "")
                    if (raw && parseInt(raw) > 10000000) raw = "10000000"
                    setCustomBudget(raw)
                    if (raw) setBudget("custom")
                  }}
                  className="flex-1 h-8 text-center font-bold bg-transparent border-0 border-b-2 border-muted/30 focus:border-violet-500 rounded-none px-2 focus-visible:ring-0"
                />
                <span className="font-bold text-sm shrink-0">{locale === 'ru' ? '₽' : '$'}</span>
              </div>
            </div>

            {/* Interests */}
            <div className="border-t border-border/50 pt-5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-amber-500/80 mb-4 block">{t('fieldLabels.interests')}</label>
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                {[
                  { id: "culture",   label: t('interests.culture'),   icon: Compass,     color: "#f59e0b", glow: "rgba(245,158,11,0.25)" },
                  { id: "nature",    label: t('interests.nature'),    icon: Mountain,    color: "#10b981", glow: "rgba(16,185,129,0.25)" },
                  { id: "food",      label: t('interests.food'),      icon: Utensils,    color: "#f59e0b", glow: "rgba(245,158,11,0.25)" },
                  { id: "relax",     label: t('interests.relax'),     icon: Bed,         color: "#6366f1", glow: "rgba(99,102,241,0.25)" },
                  { id: "adventure", label: t('interests.adventure'), icon: Map,         color: "#f59e0b", glow: "rgba(245,158,11,0.25)" },
                  { id: "shopping",  label: t('interests.shopping'),  icon: ShoppingBag, color: "#ec4899", glow: "rgba(236,72,153,0.25)" },
                  { id: "photo",     label: t('interests.photo'),     icon: Camera,      color: "#f59e0b", glow: "rgba(245,158,11,0.25)" },
                  { id: "luxury",    label: t('interests.luxury'),    icon: Gem,         color: "#a855f7", glow: "rgba(168,85,247,0.25)" },
                  { id: "events",    label: t('interests.events'),    icon: Sparkles,    color: "#f43f5e", glow: "rgba(244,63,94,0.25)"  },
                  { id: "nightlife", label: t('interests.nightlife'), icon: Palette,     color: "#8b5cf6", glow: "rgba(139,92,246,0.25)" },
                ].map(style => {
                  const Icon = style.icon
                  const sel = travelStyle.includes(style.id)
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => toggleStyle(style.id)}
                      style={sel ? { borderColor: style.color, boxShadow: `0 0 14px ${style.glow}, inset 0 0 12px ${style.glow}` } : {}}
                      className={cn(
                        "relative flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-2.5 sm:p-3.5 rounded-2xl border-2 cursor-pointer transition-all duration-200 touch-manipulation min-w-0",
                        "bg-[#1a1f2e] dark:bg-[#1a1f2e]",
                        sel ? "border-[var(--sel-color)]" : "border-white/10 hover:border-white/25"
                      )}
                    >
                      {sel && (
                        <div
                          className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-black"
                          style={{ backgroundColor: style.color }}
                        >✓</div>
                      )}
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
                        style={{ backgroundColor: sel ? `${style.color}22` : "rgba(255,255,255,0.06)", border: `1.5px solid ${sel ? style.color + "80" : "rgba(255,255,255,0.1)"}` }}
                      >
                        <Icon className="h-4.5 w-4.5 transition-colors" style={{ width: 18, height: 18, color: sel ? style.color : "rgba(255,255,255,0.55)" }} />
                      </div>
                      <span className="text-[11px] font-semibold text-white/80">{style.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          {/* ╔══════════════════════════════════╗
              ║  04 — ИЗЮМИНКА ПОЕЗДКИ           ║
              ╚══════════════════════════════════╝ */}
          <section className="lg:col-span-2 rounded-3xl p-5 sm:p-8 bg-[#111827] text-white relative overflow-hidden group/highlight">
            {/* ambient glows */}
            <div className="absolute -right-16 -bottom-16 w-56 h-56 rounded-full bg-blue-500/15 blur-[80px] pointer-events-none transition-opacity duration-500 group-focus-within/highlight:opacity-150" />
            <div className="absolute -left-8 top-0 w-40 h-40 rounded-full bg-violet-500/12 blur-[60px] pointer-events-none" />
            {/* animated glow border on focus */}
            <div className="absolute inset-0 rounded-3xl opacity-0 group-focus-within/highlight:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(59,130,246,0.10) 50%, rgba(236,72,153,0.10) 100%)", boxShadow: "inset 0 0 0 1.5px rgba(139,92,246,0.35)" }} />

            <div className="relative z-10 min-w-0">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-5">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/40 shrink-0">04</span>
                  <Sparkles className="h-4 w-4 text-blue-400 shrink-0" />
                  <h2 className="font-bold text-base sm:text-lg tracking-tight">{t('sections.highlight')}</h2>
                  <span className="bg-gradient-to-r from-violet-500 to-fuchsia-500 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider animate-pulse shrink-0">{t('fieldLabels.personalBadge')}</span>
                </div>
                <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest shrink-0 sm:text-right">{t('fieldLabels.optional')}</span>
              </div>

              {/* textarea card with glow border */}
              <div
                className="mb-4 rounded-2xl transition-all duration-300"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  boxShadow: highlightFocused
                    ? "0 0 0 1.5px rgba(139,92,246,0.65), 0 0 28px rgba(139,92,246,0.18), 0 0 50px rgba(59,130,246,0.10)"
                    : "0 0 0 1px rgba(255,255,255,0.10)",
                }}
              >
                <Textarea
                  placeholder={t('placeholders.highlight')}
                  value={tripHighlight}
                  onChange={(e) => {
                    const v = e.target.value.slice(0, 300)
                    setTripHighlight(v)
                    setHighlightError(v.length > 0 ? validateHighlight(v) : null)
                  }}
                  onFocus={() => setHighlightFocused(true)}
                  onBlur={() => setHighlightFocused(false)}
                  className="w-full bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-white/90 placeholder:text-white/30 text-sm resize-none min-h-[96px] max-h-[140px] p-4 leading-relaxed font-medium rounded-t-2xl"
                />
                <div className="flex items-center justify-between px-4 pb-3 gap-3">
                  {highlightError ? (
                    <span className="text-xs text-red-400 font-semibold flex items-center gap-1"><span>⚠️</span>{highlightError}</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[10px] text-white/45 font-bold uppercase tracking-wider">{t('fieldLabels.aiWillRealize')}</span>
                    </div>
                  )}
                  <span className={cn("text-[10px] font-bold shrink-0", tripHighlight.length > 250 ? "text-amber-400" : "text-white/25")}>
                    {tripHighlight.length} / 300
                  </span>
                </div>
              </div>

              {/* Suggestion chips */}
              {!tripHighlight ? (
                <div className="flex flex-wrap gap-2 animate-in fade-in duration-300">
                  {HIGHLIGHT_SUGGESTIONS.map(s => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setTripHighlight(s.value)}
                      className="px-3.5 py-1.5 rounded-full bg-white/[0.07] border border-white/[0.08] hover:bg-white/[0.13] hover:border-white/20 text-xs font-medium transition-all text-white/65 hover:text-white active:scale-95"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              ) : (
                <button onClick={() => setTripHighlight("")} className="text-[10px] font-bold text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors">
                  <span>✕</span> {t('actions.clearHighlight')}
                </button>
              )}
            </div>
          </section>
        </div>

        {/* ── Full width: Конфигурация команды ───────────────────────────── */}
        <section className="mt-4 sm:mt-6 rounded-3xl p-5 sm:p-8 bg-[#111827] text-white relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 min-w-0">
          <div className="absolute -left-20 -bottom-20 w-64 h-64 rounded-full bg-blue-500/10 blur-[80px] pointer-events-none" />

          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">

              {/* Left: companions + payment */}
              <div className="flex-1 w-full">
                <div className="flex items-center gap-3 mb-5">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/40">05</span>
                  <h2 className="font-bold text-lg tracking-tight">{t('sections.teamConfig')}</h2>
                </div>

                {/* Companions */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 bg-white/5 backdrop-blur-md p-3 sm:p-5 rounded-2xl border border-white/10 mb-4">
                  {[
                    { id: "solo",    label: t('companions.solo'),    icon: "👤" },
                    { id: "couple",  label: t('companions.couple'),  icon: "💑" },
                    { id: "family",  label: t('companions.family'),  icon: "👨‍👩‍👧‍👦" },
                    { id: "friends", label: t('companions.friends'), icon: "👥" },
                  ].map(c => (
                    <div
                      key={c.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setCompanions(c.id)}
                      onKeyDown={(e) => e.key === "Enter" || e.key === " " ? setCompanions(c.id) : null}
                      className={cn(
                        "flex flex-col items-center gap-1.5 sm:gap-2 py-3 px-2 sm:py-4 sm:px-3 rounded-xl cursor-pointer transition-all duration-200 touch-manipulation min-w-0",
                        companions === c.id
                          ? "bg-blue-500/20 border border-blue-500/40 ring-1 ring-blue-500/20"
                          : "hover:bg-white/5 border border-transparent"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all",
                        companions === c.id ? "bg-blue-500 shadow-lg shadow-blue-500/40 scale-110" : "bg-white/10"
                      )}>
                        {c.icon}
                      </div>
                      <span className={cn("text-[10px] font-bold uppercase tracking-wider", companions === c.id ? "text-blue-400" : "text-white/60")}>
                        {c.label}
                      </span>
                      {/* Travelers counter for family/friends */}
                      {(c.id === "family" || c.id === "friends") && companions === c.id && (
                        <div className="flex items-center gap-2 mt-1 animate-in fade-in duration-200">
                          <button type="button" onClick={(e) => { e.stopPropagation(); setTravelers(Math.max(2, travelers - 1)) }} className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs font-bold transition-all">−</button>
                          <span className="text-sm font-bold w-4 text-center">{travelers}</span>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setTravelers(Math.min(20, travelers + 1)) }} className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs font-bold transition-all">+</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

              </div>

              {/* Right: CTA */}
              <div className="w-full lg:w-64 flex flex-col items-stretch lg:items-end gap-3">
                <p className="text-[11px] text-white/40 font-medium text-center lg:text-right leading-relaxed">
                  {companions === "solo" ? t('info.for1') : companions === "couple" ? t('info.for2') : t('info.forN', { count: travelers })}<br />
                  <span className="text-emerald-400/70">{t('info.accuracy')}</span>
                </p>

                {/* Suboptimal order warning */}
                {isSuboptimal && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs animate-in fade-in duration-300"
                    style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span className="text-amber-300/80 flex-1">{t('info.orderWarning')}</span>
                    <button type="button" onClick={handleOptimize}
                      className="text-amber-400 font-bold hover:text-amber-300 transition-colors shrink-0">
                      {t('actions.fixOrder')}
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSubmit}
                  className="w-full flex items-center justify-center gap-3 py-3.5 sm:py-4 px-6 sm:px-8 rounded-2xl font-bold text-base sm:text-lg bg-blue-500 text-white shadow-[0_0_30px_rgba(0,122,255,0.4)] hover:bg-blue-600 hover:shadow-[0_0_40px_rgba(0,122,255,0.5)] active:scale-[0.98] transition-all duration-200 touch-manipulation"
                >
                  {t('actions.continueToVibe')}
                  <Sparkles className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  )
}
