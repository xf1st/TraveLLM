import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { getRequestUserId, recordAiUsageEvent } from "@/lib/ai-usage-events"
import { geminiInferenceWithUsage, GEMINI_FLASH } from "@/lib/gemini"

export const maxDuration = 20

export async function GET() {
  const authError = await requireAdmin()
  if (authError) return authError

  const startedAt = Date.now()

  try {
    const result = await geminiInferenceWithUsage(
      [{ role: "user", content: "Reply with exactly: OK" }],
      {
        maxTokens: 32,
        temperature: 0,
        responseFormat: "text",
        reasoningEffort: "minimal",
      }
    )

    if (result.content.trim().toUpperCase() !== "OK") {
      throw new Error("Gemini returned an unexpected health-check response")
    }

    const userId = await getRequestUserId()
    if (userId && result.usage) {
      await recordAiUsageEvent({
        userId,
        source: "admin-health",
        provider: "gemini",
        usage: result.usage,
      })
    }

    return NextResponse.json({
      ok: true,
      provider: "openrouter",
      model: result.usage?.model || GEMINI_FLASH,
      duration: Date.now() - startedAt,
      usage: result.usage
        ? {
            promptTokens: result.usage.promptTokens,
            completionTokens: result.usage.completionTokens,
            costUsd: result.usage.costUsd,
          }
        : null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gemini health check failed"
    console.error("[Admin Health] Gemini check failed:", message)
    return NextResponse.json(
      { ok: false, model: GEMINI_FLASH, error: message, duration: Date.now() - startedAt },
      { status: 502 }
    )
  }
}
