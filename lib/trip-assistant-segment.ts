/**
 * Segment merge, validation, and day totals for trip-assistant API.
 */

const ACTIVITY_TYPES = new Set([
  "transport",
  "hotel",
  "food",
  "activity",
  "free",
  "check-in",
  "checkin",
])

const MAX_STR = 2000
const MAX_ACTIVITIES_PER_DAY = 24

function normalizeActivityType(t: unknown): string {
  if (typeof t !== "string" || !t.trim()) return "activity"
  const s = t.trim().toLowerCase()
  if (s === "checkin") return "check-in"
  if (ACTIVITY_TYPES.has(s)) return s
  return "activity"
}

/** One-line-per-day summary for classifier (no full JSON). */
export function buildCompactItinerarySummary(itinerary: any[]): string {
  if (!Array.isArray(itinerary) || itinerary.length === 0) {
    return "Маршрут пуст."
  }
  return itinerary
    .map((day: any) => {
      const n = day?.activities?.length ?? 0
      const title = String(day?.title ?? "").slice(0, 100)
      return `День ${day?.day ?? "?"}: ${title} (${n} активностей)`
    })
    .join("\n")
}

function summarizeDayEdge(day: any, edge: "first" | "last"): string {
  if (!day || !Array.isArray(day.activities) || day.activities.length === 0) {
    return "нет активностей"
  }
  const act =
    edge === "first" ? day.activities[0] : day.activities[day.activities.length - 1]
  const place = String(act?.placeName || act?.title || "").slice(0, 120)
  const typ = String(act?.type || "activity")
  const time = String(act?.time || "")
  return `${time} [${typ}] ${place}`
}

/** Context for segment rewrite: previous day tail + next day head. */
export function buildSegmentEdgeContext(
  itinerary: any[],
  startDay: number,
  endDay: number
): { before: string; after: string } {
  const byDay = new Map<number, any>()
  for (const d of itinerary) {
    if (typeof d?.day === "number") byDay.set(d.day, d)
  }
  const prev = byDay.get(startDay - 1)
  const next = byDay.get(endDay + 1)
  return {
    before: prev
      ? `День ${startDay - 1} (хвост): ${summarizeDayEdge(prev, "last")}`
      : "Перед сегментом: первый день поездки / нет предыдущего дня.",
    after: next
      ? `День ${endDay + 1} (начало): ${summarizeDayEdge(next, "first")}`
      : "После сегмента: последний день поездки / нет следующего дня.",
  }
}

export function recalculateDayTotal(day: any): any {
  const activities = Array.isArray(day?.activities) ? day.activities : []
  const sum = activities.reduce((acc: number, a: any) => {
    const raw = String(a?.cost ?? "0")
    const n = parseInt(raw.replace(/[^0-9]/g, ""), 10)
    return acc + (Number.isFinite(n) ? n : 0)
  }, 0)
  return {
    ...day,
    dayTotal: `${sum.toLocaleString("ru-RU")} ₽`,
  }
}

function validateActivity(a: any, path: string): string | null {
  if (!a || typeof a !== "object") return `${path}: активность не объект`
  const time = String(a.time ?? "").trim()
  if (!time || time.length > 80) return `${path}: неверное time`
  for (const key of ["title", "placeName", "desc", "cost"] as const) {
    const v = a[key]
    if (typeof v !== "string" || !v.trim()) return `${path}: поле ${key} обязательно`
    if (v.length > MAX_STR) return `${path}: ${key} слишком длинное`
  }
  const mapLink = a.mapLink
  if (mapLink != null && typeof mapLink !== "string")
    return `${path}: mapLink должен быть строкой`
  if (typeof mapLink === "string" && mapLink.length > MAX_STR)
    return `${path}: mapLink слишком длинный`
  return null
}

export function validateDay(day: any, expectedDayNum: number): string | null {
  if (!day || typeof day !== "object") return "День не объект"
  if (typeof day.day !== "number" || day.day !== expectedDayNum) {
    return `Номер дня должен быть ${expectedDayNum}, получено ${day?.day}`
  }
  const title = String(day.title ?? "").trim()
  if (!title || title.length > MAX_STR) return "Неверное title у дня"
  const acts = day.activities
  if (!Array.isArray(acts) || acts.length === 0) return "У дня нет активностей"
  if (acts.length > MAX_ACTIVITIES_PER_DAY) return "Слишком много активностей в одном дне"
  for (let i = 0; i < acts.length; i++) {
    const err = validateActivity(acts[i], `День ${expectedDayNum}, активность ${i}`)
    if (err) return err
  }
  return null
}

/** Normalize types and trim strings; does not fix missing required fields. */
export function normalizeDay(day: any): any {
  if (!day || typeof day !== "object") return day
  const activities = Array.isArray(day.activities)
    ? day.activities.map((a: any) => ({
        ...a,
        time: String(a?.time ?? "").trim(),
        type: normalizeActivityType(a?.type),
        title: String(a?.title ?? "").trim(),
        placeName: String(a?.placeName ?? "").trim(),
        desc: String(a?.desc ?? "").trim(),
        cost: String(a?.cost ?? "").trim(),
        mapLink: a?.mapLink != null ? String(a.mapLink) : "",
        link: a?.link != null ? String(a.link) : "",
        bookingUrl: a?.bookingUrl != null ? String(a.bookingUrl) : undefined,
        ticketUrl: a?.ticketUrl != null ? String(a.ticketUrl) : undefined,
      }))
    : []
  return recalculateDayTotal({
    ...day,
    title: String(day.title ?? "").trim(),
    tips: day.tips != null ? String(day.tips) : undefined,
    activities,
  })
}

export function validateSegmentDays(
  segmentDays: any[],
  startDay: number,
  endDay: number
): string | null {
  const expected = endDay - startDay + 1
  if (!Array.isArray(segmentDays) || segmentDays.length !== expected) {
    return `Ожидалось ${expected} дней в сегменте, получено ${segmentDays?.length ?? 0}`
  }
  for (let i = 0; i < segmentDays.length; i++) {
    const dNum = startDay + i
    const err = validateDay(segmentDays[i], dNum)
    if (err) return err
  }
  return null
}

export function mergeSegmentIntoItinerary(
  fullItinerary: any[],
  segmentDays: any[],
  startDay: number,
  endDay: number
): any[] {
  const err = validateSegmentDays(segmentDays, startDay, endDay)
  if (err) throw new Error(err)

  const out = [...fullItinerary]
  const byIndex = new Map<number, number>()
  out.forEach((d, idx) => {
    if (typeof d?.day === "number") byIndex.set(d.day, idx)
  })

  for (let i = 0; i < segmentDays.length; i++) {
    const dayNum = startDay + i
    const normalized = normalizeDay(segmentDays[i])
    const idx = byIndex.get(dayNum)
    if (idx === undefined) {
      throw new Error(`День ${dayNum} не найден в маршруте`)
    }
    out[idx] = { ...normalized, day: dayNum }
  }
  return out
}
