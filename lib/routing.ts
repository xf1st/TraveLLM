export type RoutingProfile = "foot" | "car"

export interface RouteGeometry {
  type: "LineString"
  coordinates: [number, number][]
}

export interface RouteResult {
  geometry: RouteGeometry
  distanceKm: number
  durationMin: number
  profile: RoutingProfile
}

export async function fetchRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  profile: RoutingProfile = "foot",
): Promise<RouteResult> {
  const osrmProfile = profile === "car" ? "driving" : "foot"
  const url =
    `https://router.project-osrm.org/route/v1/${osrmProfile}/` +
    `${fromLng},${fromLat};${toLng},${toLat}` +
    "?overview=full&geometries=geojson&steps=false"

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`OSRM request failed: ${response.status}`)
  }

  const data = await response.json()
  const firstRoute = data?.routes?.[0]
  const geometry = firstRoute?.geometry

  if (!geometry || geometry.type !== "LineString" || !Array.isArray(geometry.coordinates)) {
    throw new Error("OSRM returned no route geometry")
  }

  const distanceMeters = Number(firstRoute?.distance) || 0
  const durationSeconds = Number(firstRoute?.duration) || 0

  return {
    geometry: geometry as RouteGeometry,
    distanceKm: distanceMeters / 1000,
    durationMin: durationSeconds / 60,
    profile,
  }
}
