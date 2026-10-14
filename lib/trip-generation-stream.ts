import { getDefaultRouteGenerationProvider, getRouteGenerationEndpoint, normalizeRouteGenerationProvider } from "./route-generation-provider.ts"
import { combineAbortSignals } from "./fetch-with-timeout.ts"

export type GenerationPhase = "preparing" | "generating" | "enriching" | "saving"

type GenerationStreamOptions = { onPhase?: (phase: GenerationPhase) => void; timeoutMs?: number }

/** Supports streamed Gemini responses and the JSON DeepSeek endpoint. */
export async function streamTripGeneration(
  requestPayload: Record<string, unknown> & { generationProvider?: unknown },
  signal?: AbortSignal,
  options: GenerationStreamOptions = {},
): Promise<{ routeData: unknown }> {
  const days = Math.max(1, Number(requestPayload.days) || 7)
  const calls = days > 14 ? Math.ceil(days / 7) + 1 : 1
  const timeout = AbortSignal.timeout(options.timeoutMs ?? Math.max(420000, calls * 240000 + 90000))
  const requestSignal = signal ? combineAbortSignals([signal, timeout]) : timeout
  const provider = requestPayload.generationProvider === undefined
    ? getDefaultRouteGenerationProvider()
    : normalizeRouteGenerationProvider(requestPayload.generationProvider)
  const { generationProvider: _generationProvider, ...apiBody } = requestPayload
  options.onPhase?.("preparing")
  try {
    const response = await fetch(getRouteGenerationEndpoint(provider), {
      signal: requestSignal, method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(apiBody),
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      const error = Object.assign(new Error(err.message || err.error || `API Error: ${response.status}`), {
        code: err.code, limitExceeded: err.limitExceeded, limit: err.limit,
        resetAt: err.resetAt, retryAfterSec: err.retryAfterSec ?? (Number(response.headers.get("Retry-After")) || undefined),
      })
      throw error
    }
    options.onPhase?.("generating")
    if (response.headers.get("Content-Type")?.includes("application/json")) {
      const routeData = await response.json()
      if (!routeData || !Array.isArray(routeData.itinerary)) throw new Error("Invalid response format")
      return { routeData }
    }
    if (!response.body) throw new Error("Empty response body")
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""
    const parseEvent = (part: string): unknown => {
      const data = part.split("\n").filter(line => line.startsWith("data:")).map(line => line.slice(5).trimStart()).join("\n")
      if (!data) return undefined
      const event = JSON.parse(data)
      if (event.type === "error") throw Object.assign(new Error(event.message || "Generation failed"), { code: event.code })
      if (event.type === "progress" && ["generating", "enriching"].includes(event.phase)) options.onPhase?.(event.phase)
      if (event.type === "result") {
        if (!event.data || !Array.isArray(event.data.itinerary)) throw new Error("Invalid response format")
        return event.data
      }
      return undefined
    }
    try {
      while (true) {
        const { done, value } = await reader.read()
        buffer += done ? decoder.decode() : decoder.decode(value, { stream: true })
        // Normalize line endings after joining chunks, including split CR/LF pairs.
        buffer = buffer.replace(/\r\n/g, "\n")
        const parts = buffer.split("\n\n")
        buffer = parts.pop() ?? ""
        if (done && buffer.trim()) { parts.push(buffer); buffer = "" }
        for (const part of parts) {
          const routeData = parseEvent(part)
          if (routeData !== undefined) return { routeData }
        }
        if (done) throw new Error("Stream ended without a route")
      }
    } finally {
      void reader.cancel().catch(() => {})
      reader.releaseLock()
    }
  } catch (error) {
    if (timeout.aborted && !signal?.aborted) {
      throw Object.assign(new Error("Generation request timed out"), { code: "GENERATION_TIMEOUT" })
    }
    throw error
  }
}

export const streamGeminiTripGeneration = streamTripGeneration
export const PLAN_PENDING_GENERATION_KEY = "travellm_plan_pending_generation"
