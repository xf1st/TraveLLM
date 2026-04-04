"use client"

import { useMemo, useState, useEffect } from "react"
import {
  ExternalLink, Plane, Utensils, Hotel as HotelIcon,
  Compass, ChevronDown, Ticket, Car, Train, Bus, Link2, ArrowRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslations } from "next-intl"
import { normalizeTravelMode, type TravelMode } from "@/lib/travel-mode"
import { AffiliateNotice } from "@/components/partners/AffiliateNotice"
import { isRussianHotelDestinationSync } from "@/lib/travelpayouts"
import { unwrapTravelpayoutsDeepLink } from "@/lib/tp-media"
import { useBookingMarket } from "@/lib/hooks/useBookingMarket"
import type { BookingMarket } from "@/lib/booking-market"

type ActivityType = "transport" | "food" | "hotel" | "activity"

interface LinkItem {
  day: number
  dayTitle: string
  activityTitle: string
  url: string
  service: string
  type: ActivityType
  rawType: string
  imageQuery?: string
}

/* ─── Image thumbnail with lazy fetch ─── */
function ActivityImage({ query, type, accent }: { query?: string; type: ActivityType; accent: string }) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!query) return
    let cancelled = false
    fetch(`/api/gallery?query=${encodeURIComponent(query)}&count=1`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!cancelled && d?.images?.[0]) setSrc(d.images[0])
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [query])

  if (!src) return (
    <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: `${accent}18` }}>
      {type === "food" ? <Utensils className="w-5 h-5" style={{ color: accent }} />
        : type === "hotel" ? <HotelIcon className="w-5 h-5" style={{ color: accent }} />
        : type === "transport" ? <Plane className="w-5 h-5" style={{ color: accent }} />
        : <Compass className="w-5 h-5" style={{ color: accent }} />}
    </div>
  )

  return (
    <div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden" style={{ border: `1px solid ${accent}20` }}>
      <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
    </div>
  )
}

/* ─── Service branding ─── */
const SVC: Record<string, { color: string; label: string }> = {
  "Aviasales":    { color: "#ff6d00", label: "Aviasales"    },
  "Skyscanner":   { color: "#0770e3", label: "Skyscanner"   },
  "Booking.com":  { color: "#57b8f0", label: "Booking.com"  },
  "Ostrovok":     { color: "#ed1c24", label: "Ostrovok"     },
  "Yandex Travel": { color: "#fc3f1e", label: "Яндекс Путешествия" },
  "Travelpayouts": { color: "#7c3aed", label: "Travelpayouts" },
  "Tripster":     { color: "#e11d48", label: "Tripster"     },
  "Sputnik8":     { color: "#0ea5e9", label: "Sputnik8"     },
  "Суточно.ру":   { color: "#f97316", label: "Суточно.ру"   },
  "Airbnb":       { color: "#ff5a5f", label: "Airbnb"       },
  "Hotels.com":   { color: "#d4370c", label: "Hotels.com"   },
  "GetYourGuide": { color: "#ff5f00", label: "GetYourGuide" },
  "Klook":        { color: "#ff5722", label: "Klook"        },
  "Tiqets":       { color: "#00aa6c", label: "Tiqets"       },
  "WeGoTrip":     { color: "#6b4ce6", label: "WeGoTrip"     },
  "Viator":       { color: "#328276", label: "Viator"       },
  "TripAdvisor":  { color: "#34e0a1", label: "TripAdvisor"  },
  "Trip.com":     { color: "#287dfa", label: "Trip.com"     },
  "Omio":         { color: "#32bb78", label: "Omio"         },
}

const TYPE_ORDER: ActivityType[] = ["transport", "hotel", "food", "activity"]

/* ─── Helpers ─── */
function isMapUrl(url: string) {
  return /maps\.google|goo\.gl\/maps|yandex\.ru\/maps|2gis\.com|maps\.apple|waze\.com/i.test(url)
}

