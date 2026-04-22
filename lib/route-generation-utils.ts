import type { TokenUsage as DeepSeekTokenUsage } from "@/lib/deepseek"
import type { TokenUsage as GeminiTokenUsage } from "@/lib/gemini"
import type { TravelMode } from "@/lib/travel-mode"

type UsageLike = Partial<GeminiTokenUsage & DeepSeekTokenUsage> | null | undefined

export type CombinedRouteGenerationUsage = {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  promptCacheHitTokens: number
  promptCacheMissTokens: number
  model: string
  costUsd: number
  costRub: number
  generationTimeMs: number
}

export type TripPlanSegment = {
  startDay?: number | null
  endDay?: number | null
  city?: string | null
  country?: string | null
}

function toFiniteNumber(value: unknown): number {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function hasUsage(value: UsageLike): boolean {
  return (
    toFiniteNumber(value?.promptTokens) > 0 ||
    toFiniteNumber(value?.completionTokens) > 0 ||
    toFiniteNumber(value?.totalTokens) > 0 ||
    toFiniteNumber(value?.costUsd) > 0
  )
}

export function resolveChunkDestination(
  tripPlan: TripPlanSegment[] | null | undefined,
  startDay: number,
  endDay: number,
  fallbackDestination: string
): string {
  if (!Array.isArray(tripPlan) || tripPlan.length === 0) {
    return fallbackDestination
  }

  let bestMatch: { overlap: number; city: string } | null = null

  for (const segment of tripPlan) {
    const city = typeof segment?.city === "string" ? segment.city.trim() : ""
    const segStart = toFiniteNumber(segment?.startDay)
    const segEnd = toFiniteNumber(segment?.endDay)

    if (!city || segStart < 1 || segEnd < segStart) continue

    const overlapStart = Math.max(startDay, segStart)
    const overlapEnd = Math.min(endDay, segEnd)
    const overlap = overlapEnd - overlapStart + 1

    if (overlap <= 0) continue
    if (!bestMatch || overlap > bestMatch.overlap) {
      bestMatch = { overlap, city }
    }
  }

  return bestMatch?.city || fallbackDestination
}

export function combineRouteGenerationUsage(
  ...usages: UsageLike[]
): CombinedRouteGenerationUsage | null {
  const meaningful = usages.filter(hasUsage)
  if (meaningful.length === 0) return null

  let model = ""
  let generationTimeMs = 0

  const merged = meaningful.reduce<CombinedRouteGenerationUsage>(
    (acc, usage) => {
      acc.promptTokens += toFiniteNumber(usage?.promptTokens)
      acc.completionTokens += toFiniteNumber(usage?.completionTokens)
      acc.totalTokens += toFiniteNumber(usage?.totalTokens)
      acc.promptCacheHitTokens += toFiniteNumber(usage?.promptCacheHitTokens)
      acc.promptCacheMissTokens += toFiniteNumber(usage?.promptCacheMissTokens)
      acc.costUsd += toFiniteNumber(usage?.costUsd)
      acc.costRub += toFiniteNumber(usage?.costRub)

      if (!model && typeof usage?.model === "string" && usage.model.trim()) {
        model = usage.model
      }
      generationTimeMs += toFiniteNumber(usage?.generationTimeMs)
      return acc
    },
    {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      promptCacheHitTokens: 0,
      promptCacheMissTokens: 0,
      model: "mixed",
      costUsd: 0,
      costRub: 0,
      generationTimeMs: 0,
    }
  )

  return {
    ...merged,
    model: model || "mixed",
    generationTimeMs,
  }
}

export function getRouteGenerationProviderLabel(
  geminiUsage: UsageLike,
  deepseekUsage: UsageLike
): string {
  const hasGemini = hasUsage(geminiUsage)
  const hasDeepSeek = hasUsage(deepseekUsage)

  if (hasGemini && hasDeepSeek) return "gemini+deepseek"
  if (hasDeepSeek) return "deepseek"
  return "gemini"
}

export function shouldUseAirValidation(travelMode: TravelMode): boolean {
  return travelMode === "flight"
}

export function computeValidationBudgetFloor(params: {
  durationDays: number
  flightMinBudget: number
  minDailyBudget: number
  travelMode: TravelMode
}): number {
  const stayBudget = Math.max(0, params.durationDays) * Math.max(0, params.minDailyBudget)
  const transportBudget =
    params.travelMode === "flight" ? Math.max(0, params.flightMinBudget) : 0

  return stayBudget + transportBudget
}
