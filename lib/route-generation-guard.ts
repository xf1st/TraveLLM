/**
 * Server-side guards for /api/gemini and /api/deepseek — trip generation only.
 * Limits abuse: prompt injection via form fields, extreme trip length (token/cost), oversized payloads.
 */
import { TRAVEL_STYLES } from "@/lib/travel-styles"

export const MAX_ROUTE_TRIP_DAYS = 30
export const MAX_ROUTE_DESTINATIONS = 12

/** Remove characters useful for JSON/prompt breaking; collapse lines; cap length */
export function sanitizeRouteUserText(s: string, max: number): string {
  return s
    .replace(/[<>{}[\]\\]/g, "")
    .replace(/(\r\n|\n|\r)/gm, " ")
    .replace(/"/g, "'")
    .trim()
    .slice(0, max)
}

const PLAN_INTEREST_IDS = new Set([
  "culture",
  "nature",
  "food",
  "relax",
  "adventure",
  "shopping",
  "photo",
  "luxury",
  "events",
  "nightlife",
])

const ALLOWED_TRAVEL_STYLE_IDS = new Set([...Object.keys(TRAVEL_STYLES), ...PLAN_INTEREST_IDS])

export function toStringArray(val: unknown): string[] {
  if (!val) return []
  if (Array.isArray(val)) {
    return val.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
  }
  if (typeof val === "string") return val.split(",").map((s) => s.trim()).filter(Boolean)
  return []
}

/** Only known plan / legacy style ids — blocks arbitrary strings in the prompt */
export function normalizeTravelStyleIds(val: unknown): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of toStringArray(val)) {
    const s = raw.trim().toLowerCase().slice(0, 48)
    if (!ALLOWED_TRAVEL_STYLE_IDS.has(s) || seen.has(s)) continue
    seen.add(s)
    out.push(s)
    if (out.length >= 12) break
  }
  return out
}

export type SafeRoutePreferences = {
  citizenship?: string
  gender?: string
  age?: number
  pace?: string
  languages?: string[]
  dietaryRestrictions?: string[]
  dietaryCustom?: string
  interestsDetailed?: string[]
  interestsCustom?: string
  visitedCountries?: string[]
  departureCity?: string
  aiCreativity?: "creative" | "balanced"
}

function strArr(a: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(a)) return []
  return a
    .slice(0, maxItems)
    .map((x) => sanitizeRouteUserText(String(x), maxLen))
    .filter((x) => x.length > 0)
}

export function buildSafePreferences(prefs: unknown): SafeRoutePreferences {
  if (!prefs || typeof prefs !== "object" || Array.isArray(prefs)) return {}
  const p = prefs as Record<string, unknown>

  const paceRaw = p.pace != null ? String(p.pace).trim().toLowerCase() : ""
  const pace =
    paceRaw === "slow" || paceRaw === "moderate" || paceRaw === "fast"
      ? paceRaw
      : paceRaw
        ? sanitizeRouteUserText(paceRaw, 48)
        : undefined

  let age: number | undefined
  if (typeof p.age === "number" && Number.isFinite(p.age)) {
    const a = Math.round(p.age)
    if (a >= 1 && a <= 120) age = a
  }

  const ac =
    p.aiCreativity === "creative" || p.aiCreativity === "balanced" ? p.aiCreativity : undefined

  return {
    citizenship: p.citizenship != null ? sanitizeRouteUserText(String(p.citizenship), 80) : undefined,
    gender: p.gender != null ? sanitizeRouteUserText(String(p.gender), 40) : undefined,
    age,
    pace,
    languages: strArr(p.languages, 24, 40),
    dietaryRestrictions: strArr(p.dietaryRestrictions, 24, 100),
    dietaryCustom: p.dietaryCustom != null ? sanitizeRouteUserText(String(p.dietaryCustom), 220) : undefined,
    interestsDetailed: strArr(p.interestsDetailed, 32, 150),
    interestsCustom: p.interestsCustom != null ? sanitizeRouteUserText(String(p.interestsCustom), 320) : undefined,
    visitedCountries: strArr(p.visitedCountries, 48, 80),
    departureCity: p.departureCity != null ? sanitizeRouteUserText(String(p.departureCity), 120) : undefined,
    aiCreativity: ac,
  }
}

export function sanitizeDestinationList(
  customDestination: unknown,
  strictDestinations: unknown
): string[] {
  if (strictDestinations === false) return []
  if (customDestination == null || typeof customDestination !== "string") return []
  return customDestination
    .split(";")
    .map((s) => sanitizeRouteUserText(s.trim(), 200))
    .filter((s) => s.length > 0)
    .slice(0, MAX_ROUTE_DESTINATIONS)
}

export function computeDurationDays(startDate: unknown, endDate: unknown): number {
  if (typeof startDate !== "string" || typeof endDate !== "string") return 7
  const a = new Date(startDate).getTime()
  const b = new Date(endDate).getTime()
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 7
  const d = Math.ceil((b - a) / (1000 * 60 * 60 * 24)) + 1
  return Number.isFinite(d) ? d : 7
}

export function tripDurationError(
  durationDays: number,
  locale: "ru" | "en"
): { status: 400; body: object } | null {
  if (durationDays >= 1 && durationDays <= MAX_ROUTE_TRIP_DAYS) return null
  const message =
    locale === "en"
      ? `Trip length must be between 1 and ${MAX_ROUTE_TRIP_DAYS} days.`
      : `Длительность поездки должна быть от 1 до ${MAX_ROUTE_TRIP_DAYS} дней.`
  return {
    status: 400,
    body: { error: "invalid_duration", message },
  }
}
