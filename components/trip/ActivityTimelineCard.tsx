"use client"

import { useState, useRef, useEffect } from "react"
import { useTranslations } from "next-intl"
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
import { appToast as toast } from "@/components/ui/sonner"
import { AffiliateNotice } from "@/components/partners/AffiliateNotice"

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

export function getActivityColorTheme(activity: { type?: string; time?: string; desc?: string; title?: string; cost?: string }): ColorTheme {
  const hasCost = activity.cost && 
      activity.cost.trim() !== "" && 
      activity.cost !== "0" && 
      !activity.cost.toLowerCase().includes("бесплатно") && 
      !activity.cost.toLowerCase().includes("free");

  // Explicit type field takes priority (set by AI or normalizer)
  if (activity.type === "transport") return "transport"
  if (activity.type === "hotel") return "hotel"
  if (activity.type === "food") return "food"
  if (activity.type === "free" && !hasCost) return "free"
  if (activity.type === "activity") return "activity"

  // Keyword fallback for old trips without type field
  const combined = `${activity.type || ""} ${activity.time || ""} ${activity.desc || ""} ${activity.title || ""}`.toLowerCase()

  if (hotelKeywords.some((k) => combined.includes(k))) return "hotel"
  if (transportKeywords.some((k) => combined.includes(k))) return "transport"
  if (foodKeywords.some((k) => combined.includes(k))) return "food"
  if (!hasCost && freeKeywords.some((k) => combined.includes(k))) return "free"
  
  if (activity.type === "free") return "activity" // Fallback if it had cost but type was free
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
  "россия": "Russia", "москва": "Moscow", "санкт-петербург": "Saint Petersburg", "питер": "Saint Petersburg",
  "греция": "Greece", "афины": "Athens", "мальдивы": "Maldives", "египет": "Egypt",
  "португалия": "Portugal", "лиссабон": "Lisbon", "чехия": "Czech Republic", "прага": "Prague",
  // Russian cities
  "казань": "Kazan Russia", "екатеринбург": "Yekaterinburg Russia", "новосибирск": "Novosibirsk Russia",
  "сочи": "Sochi Russia", "владивосток": "Vladivostok Russia", "иркутск": "Irkutsk Russia",
  "нижний новгород": "Nizhny Novgorod Russia", "красноярск": "Krasnoyarsk Russia",
  "пермь": "Perm Russia", "уфа": "Ufa Russia", "омск": "Omsk Russia", "хабаровск": "Khabarovsk Russia",
  "мурманск": "Murmansk Russia Arctic", "архангельск": "Arkhangelsk Russia", "волгоград": "Volgograd Russia",
  "краснодар": "Krasnodar Russia", "ростов-на-дону": "Rostov-on-Don Russia",
  "пятигорск": "Pyatigorsk Caucasus Russia", "кисловодск": "Kislovodsk resort Russia",
  "минеральные воды": "Mineralnye Vody Russia", "ставрополь": "Stavropol Russia",
  "геленджик": "Gelendzhik Russia Black Sea", "анапа": "Anapa Russia Black Sea",
  "байкал": "Lake Baikal Russia", "карелия": "Karelia Russia nature", "алтай": "Altai Mountains Russia",
  "камчатка": "Kamchatka Russia volcano", "сахалин": "Sakhalin Island Russia",
  "ярославль": "Yaroslavl Russia golden ring", "суздаль": "Suzdal Russia ancient",
  "владимир": "Vladimir Russia historic", "кострома": "Kostroma Russia golden ring",
  "псков": "Pskov Russia fortress", "новгород": "Veliky Novgorod Russia historic",
  "калининград": "Kaliningrad Russia Baltic", "самара": "Samara Russia Volga",
  "саратов": "Saratov Russia", "тюмень": "Tyumen Russia", "воронеж": "Voronezh Russia",
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
  // Russian landmarks & cities
  [/эрмитаж/i, "Hermitage Museum Saint Petersburg art gallery interior"],
  [/кремл/i, "Kremlin fortress Russia historic architecture"],
  [/красная площадь/i, "Red Square Moscow cobblestone historic architecture"],
  [/арбат/i, "Arbat street Moscow pedestrian historic"],
  [/невский/i, "Nevsky Prospect Saint Petersburg architecture canal"],
  [/петергоф/i, "Peterhof Palace Russia fountains gardens"],
  [/царско.*село|пушкин.*город/i, "Tsarskoye Selo palace Russia ornate"],
  [/байкал/i, "Lake Baikal Russia clear blue ice scenic"],
  [/карел/i, "Karelia Russia nature lake forest"],
  [/алтай/i, "Altai Mountains Russia scenic landscape alpine"],
  [/камчатк/i, "Kamchatka volcano Russia dramatic landscape"],
  [/транссиб|аэроэкспресс/i, "Russia train railway scenic countryside"],
  [/золото.*кольц/i, "Golden Ring Russia church monastery historic"],
  [/суздал/i, "Suzdal Russia ancient monastery winter snow"],
  [/мурман/i, "Murmansk Russia Arctic northern lights"],
  [/сочи/i, "Sochi Russia resort sea mountains"],
  [/кавказ|эльбрус/i, "Caucasus mountains Russia scenic alpine"],
  [/сапсан|ласточка|высокоскоростн/i, "high-speed train Russia Sapsan interior"],
  [/набережн/i, "river embankment Russia city promenade"],
  [/кремлёвская|красн.*кремл/i, "Kremlin Russia historic tower architecture"],
  [/владивосток/i, "Vladivostok Russia harbor bridge sea"],
  [/казань.*кремл|татарстан/i, "Kazan Kremlin Russia mosque colorful"],
  [/нижегород.*кремл/i, "Nizhny Novgorod Kremlin Russia riverside"],
  [/беломорск|белое море/i, "White Sea Russia nature landscape"],
  [/ладог|онег/i, "Karelia Russia lake scenic nature"],
]

