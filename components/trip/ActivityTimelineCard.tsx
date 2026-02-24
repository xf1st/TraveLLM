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

/**
 * Extract markdown links from text, returning clean text and link list.
 * Handles: [label](https://...) patterns
 */
function extractMarkdownLinks(text: string): { cleanText: string; links: Array<{ label: string; url: string }> } {
  const links: Array<{ label: string; url: string }> = []
  const cleanText = text
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (_, label, url) => {
      links.push({ label: label.trim(), url })
      return ""
    })
    .replace(/\s{2,}/g, " ")
    .trim()
  return { cleanText, links }
}

/**
 * Extract IATA codes from flight activity title or desc.
 * Handles patterns like: "SVO→IST", "(MOW)→(DXB)", "Москва (SVO) → Стамбул (IST)"
 */
function extractFlightIata(text: string): { orig: string; dest: string } | null {
  if (!text) return null
  const match = text.match(/\b([A-Z]{3})\b.*?\b([A-Z]{3})\b/)
  if (match && match[1] !== match[2]) return { orig: match[1], dest: match[2] }
  return null
}

/**
 * Build a smart Aviasales deep link for a transport activity.
 * Prefers activity.link if available. Falls back to IATA extraction or generic search.
 */
function buildFlightLink(activity: { link?: string; title?: string; desc?: string }): string {
  if (activity.link && !activity.link.endsWith("aviasales.ru/")) return activity.link
  const textToSearch = `${activity.title || ""} ${activity.desc || ""}`
  const iata = extractFlightIata(textToSearch)
  if (iata) {
    return `https://www.aviasales.ru/search/${iata.orig}${iata.dest}1`
  }
  return "https://www.aviasales.ru/"
}

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

// Maps common Russian country/city names to English for gallery search
const RU_TO_EN_DESTINATIONS: Record<string, string> = {
  "таиланд": "Thailand", "тайланд": "Thailand", "бангкок": "Bangkok", "чиангмай": "Chiang Mai",
  "япония": "Japan", "токио": "Tokyo", "осака": "Osaka", "киото": "Kyoto",
  "франция": "France", "париж": "Paris", "италия": "Italy", "рим": "Rome", "венеция": "Venice",
  "испания": "Spain", "барселона": "Barcelona", "мадрид": "Madrid",
  "дубай": "Dubai", "оаэ": "UAE", "абу-даби": "Abu Dhabi",
  "турция": "Turkey", "стамбул": "Istanbul", "анталья": "Antalya", "каппадокия": "Cappadocia",
  "индонезия": "Indonesia", "бали": "Bali", "индия": "India", "вьетнам": "Vietnam",
  "россия": "Russia", "москва": "Moscow", "санкт-петербург": "Saint Petersburg",
  "греция": "Greece", "афины": "Athens", "мальдивы": "Maldives", "египет": "Egypt",
  "португалия": "Portugal", "лиссабон": "Lisbon", "чехия": "Czech Republic", "прага": "Prague",
}

// Russian + Thai nature/place keywords → English descriptors for Pexels search
const RU_NATURE_KEYWORDS: [RegExp, string][] = [
  [/водопад/i, "waterfall lush jungle cascading"],
  [/пещер/i, "cave stalactites underground"],
  [/гор[аы]|горный/i, "mountain peak scenic vista"],
  [/пляж/i, "beach tropical sand turquoise"],
  [/остров/i, "island tropical turquoise water"],
  [/джунгл/i, "jungle tropical rainforest green"],
  [/лес/i, "forest nature green trees"],
  [/ночной рынок|рынок/i, "market stalls colorful local night"],
  [/\bват\b|\bwat\b/i, "Buddhist temple ornate golden spire"],  // Thai "Ват/Wat" = temple
  [/храм|монастырь/i, "temple ancient architecture sacred"],
  [/дворец/i, "palace historic ornate architecture"],
  [/мост/i, "bridge scenic river crossing"],
  [/закат|рассвет/i, "sunset golden hour scenic dramatic"],
  [/треккинг|поход|хайкинг/i, "hiking trail scenic nature"],
  [/снорк|дайвинг/i, "snorkeling coral reef underwater colorful"],
  [/слон/i, "elephant sanctuary nature conservation"],
  [/тигр/i, "tiger wildlife sanctuary"],
  [/ферм/i, "farm rural countryside organic"],
  [/сафари/i, "safari wildlife nature animals"],
  [/вулкан/i, "volcano scenic dramatic landscape"],
  [/река|канал|клонг/i, "river canal scenic water boat"],
  [/озер/i, "lake scenic reflection mountain"],
  [/чайнатаун|chinatown/i, "Chinatown colorful lanterns street market"],
  [/скайвок|skywalk|небоскрёб|небоскреб/i, "skyscraper glass observation deck city panorama"],
  [/плавуч|floating/i, "floating market colorful boats tropical"],
  [/кулинар|cooking school/i, "cooking class Thai food kitchen herbs"],
  [/массаж|spa/i, "spa massage relaxing wellness"],
  [/тук-тук|тук тук|tuk.?tuk/i, "tuk-tuk street ride colorful Bangkok"],
]

