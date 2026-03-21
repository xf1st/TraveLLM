import { supabase } from "@/lib/supabase"
import { normalizeTravelMode } from "@/lib/travel-mode"

type RouterLike = { push: (href: string) => void }

/**
 * Persist streamed route to Supabase or localStorage fallback; then navigate.
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
  const { data: { user } } = await supabase.auth.getUser()
  const travelMode = normalizeTravelMode(requestPayload.travelMode)
  const departureCity =
    typeof requestPayload.departureCity === "string" ? requestPayload.departureCity.trim() || null : null

  if (user) {
    const tripRecord = {
      user_id: user.id,
      title: (routeData.title as string) || opts.defaultTripTitle,
      destination: (routeData.countries as { name?: string }[])?.[0]?.name || (requestPayload.customDestination as string) || opts.defaultDestination,
      description: (routeData.description as string) || "",
      itinerary: routeData.itinerary || [],
      total_cost: routeData.totalBudget || "",
      tags: routeData.tags || [],
      cover_image: routeData.coverImage || "",
      countries: routeData.countries || [],
      budget_analysis: routeData.budgetAnalysis || null,
      visa_advice: routeData.visaAdvice || "",
      payment_advice: routeData.paymentAdvice || "",
      safety_info: routeData.safetyInfo || null,
      restrictions: routeData.restrictions || null,
      viral_spots: routeData.viralSpots || [],
      flights: routeData.flights || [],
      hotels: routeData.hotels || [],
      token_usage: routeData.tokenUsage || null,
      travelers: requestPayload.travelers,
      start_date: requestPayload.startDate || null,
      end_date: requestPayload.endDate || null,
      departure_city: departureCity,
      travel_mode: travelMode,
    }
    const { data: insertedTrip, error } = await supabase.from("trips").insert(tripRecord).select().single()
    if (!error && insertedTrip && opts.autoFavorites) {
      await supabase.from("favorites").insert({ user_id: user.id, trip_id: insertedTrip.id })
    }
    if (error) {
      console.error("Failed to save trip:", JSON.stringify(error, null, 2))
      const localId = `local-${Date.now()}`
      localStorage.setItem(`trip-${localId}`, JSON.stringify(routeData))
      opts.router.push(`/trip/${localId}`)
      return
    }
    if (insertedTrip) opts.router.push(`/trip/${insertedTrip.id}`)
  } else {
    const localId = `${Date.now()}`
    const storedRoute = {
      ...routeData,
      travelMode,
      departureCity: departureCity ?? undefined,
    }
    localStorage.setItem(`trip-local-${localId}`, JSON.stringify(storedRoute))
    localStorage.setItem("lastGeneratedRoute", JSON.stringify(routeData))
    opts.router.push(`/trip/local-${localId}`)
  }
}
