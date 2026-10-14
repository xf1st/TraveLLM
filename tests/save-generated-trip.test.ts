import test from "node:test"
import assert from "node:assert/strict"
import { saveGeneratedTripAndNavigate } from "../lib/save-generated-trip-client.ts"

test("save goes directly to authenticated API and navigates to the saved ID", async (t) => {
  let location = ""
  t.mock.method(globalThis, "fetch", async (input: unknown) => {
    assert.equal(input, "/api/trips/save")
    return Response.json({ trip: { id: "saved-trip" } })
  })
  await saveGeneratedTripAndNavigate({ itinerary: [] }, {}, { autoFavorites: false, defaultTripTitle: "Trip", defaultDestination: "World", router: { push: href => { location = href } } })
  assert.equal(location, "/trip/saved-trip")
})

test("failed persistence retains transport mode and origin in local fallback", async (t) => {
  const entries = new Map<string, string>()
  const prior = Object.getOwnPropertyDescriptor(globalThis, "localStorage")
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { setItem: (key: string, value: string) => entries.set(key, value) } })
  t.mock.method(globalThis, "fetch", async () => { throw new TypeError("Network down") })
  let location = ""
  let warned = false
  try {
    await saveGeneratedTripAndNavigate({ itinerary: [{ day: 1 }] }, { travelMode: "car", departureCity: "Москва", customDestination: "Казань" }, {
      autoFavorites: false, defaultTripTitle: "Trip", defaultDestination: "World", router: { push: href => { location = href } }, onLocalFallback: () => { warned = true },
    })
    const stored = JSON.parse([...entries.values()][0])
    assert.equal(stored.travelMode, "car")
    assert.equal(stored.departureCity, "Москва")
    assert.equal(stored.destination, "Казань")
    assert.equal(location, `/trip/${stored.id}`)
    assert.equal(warned, true)
  } finally {
    if (prior) Object.defineProperty(globalThis, "localStorage", prior)
    else Reflect.deleteProperty(globalThis, "localStorage")
  }
})

test("user cancellation prevents saving or navigating", async (t) => {
  t.mock.method(globalThis, "fetch", () => { throw new Error("Must not fetch") })
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(saveGeneratedTripAndNavigate({}, {}, { signal: controller.signal, autoFavorites: false, defaultTripTitle: "", defaultDestination: "", router: { push: () => assert.fail("Must not navigate") } }), { name: "AbortError" })
})
