"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarIcon, Sparkles, MapPin, CreditCard, Users, Plane } from "lucide-react"
import { format } from "date-fns"
import { enUS, ru } from "date-fns/locale"
import { DateRange } from "react-day-picker"
import { CityAutocomplete } from "@/components/ui/city-autocomplete"
import { cn } from "@/lib/utils"

export interface TripGenerationParams {
  departureCity: string
  destination: string
  startDate: string
  endDate: string
  budget: "economy" | "comfort" | "premium"
  companions: "solo" | "couple" | "family" | "friends"
  travelStyle: string[]
  travelers: number
}

const BUDGET_IDS = ["economy", "comfort", "premium"] as const
const COMPANION_IDS = ["solo", "couple", "family", "friends"] as const
const TRAVEL_STYLE_KEYS = ["styleRelax", "styleActive", "styleCulture", "styleFood", "styleShopping"] as const

const COMPANION_ICONS: Record<(typeof COMPANION_IDS)[number], string> = {
  solo: "👤",
  couple: "💑",
  family: "👨‍👩‍👧‍👦",
  friends: "👥",
}

const COMPANION_TRAVELERS: Record<(typeof COMPANION_IDS)[number], number> = {
  solo: 1,
  couple: 2,
  family: 4,
  friends: 3,
}

interface TripWizardCardProps {
  onGenerate: (params: TripGenerationParams) => void
  defaultDepartureCity?: string
}

export function TripWizardCard({ onGenerate, defaultDepartureCity = "" }: TripWizardCardProps) {
  const t = useTranslations("plan")
  const tw = useTranslations("plan.tripWizard")
  const locale = useLocale()

  const dateLocale = locale === "ru" ? ru : enUS

  const [departureCity, setDepartureCity] = useState(defaultDepartureCity)
  const [destination, setDestination] = useState("")
  const [date, setDate] = useState<DateRange | undefined>()
  const [budget, setBudget] = useState<"economy" | "comfort" | "premium">("comfort")
  const [companions, setCompanions] = useState<"solo" | "couple" | "family" | "friends">("couple")
  const [travelStyles, setTravelStyles] = useState<string[]>([])

  const styleOptions = useMemo(
    () => TRAVEL_STYLE_KEYS.map((key) => ({ key, label: tw(key) })),
    [tw],
  )

  const toggleStyle = (style: string) => {
    setTravelStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style],
    )
  }

  const canSubmit = destination.trim() && date?.from && date?.to

  const handleSubmit = () => {
    if (!canSubmit) return
    const defCity = tw("defaultDepartureCity")
    onGenerate({
      departureCity: departureCity.trim() || defCity,
      destination,
      startDate: format(date!.from!, "yyyy-MM-dd"),
      endDate: format(date!.to!, "yyyy-MM-dd"),
      budget,
      companions,
      travelStyle: travelStyles,
      travelers: COMPANION_TRAVELERS[companions],
    })
  }

  const dayCount =
    date?.from && date?.to
      ? Math.ceil((date.to.getTime() - date.from.getTime()) / 86400000) + 1
      : 0

  return (
    <div className="bg-card w-full max-w-sm rounded-2xl border border-primary/20 p-4 shadow-lg shadow-primary/5 relative overflow-hidden mt-2">
      <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
        <Sparkles className="w-16 h-16 text-primary" />
      </div>

      <div className="space-y-3 relative z-10">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          {t("actions.create")}
        </h4>

        {/* Departure City */}
        <div className="space-y-1">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Plane className="w-3 h-3" /> {tw("flyingFrom")}
          </p>
          <CityAutocomplete
            value={departureCity}
            onValueChange={setDepartureCity}
            placeholder={tw("cityDefaultHint")}
            className="h-9 text-sm bg-background/50 border-border/60"
          />
        </div>

        {/* Destination */}
        <div className="space-y-1">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {t("fieldLabels.whereTo")}
          </p>
          <CityAutocomplete
            value={destination}
            onValueChange={setDestination}
            placeholder={t("placeholders.destination")}
            className="h-9 text-sm bg-background/50 border-border/60"
          />
        </div>

        {/* Dates */}
        <div className="space-y-1">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <CalendarIcon className="w-3 h-3" /> {tw("datesShort")}
          </p>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal h-9 text-sm bg-background/50 border-border/60",
                  !date && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "d MMM", { locale: dateLocale })}
                      {" – "}
                      {format(date.to, "d MMM yyyy", { locale: dateLocale })}
                      <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
                        {t("fieldLabels.durationDaysBadge", { count: dayCount })}
                      </span>
                    </>
                  ) : (
                    format(date.from, "d MMMM yyyy", { locale: dateLocale })
                  )
                ) : (
                  t("placeholders.dates")
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={1}
                locale={dateLocale}
                disabled={{ before: new Date() }}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Budget */}
        <div className="space-y-1">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <CreditCard className="w-3 h-3" /> {t("sections.budgetMatrix")}
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {BUDGET_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setBudget(id)}
                className={cn(
                  "py-1.5 px-2 rounded-xl border text-center transition-all",
                  budget === id
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background/50 border-border/50 text-muted-foreground hover:border-primary/40",
                )}
              >
                <div className="text-[11px] font-bold">{t(`budgets.${id}`)}</div>
                <div className="text-[10px] opacity-70">{t(`budgets.${id}Daily`)}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Companions */}
        <div className="space-y-1">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Users className="w-3 h-3" /> {tw("companionsLabel")}
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {COMPANION_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setCompanions(id)}
                className={cn(
                  "py-1.5 rounded-xl border text-center transition-all flex flex-col items-center gap-0.5",
                  companions === id
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background/50 border-border/50 text-muted-foreground hover:border-primary/40",
                )}
              >
                <span className="text-base leading-none">{COMPANION_ICONS[id]}</span>
                <span className="text-[10px] font-medium">{t(`companions.${id}`)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Travel Style */}
        <div className="space-y-1">
          <p className="text-[11px] text-muted-foreground">{tw("travelStyleLabel")}</p>
          <div className="flex flex-wrap gap-1.5">
            {styleOptions.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => toggleStyle(label)}
                className={cn(
                  "px-2.5 py-1 text-[11px] rounded-full border transition-all",
                  travelStyles.includes(label)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background/50 border-border/50 text-muted-foreground hover:border-primary/40",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full gap-2 rounded-xl h-10 mt-1"
        >
          <Sparkles className="w-4 h-4" />
          {t("actions.create")}
        </Button>

        {!canSubmit && (
          <p className="text-[10px] text-center text-muted-foreground">{tw("fillHint")}</p>
        )}
      </div>
    </div>
  )
}
