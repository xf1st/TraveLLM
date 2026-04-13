"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import dynamic from "next/dynamic"
import { format, parseISO } from "date-fns"
import { ru, enUS } from "date-fns/locale"
import type { DateRange } from "react-day-picker"
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
  Plane,
  Train,
  Car,
  AlertTriangle,
  ArrowLeft,
  Loader2,
} from "lucide-react"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { streamGeminiTripGeneration } from "@/lib/trip-generation-stream"
import { saveGeneratedTripAndNavigate } from "@/lib/save-generated-trip-client"
import { ErrorModal } from "@/components/ErrorModal"
import type { ReelCardDTO } from "@/components/travel/DiscoveryReelsFeed"
import { CityAutocomplete } from "@/components/ui/city-autocomplete"
import { PlanTooltips } from "@/components/plan/PlanTooltips"
import { ReelAnchorPreviewCard } from "@/components/travel/ReelAnchorPreviewCard"

const GeneratingModal = dynamic(
  () => import("@/components/GeneratingModal").then((m) => ({ default: m.GeneratingModal })),
  { ssr: false },
)

const CIRC = 2 * Math.PI * 60
function getBudgetOffset(budget: string, customBudget: string): number {
  let pct = 0.62
  if (budget === "economy") pct = 0.3
  else if (budget === "comfort") pct = 0.62
  else if (budget === "premium") pct = 0.88
  else if (budget === "custom") {
    const val = parseInt(customBudget || "0", 10)
    pct = val > 0 ? Math.min(val / 1_000_000, 1) : 0.1
  }
  return CIRC * (1 - pct)
}
const BUDGET_COLORS: Record<string, string> = {
  economy: "#10b981",
  comfort: "#007AFF",
  premium: "#f59e0b",
  custom: "#8b5cf6",
}

const FORBIDDEN_STEMS = [
  "хуй",
  "хуе",
  "хуи",
  "хуя",
  "пизд",
  "ебал",
  "ебать",
  "ебан",
  "ёбал",
  "ёбать",
  "ёбан",
  "наебал",
  "блять",
  "блядь",
  "мудак",
  "залупа",
  "суках",
  "сукин",
  "наркотик",
  "героин",
  "кокаин",
  "метамфет",
  "амфетамин",
  "проститут",
  "бордел",
  "стриптиз",
  "порнo",
  "порно",
  "ignore previous",
  "system prompt",
  "jailbreak",
  "dan mode",
  "забудь всё",
  "забудь все",
  "respond only",
  "act as an ai",
]

function sanitizeInput(s: string) {
  return s.replace(/[<>{}[\]\\]/g, "").replace(/(\r\n|\n|\r)/gm, " ").trim()
}

