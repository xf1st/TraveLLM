import { normalizeTravelMode } from "./travel-mode.ts"
import { fetchWithTimeout } from "./fetch-with-timeout.ts"

type RouterLike = { push: (href: string) => void }

/** A generated itinerary survives failed/slow persistence without another AI call. */
export async function saveGeneratedTripAndNavigate(
  routeData: Record<string, unknown>,
  requestPayload: Record<string, unknown>,
  opts: {
    autoFavorites: boolean
    defaultTripTitle: string
    defaultDestination: string
    router: RouterLike
    signal?: AbortSignal
    onLocalFallback?: () => void
  },
): Promise<void> {
  opts.signal?.throwIfAborted()
  const preparedRoute = {
    ...routeData,
    title: routeData.title || opts.defaultTripTitle,
    destination: routeData.destination || requestPayload.customDestination || opts.defaultDestination,
    travelMode: normalizeTravelMode(requestPayload.travelMode),
    departureCity: typeof requestPayload.departureCity === "string" ? requestPayload.departureCity.trim() : undefined,
  }
  let guest = false
  try {
    const response = await fetchWithTimeout("/api/trips/save", {
      method: "POST", credentials: "same-origin", signal: opts.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ routeData: preparedRoute, requestPayload, autoFavorites: opts.autoFavorites }),
    }, 20000)
    guest = response.status === 401
    if (!response.ok) throw new Error(`Trip save failed (${response.status})`)
    const { trip } = await response.json()
    if (typeof trip?.id !== "string" || !trip.id) throw new Error("Missing saved trip ID")
    opts.signal?.throwIfAborted()
    opts.router.push(`/trip/${trip.id}`)
    return
  } catch (error) {
    if (opts.signal?.aborted) throw opts.signal.reason
    if (!guest) console.warn("[saveGeneratedTrip] Saving locally after a persistence failure")
  }
  opts.signal?.throwIfAborted()
  const localId = `local-${crypto.randomUUID()}`
  localStorage.setItem(`trip-${localId}`, JSON.stringify({ ...preparedRoute, id: localId, created_at: new Date().toISOString() }))
  if (!guest) opts.onLocalFallback?.()
  opts.router.push(`/trip/${localId}`)
}
