/**
 * Load a trip row for AI routes — only if owned by userId (service role).
 */

import type { SupabaseClient } from "@supabase/supabase-js"

export type TripForAiRow = {
  id: string
  title: string
  destination: string
  itinerary: unknown
  total_cost: string | null
  budget_range: string | null
  countries: unknown
  departure_city: string | null
  start_date: string | null
  end_date: string | null
  travel_mode: string | null
  description: string | null
}

/** Shape expected by trip-assistant / similar prompts */
export function tripRowToAssistantPayload(trip: TripForAiRow) {
  const itinerary = Array.isArray(trip.itinerary) ? trip.itinerary : []
  return {
    title: trip.title,
    destination: trip.destination,
    itinerary,
    totalBudget: trip.total_cost,
    total_cost: trip.total_cost,
    budget_range: trip.budget_range,
    countries: trip.countries,
    departure_city: trip.departure_city,
    start_date: trip.start_date,
    end_date: trip.end_date,
    travel_mode: trip.travel_mode,
    description: trip.description,
  }
}

export async function fetchTripOwnedByUser(
  admin: SupabaseClient,
  tripId: string,
  userId: string
): Promise<{ ok: true; trip: TripForAiRow } | { ok: false }> {
  const { data: trip, error } = await admin
    .from("trips")
    .select(
      "id, title, destination, itinerary, total_cost, budget_range, countries, departure_city, start_date, end_date, travel_mode, description"
    )
    .eq("id", tripId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error || !trip) return { ok: false }
  return { ok: true, trip: trip as TripForAiRow }
}
