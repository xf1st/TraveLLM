"use client"

import { useState } from "react"
import { PlaceGallery } from "@/components/PlaceGallery"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

type ColorTheme = "transport" | "food" | "activity" | "free" | "hotel"

const transportKeywords = [
  "transport",
  "transfer",
  "flight",
  "plane",
  "train",
  "taxi",
  "car",
  "трансфер",
  "перелёт",
  "перелет",
  "такси",
  "поезд",
  "автобус",
  "прибытие",
  "отправление",
]
const foodKeywords = [
  "food",
  "restaurant",
  "cafe",
  "lunch",
  "dinner",
  "breakfast",
  "ресторан",
  "обед",
  "ужин",
  "завтрак",
  "кафе",
  "еда",
  "кухня",
  "гастро",
]
const hotelKeywords = [
  "hotel",
  "заселение",
  "отель",
  "гостиница",
  "хостел",
  "check-in",
  "checkin",
  "размещение",
]
const freeKeywords = [
  "free",
  "relax",
  "beach",
  "пляж",
  "отдых",
  "свобод",
  "nightlife",
  "вечер",
  "ночь",
  "прогулка",
]

export function getActivityColorTheme(activity: { type?: string; time?: string; desc?: string; title?: string }): ColorTheme {
  // Explicit type field takes priority (set by AI or normalizer)
  if (activity.type === "transport") return "transport"
  if (activity.type === "hotel") return "hotel"
  if (activity.type === "food") return "food"
  if (activity.type === "free") return "free"
  if (activity.type === "activity") return "activity"

  // Keyword fallback for old trips without type field
  const combined = `${activity.type || ""} ${activity.time || ""} ${activity.desc || ""} ${activity.title || ""}`.toLowerCase()

  if (hotelKeywords.some((k) => combined.includes(k))) return "hotel"
  if (transportKeywords.some((k) => combined.includes(k))) return "transport"
  if (foodKeywords.some((k) => combined.includes(k))) return "food"
  if (freeKeywords.some((k) => combined.includes(k))) return "free"
  return "activity"
}

interface ThemeConfig {
  iconClass: string
  icon: string
  badgeBg: string
  badgeText: string
  categoryLabel: string
}

const themeConfigs: Record<ColorTheme, ThemeConfig> = {
  transport: {
    iconClass: "trip-icon-transport",
    icon: "flight_land",
    badgeBg: "bg-sky-100 dark:bg-blue-500/20",
    badgeText: "text-sky-700 dark:text-blue-200",
    categoryLabel: "Транспорт",
  },
  food: {
    iconClass: "trip-icon-food",
    icon: "restaurant",
    badgeBg: "bg-orange-100 dark:bg-orange-500/20",
    badgeText: "text-orange-700 dark:text-orange-200",
    categoryLabel: "Еда",
  },
  activity: {
    iconClass: "trip-icon-activity",
    icon: "museum",
    badgeBg: "bg-purple-100 dark:bg-purple-500/20",
    badgeText: "text-purple-700 dark:text-purple-200",
    categoryLabel: "Активность",
  },
  hotel: {
    iconClass: "trip-icon-hotel",
    icon: "hotel",
    badgeBg: "bg-emerald-100 dark:bg-emerald-500/20",
    badgeText: "text-emerald-700 dark:text-emerald-200",
    categoryLabel: "Проживание",
  },
  free: {
    iconClass: "trip-icon-free",
    icon: "nightlife",
    badgeBg: "bg-indigo-100 dark:bg-indigo-500/20",
    badgeText: "text-indigo-700 dark:text-indigo-200",
    categoryLabel: "Свободное время",
  },
}

const iconTextColors: Record<ColorTheme, string> = {
  transport: "text-sky-700 dark:text-blue-200",
  hotel: "text-emerald-700 dark:text-emerald-200",
  food: "text-orange-700 dark:text-orange-200",
  activity: "text-purple-700 dark:text-purple-200",
  free: "text-indigo-700 dark:text-indigo-200",
}

interface Activity {
  time?: string
  title?: string
  placeName?: string
  imageQuery?: string
  desc?: string
  cost?: string
  type?: string
  mapLink?: string
  link?: string
  ticketsRequired?: boolean
}

interface ActivityTimelineCardProps {
  activity: Activity
  destination: string
  dayNumber: number
  onGenerateExtraActivity?: (dayNumber: number) => void
  onRequestModifyInChat?: (activity: Activity, dayNumber: number) => void
  isGeneratingExtra?: boolean
}

