import { buildImageQuery } from "@/lib/image-utils"

const SKIP_TYPES = new Set(["transport", "free"])

/**
 * Unique English-ish gallery queries from itinerary (imageQuery or derived from place/title).
 */
export function collectMemoryGalleryQueries(itinerary: unknown, max = 6): string[] {
  if (!Array.isArray(itinerary)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const day of itinerary) {
    const activities = (day as { activities?: unknown[] })?.activities
    if (!Array.isArray(activities)) continue
    for (const act of activities) {
      if (out.length >= max) return out
      const a = act as {
        type?: string
        imageQuery?: string
        placeName?: string
        title?: string
        desc?: string
      }
      const type = (a.type || "activity").toLowerCase()
      if (SKIP_TYPES.has(type)) continue
      const raw = (a.imageQuery && String(a.imageQuery).trim()) || ""
      const q = raw || buildImageQuery(a.placeName, a.title, a.desc?.slice(0, 120))
      if (!q || seen.has(q)) continue
      seen.add(q)
      out.push(q)
    }
  }
  return out
}

export function computeTripMemoryStats(route: {
  itinerary?: unknown[]
  countries?: unknown[]
}): { days: number; totalActivities: number; countriesCount: number } {
  if (!route?.itinerary || !Array.isArray(route.itinerary)) {
    return { days: 0, totalActivities: 0, countriesCount: 0 }
  }
  let total = 0
  for (const day of route.itinerary) {
    const activities = (day as { activities?: unknown[] })?.activities
    if (!Array.isArray(activities)) continue
    total += activities.length
  }
  const countries = route.countries
  const countriesCount = Array.isArray(countries) && countries.length > 0 ? countries.length : 1
  return {
    days: route.itinerary.length,
    totalActivities: total,
    countriesCount,
  }
}
