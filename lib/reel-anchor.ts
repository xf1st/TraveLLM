export type ActivityInfoLink = { title: string; url: string }

export type ActivityAnchor = {
  title?: string
  placeName?: string
  time?: string
  type?: string
  desc?: string
  cost?: string
  mapLink?: string
  /** HTTPS link to book (Klook, Tiqets, WeGoTrip, official site, etc.) */
  bookingUrl?: string
  bookingLabel?: string
  infoLinks?: ActivityInfoLink[]
}

export type DiscoveryReelRecord = {
  id: string
  title: string
  country: string
  city: string | null
  anchor_day: number
  activity_anchor: ActivityAnchor | Record<string, unknown>
  images?: unknown
  price_label?: string | null
}

function norm(s: string) {
  return s.toLowerCase().replace(/\s+/g, " ").trim()
}

/** Heuristic: model included anchor activity in any day */
export function itineraryContainsAnchor(
  itinerary: { day?: number; activities?: unknown[] }[] | null | undefined,
  reel: Pick<DiscoveryReelRecord, "title" | "activity_anchor">
): boolean {
  if (!Array.isArray(itinerary) || itinerary.length === 0) return false
  const anchor = (reel.activity_anchor || {}) as ActivityAnchor
  const needles = [anchor.title, anchor.placeName, reel.title]
    .filter(Boolean)
    .map((x) => norm(String(x)))
    .filter((x) => x.length >= 3)

  if (needles.length === 0) return false

  for (const day of itinerary) {
    const acts = Array.isArray(day?.activities) ? day!.activities! : []
    for (const raw of acts) {
      const a = raw as Record<string, unknown>
      const hay = norm(
        `${a.title ?? ""} ${a.placeName ?? ""} ${a.desc ?? ""} ${a.time ?? ""} ${(a as { bookingUrl?: string }).bookingUrl ?? ""}`,
      )
      if (needles.some((n) => hay.includes(n))) return true
    }
  }
  return false
}

/** Insert anchor into a specific calendar day (1-based day index) */
export function injectAnchorIntoItinerary(
  itinerary: { day: number; activities?: Record<string, unknown>[]; title?: string }[],
  reel: DiscoveryReelRecord
): void {
  if (!Array.isArray(itinerary) || itinerary.length === 0) return
  const anchor = (reel.activity_anchor || {}) as ActivityAnchor
  const targetDay = Math.min(Math.max(1, reel.anchor_day), itinerary.length)
  const dayObj = itinerary.find((d) => d.day === targetDay) ?? itinerary[targetDay - 1]
  if (!dayObj) return

  const act: Record<string, unknown> = {
    time: anchor.time || "10:00",
    title: anchor.title || reel.title,
    placeName: anchor.placeName || reel.city || reel.country,
    desc: anchor.desc || "",
    type: anchor.type || "activity",
  }
  if (anchor.cost) act.cost = anchor.cost
  if (anchor.mapLink) act.mapLink = anchor.mapLink
  if (anchor.bookingUrl) act.bookingUrl = anchor.bookingUrl
  if (anchor.bookingLabel) act.bookingLabel = anchor.bookingLabel
  if (Array.isArray(anchor.infoLinks) && anchor.infoLinks.length > 0) {
    act.infoLinks = anchor.infoLinks
  }

  dayObj.activities = Array.isArray(dayObj.activities) ? [...dayObj.activities] : []
  dayObj.activities.splice(0, 0, act)
}