function parseService(url: string): string {
  // Unwrap affiliate redirects (emrld.ltd, tp.media) before detecting the brand
  const resolved = unwrapTravelpayoutsDeepLink(url)
  const u = resolved || url
  if (/aviasales/i.test(u))                    return "Aviasales"
  if (/skyscanner/i.test(u))                   return "Skyscanner"
  if (/booking\.com/i.test(u))                 return "Booking.com"
  if (/travel\.yandex\.ru\/hotels/i.test(u))   return "Yandex Travel"
  if (/ostrovok/i.test(u))                     return "Ostrovok"
  if (/airbnb/i.test(u))                       return "Airbnb"
  if (/hotels\.com/i.test(u))                  return "Hotels.com"
  if (/tripadvisor/i.test(u))                  return "TripAdvisor"
  if (/tripster\.ru/i.test(u))                 return "Tripster"
  if (/sputnik8\.com/i.test(u))                return "Sputnik8"
  if (/sutochno\.ru/i.test(u))                 return "Суточно.ру"
  if (/tomesto\.ru/i.test(u))                  return "ТоМесто"
  if (/getyourguide/i.test(u))                 return "GetYourGuide"
  if (/tiqets\.com/i.test(u))                  return "Tiqets"
  if (/wegotrip\.com/i.test(u))                return "WeGoTrip"
  if (/klook/i.test(u))                        return "Klook"
  if (/viator/i.test(u))                       return "Viator"
  if (/trip\.com/i.test(u))                    return "Trip.com"
  if (/omio\.com/i.test(u))                    return "Omio"
  // Fallback: show the actual partner hostname (unwrapped), not the redirect host
  try { return new URL(u).hostname.replace("www.", "") } catch { return "Link" }
}

function getTransportIcon(text: string) {
  const t = text.toLowerCase()
  if (/поезд|train|сапсан|ласточка|жд|аэроэкспресс/.test(t)) return Train
  if (/автобус|bus/.test(t)) return Bus
  if (/такси|taxi|трансфер|transfer|авто|машин/.test(t)) return Car
  return Plane
}

function parseFlightRoute(title: string): { from: string; to: string } | null {
  for (const sep of [" – ", " — ", " → ", " - ", "→", "–"]) {
    if (title.includes(sep)) {
      const parts = title.split(sep)
      if (parts.length === 2) return { from: parts[0].trim(), to: parts[1].trim() }
    }
  }
  return null
}

/* ─── Liquid glass style helper ─── */
const glass = {
  background: "rgba(34, 38, 47, 0.45)",
  backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)",
  border: "1px solid rgba(255,255,255,0.08)",
} as React.CSSProperties

