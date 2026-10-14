import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { getRequestUserId, recordAiUsageEvent } from "@/lib/ai-usage-events"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { geminiInferenceWithUsage, GEMINI_FLASH } from "@/lib/gemini"
import { deepseekInferenceWithUsage, DEEPSEEK_CHAT } from "@/lib/deepseek"
import { describeConnectionError } from "@/lib/server/ai-connection"

export const maxDuration = 30

export async function POST(req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied
  const userId = await getRequestUserId()
  if (!userId) return NextResponse.json({ error: "Не авторизован." }, { status: 401 })
  const limit = await checkRateLimit(userId, "admin-network-test", 3, 60000)
  if (!limit.allowed) return rateLimitResponse(limit)
  const requested = await req.json().catch(() => ({}))
  if (requested.mode !== undefined && !["direct", "proxy", "both"].includes(requested.mode)) {
    return NextResponse.json({ error: "Неизвестный способ соединения." }, { status: 400 })
  }
  const modes = requested.mode === "direct" ? ["direct" as const] : requested.mode === "proxy" ? ["proxy" as const] : ["direct" as const, "proxy" as const]
  const results = await Promise.all(modes.flatMap(mode => ["gemini" as const, "deepseek" as const].map(async provider => {
    const started = Date.now()
    try {
      const options = { maxTokens: 32, temperature: 0, connectionMode: mode, trackSession: false, signal: AbortSignal.any([req.signal, AbortSignal.timeout(15000)]) }
      const messages = [{ role: "user" as const, content: "Reply with exactly: OK" }]
      const result = provider === "gemini" ? await geminiInferenceWithUsage(messages, { ...options, reasoningEffort: "minimal" }) : await deepseekInferenceWithUsage(messages, options)
      if (!/^OK[.!]?$/i.test(result.content.trim())) throw new Error("Unexpected response")
      const durationMs = Date.now() - started
      await recordAiUsageEvent({ userId, source: "admin-health", provider, usage: result.usage })
      return { provider, mode, ok: true, durationMs, model: result.usage?.model || (provider === "gemini" ? GEMINI_FLASH : DEEPSEEK_CHAT), message: "Ответ получен." }
    } catch (error) {
      return { provider, mode, ok: false, durationMs: Date.now() - started, model: provider === "gemini" ? GEMINI_FLASH : DEEPSEEK_CHAT, ...describeConnectionError(error) }
    }
  })))
  return NextResponse.json({
    checkedAt: new Date().toISOString(), results,
    runtime: process.env.NODE_ENV === "production" ? "production" : "development",
  }, { headers: { "Cache-Control": "private, no-store" } })
}
