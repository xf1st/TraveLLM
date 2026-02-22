import { NextResponse } from "next/server"
import { geminiInferenceWithUsage } from "@/lib/gemini"
import { getRequestUserId, recordAiUsageEvent } from "@/lib/ai-usage-events"

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

    const { activity, day, destination, userMessage, history = [] } = await req.json()

    if (!userMessage || typeof userMessage !== "string") {
      return NextResponse.json({ error: "Missing userMessage" }, { status: 400 })
    }

    const safeHistory: ChatMessage[] = Array.isArray(history)
      ? history.filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string").slice(-8)
      : []

    const activityTitle = activity?.title || activity?.placeName || activity?.place_name || "Current activity"
    const activityTime = activity?.time || "daytime"
    const activityDesc = activity?.desc || activity?.description || ""

    const systemPrompt = `You are a practical local travel assistant.
Answer in Russian, in 2-4 concise sentences.
Context:
- Destination: ${destination || "unknown"}
- Day: ${day || "unknown"}
- Activity: ${activityTitle}
- Time: ${activityTime}
- Description: ${activityDesc || "none"}
Give actionable tips and keep answers short.`

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...safeHistory.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: userMessage },
    ]

    const replyResponse = await geminiInferenceWithUsage(messages, {
      maxTokens: 450,
      temperature: 0.5,
      tripDays: 3,
    })

    const reply = replyResponse.content

    if (replyResponse.usage) {
      await recordAiUsageEvent({
        userId,
        source: "activity-chat",
        provider: "gemini",
        usage: replyResponse.usage
      })
    }

    return NextResponse.json({ reply: reply.trim() })
  } catch (error: any) {
    console.error("Activity Chat Error:", error)
    return NextResponse.json({ error: error?.message || "Failed to process activity chat" }, { status: 500 })
  }
}
