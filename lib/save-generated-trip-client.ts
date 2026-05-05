import { normalizeTravelMode } from "@/lib/travel-mode"

type RouterLike = { push: (href: string) => void }

/**
 * Persist streamed route via server API (rate-limited, generation-limit-checked),
 * with localStorage fallback for unauthenticated users.
 */
export async function saveGeneratedTripAndNavigate(
  routeData: Record<string, unknown>,
  requestPayload: Record<string, unknown>,
  opts: {
    autoFavorites: boolean
    defaultTripTitle: string
    defaultDestination: string
    router: RouterLike
  }
): Promise<void> {
  const sessionRes = await fetch("/api/auth/session", { credentials: "same-origin" })
  const sessionData = await sessionRes.json().catch(() => ({}))
  const user = sessionRes.ok ? sessionData.user : null

  if (user) {
    const res = await fetch("/api/trips/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routeData,
        requestPayload,
        autoFavorites: opts.autoFavorites,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error("[saveGeneratedTrip] Server error:", err)

      // Fallback to localStorage so the user doesn't lose their route
      const localId = `local-${Date.now()}`
      localStorage.setItem(`trip-${localId}`, JSON.stringify(routeData))
      opts.router.push(`/trip/${localId}`)
      return
    }

    const { trip } = await res.json()
    if (trip) opts.router.push(`/trip/${trip.id}`)
  } else {
    const travelMode = normalizeTravelMode(requestPayload.travelMode)
    const departureCity =
      typeof requestPayload.departureCity === "string"
        ? requestPayload.departureCity.trim() || undefined
        : undefined

    const localId = `${Date.now()}`
    localStorage.setItem(
      `trip-local-${localId}`,
      JSON.stringify({ ...routeData, travelMode, departureCity })
    )
    localStorage.setItem("lastGeneratedRoute", JSON.stringify(routeData))
    opts.router.push(`/trip/local-${localId}`)
  }
}
