import test from "node:test"
import assert from "node:assert/strict"

import {
  combineRouteGenerationUsage,
  computeValidationBudgetFloor,
  getRouteGenerationProviderLabel,
  resolveChunkDestination,
  shouldUseAirValidation,
} from "../lib/route-generation-utils.ts"

test("resolveChunkDestination picks the best overlapping city from tripPlan", () => {
  const destination = resolveChunkDestination(
    [
      { startDay: 1, endDay: 3, city: "Tokyo" },
      { startDay: 4, endDay: 7, city: "Kyoto" },
      { startDay: 8, endDay: 10, city: "Osaka" },
    ],
    4,
    7,
    "Japan",
  )

  assert.equal(destination, "Kyoto")
})

test("resolveChunkDestination falls back when tripPlan is missing", () => {
  assert.equal(resolveChunkDestination(undefined, 1, 3, "Paris"), "Paris")
})

test("travel-mode air validation only runs for flights", () => {
  assert.equal(shouldUseAirValidation("flight"), true)
  assert.equal(shouldUseAirValidation("train"), false)
  assert.equal(shouldUseAirValidation("car"), false)
})

test("computeValidationBudgetFloor excludes flight spend for non-flight modes", () => {
  assert.equal(
    computeValidationBudgetFloor({
      durationDays: 5,
      flightMinBudget: 40000,
      minDailyBudget: 10000,
      travelMode: "flight",
    }),
    90000,
  )

  assert.equal(
    computeValidationBudgetFloor({
      durationDays: 5,
      flightMinBudget: 40000,
      minDailyBudget: 10000,
      travelMode: "train",
    }),
    50000,
  )
})

test("combineRouteGenerationUsage merges provider totals", () => {
  const merged = combineRouteGenerationUsage(
    {
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      promptCacheHitTokens: 0,
      promptCacheMissTokens: 100,
      model: "gemini",
      costUsd: 0.1,
      costRub: 9,
      generationTimeMs: 200,
    },
    {
      promptTokens: 40,
      completionTokens: 10,
      totalTokens: 50,
      promptCacheHitTokens: 5,
      promptCacheMissTokens: 35,
      model: "deepseek",
      costUsd: 0.05,
      costRub: 4.5,
      generationTimeMs: 100,
    },
  )

  assert.deepEqual(merged, {
    promptTokens: 140,
    completionTokens: 60,
    totalTokens: 200,
    promptCacheHitTokens: 5,
    promptCacheMissTokens: 135,
    model: "gemini",
    costUsd: 0.15000000000000002,
    costRub: 13.5,
    generationTimeMs: 300,
  })
})

test("provider label reflects mixed fallback generations", () => {
  assert.equal(
    getRouteGenerationProviderLabel(
      { promptTokens: 1, completionTokens: 1, totalTokens: 2, model: "gemini", costUsd: 0.01, costRub: 0.9 },
      { promptTokens: 1, completionTokens: 1, totalTokens: 2, model: "deepseek", costUsd: 0.01, costRub: 0.8 },
    ),
    "gemini+deepseek",
  )
})
