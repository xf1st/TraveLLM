/**
 * Shared client-side streaming fetch for /api/gemini (plan + vibe pages).
 */
export async function streamGeminiTripGeneration(
  requestPayload: Record<string, unknown>,
  signal?: AbortSignal
): Promise<{ routeData: unknown }> {
  const response = await fetch("/api/gemini", {
    signal,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestPayload),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error || `API Error: ${response.status}`)
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
        if (event.type === "error") throw new Error(event.message || "Generation failed")
        if (event.type === "result") routeData = event.data
      } catch (e) {
        if (e instanceof SyntaxError) continue
        throw e
      }
    }
  }
  if (!routeData || typeof routeData !== "object") throw new Error("Invalid response format")
  return { routeData }
}

/** sessionStorage key for plan → vibe handoff */
export const PLAN_PENDING_GENERATION_KEY = "travellm_plan_pending_generation"