export function ActivityTimelineCard({
  activity,
  destination,
  dayNumber,
  onGenerateExtraActivity,
  onRequestModifyInChat,
  isGeneratingExtra = false,
}: ActivityTimelineCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const theme = getActivityColorTheme(activity)
  const config = themeConfigs[theme]
  
  // Check if this is a generic placeholder or a specific activity
  // It's a placeholder if it matches "free" theme AND has a generic title (or no title)
  const isPlaceholder = theme === "free" && (!activity.title || activity.title === "Свободное время" || activity.title === "Free Time")

  let iconName = config.icon
  const descLower = `${activity.type || ""} ${activity.desc || ""} ${activity.time || ""}`.toLowerCase()
  if (theme === "transport") {
    if (descLower.includes("taxi") || descLower.includes("такси") || descLower.includes("car") || descLower.includes("трансфер")) {
      iconName = "directions_car"
    } else if (descLower.includes("train") || descLower.includes("поезд")) {
      iconName = "train"
    }
  }

  const rawTitle = activity.title || activity.placeName || "Активность"
  const displayTitle = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1)

  const handleOpenMap = () => {
    const query =
      activity.mapLink ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        activity.placeName || activity.desc?.split(".")[0] || ""
      )}`
    window.open(query, "_blank")
  }

  const handleModifyViaChat = () => {
    if (onRequestModifyInChat) {
      onRequestModifyInChat(activity, dayNumber)
      return
    }

    window.dispatchEvent(
      new CustomEvent("trip-ai-prefill", {
        detail: {
          text: `Измени активность \"${displayTitle}\" в день ${dayNumber}.`,
        },
      })
    )

    toast.info("Открыл чат. Уточните, что нужно изменить.")
  }

  return (
    <>
      <div className="relative pl-14 group/card">
        <div
          className={cn(
            "absolute left-0 top-1 w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center z-10 border",
            config.iconClass
          )}
        >
          <span className={cn("material-symbols-outlined text-xl", iconTextColors[theme])}>{iconName}</span>
        </div>

        <div
          className={cn(
            "trip-glass p-6 rounded-[2rem] transition-all duration-300",
            isPlaceholder
              ? "border-dashed !border-slate-300 dark:!border-white/20 hover:!border-solid hover:shadow-lg group-hover/card:!border-indigo-300 dark:group-hover/card:!border-indigo-400/50"
              : "hover:shadow-lg trip-glass-hover"
          )}
        >
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border shadow-sm",
                    config.badgeBg,
                    config.badgeText,
                    theme === "transport"
                      ? "border-sky-200 dark:border-blue-400/20"
                      : theme === "hotel"
                      ? "border-emerald-200 dark:border-emerald-400/20"
                      : theme === "food"
                      ? "border-orange-200 dark:border-orange-400/20"
                      : theme === "activity"
                      ? "border-purple-200 dark:border-purple-400/20"
                      : "border-indigo-200 dark:border-indigo-400/20"
                  )}
                >
                  {config.categoryLabel}
                </span>
                {activity.time && (
                  <span className="text-xs font-bold text-slate-500 dark:text-blue-200/70 uppercase tracking-wide bg-white/40 dark:bg-white/5 px-2 py-0.5 rounded-lg border border-white/30 dark:border-transparent">
                    {activity.time}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-slate-800 dark:text-white text-xl">{displayTitle}</h3>
            </div>

            <div className="flex items-center gap-2">
              {activity.cost && (
                <span className="text-xs font-bold text-slate-700 dark:text-white bg-white/40 dark:bg-white/10 px-2 py-1 rounded-lg border border-white/40 dark:border-white/10 shadow-sm">
                  {activity.cost}
                </span>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="text-slate-400 dark:text-white/50 hover:text-slate-600 dark:hover:text-white transition-colors p-2 hover:bg-white/40 dark:hover:bg-white/10 rounded-full">
                    <span className="material-symbols-outlined">more_horiz</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl p-1.5">
                  <DropdownMenuItem onClick={() => setIsDetailsOpen(true)}>
                    Подробнее
                  </DropdownMenuItem>
                  {activity.placeName && <DropdownMenuItem onClick={handleOpenMap}>Посмотреть на карте</DropdownMenuItem>}
                  <DropdownMenuItem onClick={handleModifyViaChat}>Изменить через чат</DropdownMenuItem>
                  {activity.ticketsRequired && activity.link && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => window.open(activity.link, "_blank")}>Открыть билеты</DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {activity.desc && (
            <p className="text-sm text-slate-600 dark:text-blue-100/80 leading-relaxed mb-5 font-medium">{activity.desc}</p>
          )}

          {!isPlaceholder && theme !== "transport" && (activity.imageQuery || activity.placeName) && (
            <div className="mb-4">
              <PlaceGallery
                query={activity.imageQuery || `${activity.placeName} ${destination}`}
                specificQuery={activity.placeName ? `${activity.placeName} ${destination}` : undefined}
                displayTitle={activity.title || activity.placeName}
                count={theme === "hotel" ? 3 : 4}
                showProviderBadge={process.env.NODE_ENV === "development"}
              />
            </div>
          )}

          {!isPlaceholder ? (
            <div className="flex items-center justify-between pt-4 border-t border-slate-200/50 dark:border-white/5">
              <div className="flex items-center gap-3">
                {theme === "transport" ? (
                  <a
                    href={activity.link || "https://www.aviasales.ru/"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-xs text-white font-semibold bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-500 px-3 py-1.5 rounded-full transition-colors shadow-sm"
                  >
                    <span className="material-symbols-outlined text-sm mr-1.5">flight</span>
                    Найти билеты
                  </a>
                ) : (
                  <>
                    {activity.placeName && (
                      <button
                        onClick={handleOpenMap}
                        className="flex items-center text-xs text-slate-600 dark:text-blue-100/70 font-semibold bg-white/40 dark:bg-white/5 px-3 py-1.5 rounded-full border border-white/30 dark:border-transparent hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm mr-1.5 text-slate-500 dark:text-blue-300">map</span>
                        Карта
                      </button>
                    )}
                    {activity.ticketsRequired && activity.link && (
                      <a
                        href={activity.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-xs text-slate-600 dark:text-blue-100/70 font-semibold bg-white/40 dark:bg-white/5 px-3 py-1.5 rounded-full border border-white/30 dark:border-transparent hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm mr-1.5 text-slate-500 dark:text-blue-300">confirmation_number</span>
                        Билеты
                      </a>
                    )}
                  </>
                )}
              </div>

              <button
                onClick={() => setIsDetailsOpen(true)}
                className="text-xs font-bold text-sky-600 dark:text-blue-300 hover:text-sky-800 dark:hover:text-white flex items-center gap-1 bg-white/40 dark:bg-white/5 px-3 py-1.5 rounded-full hover:bg-white/60 dark:hover:bg-white/10 transition-colors border border-white/30 dark:border-transparent"
              >
                Подробнее <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          ) : (
            <div className="flex justify-between items-start mt-2 gap-3">
              <p className="text-sm text-slate-600 dark:text-blue-200/70 leading-relaxed font-medium">
                {activity.desc || "Свободное время для отдыха или прогулки по городу."}
              </p>

              <button
                onClick={() => onGenerateExtraActivity?.(dayNumber)}
                disabled={isGeneratingExtra}
                className="text-white text-xs font-bold bg-indigo-500 hover:bg-indigo-400 px-4 py-2 rounded-full border border-indigo-400/20 transition-colors flex items-center gap-1 backdrop-blur-sm shadow-md shadow-indigo-500/20 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                {isGeneratingExtra ? "Генерация..." : "Сгенерировать"}
              </button>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{displayTitle}</DialogTitle>
            <DialogDescription>День {dayNumber}. Детали активности и быстрые действия.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {activity.time && (
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-1">Время</p>
                <p className="font-semibold">{activity.time}</p>
              </div>
            )}

            {activity.desc && (
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-1">Описание</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{activity.desc}</p>
              </div>
            )}

            {activity.cost && (
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-1">Стоимость</p>
                <p className="font-semibold">{activity.cost}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              {activity.placeName && (
                <button
                  onClick={handleOpenMap}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20 hover:bg-sky-500/20 transition-colors"
                >
                  Посмотреть на карте
                </button>
              )}

              <button
                onClick={handleModifyViaChat}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors"
              >
                Изменить через чат
              </button>

              {activity.ticketsRequired && activity.link && (
                <button
                  onClick={() => window.open(activity.link, "_blank")}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                >
                  Открыть билеты
                </button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