// Russian type/place prefixes to strip from the start
const RU_PLACE_PREFIX = /^(ресторан|отель|кафе|кафе-ресторан|музей|храм|рынок|ночной рынок|парк|пляж|остров|деревня|площадь|ужин в|обед в|завтрак в|посещение|посещение секретного|экскурсия|прогулка по|прогулка)\s+/gi

// Returns true if the string is predominantly Latin (English) characters
function isEnglishQuery(q: string): boolean {
  const latin = (q.match(/[a-zA-Z]/g) || []).length
  const cyrillic = (q.match(/[а-яёА-ЯЁ]/g) || []).length
  return latin > cyrillic
}

/**
 * Detect if a name is a specific branded/fictional venue rather than a generic place.
 * "The Chronos Keyhole", "Bar Tartine" etc. return 0 results when searched literally.
 */
function isSpecificVenueName(name: string): boolean {
  if (!name || name.length < 3) return false
  // Generic geographic/travel terms — NOT specific venue names
  const genericTerms = /landmark|panorama|view|lake|mountain|park|beach|museum|castle|palace|market|square|street|bridge|old town|historic|district|neighborhood|quarter|coast|river|valley|island|temple|cathedral|fortress/i
  if (genericTerms.test(name)) return false
  // Starts with "The " → almost always a named venue
  if (/^The\s/i.test(name)) return true
  // Multi-word English name without common travel terms → likely a venue
  if (isEnglishQuery(name) && name.trim().split(/\s+/).length >= 2) return true
  return false
}

/**
 * Extract a descriptive venue category from activity text for fallback searches.
 * Used when the actual venue name returns 0 results from photo APIs.
 */
function extractVenueCategory(text: string): string {
  const t = text.toLowerCase()
  if (/speakeasy|спикизи|hidden bar|secret bar/.test(t)) return "speakeasy cocktail bar dark atmospheric interior"
  if (/bar|бар|cocktail|коктейл|lounge|pub|паб/.test(t)) return "cocktail bar interior moody lighting"
  if (/nightclub|клуб|night club|ночной клуб/.test(t)) return "nightclub dance floor lights"
  if (/rooftop|крыш/.test(t)) return "rooftop bar city view night"
  if (/jazz|live music|живая музыка/.test(t)) return "jazz bar live music venue"
  if (/museum|музей/.test(t)) return "museum interior exhibit art"
  if (/gallery|галерея/.test(t)) return "art gallery interior contemporary"
  if (/spa|wellness|йога|yoga/.test(t)) return "spa wellness interior serene"
  if (/market|маркет|рынок|bazaar|базар/.test(t)) return "outdoor market street food vibrant"
  if (/theater|theatre|театр|show|концерт|concert/.test(t)) return "theater concert venue interior"
  if (/wine|вино|winery/.test(t)) return "wine bar cellar tasting"
  if (/cafe|кафе|coffee|кофе/.test(t)) return "cozy cafe interior coffee"
  if (/restaurant|ресторан|dining|ужин/.test(t)) return "restaurant interior elegant dining"
  return "travel tourism city street scenic"
}