// Russian type/place prefixes to strip from the start
const RU_PLACE_PREFIX = /^(ресторан|отель|кафе|кафе-ресторан|музей|храм|рынок|ночной рынок|парк|пляж|остров|деревня|площадь|ужин в|обед в|завтрак в|посещение|посещение секретного|экскурсия|прогулка по|прогулка)\s+/gi

// Returns true if the string is predominantly Latin (English) characters
function isEnglishQuery(q: string): boolean {
  const latin = (q.match(/[a-zA-Z]/g) || []).length
  const cyrillic = (q.match(/[а-яёА-ЯЁ]/g) || []).length
  return latin > cyrillic
}

function buildGalleryQuery(activity: Activity, destination: string): string {
  // Only use AI-generated imageQuery if it's actually in English
  if (activity.imageQuery && isEnglishQuery(activity.imageQuery)) return activity.imageQuery

  // Try to get English destination
  const destLower = destination.toLowerCase()
  const destEn = Object.entries(RU_TO_EN_DESTINATIONS)
    .find(([ru]) => destLower.includes(ru))?.[1] || destination

  // Use title for keyword detection (richer than placeName), placeName for display name
  const fullText = `${activity.title || ""} ${activity.placeName || ""}`.toLowerCase()
  const type = activity.type || "activity"

  // Check for Russian nature/place keywords in title/placeName
  for (const [pattern, enDesc] of RU_NATURE_KEYWORDS) {
    if (pattern.test(fullText)) {
      return `${enDesc} ${destEn}`
    }
  }

  // Strip Russian prefixes from placeName to get the core name
  const rawName = (activity.placeName || activity.title || "").replace(RU_PLACE_PREFIX, "").trim()

  if (type === "hotel") return `hotel elegant interior ${destEn}`
  if (type === "food") return `restaurant cozy dining food ${destEn}`
  return `travel landmark ${rawName} ${destEn}`
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

  // Parse markdown links out of desc so they're shown as chips, not raw syntax
  const rawDesc = activity.desc || ""
  const { cleanText: cleanDesc, links: descLinks } = extractMarkdownLinks(
    rawDesc.replace("(✨ специально для тебя)", "").trim()
  )

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
      <div className="relative pl-10 sm:pl-14 group/card">
        <div
          className={cn(
            "absolute left-0 top-1 w-10 h-10 sm:w-12 sm:h-12 rounded-full backdrop-blur-md flex items-center justify-center z-10 border",
            config.iconClass
          )}
        >
          <span className={cn("material-symbols-outlined text-lg sm:text-xl", iconTextColors[theme])}>{iconName}</span>
        </div>

        <div
          className={cn(
            "trip-glass p-4 sm:p-6 rounded-[2rem] transition-all duration-300",
            isPlaceholder
              ? "border-dashed !border-slate-300 dark:!border-white/20 hover:!border-solid hover:shadow-lg group-hover/card:!border-indigo-300 dark:group-hover/card:!border-indigo-400/50"
              : "hover:shadow-lg trip-glass-hover"
          )}
        >
          <div className="flex justify-between items-start mb-2 sm:mb-3">
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2 mb-2">
                <span
                  className={cn(
                    "px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wide border shadow-sm",
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
                  <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-blue-200/70 uppercase tracking-wide bg-white/40 dark:bg-white/5 px-2 py-0.5 rounded-lg border border-white/30 dark:border-transparent">
                    {activity.time}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-slate-800 dark:text-white text-base sm:text-xl">{displayTitle}</h3>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              {activity.cost && (
                <span className="text-[10px] sm:text-xs font-bold text-slate-700 dark:text-white bg-white/40 dark:bg-white/10 px-2 py-1 rounded-lg border border-white/40 dark:border-white/10 shadow-sm">
                  {activity.cost}
                </span>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="text-slate-400 dark:text-white/50 hover:text-slate-600 dark:hover:text-white transition-colors p-1.5 sm:p-2 hover:bg-white/40 dark:hover:bg-white/10 rounded-full">
                    <span className="material-symbols-outlined text-lg sm:text-xl">more_horiz</span>
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
            <div className="space-y-2 mb-3 sm:mb-5">
              <p className="text-xs sm:text-sm text-slate-600 dark:text-blue-100/80 leading-relaxed font-medium">
                {cleanDesc}
              </p>
              {(activity.desc.includes("(✨ специально для тебя)") || (activity.title && activity.title.includes("(✨ специально для тебя)"))) && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/20 w-fit animate-pulse">
                  <span className="material-symbols-outlined text-sm">auto_awesome</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Специально для тебя</span>
                </div>
              )}
            </div>
          )}

          {!isPlaceholder && theme !== "transport" && (activity.imageQuery || activity.placeName) && (
            <div className="mb-3 sm:mb-4">
              <PlaceGallery
                query={buildGalleryQuery(activity, destination)}
                displayTitle={activity.title || activity.placeName}
                count={theme === "hotel" ? 2 : 3}
                showProviderBadge={process.env.NODE_ENV === "development"}
              />
            </div>
          )}

          {!isPlaceholder ? (
            <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-slate-200/50 dark:border-white/5">
              <div className="flex items-center gap-2 sm:gap-3">
                {theme === "transport" ? (
                  <a
                    href={buildFlightLink(activity)}
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
                        className="flex items-center text-xs text-slate-600 dark:text-blue-100/70 font-semibold bg-white/40 dark:bg-white/5 px-2.5 sm:px-3 py-1.5 rounded-full border border-white/30 dark:border-transparent hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
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
                        className="flex items-center text-xs text-slate-600 dark:text-blue-100/70 font-semibold bg-white/40 dark:bg-white/5 px-2.5 sm:px-3 py-1.5 rounded-full border border-white/30 dark:border-transparent hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm mr-1.5 text-slate-500 dark:text-blue-300">confirmation_number</span>
                        Билеты
                      </a>
                    )}
                    {descLinks.map((link, i) => (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-xs text-slate-600 dark:text-blue-100/70 font-semibold bg-white/40 dark:bg-white/5 px-2.5 sm:px-3 py-1.5 rounded-full border border-white/30 dark:border-transparent hover:bg-white/60 dark:hover:bg-white/10 transition-colors max-w-[140px]"
                      >
                        <span className="material-symbols-outlined text-sm mr-1.5 text-slate-500 dark:text-blue-300 shrink-0">open_in_new</span>
                        <span className="truncate">{link.label}</span>
                      </a>
                    ))}
                  </>
                )}
              </div>

              <button
                onClick={() => setIsDetailsOpen(true)}
                className="text-xs font-bold text-sky-600 dark:text-blue-300 hover:text-sky-800 dark:hover:text-white flex items-center gap-1 bg-white/40 dark:bg-white/5 px-2.5 sm:px-3 py-1.5 rounded-full hover:bg-white/60 dark:hover:bg-white/10 transition-colors border border-white/30 dark:border-transparent"
              >
                Подробнее <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          ) : (
            <div className="flex justify-between items-start mt-2 gap-2 sm:gap-3">
              <p className="text-xs sm:text-sm text-slate-600 dark:text-blue-200/70 leading-relaxed font-medium">
                {activity.desc || "Свободное время для отдыха или прогулки по городу."}
              </p>

              <button
                onClick={() => onGenerateExtraActivity?.(dayNumber)}
                disabled={isGeneratingExtra}
                className="text-white text-xs font-bold bg-indigo-500 hover:bg-indigo-400 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-indigo-400/20 transition-colors flex items-center gap-1 backdrop-blur-sm shadow-md shadow-indigo-500/20 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                <span className="hidden sm:inline">{isGeneratingExtra ? "Генерация..." : "Сгенерировать"}</span>
                <span className="sm:hidden">{isGeneratingExtra ? "..." : "+"}</span>
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
                <p className="text-sm leading-relaxed text-muted-foreground">{cleanDesc}</p>
                {descLinks.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {descLinks.map((link, i) => (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-sky-700 dark:text-sky-300 font-semibold bg-sky-500/10 px-2.5 py-1.5 rounded-xl border border-sky-500/20 hover:bg-sky-500/20 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">open_in_new</span>
                        {link.label}
                      </a>
                    ))}
                  </div>
                )}
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
