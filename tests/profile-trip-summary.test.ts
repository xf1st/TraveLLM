import test from "node:test"
import assert from "node:assert/strict"
import { summarizeProfileTrips } from "../lib/profile-trip-summary.ts"

test("profile statistics keep completed-trip locations without downloading activity details", () => {
  const trips = [{
    id: "trip", status: "COMPLETED", countries: ["Japan"],
    itinerary: [{
      endCity: "Kyoto", logistics: { to: "Osaka", advice: "Long transport advice" },
      activities: [{ city: "Tokyo", country: "Japan", location: "Kyoto, Japan", description: "Long activity description", cost: 100 }],
    }],
  }]
  const [summary] = summarizeProfileTrips(trips)
  assert.equal(summary.id, "trip")
  assert.deepEqual(summary.countries, ["Japan"])
  assert.deepEqual(summary.itinerary, [{
    endCity: "Kyoto", logistics: { to: "Osaka" },
    activities: [{ city: "Tokyo", country: "Japan", location: "Kyoto, Japan" }],
  }])
  assert.equal(trips[0].itinerary[0].activities[0].description, "Long activity description")
})

test("planned trips retain their identity but do not need itineraries for visited statistics", () => {
  const summary = summarizeProfileTrips([{ id: "planned", status: "planned", itinerary: [{ endCity: "Paris" }] }])
  assert.equal(summary.length, 1)
  assert.equal(summary[0].id, "planned")
  assert.deepEqual(summary[0].itinerary, [])
})

test("profile summaries tolerate missing itineraries and incomplete days", () => {
  assert.deepEqual(summarizeProfileTrips([{ status: "completed", itinerary: null }])[0].itinerary, [])
  const [summary] = summarizeProfileTrips([{ status: "completed", itinerary: [null, { activities: [null] }] }])
  assert.equal(summary.itinerary.length, 2)
  assert.deepEqual(summary.itinerary[0].activities, [])
})