/* ─── Flight boarding-pass card ─── */
function FlightCard({ item, onGoToDay, t }: { item: LinkItem; onGoToDay?: (d: number) => void; t: (key: string) => string }) {
  const accent = "#85adff"
  const svc = SVC[item.service]
  const route = parseFlightRoute(item.activityTitle)
  const [bgSrc, setBgSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!item.imageQuery) return
    let cancelled = false
    fetch(`/api/gallery?query=${encodeURIComponent(item.imageQuery)}&count=1`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled && d?.images?.[0]) setBgSrc(d.images[0]) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [item.imageQuery])

  return (
    <div className="relative rounded-2xl p-6 overflow-hidden" style={glass}>
      {/* Background photo overlay */}
      {bgSrc && (
        <div className="absolute inset-0 z-0 rounded-2xl overflow-hidden pointer-events-none">
          <img src={bgSrc} alt="" className="w-full h-full object-cover opacity-[0.12]" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 0%, rgba(11,14,20,0.85) 100%)" }} />
        </div>
      )}
      {/* Service badge top-right */}
      <div className="absolute top-4 right-4">
        <span
          className="text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full"
          style={{
            background: svc ? `${svc.color}20` : `${accent}20`,
            color: svc?.color ?? accent,
            border: `1px solid ${svc ? svc.color : accent}30`,
          }}
        >
          {item.service}
        </span>
      </div>

      {route ? (
        <div className="relative z-10 flex flex-col gap-5">
          {/* From */}
          <div className="flex items-start justify-between pr-20">
            <div>
              <span className="text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5 block" style={{ color: accent }}>
                {t("departure")}
              </span>
              <h3 className="text-2xl font-bold text-white leading-tight">{route.from}</h3>
            </div>
          </div>

          {/* Duration separator */}
          <div className="relative flex items-center justify-center py-1">
            <div className="absolute w-full border-t border-dashed" style={{ borderColor: "rgba(255,255,255,0.1)" }} />
            <div
              className="relative px-4 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1.5"
              style={{ background: "rgba(22,26,33,0.95)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
            >
              <Plane className="w-3 h-3" style={{ color: accent }} />
              {`${t("day")} ${item.day}`}
            </div>
          </div>

          {/* To */}
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5 block" style={{ color: "#8ff5ff" }}>
                {t("destination")}
              </span>
              <h3 className="text-2xl font-bold text-white leading-tight">{route.to}</h3>
              <p className="text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.38)" }}>{item.dayTitle}</p>
            </div>
            <div className="w-10 h-10 flex items-center justify-center rounded-full flex-shrink-0"
              style={{ background: "rgba(143,245,255,0.1)" }}>
              <Plane className="w-5 h-5 rotate-45" style={{ color: "#8ff5ff" }} />
            </div>
          </div>

          {/* CTA row */}
          <div className="flex gap-2">
            {onGoToDay && (
              <button
                onClick={() => { onGoToDay(item.day); window.scrollTo({ top: 0, behavior: "smooth" }) }}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[12px] font-bold transition-all hover:opacity-80 active:scale-95 flex-shrink-0"
                style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}25` }}
                title={`${t("goToDay")} ${item.day}`}
              >
                <ArrowRight className="w-3.5 h-3.5" />
                {`${t("day")} ${item.day}`}
              </button>
            )}
            <a
              href={item.url} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold transition-all"
              style={{
                background: svc ? `${svc.color}18` : `${accent}18`,
                border: `1px solid ${svc ? svc.color : accent}28`,
                color: svc?.color ?? accent,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = svc ? `${svc.color}2e` : `${accent}2e` }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = svc ? `${svc.color}18` : `${accent}18` }}
            >
              {t("checkPrices")}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      ) : (
        /* fallback — simple row if can't parse route */
        <RegularCard item={item} accent={accent} t={t} />
      )}
    </div>
  )
}

/* ─── Regular horizontal card ─── */
function RegularCard({
  item, accent, onGoToDay, t,
}: {
  item: LinkItem
  accent: string
  onGoToDay?: (d: number) => void
  t: (key: string) => string
}) {
  const isHotel = item.type === "hotel"
  const svc = SVC[item.service]

  return (
    <div
      className="flex items-center gap-4 rounded-2xl p-4 group transition-all"
      style={{
        ...glass,
        ...(isHotel ? { borderLeft: `3px solid ${accent}` } : {}),
      }}
    >
      {/* Thumbnail / Icon */}
      <ActivityImage query={item.imageQuery} type={item.type} accent={accent} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-white font-bold text-[14px] leading-tight line-clamp-1">{item.activityTitle}</h4>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {onGoToDay ? (
            <button
              onClick={() => { onGoToDay(item.day); window.scrollTo({ top: 0, behavior: "smooth" }) }}
              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full transition-all hover:opacity-80 active:scale-95"
              style={{ background: `${accent}20`, color: accent }}
              title={`${t("goToDay")} ${item.day}`}
            >
              <ArrowRight className="w-2.5 h-2.5" />
              {`${t("day")} ${item.day}`}
            </button>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${accent}15`, color: accent }}>
              {`${t("day")} ${item.day}`}
            </span>
          )}
          <span className="text-[11px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
            {item.dayTitle}
          </span>
        </div>
        {item.service && (
          <span
            className="inline-block text-[9px] font-black uppercase tracking-wider mt-1.5 px-2 py-0.5 rounded-full"
            style={{ background: svc ? `${svc.color}18` : `${accent}15`, color: svc?.color ?? accent }}
          >
            {item.service}
          </span>
        )}
      </div>

      {/* Right: link only */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <a
          href={item.url} target="_blank" rel="noopener noreferrer"
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.06)" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${accent}20` }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)" }}
          onClick={e => e.stopPropagation()}
        >
          <Link2 className="w-4 h-4" style={{ color: accent }} />
        </a>
      </div>
    </div>
  )
}

