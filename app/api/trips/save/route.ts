import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getRequestUserId } from "@/lib/ai-usage-events"
import { enforceFullSiteAccess } from "@/lib/server/user-access"
import { fetchWithTimeout } from "@/lib/fetch-with-timeout"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { normalizeTravelMode } from "@/lib/travel-mode"

const MAX_TRIPS_PER_USER = 1000

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { global: { fetch: (input, init) => fetchWithTimeout(input, init, 10000) } })
}

export async function POST(req: Request) {
  try {
    const userId = await getRequestUserId()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const accessErr = await enforceFullSiteAccess(userId)
    if (accessErr) return accessErr

    // Rate limit: max 10 saves per minute (generous for legit use, blocks bots)
    const rl = await checkRateLimit(userId, "trips-save", 10)
    if (!rl.allowed) return rateLimitResponse(rl)

    // Saving does not call AI. The generation endpoints enforce/record the quota;
    // checking it again here prevented the last allowed generation from saving.

    const client = getServiceClient()
    if (!client) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    // Hard cap check before insert (belt-and-suspenders alongside DB trigger)
    const { count, error: countError } = await client
      .from("trips")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)

    if (countError) return NextResponse.json({ error: "Trip storage unavailable" }, { status: 503 })

    if ((count ?? 0) >= MAX_TRIPS_PER_USER) {
      return NextResponse.json(
        { error: "Достигнут лимит маршрутов. Удалите старые маршруты чтобы создать новые." },
        { status: 429 },
      )
    }

    const body = await req.json()
    const { routeData, requestPayload, autoFavorites } = body

    if (!routeData || !requestPayload) {
      return NextResponse.json({ error: "Missing routeData or requestPayload" }, { status: 400 })
    }

    const travelMode = normalizeTravelMode(requestPayload.travelMode)
    const departureCity =
      typeof requestPayload.departureCity === "string"
        ? requestPayload.departureCity.trim() || null
        : null

    const tripRecord = {
      user_id: userId,
      title: (routeData.title as string) || "Маршрут",
      destination: (() => {
        const names = (routeData.countries as { name?: string }[] | undefined)
          ?.map(c => c.name).filter(Boolean) as string[] | undefined
        if (names && names.length > 1) return names.join(", ")
        return names?.[0] || (requestPayload.customDestination as string) || "Неизвестно"
      })(),
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
      status: "active",
    }

    const { data: insertedTrip, error } = await client
      .from("trips")
      .insert(tripRecord)
      .select()
      .single()

    if (error) {
      console.error("[trips/save] Insert error:", error.message)
      return NextResponse.json({ error: "Failed to save trip" }, { status: 500 })
    }

    if (autoFavorites && insertedTrip) {
      const { error: favoriteError } = await client
        .from("favorites")
        .insert({ user_id: userId, trip_id: insertedTrip.id })
      if (favoriteError) console.warn("[trips/save] Favorite could not be added", favoriteError.code)
    }

    return NextResponse.json({ trip: insertedTrip })
  } catch (err) {
    console.error("[trips/save] Unexpected error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
