import { NextResponse } from "next/server"
import { ProxyAgent } from "undici"
import { getRequestUserId } from "@/lib/ai-usage-events"
import { enforceFullSiteAccess } from "@/lib/server/user-access"

// Proxy configuration
const PROXY_URL = process.env.HTTP_PROXY || process.env.http_proxy || ""
let proxyDispatcher: ProxyAgent | undefined
if (typeof window === "undefined" && PROXY_URL) {
  try {
    proxyDispatcher = new ProxyAgent(PROXY_URL)
  } catch {
    /* ignore */
  }
}

type Bbox = {
  south: number
  west: number
  north: number
  east: number
}

type SocialLayerRequest = {
  bbox: Bbox
  zoom: number
}

type OverpassElement = {
  type: "node" | "way" | "relation"
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
  geometry?: Array<{ lat: number; lon: number }>
}

const OVERPASS_URLS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const normalizeLng = (lng: number) => {
  let n = lng
  while (n < -180) n += 360
  while (n > 180) n -= 360
  return n
}

const sanitizeBbox = (bbox: Bbox, zoom: number): Bbox => {
  const southRaw = Number(bbox.south)
  const westRaw = Number(bbox.west)
  const northRaw = Number(bbox.north)
  const eastRaw = Number(bbox.east)

  const south = clamp(Math.min(southRaw, northRaw), -85, 85)
  const north = clamp(Math.max(southRaw, northRaw), -85, 85)
  const west = normalizeLng(westRaw)
  const east = normalizeLng(eastRaw)

  const latSpan = north - south
  const lonSpan = (() => {
    const span = east >= west ? east - west : 360 - (west - east)
    return span <= 0 ? 360 : span
  })()

  const maxLatSpan = zoom >= 12 ? 0.45 : zoom >= 9 ? 1.4 : zoom >= 7 ? 3.6 : 8.5
  const maxLonSpan = zoom >= 12 ? 0.7 : zoom >= 9 ? 2.2 : zoom >= 7 ? 5.2 : 12

  const centerLat = (south + north) / 2
  const centerLng = east >= west ? (east + west) / 2 : normalizeLng((east + west + 360) / 2)

  const latHalf = Math.min(latSpan / 2 || maxLatSpan / 2, maxLatSpan / 2)
  const lonHalf = Math.min(lonSpan / 2 || maxLonSpan / 2, maxLonSpan / 2)

  return {
    south: clamp(centerLat - latHalf, -85, 85),
    north: clamp(centerLat + latHalf, -85, 85),
    west: normalizeLng(centerLng - lonHalf),
    east: normalizeLng(centerLng + lonHalf),
  }
}

const splitBbox = (bbox: Bbox): Bbox[] => {
  // Handle antimeridian crossing.
  if (bbox.east >= bbox.west) return [bbox]
  return [
    { south: bbox.south, west: bbox.west, north: bbox.north, east: 180 },
    { south: bbox.south, west: -180, north: bbox.north, east: bbox.east },
  ]
}

const buildQueryForPart = (bbox: Bbox, zoom: number) => {
  const roadsLimit = zoom >= 13 ? 520 : zoom >= 10 ? 360 : 220
  const poiLimit = zoom >= 13 ? 420 : zoom >= 10 ? 280 : 170
  const highwayFilter = zoom >= 12 ? "motorway|trunk|primary|secondary|tertiary|residential|unclassified|service|living_street" : "motorway|trunk|primary|secondary|tertiary"
  const s = bbox.south.toFixed(6)
  const w = bbox.west.toFixed(6)
  const n = bbox.north.toFixed(6)
  const e = bbox.east.toFixed(6)

  return `
[out:json][timeout:25];
(
  way["highway"~"${highwayFilter}"](${s},${w},${n},${e});
);
out geom ${roadsLimit};
(
  nwr["tourism"~"attraction|museum|gallery|viewpoint|zoo|theme_park|aquarium"](${s},${w},${n},${e});
  nwr["amenity"~"restaurant|cafe|bar|fast_food|pub"](${s},${w},${n},${e});
  nwr["shop"~"mall|department_store|supermarket|convenience|gift|souvenir|clothes|shoes|jewelry|cosmetics|bakery"](${s},${w},${n},${e});
  nwr["leisure"~"park|garden"](${s},${w},${n},${e});
);
out center tags ${poiLimit};
`
}

const fetchOverpass = async (query: string) => {
  let lastError: unknown = null
  for (const endpoint of OVERPASS_URLS) {
    try {
      const fetchOptions: RequestInit = {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
        body: `data=${encodeURIComponent(query)}`,
      };

      if (proxyDispatcher) {
        // @ts-ignore
        fetchOptions.dispatcher = proxyDispatcher;
      }

      const response = await fetch(endpoint, fetchOptions)
      const raw = await response.text()

      if (!response.ok) {
        lastError = new Error(`Overpass ${endpoint} returned ${response.status}: ${raw.slice(0, 180)}`)
        continue
      }

      const contentType = String(response.headers.get("content-type") || "").toLowerCase()
      const trimmed = raw.trim()

      // Overpass can occasionally return XML/HTML payloads (rate limits/proxy pages).
      // Treat them as invalid and try the next endpoint instead of throwing JSON parse errors.
      if (trimmed.startsWith("<") || (!contentType.includes("json") && !trimmed.startsWith("{") && !trimmed.startsWith("["))) {
        lastError = new Error(`Overpass ${endpoint} returned non-JSON payload: ${trimmed.slice(0, 180)}`)
        continue
      }

      try {
        return JSON.parse(trimmed)
      } catch {
        lastError = new Error(`Overpass ${endpoint} returned malformed JSON: ${trimmed.slice(0, 180)}`)
        continue
      }
    } catch (error) {
      lastError = error
    }
  }
  throw lastError || new Error("Overpass request failed")
}

