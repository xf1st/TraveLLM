"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarIcon, Sparkles, MapPin, CreditCard, Users, Plane } from "lucide-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
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

const BUDGET_OPTIONS = [
  { id: "economy", label: "Эконом", desc: "~7.5k₽/д" },
  { id: "comfort", label: "Комфорт", desc: "~20k₽/д" },
  { id: "premium", label: "Премиум", desc: "~50k₽/д" },
]

const COMPANION_OPTIONS = [
  { id: "solo", label: "Один", icon: "👤", travelers: 1 },
  { id: "couple", label: "Вдвоём", icon: "💑", travelers: 2 },
  { id: "family", label: "Семья", icon: "👨‍👩‍👧‍👦", travelers: 4 },
  { id: "friends", label: "Друзья", icon: "👥", travelers: 3 },
]

const TRAVEL_STYLES = ["Релакс 🏖️", "Активный 🏔️", "Культура 🏛️", "Гастрономия 🍷", "Шопинг 🛍️"]

interface TripWizardCardProps {
  onGenerate: (params: TripGenerationParams) => void
  defaultDepartureCity?: string
}

export function TripWizardCard({ onGenerate, defaultDepartureCity = "" }: TripWizardCardProps) {
  const [departureCity, setDepartureCity] = useState(defaultDepartureCity)
  const [destination, setDestination] = useState("")
  const [date, setDate] = useState<DateRange | undefined>()
  const [budget, setBudget] = useState<"economy" | "comfort" | "premium">("comfort")
  const [companions, setCompanions] = useState<"solo" | "couple" | "family" | "friends">("couple")
  const [travelStyles, setTravelStyles] = useState<string[]>([])

  const toggleStyle = (style: string) => {
    setTravelStyles(prev =>
      prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style]
    )
  }

  const canSubmit = destination.trim() && date?.from && date?.to

  const handleSubmit = () => {
    if (!canSubmit) return
    const companion = COMPANION_OPTIONS.find(c => c.id === companions)!
    onGenerate({
      departureCity: departureCity || "Москва",
      destination,
      startDate: format(date!.from!, "yyyy-MM-dd"),
      endDate: format(date!.to!, "yyyy-MM-dd"),
      budget,
      companions,
      travelStyle: travelStyles,
      travelers: companion.travelers,
    })
  }

  return (
    <div className="bg-card w-full max-w-sm rounded-2xl border border-primary/20 p-4 shadow-lg shadow-primary/5 relative overflow-hidden mt-2">
      <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
        <Sparkles className="w-16 h-16 text-primary" />
      </div>

      <div className="space-y-3 relative z-10">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Создать маршрут
        </h4>

        {/* Departure City */}
        <div className="space-y-1">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Plane className="w-3 h-3" /> Откуда летим
          </p>
          <CityAutocomplete
            value={departureCity}
            onValueChange={setDepartureCity}
            placeholder="Москва (по умолчанию)"
            className="h-9 text-sm bg-background/50 border-border/60"
          />
        </div>

        {/* Destination */}
        <div className="space-y-1">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Куда едем
          </p>
          <CityAutocomplete
            value={destination}
            onValueChange={setDestination}
            placeholder="Стамбул, Бали, Дубай..."
            className="h-9 text-sm bg-background/50 border-border/60"
          />
        </div>

        {/* Dates */}
        <div className="space-y-1">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <CalendarIcon className="w-3 h-3" /> Даты
          </p>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal h-9 text-sm bg-background/50 border-border/60",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "d MMM", { locale: ru })}
                      {" – "}
                      {format(date.to, "d MMM", { locale: ru })}
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {Math.ceil((date.to.getTime() - date.from.getTime()) / 86400000) + 1} дн.
                      </span>
                    </>
                  ) : (
                    format(date.from, "d MMMM", { locale: ru })
                  )
                ) : (
                  "Выберите даты"
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
                locale={ru}
                disabled={{ before: new Date() }}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Budget */}
        <div className="space-y-1">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <CreditCard className="w-3 h-3" /> Бюджет
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {BUDGET_OPTIONS.map(b => (
              <button
                key={b.id}
                onClick={() => setBudget(b.id as "economy" | "comfort" | "premium")}
                className={cn(
                  "py-1.5 px-2 rounded-xl border text-center transition-all",
                  budget === b.id
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background/50 border-border/50 text-muted-foreground hover:border-primary/40"
                )}
              >
                <div className="text-[11px] font-bold">{b.label}</div>
                <div className="text-[10px] opacity-70">{b.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Companions */}
        <div className="space-y-1">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Users className="w-3 h-3" /> Компания
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {COMPANION_OPTIONS.map(c => (
              <button
                key={c.id}
                onClick={() => setCompanions(c.id as "solo" | "couple" | "family" | "friends")}
                className={cn(
                  "py-1.5 rounded-xl border text-center transition-all flex flex-col items-center gap-0.5",
                  companions === c.id
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background/50 border-border/50 text-muted-foreground hover:border-primary/40"
                )}
              >
                <span className="text-base leading-none">{c.icon}</span>
                <span className="text-[10px] font-medium">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Travel Style */}
        <div className="space-y-1">
          <p className="text-[11px] text-muted-foreground">Стиль путешествия</p>
          <div className="flex flex-wrap gap-1.5">
            {TRAVEL_STYLES.map(style => (
              <button
                key={style}
                onClick={() => toggleStyle(style)}
                className={cn(
                  "px-2.5 py-1 text-[11px] rounded-full border transition-all",
                  travelStyles.includes(style)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background/50 border-border/50 text-muted-foreground hover:border-primary/40"
                )}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full gap-2 rounded-xl h-10 mt-1"
        >
          <Sparkles className="w-4 h-4" />
          Создать маршрут
        </Button>

        {!canSubmit && (
          <p className="text-[10px] text-center text-muted-foreground">
            Укажите направление и даты
          </p>
        )}
      </div>
    </div>
  )
}
