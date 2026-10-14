/** Keep the location data used by profile statistics, without activity details. */
type ProfileLocationDay = {
  endCity?: unknown
  logistics: { to?: unknown }
  activities: Array<{ city?: unknown; country?: unknown; location?: unknown }>
}

export function summarizeProfileTrips<T extends { status?: unknown; itinerary?: unknown }>(trips: T[]): Array<Omit<T, "itinerary"> & { itinerary: ProfileLocationDay[] }> {
  return trips.map((trip) => ({
    ...trip,
    itinerary: String(trip.status || "").toLowerCase() === "completed" && Array.isArray(trip.itinerary)
      ? trip.itinerary.map((day) => ({
          endCity: day?.endCity,
          logistics: { to: day?.logistics?.to },
          activities: Array.isArray(day?.activities)
            ? day.activities.map((activity: { city?: unknown; country?: unknown; location?: unknown } | null) => ({
                city: activity?.city, country: activity?.country, location: activity?.location,
              }))
            : [],
        }))
      : [],
  }))
}