const categorizePoi = (tags: Record<string, string>) => {
  const amenity = String(tags.amenity || "").toLowerCase()
  const tourism = String(tags.tourism || "").toLowerCase()
  const leisure = String(tags.leisure || "").toLowerCase()
  const shop = String(tags.shop || "").toLowerCase()

  if (["restaurant", "cafe", "bar", "fast_food", "pub"].includes(amenity)) return "food"
  if (tourism && ["attraction", "museum", "gallery", "viewpoint", "zoo", "theme_park", "aquarium"].includes(tourism)) return "culture"
  if (leisure && ["park", "garden"].includes(leisure)) return "nature"
  if (shop) return "shopping"
  return "fun"
}

const roadColor = (highway?: string) => {
  const h = String(highway || "").toLowerCase()
  if (["motorway", "trunk"].includes(h)) return "#f59e0b"
  if (["primary", "secondary"].includes(h)) return "#facc15"
  return "#94a3b8"
}

const parseElementsToFeatures = (elements: OverpassElement[], zoom: number) => {
  const features: any[] = []
  const dedupPoi = new Set<string>()
  const poiMax = zoom >= 13 ? 180 : zoom >= 10 ? 110 : 70
  let poiCount = 0

  for (const el of elements) {
    if (el.type === "way" && Array.isArray(el.geometry) && el.geometry.length > 1 && el.tags?.highway) {
      const coordinates = el.geometry
        .filter((g) => Number.isFinite(g.lat) && Number.isFinite(g.lon))
        .map((g) => [Number(g.lon), Number(g.lat)])
      if (coordinates.length < 2) continue

      features.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates },
        properties: {
          kind: "road",
          category: "road",
          title: el.tags.name || "",
          highway: el.tags.highway,
          color: roadColor(el.tags.highway),
        },
      })
      continue
    }

    if (poiCount >= poiMax) continue

    const tags = el.tags || {}
    const hasPoiTag = !!(tags.amenity || tags.tourism || tags.shop || tags.leisure)
    if (!hasPoiTag) continue

    const lat = Number.isFinite(el.lat) ? Number(el.lat) : Number.isFinite(el.center?.lat) ? Number(el.center?.lat) : NaN
    const lng = Number.isFinite(el.lon) ? Number(el.lon) : Number.isFinite(el.center?.lon) ? Number(el.center?.lon) : NaN
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue

    const category = categorizePoi(tags)
    const title = tags.name || tags["name:ru"] || tags.int_name || (category === "food" ? "Ресторан/кафе" : "Точка интереса")
    const subtitle = tags.amenity || tags.tourism || tags.shop || tags.leisure || "poi"
    const dedupKey = `${title.toLowerCase()}|${lat.toFixed(4)}|${lng.toFixed(4)}`
    if (dedupPoi.has(dedupKey)) continue
    dedupPoi.add(dedupKey)
    poiCount += 1

    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: {
        kind: "poi",
        source: "social",
        category,
        title,
        description: `${subtitle.replace(/_/g, " ")} рядом`,
        time: "Сейчас рядом",
      },
    })
  }

  return features
}

export async function POST(req: Request) {
  try {
    const userId = await getRequestUserId()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized", features: [] }, { status: 401 })
    }

    const accessErr = await enforceFullSiteAccess(userId)
    if (accessErr) return accessErr

    const body = (await req.json()) as SocialLayerRequest
    const zoom = Number(body?.zoom)
    const rawBbox = body?.bbox
    if (!rawBbox || !Number.isFinite(zoom)) {
      return NextResponse.json({ error: "Invalid request payload", features: [] }, { status: 400 })
    }

    if (zoom < 6) {
      return NextResponse.json({ features: [] })
    }

    const safe = sanitizeBbox(rawBbox, zoom)
    const parts = splitBbox(safe)
    const allElements: OverpassElement[] = []

    for (const part of parts) {
      const query = buildQueryForPart(part, zoom)
      try {
        const data = await fetchOverpass(query)
        if (Array.isArray(data?.elements)) {
          allElements.push(...(data.elements as OverpassElement[]))
        }
      } catch (partError) {
        console.warn("Social layer part failed:", partError)
      }
    }

    const features = parseElementsToFeatures(allElements, zoom)
    return NextResponse.json(
      { features, count: features.length },
      {
        headers: {
          "Cache-Control": "public, max-age=50, s-maxage=90",
        },
      },
    )
  } catch (error: any) {
    console.error("Social layer API error:", error)
    return NextResponse.json({ error: error?.message || "Failed to load social layer", features: [] }, { status: 500 })
  }
}
