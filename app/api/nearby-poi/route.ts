import { NextResponse } from "next/server"
import { getRequestUserId } from "@/lib/ai-usage-events"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"

type NearbyTheme = "food" | "culture" | "nature" | "fun" | "shopping"

type NearbyPoiRequest = {
  lat: number
  lng: number
  theme?: NearbyTheme
  radiusKm?: number
  limit?: number
  activeDay?: number
  profile?: {
    pace?: string
    interests?: string[]
    accommodation?: string
  }
  tripContext?: {
    destination?: string
    title?: string
    dayTitle?: string
  }
}

type OverpassElement = {
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

const THEME_COLOR: Record<NearbyTheme, string> = {
  food: "#fb923c",
  culture: "#60a5fa",
  nature: "#34d399",
  fun: "#ec4899",
  shopping: "#a78bfa",
}

const THEME_LABEL: Record<NearbyTheme, string> = {
  food: "Еда",
  culture: "Культура",
  nature: "Природа",
  fun: "Развлечения",
  shopping: "Шопинг",
}

const THEME_FILTERS: Record<NearbyTheme, string[]> = {
  food: [
    `nwr(around:__RADIUS__,__LAT__,__LNG__)["amenity"~"restaurant|cafe|fast_food|food_court|bar|pub|ice_cream"];`,
  ],
  culture: [
    `nwr(around:__RADIUS__,__LAT__,__LNG__)["tourism"~"museum|gallery|attraction|viewpoint"];`,
    `nwr(around:__RADIUS__,__LAT__,__LNG__)["historic"];`,
  ],
  nature: [
    `nwr(around:__RADIUS__,__LAT__,__LNG__)["leisure"~"park|garden|nature_reserve"];`,
    `nwr(around:__RADIUS__,__LAT__,__LNG__)["natural"~"beach|water|peak|wood|spring"];`,
  ],
  fun: [
    `nwr(around:__RADIUS__,__LAT__,__LNG__)["amenity"~"cinema|nightclub|arts_centre"];`,
    `nwr(around:__RADIUS__,__LAT__,__LNG__)["tourism"~"theme_park|zoo|aquarium"];`,
    `nwr(around:__RADIUS__,__LAT__,__LNG__)["leisure"~"amusement_arcade|sports_centre|water_park"];`,
  ],
  shopping: [
    `nwr(around:__RADIUS__,__LAT__,__LNG__)["shop"~"mall|department_store|gift|souvenir|clothes|shoes|jewelry|cosmetics|book|sports|outdoor|bakery|supermarket|convenience"];`,
    `nwr(around:__RADIUS__,__LAT__,__LNG__)["amenity"~"marketplace"];`,
  ],
}

const OVERPASS_URLS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]

const toRad = (d: number) => (d * Math.PI) / 180

const distanceKm = (fromLat: number, fromLng: number, toLat: number, toLng: number) => {
  const earthRadiusKm = 6371
  const dLat = toRad(toLat - fromLat)
  const dLng = toRad(toLng - fromLng)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadiusKm * c
}

const pickCoord = (el: OverpassElement) => {
  if (Number.isFinite(el.lat) && Number.isFinite(el.lon)) {
    return { lat: Number(el.lat), lng: Number(el.lon) }
  }
  if (Number.isFinite(el.center?.lat) && Number.isFinite(el.center?.lon)) {
    return { lat: Number(el.center?.lat), lng: Number(el.center?.lon) }
  }
  return null
}

const inferType = (tags: Record<string, string>, theme: NearbyTheme) => {
  const value = tags.amenity || tags.tourism || tags.leisure || tags.shop || tags.historic || tags.natural || "poi"
  if (theme === "food" && value === "fast_food") return "Фастфуд"
  if (theme === "culture" && value === "museum") return "Музей"
  if (theme === "nature" && value === "park") return "Парк"
  if (theme === "shopping" && value === "marketplace") return "Рынок"
  return value.replace(/_/g, " ")
}

const scorePoi = (
  item: { title: string; typeLabel: string; dist: number },
  profile: NonNullable<NearbyPoiRequest["profile"]>,
  tripContext: NonNullable<NearbyPoiRequest["tripContext"]>,
) => {
  let score = 0

  // Closer points are preferred
  score += Math.max(0, 2.5 - item.dist)

  // Named points are usually higher quality
  if (item.title && item.title !== "Точка рядом") score += 0.6

  const haystack = `${item.title} ${item.typeLabel}`.toLowerCase()
  const interests = Array.isArray(profile.interests) ? profile.interests : []
  interests.forEach((interest) => {
    const keyword = String(interest || "").toLowerCase()
    if (keyword && haystack.includes(keyword)) score += 0.5
  })

  const routeHint = `${tripContext.destination || ""} ${tripContext.dayTitle || ""}`.toLowerCase()
  if (routeHint && haystack.split(" ").some((token) => token.length > 3 && routeHint.includes(token))) score += 0.3

  return score
}

