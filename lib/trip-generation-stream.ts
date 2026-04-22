import {
  getRouteGenerationEndpoint,
  normalizeRouteGenerationProvider,
} from "@/lib/route-generation-provider"

/**
 * Shared client-side streaming fetch for route generation (plan + vibe pages).
 */
export async function streamTripGeneration(
  requestPayload: Record<string, unknown> & { generationProvider?: unknown },
  signal?: AbortSignal
): Promise<{ routeData: unknown }> {
  const provider = normalizeRouteGenerationProvider(
    requestPayload.generationProvider
  )
  const { generationProvider: _generationProvider, ...apiBody } = requestPayload

  const response = await fetch(getRouteGenerationEndpoint(provider), {
    signal,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(apiBody),
  })

  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as {
      error?: string
      message?: string
      code?: string
      limitExceeded?: boolean
      limit?: number
      resetAt?: string
      retryAfterSec?: number
    }
    const msg = err.message || err.error || `API Error: ${response.status}`
    const e = new Error(msg) as Error & {
      code?: string
      limitExceeded?: boolean
      limit?: number
      resetAt?: string
      retryAfterSec?: number
    }
    e.code = err.code
    e.limitExceeded = err.limitExceeded
    e.limit = err.limit
    e.resetAt = err.resetAt
    e.retryAfterSec = err.retryAfterSec
    throw e
  }

  let routeData: unknown = null
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split("\n\n")
    buffer = parts.pop() ?? ""

    for (const part of parts) {
      const line = part.trim()
      if (!line || line.startsWith(":") || !line.startsWith("data: ")) continue

      try {
        const event = JSON.parse(line.slice(6))
        if (event.type === "error") {
          throw new Error(event.message || "Generation failed")
        }
        if (event.type === "result") routeData = event.data
      } catch (e) {
        if (e instanceof SyntaxError) continue
        throw e
      }
    }
  }

  if (!routeData || typeof routeData !== "object") {
    throw new Error("Invalid response format")
  }

  return { routeData }
}

export const streamGeminiTripGeneration = streamTripGeneration

/** sessionStorage key for plan -> vibe handoff */
export const PLAN_PENDING_GENERATION_KEY = "travellm_plan_pending_generation"