function isMapUrl(url: string): boolean {
  return /maps\.google|goo\.gl\/maps|yandex\.ru\/maps|2gis\.com|maps\.apple|waze\.com/i.test(url)
}

function buildGalleryQuery(activity: Activity, destination: string): string {
  // Only use AI-generated imageQuery if it's actually in English
  if (activity.imageQuery && isEnglishQuery(activity.imageQuery)) return activity.imageQuery

  // Try to get English destination
  const destLower = destination.toLowerCase()
  const destEn = Object.entries(RU_TO_EN_DESTINATIONS)
    .find(([ru]) => destLower.includes(ru))?.[1] || destination

  // Use title + placeName + desc for keyword detection
  const fullText = `${activity.title || ""} ${activity.placeName || ""} ${activity.desc || ""}`.toLowerCase()
  const type = activity.type || "activity"

  // Check for Russian nature/place keywords in title/placeName
  for (const [pattern, enDesc] of RU_NATURE_KEYWORDS) {
    if (pattern.test(fullText)) {
      return `${enDesc} ${destEn}`
    }
  }

  // Strip Russian prefixes from placeName to get the core name
  const rawName = (activity.placeName || activity.title || "").replace(RU_PLACE_PREFIX, "").trim()

  if (type === "hotel") return `hotel ${rawName || 'elegant interior'} ${destEn}`
  if (type === "food") return `restaurant ${rawName || 'cozy dining food'} ${destEn}`

  // For specific branded/fictional venue names (e.g. "The Chronos Keyhole"):
  // searching by name returns 0 photos — use category keywords + destination instead
  if (isSpecificVenueName(rawName)) {
    const category = extractVenueCategory(fullText)
    return `${destEn} ${category}`
  }

  // If the place name is already in English and specific enough (2+ words),
  // use it directly — appending a (potentially wrong) destination would hurt results
  if (isEnglishQuery(rawName) && rawName.trim().split(/\s+/).length >= 2) {
    return rawName
  }

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
  bookingUrl?: string
  ticketUrl?: string
  ticketsRequired?: boolean
}

interface ActivityTimelineCardProps {
  activity: Activity
  destination: string
  dayNumber: number
  onGenerateExtraActivity?: (dayNumber: number) => void
  onGenerateInline?: (dayNumber: number, prompt: string) => Promise<{ reply: string; success: boolean }>
  onRequestModifyInChat?: (activity: Activity, dayNumber: number) => void
  isGeneratingExtra?: boolean
}