const buildDescription = (
  title: string,
  typeLabel: string,
  dist: number,
  theme: NearbyTheme,
  profile: NonNullable<NearbyPoiRequest["profile"]>,
  tripContext: NonNullable<NearbyPoiRequest["tripContext"]>,
) => {
  const profileInterests = Array.isArray(profile.interests) && profile.interests.length > 0 ? profile.interests.slice(0, 2).join(", ") : "ваши интересы"
  const dayHint = tripContext.dayTitle ? `Хорошо сочетается с планом дня: ${tripContext.dayTitle}.` : "Точка рядом с вашим текущим маршрутом."
  const paceHint =
    profile.pace === "fast"
      ? "Подойдет для активного темпа."
      : profile.pace === "slow"
        ? "Можно посетить в спокойном ритме."
        : "Подходит под сбалансированный темп."

  return `${typeLabel}: ${title}. Примерно ${dist.toFixed(1)} км от вас. Категория: ${THEME_LABEL[theme]}. Подбор под ${profileInterests}. ${dayHint} ${paceHint}`
}

const buildOverpassQuery = (theme: NearbyTheme, lat: number, lng: number, radiusMeters: number) => {
  const body = THEME_FILTERS[theme]
    .map((q) => q.replace("__RADIUS__", String(radiusMeters)).replace("__LAT__", String(lat)).replace("__LNG__", String(lng)))
    .join("\n")

  return `
[out:json][timeout:25];
(
  ${body}
);
out center tags 120;
`
}

const fetchOverpass = async (query: string) => {
  let lastError: unknown = null
  for (const endpoint of OVERPASS_URLS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
        body: `data=${encodeURIComponent(query)}`,
      })
      if (!response.ok) {
        lastError = new Error(`Overpass ${endpoint} returned ${response.status}`)
        continue
      }
      const json = await response.json()
      return json
    } catch (error) {
      lastError = error
    }
  }
  throw lastError || new Error("Overpass request failed")
}

export async function POST(req: Request) {
  try {
    const userId = await getRequestUserId()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate limit: 20 req/min per user — each call hits Overpass API
    const rl = checkRateLimit(userId, "nearby-poi", 20)
    if (!rl.allowed) return rateLimitResponse(rl)

    const body = (await req.json()) as NearbyPoiRequest
    const lat = Number(body?.lat)
    const lng = Number(body?.lng)
    const theme: NearbyTheme = body?.theme || "food"
    const limit = Math.max(2, Math.min(4, Number(body?.limit || 4)))
    const radiusKm = Math.max(0.4, Math.min(8, Number(body?.radiusKm || 3)))
    const radiusMeters = Math.round(radiusKm * 1000)
    const activeDay = Number(body?.activeDay || 1)

    if (!Number.isFinite(lat) || !Number.isFinite(lng) ||
        lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 })
    }

    const profile = {
      pace: body?.profile?.pace || "moderate",
      interests: Array.isArray(body?.profile?.interests) ? body.profile?.interests : [],
      accommodation: body?.profile?.accommodation || "hotel",
    }
    const tripContext = {
      destination: body?.tripContext?.destination || "",
      title: body?.tripContext?.title || "",
      dayTitle: body?.tripContext?.dayTitle || "",
    }

    const query = buildOverpassQuery(theme, lat, lng, radiusMeters)
    const data = await fetchOverpass(query)
    const elements = Array.isArray(data?.elements) ? (data.elements as OverpassElement[]) : []

    const seen = new Set<string>()
    const scored = elements
      .map((el) => {
        const coord = pickCoord(el)
        if (!coord) return null

        const tags = el.tags || {}
        const title = tags.name || tags["name:ru"] || tags["int_name"] || "Точка рядом"
        const typeLabel = inferType(tags, theme)
        const dist = distanceKm(lat, lng, coord.lat, coord.lng)
        const dedupKey = `${title.toLowerCase()}|${coord.lat.toFixed(4)}|${coord.lng.toFixed(4)}`
        if (seen.has(dedupKey)) return null
        seen.add(dedupKey)

        const score = scorePoi({ title, typeLabel, dist }, profile, tripContext)
        return {
          lat: Number(coord.lat.toFixed(6)),
          lng: Number(coord.lng.toFixed(6)),
          title,
          label: THEME_LABEL[theme],
          type: theme,
          distanceKm: Number(dist.toFixed(1)),
          color: THEME_COLOR[theme],
          day: activeDay,
          time: "Сейчас рядом",
          transportHint: profile.accommodation === "hostel" ? "Пешком/транспорт" : "Пешком или такси",
          desc: buildDescription(title, typeLabel, dist, theme, profile, tripContext),
          score,
        }
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.score - a.score)

    const places = scored.slice(0, limit).map(({ score: _score, ...rest }: any) => rest)

    return NextResponse.json(
      { places, source: "overpass", count: places.length },
      {
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=180",
        },
      },
    )
  } catch (error: any) {
    console.error("Nearby POI API error:", error)
    return NextResponse.json({ error: "Failed to fetch nearby POI", places: [] }, { status: 500 })
  }
}