export default function PlanFromReelPage() {
  const params = useParams()
  const reelId = typeof params.reelId === "string" ? params.reelId : ""
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations("fromReel")
  const tPlan = useTranslations("plan")
  const dateFnsLocale = locale === "ru" ? ru : enUS

  const BUDGET_LABELS: Record<string, string> = {
    economy: tPlan("budgets.economy"),
    comfort: tPlan("budgets.comfort"),
    premium: tPlan("budgets.premium"),
    custom: tPlan("budgets.custom"),
  }
  const BUDGET_DAILY: Record<string, string> = {
    economy: tPlan("budgets.economyDaily"),
    comfort: tPlan("budgets.comfortDaily"),
    premium: tPlan("budgets.premiumDaily"),
    custom: "",
  }

  const [reel, setReel] = useState<ReelCardDTO | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null)

  const [departureCity, setDepartureCity] = useState("")
  const [returnToOrigin, setReturnToOrigin] = useState(true)
  const [returnCity, setReturnCity] = useState("")
  const [date, setDate] = useState<DateRange | undefined>()
  const [budget, setBudget] = useState("comfort")
  const [customBudget, setCustomBudget] = useState("")
  const [travelStyle, setTravelStyle] = useState<string[]>([])
  const [travelers, setTravelers] = useState(2)
  const [companions, setCompanions] = useState("couple")
  const [travelMode, setTravelMode] = useState<"flight" | "train" | "car">("flight")
  const [tripVibe, setTripVibe] = useState("")
  const [highlightFocused, setHighlightFocused] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorModal, setErrorModal] = useState<{
    open: boolean
    title?: string
    message: string
    blockers?: Array<{ code: string; message: string; suggestion?: string }>
  }>({ open: false, message: "" })

  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    let tm: NodeJS.Timeout
    const onResize = () => {
      clearTimeout(tm)
      tm = setTimeout(check, 150)
    }
    window.addEventListener("resize", onResize)
    return () => {
      window.removeEventListener("resize", onResize)
      clearTimeout(tm)
    }
  }, [])

  useEffect(() => {
    if (!reelId) {
      setLoadError(t("invalidReel"))
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/reels/${reelId}`, { credentials: "include" })
        const j = (await res.json().catch(() => ({}))) as { reel?: ReelCardDTO; error?: string }
        if (!res.ok || !j.reel) throw new Error(j.error || t("notFound"))
        if (!cancelled) {
          setReel(j.reel)
          if (j.reel.suggested_start_date && j.reel.suggested_end_date) {
            setDate({
              from: parseISO(j.reel.suggested_start_date),
              to: parseISO(j.reel.suggested_end_date),
            })
          }
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : t("notFound"))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [reelId, t])

  useEffect(() => {
    ;(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.user) return
      const { data: pd } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()
      if (pd) {
        setProfile(pd as Record<string, unknown>)
        const prefs = (pd as { preferences?: { departureCity?: string } }).preferences
        if (prefs?.departureCity) setDepartureCity(prefs.departureCity)
      }
    })()
  }, [])

  const lockedDestination =
    reel?.city && reel.country ? `${reel.city}, ${reel.country}` : reel?.country ?? ""

  const tripDays =
    date?.from && date?.to ? Math.ceil((date.to.getTime() - date.from.getTime()) / 86_400_000) + 1 : 0

  const anchorOk = reel ? tripDays >= reel.anchor_day : false

  const validateHighlight = (text: string): string | null => {
    if (!text.trim()) return null
    const lower = text.toLowerCase()
    for (const stem of FORBIDDEN_STEMS) if (lower.includes(stem)) return tPlan("validation.highlightInvalid")
    if (/\b(ты теперь|ты являешься|ты — это)\b/i.test(lower)) return tPlan("validation.aiJailbreak")
    return null
  }

  const HIGHLIGHT_KEYS = [
    "cats",
    "streetFood",
    "sunrise",
    "hiddenPlaces",
    "streetArt",
    "wineViews",
    "photoshoot",
    "liveMusic",
    "coffee",
  ] as const
  const HIGHLIGHT_SUGGESTIONS = HIGHLIGHT_KEYS.map((k) => ({
    label: tPlan(`highlightSuggestions.${k}`),
    value: tPlan(`highlightValues.${k}`),
  }))

  const validateForm = (): string[] => {
    const errors: string[] = []
    if (!departureCity.trim()) errors.push(t("validation.departure"))
    if (!date?.from || !date?.to) {
      errors.push(t("validation.dates"))
    } else {
      if (tripDays < 1) errors.push(t("validation.minDays"))
      if (tripDays > 30) errors.push(t("validation.maxDays"))
    }
    if (reel && tripDays > 0 && tripDays < reel.anchor_day) {
      errors.push(t("validation.anchor", { day: reel.anchor_day }))
    }
    if (!budget) errors.push(tPlan("validation.budgetRequired"))
    if (budget === "custom") {
      const val = parseInt(customBudget || "0", 10)
      if (!customBudget || val < 10000) errors.push(t("validation.minBudget"))
      else if (val > 10000000) errors.push(tPlan("validation.maxBudget"))
    }
    if (tripVibe.trim() && validateHighlight(tripVibe)) errors.push(tPlan("validation.highlightInvalid"))
    return errors
  }

  const toggleStyle = (style: string) =>
    setTravelStyle((prev) => (prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]))

  const donutOffset = getBudgetOffset(budget, customBudget)
  const donutColor = BUDGET_COLORS[budget] || "#007AFF"
  const budgetDailyText =
    budget === "custom" && customBudget
      ? `${parseInt(customBudget, 10).toLocaleString(locale === "ru" ? "ru-RU" : "en-US")} ${locale === "ru" ? "₽" : "$"}`
      : BUDGET_DAILY[budget] || tPlan("budgets.comfortDaily")
  const budgetFontSize =
    budget === "custom" && customBudget && parseInt(customBudget, 10) >= 1000000
      ? "text-sm"
      : budget === "custom" && customBudget && parseInt(customBudget, 10) >= 100000
        ? "text-base"
        : "text-xl"

  const runGeneration = async () => {
    if (!reel) return
    const errors = validateForm()
    if (errors.length > 0) {
      setErrorModal({
        open: true,
        title: tPlan("validation.checkTitle"),
        message: tPlan("errors.fillRequired"),
        blockers: errors.map((err, i) => ({ code: `VAL${i}`, message: err })),
      })
      return
    }

    const prefs = profile?.preferences as Record<string, unknown> | undefined
    const requestPayload: Record<string, unknown> = {
      destinationType: "custom",
      customDestination: lockedDestination,
      days: tripDays,
      budget,
      customBudget: budget === "custom" ? customBudget : undefined,
      departureCity: sanitizeInput(departureCity),
      returnToOrigin,
      returnCity: returnToOrigin ? undefined : sanitizeInput(returnCity),
      travelStyle,
      companions,
      startDate: format(date!.from!, "yyyy-MM-dd"),
      endDate: format(date!.to!, "yyyy-MM-dd"),
      travelers: companions === "family" || companions === "friends" ? travelers : companions === "solo" ? 1 : 2,
      aiCreativity: "balanced",
      locale,
      travelMode,
      reelId: reel.id,
      tripVibe: tripVibe.trim() ? sanitizeInput(tripVibe).slice(0, 500) : undefined,
      strictDestinations: true,
      countryCount: "1",
      preferences: profile
        ? {
            citizenship: (prefs?.citizenship as string) || undefined,
            languages: (profile.languages as string[]) || (prefs?.languages as string[]),
            visitedCountries: prefs?.visitedCountries as string[] | undefined,
            interestsDetailed: prefs?.interestsDetailed as string[] | undefined,
            dietaryRestrictions: prefs?.dietaryRestrictions as string[] | undefined,
            dietaryCustom: prefs?.dietaryCustom as string | undefined,
            pace: (prefs?.pace as string) || "moderate",
            gender: prefs?.gender as string | undefined,
            age: prefs?.age as string | undefined,
          }
        : undefined,
      autoFavorites: false,
    }

    try {
      if (abortRef.current) abortRef.current.abort()
      abortRef.current = new AbortController()
      setLoading(true)
      const { autoFavorites, ...apiBody } = requestPayload
      const { routeData } = await streamGeminiTripGeneration(apiBody, abortRef.current.signal)
      await saveGeneratedTripAndNavigate(routeData as Record<string, unknown>, requestPayload, {
        autoFavorites: !!autoFavorites,
        defaultTripTitle: tPlan("defaultTripTitle"),
        defaultDestination: tPlan("defaultDestination"),
        router,
      })
    } catch (error: unknown) {
      const err = error as {
        name?: string
        message?: string
        limitExceeded?: boolean
        limit?: number
        resetAt?: string
        code?: string
        retryAfterSec?: number
      }
      if (err.name === "AbortError") return
      let message = err.message || t("generationFailed")
      if (err.limitExceeded && err.resetAt) {
        message = tPlan("monthlyLimitBody", {
          limit: err.limit ?? 10,
          date: new Date(err.resetAt).toLocaleDateString(undefined, {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
        })
      } else if (err.code === "RATE_LIMIT") {
        message = tPlan("rateLimitGeneration", { seconds: err.retryAfterSec ?? 60 })
      }
      setErrorModal({ open: true, title: tPlan("generationError"), message })
    } finally {
      setLoading(false)
    }
  }

  if (loadError || !reelId) {
    return (
      <AppLayout className="trip-bg">
        <div className="relative z-10 mx-auto min-w-0 max-w-lg px-3 sm:px-4 py-20 sm:py-24 text-center">
          <p className="mb-4 text-destructive">{loadError || t("invalidReel")}</p>
          <Button variant="outline" onClick={() => router.push("/reels")}>
            {t("backToReels")}
          </Button>
        </div>
      </AppLayout>
    )
  }

  if (!reel) {
    return (
      <AppLayout className="trip-bg">
        <div className="flex justify-center py-32">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    )
  }

  const activityAnchor =
    reel.activity_anchor && typeof reel.activity_anchor === "object"
      ? (reel.activity_anchor as Record<string, unknown>)
      : null

  return (
    <AppLayout className="trip-bg">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[-20%] left-[-10%] h-[600px] w-[600px] rounded-full bg-blue-500/10 blur-[120px] animate-pulse dark:bg-blue-500/5"
          style={{ animationDuration: "8s" }}
        />
        <div
          className="absolute right-[-5%] bottom-[-10%] h-[500px] w-[500px] rounded-full bg-emerald-500/8 blur-[100px] animate-pulse dark:bg-emerald-500/4"
          style={{ animationDuration: "12s", animationDelay: "2s" }}
        />
        <div
          className="absolute top-[40%] right-[20%] h-[300px] w-[300px] rounded-full bg-violet-500/6 blur-[80px] animate-pulse dark:bg-violet-500/4"
          style={{ animationDuration: "10s", animationDelay: "4s" }}
        />
      </div>

      <PlanTooltips />
      <ErrorModal
        open={errorModal.open}
        onClose={() => setErrorModal({ ...errorModal, open: false })}
        onRetry={runGeneration}
        title={errorModal.title}
        message={errorModal.message}
        blockers={errorModal.blockers}
      />

      <div className="relative z-10 mx-auto w-full min-w-0 max-w-7xl px-0 pt-16 pb-28 sm:pt-20 md:pb-16">
        <div className="mb-6 flex items-center gap-3 px-3 sm:px-6 lg:px-8">
          <Button variant="ghost" size="sm" className="min-h-10 gap-2 touch-manipulation text-white/80 hover:text-white" onClick={() => router.push("/reels")}>
            <ArrowLeft className="h-4 w-4" />
            {t("back")}
          </Button>
        </div>

        <header className="mb-8 sm:mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700 px-3 sm:px-6 lg:px-8">
          <h1 className="mb-2 font-black text-3xl tracking-tight text-foreground dark:text-white sm:text-4xl md:text-5xl">
            {t("heroTitle")}{" "}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600 bg-clip-text text-transparent dark:from-sky-400 dark:via-blue-400 dark:to-indigo-400">
              {t("heroAccent")}
            </span>
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground sm:text-base">{t("subtitle")}</p>
        </header>

        <div className="grid grid-cols-1 gap-4 px-3 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150 sm:gap-6 sm:px-6 lg:grid-cols-[1.2fr_0.8fr_1fr] lg:px-8">
          {/* 01 — hub */}
          <section className="rounded-3xl border border-white/60 bg-white/70 p-5 shadow-[0_8px_32px_rgba(0,122,255,0.08)] backdrop-blur-2xl dark:border-white/[0.07] dark:bg-white/[0.03] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)] sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white shadow-lg shadow-blue-500/30">
                01
              </span>
              <h2 className="text-lg font-bold tracking-tight">{tPlan("sections.routeHub")}</h2>
            </div>

            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-blue-500">
                  {tPlan("fieldLabels.departureCity")}
                </label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-4 top-1/2 z-0 h-4 w-4 -translate-y-1/2 text-blue-400" />
                  <CityAutocomplete
                    placeholder={tPlan("placeholders.departure")}
                    value={departureCity}
                    onValueChange={setDepartureCity}
                    className="relative z-[1] h-12 !pl-12 rounded-xl border-blue-100 bg-blue-50/95 text-base transition-colors focus:bg-white dark:border-blue-500/20 dark:bg-blue-950/50 dark:focus:bg-blue-500/15"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-blue-500">
                  {tPlan("fieldLabels.returnTo")}
                </label>
                <div className="grid min-w-0 grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReturnToOrigin(true)}
                    className={cn(
                      "flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-semibold transition-all duration-200 touch-manipulation sm:h-11 sm:gap-2 sm:text-sm",
                      returnToOrigin
                        ? "border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                        : "border-blue-100 bg-blue-50/50 text-muted-foreground hover:border-blue-300 dark:border-blue-500/20 dark:bg-blue-500/5 dark:hover:border-blue-500/40",
                    )}
                  >
                    <RotateCcw className="h-4 w-4" />
                    {tPlan("fieldLabels.returnSame")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReturnToOrigin(false)}
                    className={cn(
                      "flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-semibold transition-all duration-200 touch-manipulation sm:h-11 sm:gap-2 sm:text-sm",
                      !returnToOrigin
                        ? "border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                        : "border-blue-100 bg-blue-50/50 text-muted-foreground hover:border-blue-300 dark:border-blue-500/20 dark:bg-blue-500/5 dark:hover:border-blue-500/40",
                    )}
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                    {tPlan("fieldLabels.returnOther")}
                  </button>
                </div>
                {!returnToOrigin && (
                  <CityAutocomplete
                    placeholder={tPlan("placeholders.returnCity")}
                    value={returnCity}
                    onValueChange={setReturnCity}
                    className="h-12 rounded-xl border-blue-100 bg-blue-50/50 text-base transition-all focus:bg-white dark:border-blue-500/20 dark:bg-blue-500/5 dark:focus:bg-blue-500/10"
                  />
                )}
              </div>

              <div className="space-y-2">
                <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-blue-500">
                  {tPlan("fieldLabels.travelMode")}
                </label>
                <div className="grid min-w-0 grid-cols-3 gap-1.5 sm:gap-2">
                  {(
                    [
                      { id: "flight" as const, icon: Plane, label: tPlan("travelMode.flight") },
                      { id: "train" as const, icon: Train, label: tPlan("travelMode.train") },
                      { id: "car" as const, icon: Car, label: tPlan("travelMode.car") },
                    ] as const
                  ).map(({ id, icon: Icon, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTravelMode(id)}
                      className={cn(
                        "flex min-h-[3.75rem] flex-col items-center justify-center gap-0.5 rounded-xl border py-2 text-[10px] font-semibold transition-all duration-200 touch-manipulation sm:h-[4.25rem] sm:gap-1 sm:text-xs",
                        travelMode === id
                          ? "border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                          : "border-blue-100 bg-blue-50/50 text-muted-foreground hover:border-blue-300 dark:border-blue-500/20 dark:bg-blue-500/5 dark:hover:border-blue-500/40",
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="px-1 text-center leading-tight">{label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] leading-snug text-muted-foreground">{tPlan("travelMode.hint")}</p>
              </div>

              <div className="space-y-1.5">
                <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-blue-500">
                  {tPlan("fieldLabels.travelDates")}
                </label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "flex h-12 min-w-0 w-full items-center rounded-xl border px-3 text-sm transition-all touch-manipulation sm:px-4",
                        "border-blue-100 bg-blue-50/50 hover:border-blue-300 hover:bg-white dark:border-blue-500/20 dark:bg-blue-500/5 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10",
                        !date && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-blue-400 sm:mr-3" />
                      {date?.from ? (
                        date.to ? (
                          <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                            <span className="truncate text-left text-xs font-semibold sm:text-sm">
                              {format(date.from, locale === "ru" ? "dd MMM" : "MMM dd", { locale: dateFnsLocale })} —{" "}
                              {format(date.to, locale === "ru" ? "dd MMM yyyy" : "MMM dd, yyyy", {
                                locale: dateFnsLocale,
                              })}
                            </span>
                            <span className="shrink-0 rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold text-blue-500 dark:text-blue-400 sm:px-2 sm:text-xs">
                              {tPlan("fieldLabels.durationDaysBadge", {
                                count: Math.ceil((date.to.getTime() - date.from.getTime()) / 86_400_000) + 1,
                              })}
                            </span>
                          </span>
                        ) : (
                          <span className="font-semibold">
                            {format(date.from, locale === "ru" ? "dd MMMM yyyy" : "MMMM dd, yyyy", {
                              locale: dateFnsLocale,
                            })}
                          </span>
                        )
                      ) : (
                        <span>{t("pickRange")}</span>
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto rounded-2xl border border-border bg-card p-0 shadow-2xl" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={date?.from}
                      selected={date}
                      onSelect={setDate}
                      numberOfMonths={isMobile ? 1 : 2}
                      locale={dateFnsLocale}
                      className="rounded-2xl"
                    />
                    <div className="flex justify-end border-t border-border p-3">
                      <Button size="sm" className="rounded-xl" onClick={() => setIsCalendarOpen(false)}>
                        {tPlan("actions.done")}
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
                {reel && tripDays > 0 && !anchorOk && (
                  <p className="text-sm text-amber-600 dark:text-amber-400">{t("validation.anchor", { day: reel.anchor_day })}</p>
                )}
              </div>
            </div>
          </section>

          {/* 02 — reel anchor */}
          <section className="rounded-3xl border border-white/50 bg-white/55 p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] backdrop-blur-2xl dark:border-white/[0.06] dark:bg-white/[0.025] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-500/30">
                02
              </span>
              <h2 className="text-lg font-bold tracking-tight">{tPlan("sections.inspiration")}</h2>
            </div>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-emerald-500/90">
              {t("lockedDestinationLabel")}
            </p>
            <div className="mb-5 min-w-0 break-words rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-3 text-sm font-semibold text-white/90 dark:text-white sm:px-4">
              {lockedDestination}
            </div>
            <ReelAnchorPreviewCard
              reelTitle={reel.title}
              lockedDestination={lockedDestination}
              priceLabel={reel.price_label}
              anchorDay={reel.anchor_day}
              activityAnchor={activityAnchor}
              hint={t("anchorHint", { day: reel.anchor_day })}
              sectionLabel={t("reelAnchorLabel")}
              bookFallbackLabel={t("bookFallback")}
            />
          </section>

          {/* 03 — budget + interests */}
          <section className="rounded-3xl border border-white/60 bg-white/70 p-5 shadow-[0_8px_32px_rgba(0,122,255,0.06)] backdrop-blur-2xl dark:border-white/[0.07] dark:bg-white/[0.03] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)] sm:p-8 lg:row-span-2">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white shadow-lg shadow-amber-500/30">
                03
              </span>
              <h2 className="text-lg font-bold tracking-tight">{tPlan("sections.budgetMatrix")}</h2>
            </div>

            <div className="relative mx-auto mb-6 flex h-36 w-36 items-center justify-center">
              <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 140 140">
                <circle cx="70" cy="70" r="60" fill="transparent" stroke="currentColor" strokeWidth="10" className="text-muted/20" />
                <circle
                  cx="70"
                  cy="70"
                  r="60"
                  fill="transparent"
                  stroke={donutColor}
                  strokeWidth="10"
                  strokeDasharray={CIRC}
                  strokeDashoffset={donutOffset}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.4,0,0.2,1), stroke 400ms ease" }}
                />
              </svg>
              <div className="z-10 max-w-[120px] px-2 text-center">
                <span className={cn("block font-extrabold leading-tight break-all", budgetFontSize)} style={{ color: donutColor }}>
                  {budgetDailyText}
                </span>
                <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                  {BUDGET_LABELS[budget]}
                </span>
              </div>
            </div>

            <div className="mb-6 space-y-2">
              {[
                { id: "economy", label: tPlan("budgets.economy"), sub: tPlan("budgets.economyDaily"), color: "emerald" },
                { id: "comfort", label: tPlan("budgets.comfort"), sub: tPlan("budgets.comfortDaily"), color: "blue" },
                { id: "premium", label: tPlan("budgets.premium"), sub: tPlan("budgets.premiumDaily"), color: "amber" },
              ].map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBudget(b.id)}
                  className={cn(
                    "flex w-full min-w-0 flex-col items-stretch gap-1.5 rounded-xl border px-3 py-3 text-left text-sm transition-all duration-200 touch-manipulation sm:flex-row sm:items-center sm:justify-between sm:px-4",
                    budget === b.id
                      ? `border-${b.color}-500/60 bg-${b.color}-500/8 ring-1 ring-${b.color}-500/20`
                      : "border-border bg-white/30 hover:bg-white/50 dark:bg-white/5 dark:hover:bg-white/10",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                    <div
                      className={cn(
                        "h-2.5 w-2.5 shrink-0 rounded-full transition-all",
                        budget === b.id ? `bg-${b.color}-500` : "bg-muted-foreground/30",
                      )}
                    />
                    <span className="truncate font-bold">{b.label}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground sm:text-right sm:text-xs">{b.sub}</span>
                </button>
              ))}

              <div
                className={cn(
                  "flex flex-wrap items-center gap-2 rounded-xl border px-3 py-3 transition-all sm:gap-3 sm:px-4",
                  budget === "custom"
                    ? "border-violet-500/60 bg-violet-500/8 ring-1 ring-violet-500/20"
                    : "border-border bg-white/30 dark:bg-white/5",
                )}
              >
                <div
                  className={cn(
                    "h-2.5 w-2.5 shrink-0 rounded-full transition-all",
                    budget === "custom" ? "bg-violet-500" : "bg-muted-foreground/30",
                  )}
                />
                <span className="shrink-0 text-sm font-bold">{tPlan("fieldLabels.customBudget")}</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="100.000"
                  value={
                    customBudget
                      ? parseInt(customBudget.replace(/\D/g, ""), 10).toLocaleString(locale === "ru" ? "ru-RU" : "en-US").replace(/\s/g, ".")
                      : ""
                  }
                  onChange={(e) => {
                    let raw = e.target.value.replace(/\D/g, "")
                    if (raw && parseInt(raw, 10) > 10000000) raw = "10000000"
                    setCustomBudget(raw)
                    if (raw) setBudget("custom")
                  }}
                  className="h-8 flex-1 rounded-none border-0 border-b-2 border-muted/30 bg-transparent px-2 text-center font-bold focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-violet-500"
                />
                <span className="shrink-0 text-sm font-bold">{locale === "ru" ? "₽" : "$"}</span>
              </div>
            </div>

            <div className="border-t border-border/50 pt-5">
              <label className="mb-4 block text-[10px] font-bold uppercase tracking-widest text-amber-500/80">
                {tPlan("fieldLabels.interests")}
              </label>
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                {[
                  { id: "culture", label: tPlan("interests.culture"), icon: Compass, color: "#f59e0b", glow: "rgba(245,158,11,0.25)" },
                  { id: "nature", label: tPlan("interests.nature"), icon: Mountain, color: "#10b981", glow: "rgba(16,185,129,0.25)" },
                  { id: "food", label: tPlan("interests.food"), icon: Utensils, color: "#f59e0b", glow: "rgba(245,158,11,0.25)" },
                  { id: "relax", label: tPlan("interests.relax"), icon: Bed, color: "#6366f1", glow: "rgba(99,102,241,0.25)" },
                  { id: "adventure", label: tPlan("interests.adventure"), icon: Map, color: "#f59e0b", glow: "rgba(245,158,11,0.25)" },
                  { id: "shopping", label: tPlan("interests.shopping"), icon: ShoppingBag, color: "#ec4899", glow: "rgba(236,72,153,0.25)" },
                  { id: "photo", label: tPlan("interests.photo"), icon: Camera, color: "#f59e0b", glow: "rgba(245,158,11,0.25)" },
                  { id: "luxury", label: tPlan("interests.luxury"), icon: Gem, color: "#a855f7", glow: "rgba(168,85,247,0.25)" },
                  { id: "events", label: tPlan("interests.events"), icon: Sparkles, color: "#f43f5e", glow: "rgba(244,63,94,0.25)" },
                  { id: "nightlife", label: tPlan("interests.nightlife"), icon: Palette, color: "#8b5cf6", glow: "rgba(139,92,246,0.25)" },
                ].map((style) => {
                  const Icon = style.icon
                  const sel = travelStyle.includes(style.id)
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => toggleStyle(style.id)}
                      style={
                        sel
                          ? { borderColor: style.color, boxShadow: `0 0 14px ${style.glow}, inset 0 0 12px ${style.glow}` }
                          : {}
                      }
                      className={cn(
                        "relative flex min-w-0 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-2.5 transition-all duration-200 touch-manipulation sm:gap-2 sm:p-3.5",
                        "bg-[#1a1f2e] dark:bg-[#1a1f2e]",
                        sel ? "border-[var(--sel-color)]" : "border-white/10 hover:border-white/25",
                      )}
                    >
                      {sel && (
                        <div
                          className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black text-white"
                          style={{ backgroundColor: style.color }}
                        >
                          ✓
                        </div>
                      )}
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200"
                        style={{
                          backgroundColor: sel ? `${style.color}22` : "rgba(255,255,255,0.06)",
                          border: `1.5px solid ${sel ? `${style.color}80` : "rgba(255,255,255,0.1)"}`,
                        }}
                      >
                        <Icon className="h-[18px] w-[18px] transition-colors" style={{ color: sel ? style.color : "rgba(255,255,255,0.55)" }} />
                      </div>
                      <span className="text-[11px] font-semibold text-white/80">{style.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          {/* 04 — vibe */}
          <section className="group/highlight relative col-span-1 min-w-0 overflow-hidden rounded-3xl bg-[#111827] p-5 text-white sm:col-span-2 sm:p-8 lg:col-span-2">
            <div className="pointer-events-none absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-blue-500/15 blur-[80px] transition-opacity duration-500 group-focus-within/highlight:opacity-150" />
            <div className="pointer-events-none absolute -left-8 top-0 h-40 w-40 rounded-full bg-violet-500/12 blur-[60px]" />
            <div
              className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-500 group-focus-within/highlight:opacity-100"
              style={{
                background: "linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(59,130,246,0.10) 50%, rgba(236,72,153,0.10) 100%)",
                boxShadow: "inset 0 0 0 1.5px rgba(139,92,246,0.35)",
              }}
            />
            <div className="relative z-10 min-w-0">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2 min-w-0 sm:gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white shadow-lg shadow-blue-500/40">
                    04
                  </span>
                  <Sparkles className="h-4 w-4 shrink-0 text-blue-400" />
                  <h2 className="text-base font-bold tracking-tight sm:text-lg">{tPlan("sections.highlight")}</h2>
                  <span className="shrink-0 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider animate-pulse">
                    {tPlan("fieldLabels.personalBadge")}
                  </span>
                </div>
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-white/40 sm:text-right">{tPlan("fieldLabels.optional")}</span>
              </div>

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
                  placeholder={t("vibePh")}
                  value={tripVibe}
                  onChange={(e) => setTripVibe(e.target.value.slice(0, 500))}
                  onFocus={() => setHighlightFocused(true)}
                  onBlur={() => setHighlightFocused(false)}
                  className="max-h-[140px] min-h-[96px] w-full resize-none rounded-t-2xl border-0 bg-transparent p-4 text-sm font-medium leading-relaxed text-white/90 placeholder:text-white/30 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <div className="flex items-center justify-between gap-3 px-4 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/45">{tPlan("fieldLabels.aiWillRealize")}</span>
                  </div>
                  <span className={cn("shrink-0 text-[10px] font-bold", tripVibe.length > 400 ? "text-amber-400" : "text-white/25")}>
                    {tripVibe.length} / 500
                  </span>
                </div>
              </div>

              {!tripVibe ? (
                <div className="flex flex-wrap gap-2 duration-300 animate-in fade-in">
                  {HIGHLIGHT_SUGGESTIONS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setTripVibe(s.value)}
                      className="touch-manipulation rounded-full border border-white/[0.08] bg-white/[0.07] px-3.5 py-2 text-xs font-medium text-white/65 transition-all hover:border-white/20 hover:bg-white/[0.13] hover:text-white active:scale-95"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setTripVibe("")}
                  className="flex items-center gap-1 text-[10px] font-bold text-violet-400 transition-colors hover:text-violet-300"
                >
                  <span>✕</span> {tPlan("actions.clearHighlight")}
                </button>
              )}
            </div>
          </section>
        </div>

        {/* 05 — team + CTA */}
        <section className="relative mx-3 mt-4 min-w-0 overflow-hidden rounded-3xl bg-[#111827] p-5 text-white animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 sm:mx-6 sm:mt-6 sm:p-8 lg:mx-8">
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-blue-500/10 blur-[80px]" />
          <div className="relative z-10 flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="w-full flex-1">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white shadow-lg shadow-blue-500/40">
                  05
                </span>
                <h2 className="text-lg font-bold tracking-tight">{tPlan("sections.teamConfig")}</h2>
              </div>
              <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-md sm:grid-cols-4 sm:gap-3 sm:p-5">
                {[
                  { id: "solo", label: tPlan("companions.solo"), icon: "👤" },
                  { id: "couple", label: tPlan("companions.couple"), icon: "💑" },
                  { id: "family", label: tPlan("companions.family"), icon: "👨‍👩‍👧‍👦" },
                  { id: "friends", label: tPlan("companions.friends"), icon: "👥" },
                ].map((c) => (
                  <div
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setCompanions(c.id)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " " ? setCompanions(c.id) : null)}
                    className={cn(
                      "flex min-w-0 cursor-pointer flex-col items-center gap-1.5 rounded-xl border px-2 py-3 transition-all duration-200 touch-manipulation sm:gap-2 sm:px-3 sm:py-4",
                      companions === c.id
                        ? "border-blue-500/40 bg-blue-500/20 ring-1 ring-blue-500/20"
                        : "border-transparent hover:bg-white/5",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-full text-2xl transition-all",
                        companions === c.id ? "scale-110 bg-blue-500 shadow-lg shadow-blue-500/40" : "bg-white/10",
                      )}
                    >
                      {c.icon}
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wider",
                        companions === c.id ? "text-blue-400" : "text-white/60",
                      )}
                    >
                      {c.label}
                    </span>
                    {(c.id === "family" || c.id === "friends") && companions === c.id && (
                      <div className="mt-1 flex animate-in fade-in items-center gap-2 duration-200">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setTravelers((x) => Math.max(2, x - 1))
                          }}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-bold transition-all hover:bg-white/20"
                        >
                          −
                        </button>
                        <span className="w-4 text-center text-sm font-bold">{travelers}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setTravelers((x) => Math.min(20, x + 1))
                          }}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-bold transition-all hover:bg-white/20"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex w-full flex-col items-stretch gap-3 lg:w-72 lg:items-end">
              <p className="text-center text-[11px] font-medium leading-relaxed text-white/40 lg:text-right">
                {companions === "solo"
                  ? tPlan("info.for1")
                  : companions === "couple"
                    ? tPlan("info.for2")
                    : tPlan("info.forN", { count: travelers })}
                <br />
                <span className="text-emerald-400/70">{tPlan("info.accuracy")}</span>
              </p>
              {!anchorOk && (
                <div
                  className="flex min-w-0 items-start gap-2 rounded-xl px-3 py-2 text-xs"
                  style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
                >
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <span className="min-w-0 text-left leading-snug text-amber-200/90">{t("validation.anchor", { day: reel.anchor_day })}</span>
                </div>
              )}
              <button
                type="button"
                onClick={runGeneration}
                disabled={loading || !anchorOk}
                className="flex w-full min-h-[3.25rem] items-center justify-center gap-3 rounded-2xl bg-blue-500 py-3.5 text-base font-bold text-white shadow-[0_0_30px_rgba(0,122,255,0.4)] transition-all duration-200 hover:bg-blue-600 hover:shadow-[0_0_40px_rgba(0,122,255,0.5)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 touch-manipulation sm:py-4 sm:text-lg"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : t("generate")}
                {!loading && <Sparkles className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </section>
      </div>

      <GeneratingModal open={loading} onCancel={() => abortRef.current?.abort()} />
    </AppLayout>
  )
}