export function ActivityTimelineCard({
  activity,
  destination,
  dayNumber,
  onGenerateExtraActivity,
  onGenerateInline,
  onRequestModifyInChat,
  isGeneratingExtra = false,
}: ActivityTimelineCardProps) {
  const t = useTranslations('activity')
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isInlineOpen, setIsInlineOpen] = useState(false)
  const [inlinePrompt, setInlinePrompt] = useState("")
  const [isInlineLoading, setIsInlineLoading] = useState(false)
  const [inlineReply, setInlineReply] = useState<string | null>(null)
  const inlineInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isInlineOpen && inlineInputRef.current) {
      inlineInputRef.current.focus()
    }
  }, [isInlineOpen])

  const handleOpenInlinePanel = () => {
    const defaultPrompt = t('inline.defaultPrompt', { day: dayNumber })
    setInlinePrompt(defaultPrompt)
    setInlineReply(null)
    setIsInlineOpen(true)
  }

  const handleInlineSend = async () => {
    if (!inlinePrompt.trim() || isInlineLoading || !onGenerateInline) return
    setIsInlineLoading(true)
    setInlineReply(null)
    try {
      const result = await onGenerateInline(dayNumber, inlinePrompt)
      if (result.success) {
        setInlineReply(result.reply)
        // Auto-close panel after short delay so user can see the success message
        setTimeout(() => {
          setIsInlineOpen(false)
          setInlineReply(null)
          setInlinePrompt("")
        }, 2500)
      } else {
        setInlineReply(result.reply || t('inline.errorRetry'))
      }
    } catch {
      setInlineReply(t('inline.errorGeneral'))
    } finally {
      setIsInlineLoading(false)
    }
  }

  const handleCloseInline = () => {
    if (isInlineLoading) return
    setIsInlineOpen(false)
    setInlineReply(null)
    setInlinePrompt("")
  }

  const theme = getActivityColorTheme(activity)
  const config = themeConfigs[theme]
  
  // Check if this is a generic placeholder or a specific activity
  // It's a placeholder if it matches "free" theme AND has a generic title (or no title)
  const isPlaceholder = theme === "free" && (!activity.title || activity.title === "Свободное время" || activity.title === "Free Time" || activity.title === t('categories.free'))

  let iconName = config.icon
  // Include title in detection — most transport info is in the title
  const transportText = `${activity.title || ""} ${activity.desc || ""} ${activity.type || ""}`.toLowerCase()
  if (theme === "transport") {
    if (/поезд|сапсан|ласточка|жд|ржд|ж\.д\.|аэроэкспресс|train/.test(transportText)) {
      iconName = "train"
    } else if (/автобус|bus/.test(transportText)) {
      iconName = "directions_bus"
    } else if (/такси|taxi|трансфер|transfer|авто(?!бус)|машин|переезд|дорога|трасса/.test(transportText)) {
      iconName = "directions_car"
    } else if (/пешком|прогулка|walk|foot/.test(transportText)) {
      iconName = "directions_walk"
    } else if (/перелёт|перелет|рейс|вылет|авиа|самол|flight|plane/.test(transportText)) {
      iconName = "flight_land"
    } else {
      // Default to car for unknown land transport instead of flight
      iconName = "commute"
    }
  }

  const categoryLabels: Record<ColorTheme, string> = {
    transport: t('categories.transport'),
    food: t('categories.food'),
    activity: t('categories.activity'),
    hotel: t('categories.hotel'),
    free: t('categories.free'),
  }
  const rawTitle = activity.title || activity.placeName || t('defaultActivity')
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
          text: t('modifyChatText', { title: displayTitle, day: dayNumber }),
        },
      })
    )

    toast.info(t('chatOpenedToast'))
  }

  return (
    <>
      <div className="relative pl-12 sm:pl-16 group/card">
        <div
          className={cn(
            "absolute left-1 sm:left-2 top-1 w-10 h-10 sm:w-12 sm:h-12 rounded-full backdrop-blur-md flex items-center justify-center z-10 border",
            config.iconClass
          )}
        >
          <span className={cn("material-symbols-outlined text-lg sm:text-xl", iconTextColors[theme])}>{iconName}</span>
        </div>

        <div
          className={cn(
            "trip-glass min-w-0 rounded-[2rem] p-4 transition-all duration-300 sm:p-6",
            isPlaceholder
              ? "border-dashed !border-slate-300 dark:!border-white/20 hover:!border-solid hover:shadow-lg group-hover/card:!border-indigo-300 dark:group-hover/card:!border-indigo-400/50"
              : "hover:shadow-lg trip-glass-hover"
          )}
        >
          <div className="mb-2 flex items-start justify-between gap-2 sm:mb-3">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
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
                  {categoryLabels[theme]}
                </span>
                {activity.time && (
                  <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-blue-200/70 uppercase tracking-wide bg-white/40 dark:bg-white/5 px-2 py-0.5 rounded-lg border border-white/30 dark:border-transparent">
                    {activity.time}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-slate-800 dark:text-white text-base sm:text-xl">{displayTitle}</h3>
            </div>

            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              {activity.cost && (
                <span className="whitespace-nowrap text-[10px] sm:text-xs font-bold text-slate-700 dark:text-white bg-white/40 dark:bg-white/10 px-2 py-1 rounded-lg border border-white/40 dark:border-white/10 shadow-sm">
                  {activity.cost}
                </span>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex h-10 w-10 touch-manipulation items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/40 hover:text-slate-600 dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white sm:h-9 sm:w-9"
                  >
                    <span className="material-symbols-outlined text-lg sm:text-xl">more_horiz</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl p-1.5">
                  <DropdownMenuItem onClick={() => setIsDetailsOpen(true)}>
                    {t('buttons.details')}
                  </DropdownMenuItem>
                  {activity.placeName && <DropdownMenuItem onClick={handleOpenMap}>{t('buttons.viewOnMap')}</DropdownMenuItem>}
                  <DropdownMenuItem onClick={handleModifyViaChat}>{t('buttons.modifyViaChat')}</DropdownMenuItem>
                  {activity.ticketsRequired && activity.link && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => window.open(activity.link, "_blank")}>{t('buttons.openTickets')}</DropdownMenuItem>
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
                  <span className="text-[10px] font-bold uppercase tracking-wider">{t('specialForYou')}</span>
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
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 pt-3 sm:pt-4 border-t border-slate-200/50 dark:border-white/5">
              <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3 [&_a]:touch-manipulation [&_button]:touch-manipulation [&>a]:inline-flex [&>a]:min-h-9 [&>a]:items-center [&>button]:inline-flex [&>button]:min-h-9 [&>button]:items-center">
                {theme === "transport" ? (
                  (() => {
                    const tt = transportText
                    if (/поезд|сапсан|ласточка|жд|ржд|аэроэкспресс|train/.test(tt)) {
                      return (
                        <a href="https://www.tutu.ru/poezda/" target="_blank" rel="noopener noreferrer"
                          className="flex items-center text-xs text-white font-semibold bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-500 px-3 py-1.5 rounded-full transition-colors shadow-sm">
                          <span className="material-symbols-outlined text-sm mr-1.5">train</span>
                          {t('buttons.trainTickets')}
                        </a>
                      )
                    }
                    if (/автобус|bus/.test(tt)) {
                      return (
                        <a href="https://www.tutu.ru/avtobus/" target="_blank" rel="noopener noreferrer"
                          className="flex items-center text-xs text-white font-semibold bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-500 px-3 py-1.5 rounded-full transition-colors shadow-sm">
                          <span className="material-symbols-outlined text-sm mr-1.5">directions_bus</span>
                          {t('buttons.findBus')}
                        </a>
                      )
                    }
                    if (/такси|taxi|трансфер|transfer|авто(?!бус)|машин|переезд|дорога|трасса|пешком|walk|foot/.test(tt)) {
                      return (
                        <>
                          {activity.link && (
                            <a href={activity.link} target="_blank" rel="noopener noreferrer"
                              className="flex items-center text-xs text-white font-semibold bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-500 px-3 py-1.5 rounded-full transition-colors shadow-sm">
                              <span className="material-symbols-outlined text-sm mr-1.5">directions_car</span>
                              {t('buttons.orderTransfer')}
                            </a>
                          )}
                          {(activity.mapLink || activity.placeName) && (
                            <button type="button" onClick={handleOpenMap}
                              className="flex min-h-9 items-center rounded-full border border-white/30 bg-white/40 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-white/60 dark:border-transparent dark:bg-white/5 dark:text-blue-100/70 dark:hover:bg-white/10">
                              <span className="material-symbols-outlined text-sm mr-1.5 text-slate-500 dark:text-blue-300">map</span>
                              {t('buttons.route')}
                            </button>
                          )}
                        </>
                      )
                    }
                    // Only show flight button if flight-related keywords are found
                    if (/перелёт|перелет|рейс|вылет|авиа|самол|flight|plane/.test(tt)) {
                      return (
                        <a href={buildFlightLink(activity)} target="_blank" rel="noopener noreferrer"
                          className="flex items-center text-xs text-white font-semibold bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-500 px-3 py-1.5 rounded-full transition-colors shadow-sm">
                          <span className="material-symbols-outlined text-sm mr-1.5">flight</span>
                          {t('buttons.findFlights')}
                        </a>
                      )
                    }
                    return null
                  })()
                ) : (
                  <>
                    {/* Map button — direct link if mapLink exists, else Google Maps search */}
                    {(activity.placeName || activity.mapLink) && (
                      <button
                        type="button"
                        onClick={handleOpenMap}
                        className="flex min-h-9 items-center rounded-full border border-white/30 bg-white/40 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-white/60 dark:border-transparent dark:bg-white/5 dark:text-blue-100/70 dark:hover:bg-white/10 sm:px-3"
                      >
                        <span className="material-symbols-outlined text-sm mr-1.5 text-slate-500 dark:text-blue-300">map</span>
                        {t('buttons.map')}
                      </button>
                    )}

                    {/* Hotel: booking button — prefer direct URL, fallback to Booking.com search */}
                    {theme === "hotel" && (
                      <a
                        href={
                          activity.bookingUrl ||
                          (!isMapUrl(activity.link || "") ? activity.link : undefined) ||
                          `https://www.booking.com/search.html?ss=${encodeURIComponent([activity.placeName, activity.title].filter(Boolean).join(" "))}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-2.5 sm:px-3 py-1.5 rounded-full transition-colors shadow-sm shadow-blue-600/30"
                      >
                        <span className="material-symbols-outlined text-sm mr-1.5">hotel</span>
                        {t('buttons.book')}
                      </a>
                    )}

                    {/* Food: reservation link if exists */}
                    {theme === "food" && (activity.bookingUrl || activity.link) && (
                      <a
                        href={activity.bookingUrl || activity.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-xs font-bold text-white bg-orange-500 hover:bg-orange-400 px-2.5 sm:px-3 py-1.5 rounded-full transition-colors shadow-sm shadow-orange-500/30"
                      >
                        <span className="material-symbols-outlined text-sm mr-1.5">restaurant</span>
                        {t('buttons.tableReservation')}
                      </a>
                    )}

                    {/* Activity: tickets */}
                    {theme !== "hotel" && theme !== "food" && (activity.ticketUrl || (activity.ticketsRequired && activity.link)) && (
                      <a
                        href={activity.ticketUrl || activity.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 px-2.5 sm:px-3 py-1.5 rounded-full transition-colors shadow-sm shadow-violet-600/30"
                      >
                        <span className="material-symbols-outlined text-sm mr-1.5">confirmation_number</span>
                        {t('buttons.tickets')}
                      </a>
                    )}

                    {/* Generic link from description */}
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
                type="button"
                onClick={() => setIsDetailsOpen(true)}
                className="inline-flex min-h-10 w-full shrink-0 touch-manipulation items-center justify-center gap-1 rounded-full border border-white/30 bg-white/40 px-2.5 py-2 text-xs font-bold text-sky-600 transition-colors hover:bg-white/60 hover:text-sky-800 dark:border-transparent dark:bg-white/5 dark:text-blue-300 dark:hover:bg-white/10 dark:hover:text-white sm:ml-auto sm:w-auto sm:min-h-0 sm:px-3 sm:py-1.5"
              >
                {t('buttons.details')} <span className="material-symbols-outlined text-sm shrink-0">chevron_right</span>
              </button>
            </div>
          ) : (
            <div className="flex justify-between items-start mt-2 gap-2 sm:gap-3">
              <p className="text-xs sm:text-sm text-slate-600 dark:text-blue-200/70 leading-relaxed font-medium">
                {activity.desc || t('freeTimeDesc')}
              </p>

              <button
                type="button"
                onClick={onGenerateInline ? handleOpenInlinePanel : () => onGenerateExtraActivity?.(dayNumber)}
                disabled={isGeneratingExtra || isInlineOpen}
                className="flex min-h-10 shrink-0 touch-manipulation items-center gap-1 whitespace-nowrap rounded-full border border-indigo-400/20 bg-indigo-500 px-3 py-2 text-xs font-bold text-white shadow-md shadow-indigo-500/20 backdrop-blur-sm transition-colors hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-0 sm:px-4 sm:py-1.5"
              >
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                <span className="hidden sm:inline">{isGeneratingExtra ? t('buttons.generating') : t('buttons.generate')}</span>
                <span className="sm:hidden">{isGeneratingExtra ? "..." : "+"}</span>
              </button>
            </div>
          )}
        </div>

        {/* Inline Generation Panel */}
        {isInlineOpen && (
          <div className="mt-3 rounded-2xl overflow-hidden border border-indigo-300/50 dark:border-indigo-500/30 bg-white/90 dark:bg-[#0a1128]/90 backdrop-blur-xl shadow-lg shadow-indigo-500/10 animate-in slide-in-from-top-2 duration-300">
            {/* Panel Header */}
            <div className="px-4 py-2.5 border-b border-indigo-200/50 dark:border-indigo-500/20 bg-gradient-to-r from-indigo-50/80 to-purple-50/50 dark:from-indigo-900/20 dark:to-purple-900/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.6)]" />
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-300 uppercase tracking-[0.1em]">{t('inline.header')}</span>
              </div>
              <button
                type="button"
                onClick={handleCloseInline}
                disabled={isInlineLoading}
                className="flex h-9 w-9 touch-manipulation items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {/* Panel Body */}
            <div className="p-4">
              {isInlineLoading ? (
                /* Loading State */
                <div className="flex items-center gap-3 py-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-indigo-500/20 shrink-0">
                    AI
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      <span className="text-[11px] text-indigo-500 dark:text-indigo-300 font-medium">{t('inline.generating')}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-white/30 mt-1">{t('inline.generatingHint')}</p>
                  </div>
                </div>
              ) : inlineReply ? (
                /* Success Reply */
                <div className="flex items-start gap-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-emerald-500/20 shrink-0 mt-0.5">
                    ✓
                  </div>
                  <div className="flex-1">
                    <p className="text-[12px] text-slate-700 dark:text-white/80 leading-relaxed whitespace-pre-wrap">{inlineReply}</p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-2 uppercase tracking-wide flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                      {t('inline.itineraryUpdated')}
                    </p>
                  </div>
                </div>
              ) : (
                /* Input State */
                <form
                  onSubmit={(e) => { e.preventDefault(); handleInlineSend() }}
                  className="flex gap-2 items-center"
                >
                  <input
                    ref={inlineInputRef}
                    value={inlinePrompt}
                    onChange={(e) => setInlinePrompt(e.target.value)}
                    placeholder={t('inline.placeholder')}
                    className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/30 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white dark:placeholder:text-white/25 sm:h-10 sm:text-[13px]"
                  />
                  <button
                    type="submit"
                    disabled={!inlinePrompt.trim()}
                    className="flex h-11 w-11 flex-shrink-0 touch-manipulation items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-600/25 transition-all hover:from-indigo-400 hover:to-purple-500 disabled:opacity-30 disabled:shadow-none sm:h-10 sm:w-10"
                  >
                    <span className="material-symbols-outlined text-lg">send</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="w-[calc(100vw-1.25rem)] max-w-xl rounded-3xl p-5 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{displayTitle}</DialogTitle>
            <DialogDescription>{t('details.dayLabel', { day: dayNumber })}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4 max-h-[65vh] overflow-y-auto pr-1">
            {activity.time && (
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-1">{t('details.time')}</p>
                <p className="font-semibold">{activity.time}</p>
              </div>
            )}

            {activity.desc && (
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-1">{t('details.description')}</p>
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
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-1">{t('details.cost')}</p>
                <p className="font-semibold">{activity.cost}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              {activity.placeName && (
                <button
                  type="button"
                  onClick={handleOpenMap}
                  className="min-h-10 touch-manipulation rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-xs font-bold text-sky-700 transition-colors hover:bg-sky-500/20 dark:text-sky-300"
                >
                  {t('buttons.viewOnMap')}
                </button>
              )}

              <button
                  type="button"
                  onClick={handleModifyViaChat}
                  className="min-h-10 touch-manipulation rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-500/20 dark:text-indigo-300"
                >
                  {t('buttons.modifyViaChat')}
              </button>

              {activity.ticketsRequired && activity.link && (
                <button
                  type="button"
                  onClick={() => window.open(activity.link, "_blank")}
                  className="min-h-10 touch-manipulation rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-500/20 dark:text-emerald-300"
                >
                  {t('buttons.openTickets')}
                </button>
              )}
            </div>

            {(descLinks.length > 0 ||
              !!(activity.link && String(activity.link).startsWith("http")) ||
              !!(activity.bookingUrl && String(activity.bookingUrl).startsWith("http")) ||
              !!(activity.ticketUrl && String(activity.ticketUrl).startsWith("http"))) && (
              <AffiliateNotice className="mt-4 pt-3 border-t border-border/60 text-muted-foreground [&_a]:text-sky-600 dark:[&_a]:text-sky-400" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
