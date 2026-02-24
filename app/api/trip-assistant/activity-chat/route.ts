import { NextResponse } from "next/server"
import { deepseekInferenceWithUsage } from "@/lib/deepseek"
import { getRequestUserId, recordAiUsageEvent } from "@/lib/ai-usage-events"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"

type ChatMessage = {
  role: "user" | "assistant"
  content: string
}

export async function POST(req: Request) {
  try {
    const userId = await getRequestUserId()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rl = checkRateLimit(userId, "activity-chat", 20)
    if (!rl.allowed) return rateLimitResponse(rl)

    const { activity, day, destination, userMessage, history = [] } = await req.json()

    if (!userMessage || typeof userMessage !== "string" || userMessage.length > 2000) {
      return NextResponse.json({ error: "Missing or invalid userMessage" }, { status: 400 })
    }

    const safeHistory: ChatMessage[] = Array.isArray(history)
      ? history.filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string").slice(-8)
      : []

    const activityTitle = activity?.title || activity?.placeName || activity?.place_name || "Current activity"
    const activityTime = activity?.time || "daytime"
    const activityDesc = activity?.desc || activity?.description || ""

    const systemPrompt = `Ты — проактивный, живой и дерзкий ИИ-компаньон для путешествий, который сейчас гуляет вместе с пользователем (Live Assistant).
Отвечай всегда на русском языке. Ответы должны быть очень короткими, по делу и в виде живого диалога (2-3 предложения максимум).
Используй пару релевантных эмодзи, но не переборщи. Не пиши длинные списки или простыни текста — пользователь читает это на ходу с телефона.
Если спрашивают "Где перекусить?", дай 1-2 крутых места с кратким аргументом. Если спрашивают про достопримечательность, выдай интересный неочевидный факт.

Текущий контекст:
Город: ${destination || "Неизвестно"}
День поездки: ${day || "Неизвестно"}
Текущая локация (активность): ${activityTitle}
Запланированное время: ${activityTime}
Описание локации: ${activityDesc || "Нет"}

Будь живым, держи темп и давай советы как лучший друг-локал!`

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...safeHistory.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: userMessage },
    ]

    const replyResponse = await deepseekInferenceWithUsage(messages, {
      maxTokens: 450,
      temperature: 0.5,
    })

    const reply = replyResponse.content

    if (replyResponse.usage) {
      await recordAiUsageEvent({
        userId,
        source: "activity-chat",
        provider: "deepseek",
        usage: replyResponse.usage
      })
    }

    return NextResponse.json({ reply: reply.trim() })
  } catch (error: any) {
    console.error("Activity Chat Error:", error)
    return NextResponse.json({ error: error?.message || "Failed to process activity chat" }, { status: 500 })
  }
}