/* ─── Section accordion ─── */
function CategorySection({
  typeKey, items, isOpen, onToggle, onGoToDay, cat, t,
  travelMode,
}: {
  typeKey: ActivityType
  items: LinkItem[]
  isOpen: boolean
  onToggle: () => void
  onGoToDay?: (day: number) => void
  cat: Record<ActivityType, { label: string; icon: any; accent: string; dim: string }>
  t: (key: string) => string
  travelMode: TravelMode
}) {
  if (!items.length) return null
  const { label, icon: Icon, accent } = cat[typeKey]

  return (
    <div>
      {/* Section header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-2 py-3 transition-all rounded-xl"
        style={{ background: isOpen ? `${accent}08` : "transparent" }}
      >
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: accent }} />
        <span className="flex-1 text-left text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.45)" }}>
          {label}
        </span>
        <span
          className="whitespace-nowrap text-[10px] font-black px-2 py-0.5 rounded-full"
          style={{ background: `${accent}20`, color: accent }}
        >
          {items.length}
        </span>
        <ChevronDown
          className={cn("w-4 h-4 transition-transform duration-300 flex-shrink-0", isOpen && "rotate-180")}
          style={{ color: "rgba(255,255,255,0.25)" }}
        />
      </button>

      {/* Divider */}
      {isOpen && (
        <div className="h-px mb-3" style={{ background: `linear-gradient(90deg, ${accent}30 0%, transparent 80%)` }} />
      )}

      {/* Items */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-3 pb-4">
              {items.map((item, i) => {
                const isFlightLike =
                  travelMode === "flight" &&
                  typeKey === "transport" &&
                  /авиа|рейс|перелёт|перелет|flight|вылет|прилёт|прилет/i.test(item.activityTitle)
                if (isFlightLike) {
                  return <FlightCard key={i} item={item} onGoToDay={onGoToDay} t={t} />
                }
                return (
                  <RegularCard key={i} item={item} accent={cat[typeKey].accent} onGoToDay={onGoToDay} t={t} />
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Quick external tools (travelMode from /plan) ─── */
function TripQuickLinks({
  route,
  travelMode,
  bookingMarket,
}: {
  route: any
  travelMode: TravelMode
  bookingMarket: BookingMarket
}) {
  const t = useTranslations("links")
  const from = String(route?.departure_city || route?.departureCity || "").trim()
  const firstAct = route?.itinerary?.[0]?.activities?.find((a: { placeName?: string; title?: string }) => a.placeName || a.title)
  const to = String(firstAct?.placeName || firstAct?.title || route?.destination || "").trim()
  const mapsDir =
    from && to
      ? `https://www.google.com/maps/dir/${encodeURIComponent(from)}/${encodeURIComponent(to)}`
      : "https://www.google.com/maps"

  const aviasales = bookingMarket === "world" ? "https://www.aviasales.com/" : "https://www.aviasales.ru/"
  const skyscanner = "https://www.skyscanner.com/"

  const pillStyle =
    "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all border"
  const pillDefault = "border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08] hover:border-white/20"

  if (travelMode === "flight") {
    return (
      <div className="flex flex-wrap gap-2 pb-4 -mt-1">
        <span className="w-full text-[10px] font-black uppercase tracking-[0.2em] text-white/35 mb-0.5">{t("quick.title")}</span>
        <a href={aviasales} target="_blank" rel="noopener noreferrer" className={`${pillStyle} ${pillDefault}`}>
          <Plane className="w-3.5 h-3.5 text-[#85adff]" />
          {t("quick.aviasales")}
          <ExternalLink className="w-3 h-3 opacity-40" />
        </a>
        <a href={skyscanner} target="_blank" rel="noopener noreferrer" className={`${pillStyle} ${pillDefault}`}>
          {t("quick.skyscanner")}
          <ExternalLink className="w-3 h-3 opacity-40" />
        </a>
        <a href={mapsDir} target="_blank" rel="noopener noreferrer" className={`${pillStyle} ${pillDefault}`}>
          <Compass className="w-3.5 h-3.5 text-[#85adff]" />
          {t("quick.mapsRoute")}
          <ExternalLink className="w-3 h-3 opacity-40" />
        </a>
      </div>
    )
  }
  if (travelMode === "train") {
    if (bookingMarket === "world") {
      return (
        <div className="flex flex-wrap gap-2 pb-4 -mt-1">
          <span className="w-full text-[10px] font-black uppercase tracking-[0.2em] text-white/35 mb-0.5">{t("quick.title")}</span>
          <a href="https://www.trip.com/trains/" target="_blank" rel="noopener noreferrer" className={`${pillStyle} ${pillDefault}`}>
            <Train className="w-3.5 h-3.5 text-[#85adff]" />
            Trip.com
            <ExternalLink className="w-3 h-3 opacity-40" />
          </a>
          <a href="https://www.omio.com/" target="_blank" rel="noopener noreferrer" className={`${pillStyle} ${pillDefault}`}>
            <Train className="w-3.5 h-3.5 text-[#85adff]" />
            Omio
            <ExternalLink className="w-3 h-3 opacity-40" />
          </a>
          <a href={mapsDir} target="_blank" rel="noopener noreferrer" className={`${pillStyle} ${pillDefault}`}>
            <Compass className="w-3.5 h-3.5 text-[#85adff]" />
            {t("quick.mapsRoute")}
            <ExternalLink className="w-3 h-3 opacity-40" />
          </a>
        </div>
      )
    }
    return (
      <div className="flex flex-wrap gap-2 pb-4 -mt-1">
        <span className="w-full text-[10px] font-black uppercase tracking-[0.2em] text-white/35 mb-0.5">{t("quick.title")}</span>
        <a href="https://ticket.rzd.ru/" target="_blank" rel="noopener noreferrer" className={`${pillStyle} ${pillDefault}`}>
          <Train className="w-3.5 h-3.5 text-[#85adff]" />
          {t("quick.rzd")}
          <ExternalLink className="w-3 h-3 opacity-40" />
        </a>
        <a href="https://travel.yandex.ru/trains/" target="_blank" rel="noopener noreferrer" className={`${pillStyle} ${pillDefault}`}>
          <Train className="w-3.5 h-3.5 text-[#85adff]" />
          {t("quick.yandexTrains")}
          <ExternalLink className="w-3 h-3 opacity-40" />
        </a>
        <a href={mapsDir} target="_blank" rel="noopener noreferrer" className={`${pillStyle} ${pillDefault}`}>
          <Compass className="w-3.5 h-3.5 text-[#85adff]" />
          {t("quick.mapsRoute")}
          <ExternalLink className="w-3 h-3 opacity-40" />
        </a>
      </div>
    )
  }
  return (
    <div className="flex flex-wrap gap-2 pb-4 -mt-1">
      <span className="w-full text-[10px] font-black uppercase tracking-[0.2em] text-white/35 mb-0.5">{t("quick.title")}</span>
      <a href={mapsDir} target="_blank" rel="noopener noreferrer" className={`${pillStyle} ${pillDefault}`}>
        <Car className="w-3.5 h-3.5 text-[#85adff]" />
        {t("quick.mapsRoute")}
        <ExternalLink className="w-3 h-3 opacity-40" />
      </a>
      <a href="https://www.booking.com/cars/index.html" target="_blank" rel="noopener noreferrer" className={`${pillStyle} ${pillDefault}`}>
        <Car className="w-3.5 h-3.5 text-[#85adff]" />
        {t("quick.carRental")}
        <ExternalLink className="w-3 h-3 opacity-40" />
      </a>
    </div>
  )
}

/* ─── Main ─── */
interface Props {
  route: any
  onGoToDay?: (day: number) => void
}

export function TripLinksPanel({ route, onGoToDay }: Props) {
  const t = useTranslations("links")
  const bookingMarket = useBookingMarket()
  const travelMode = normalizeTravelMode(route?.travelMode ?? route?.travel_mode)

  const TransportIcon = travelMode === "train" ? Train : travelMode === "car" ? Car : Plane
  const transportSectionLabel = {
    flight: t("transportByMode.flight"),
    train: t("transportByMode.train"),
    car: t("transportByMode.car"),
  }[travelMode]

  const CAT: Record<ActivityType, { label: string; icon: any; accent: string; dim: string }> = {
    transport: { label: transportSectionLabel, icon: TransportIcon, accent: "#85adff", dim: "rgba(133,173,255,0.12)" },
    hotel:     { label: t("accommodation"), icon: HotelIcon, accent: "#ac89ff", dim: "rgba(172,137,255,0.12)" },
    food:      { label: t("restaurants"), icon: Utensils, accent: "#34d399", dim: "rgba(52,211,153,0.12)" },
    activity:  { label: t("activities"), icon: Ticket, accent: "#fbbf24", dim: "rgba(251,191,36,0.12)" },
  }

  const grouped = useMemo(() => {
    const result: Record<ActivityType, LinkItem[]> = {
      transport: [], hotel: [], food: [], activity: [],
    }
    if (!Array.isArray(route?.itinerary)) return result

    const yandexHotelsFallback = () => {
      const m = process.env.NEXT_PUBLIC_TRAVELPAYOUTS_MARKER || ""
      const p = new URLSearchParams()
      if (m) p.set("marker", m)
      return `https://travel.yandex.ru/hotels/?${p.toString()}`
    }
    const hotelFallbackUrl = (placeName: string) => {
      if (bookingMarket === "world" && placeName && !isRussianHotelDestinationSync(placeName)) {
        return `https://www.booking.com/search.html?ss=${encodeURIComponent(placeName)}`
      }
      return yandexHotelsFallback()
    }

    for (const day of route.itinerary) {
      const dayNum: number = day.day
      const dayTitle: string = day.title || `${t("day")} ${dayNum}`

      for (const act of day.activities ?? []) {
        const rawUrls: string[] = []

        // Collect non-map URLs from all fields
        if (act.link       && typeof act.link       === "string" && act.link.startsWith("http")       && !isMapUrl(act.link))       rawUrls.push(act.link)
        if (act.mapLink    && typeof act.mapLink    === "string" && act.mapLink.startsWith("http")    && !isMapUrl(act.mapLink))    rawUrls.push(act.mapLink)
        if (act.bookingUrl && typeof act.bookingUrl === "string" && act.bookingUrl.startsWith("http") && !isMapUrl(act.bookingUrl)) rawUrls.push(act.bookingUrl)
        if (act.ticketUrl  && typeof act.ticketUrl  === "string" && act.ticketUrl.startsWith("http")  && !isMapUrl(act.ticketUrl))  rawUrls.push(act.ticketUrl)

        const actTitle: string = act.placeName || act.title || "Активность"
        const rawType: string  = act.type || "activity"
        const actType: ActivityType = rawType === "transport" ? "transport"
          : rawType === "hotel" ? "hotel"
          : rawType === "food"  ? "food"
          : "activity"
        const imageQuery: string | undefined = act.imageQuery || undefined

        let finalUrls: string[] = []

        if (actType === "hotel") {
          // For hotels, deduplicate and pick one best link per service (Yandex / Ostrovok / Booking)
          const deduped = [...new Set(rawUrls)]
          const yandex = deduped.find(u => /travel\.yandex\.ru/i.test(u))
          const ostrovok = deduped.find(u => /ostrovok\.ru/i.test(u))
          const booking = deduped.find(u => /booking\.com/i.test(u))

          if (yandex) finalUrls.push(yandex)
          if (ostrovok) finalUrls.push(ostrovok)
          // Only show Booking if no Russian service is available
          if (!yandex && !ostrovok && booking) finalUrls.push(booking)

          // If still no link, use fallback
          if (finalUrls.length === 0) {
            finalUrls.push(hotelFallbackUrl(act.placeName || ""))
          }
        } else {
          // Deduplicate & remove generic google.com search URLs when real service URLs exist
          const dedupedUrls = [...new Set(rawUrls)]
          const hasNonGoogle = dedupedUrls.some(u => !/google\.com/i.test(u))
          finalUrls = hasNonGoogle ? dedupedUrls.filter(u => !/google\.com/i.test(u)) : dedupedUrls
        }

        for (const url of finalUrls) {
          result[actType].push({
            day: dayNum, dayTitle, activityTitle: actTitle,
            url, service: parseService(url),
            type: actType, rawType, imageQuery,
          })
        }
      }
    }
    for (const k of Object.keys(result) as ActivityType[]) result[k].sort((a, b) => a.day - b.day)
    return result
  }, [route, t, bookingMarket])

  const firstNonEmpty = TYPE_ORDER.find(key => grouped[key].length > 0) ?? null
  const [openKey, setOpenKey] = useState<ActivityType | null>(firstNonEmpty)

  const hasAny = TYPE_ORDER.some(key => grouped[key].length > 0)
  if (!hasAny) return (
    <div className="text-center py-16 px-2">
      <Link2 className="w-8 h-8 mx-auto mb-3" style={{ color: "rgba(255,255,255,0.15)" }} />
      <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>{t("noLinks")}</p>
      <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.2)" }}>{t("noLinksHint")}</p>
      <AffiliateNotice className="mt-6 max-w-sm mx-auto text-white/40 [&_a]:text-sky-300/90" />
    </div>
  )

  return (
    <div className="space-y-1">
      <TripQuickLinks route={route} travelMode={travelMode} bookingMarket={bookingMarket} />
      {TYPE_ORDER.map(key => (
        <CategorySection
          key={key}
          typeKey={key}
          items={grouped[key]}
          isOpen={openKey === key}
          onToggle={() => setOpenKey(prev => prev === key ? null : key)}
          onGoToDay={onGoToDay}
          cat={CAT}
          t={t}
          travelMode={travelMode}
        />
      ))}
      <AffiliateNotice className="mt-4 pt-3 border-t border-white/10 text-white/45 [&_a]:text-sky-300/95" />
    </div>
  )
}
