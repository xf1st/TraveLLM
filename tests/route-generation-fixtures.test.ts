import test from "node:test"
import assert from "node:assert/strict"

import {
  getRouteGenerationEndpoint,
  normalizeRouteGenerationProvider,
} from "../lib/route-generation-provider.ts"
import {
  computeValidationBudgetFloor,
  resolveChunkDestination,
  shouldUseAirValidation,
} from "../lib/route-generation-utils.ts"

type BudgetFixture = {
  name: string
  travelMode: "flight" | "train" | "car"
  durationDays: number
  minDailyBudget: number
  flightMinBudget: number
  expectedBudgetFloor: number
  expectedAirValidation: boolean
}

type ChunkFixture = {
  name: string
  tripPlan: Array<{ startDay: number; endDay: number; city: string }>
  chunkStart: number
  chunkEnd: number
  fallbackDestination: string
  expectedDestination: string
}

const budgetFixtures: BudgetFixture[] = [
  {
    name: "single-city-flight",
    travelMode: "flight",
    durationDays: 5,
    minDailyBudget: 12000,
    flightMinBudget: 35000,
    expectedBudgetFloor: 95000,
    expectedAirValidation: true,
  },
  {
    name: "rail-europe",
    travelMode: "train",
    durationDays: 7,
    minDailyBudget: 14000,
    flightMinBudget: 50000,
    expectedBudgetFloor: 98000,
    expectedAirValidation: false,
  },
  {
    name: "roadtrip-abkhazia",
    travelMode: "car",
    durationDays: 6,
    minDailyBudget: 9000,
    flightMinBudget: 25000,
    expectedBudgetFloor: 54000,
    expectedAirValidation: false,
  },
]

const chunkFixtures: ChunkFixture[] = [
  {
    name: "japan-16-days-chunk-1",
    tripPlan: [
      { startDay: 1, endDay: 4, city: "Tokyo" },
      { startDay: 5, endDay: 9, city: "Kyoto" },
      { startDay: 10, endDay: 16, city: "Osaka" },
    ],
    chunkStart: 1,
    chunkEnd: 7,
    fallbackDestination: "Japan",
    expectedDestination: "Tokyo",
  },
  {
    name: "japan-16-days-chunk-2",
    tripPlan: [
      { startDay: 1, endDay: 4, city: "Tokyo" },
      { startDay: 5, endDay: 9, city: "Kyoto" },
      { startDay: 10, endDay: 16, city: "Osaka" },
    ],
    chunkStart: 8,
    chunkEnd: 14,
    fallbackDestination: "Japan",
    expectedDestination: "Osaka",
  },
  {
    name: "fallback-when-plan-missing",
    tripPlan: [],
    chunkStart: 1,
    chunkEnd: 7,
    fallbackDestination: "Paris",
    expectedDestination: "Paris",
  },
]

for (const fixture of budgetFixtures) {
  test(`budget fixture: ${fixture.name}`, () => {
    assert.equal(
      shouldUseAirValidation(fixture.travelMode),
      fixture.expectedAirValidation
    )

    assert.equal(
      computeValidationBudgetFloor({
        durationDays: fixture.durationDays,
        minDailyBudget: fixture.minDailyBudget,
        flightMinBudget: fixture.flightMinBudget,
        travelMode: fixture.travelMode,
      }),
      fixture.expectedBudgetFloor
    )
  })
}

for (const fixture of chunkFixtures) {
  test(`chunk fixture: ${fixture.name}`, () => {
    assert.equal(
      resolveChunkDestination(
        fixture.tripPlan,
        fixture.chunkStart,
        fixture.chunkEnd,
        fixture.fallbackDestination
      ),
      fixture.expectedDestination
    )
  })
}

test("provider resolver defaults to gemini for unknown values", () => {
  assert.equal(normalizeRouteGenerationProvider("something-else"), "gemini")
  assert.equal(getRouteGenerationEndpoint("gemini"), "/api/gemini")
  assert.equal(getRouteGenerationEndpoint("deepseek"), "/api/deepseek")
})
