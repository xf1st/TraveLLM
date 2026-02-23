import { NextResponse } from "next/server"
import { openrouterInference } from "@/lib/openrouter"
import { GROUNDING_DATA_2026 } from "@/lib/grounding"
import { getRequestUserId } from "@/lib/ai-usage-events"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"

export async function POST(req: Request) {
    try {
        const userId = await getRequestUserId()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const rl = checkRateLimit(userId, "guide-chat", 20)
        if (!rl.allowed) return rateLimitResponse(rl)

        const { message, context, mode = 'local' } = await req.json()

        if (!message || typeof message !== "string" || message.length > 2000) {
            return NextResponse.json({ error: "Invalid message" }, { status: 400 })
        }

        let systemPrompt = ""

        const realityContext = `
ТЕКУЩАЯ РЕАЛЬНОСТЬ (Январь 2026):
- Ограничения: ${GROUNDING_DATA_2026.globalRestrictions.join(' ')}
- Аэропорты: ${GROUNDING_DATA_2026.airportStatus.join(' ')}
- Перелеты: ${GROUNDING_DATA_2026.flightConnectivity.join(' ')}
`

        if (mode === 'global') {
            systemPrompt = `Ты — профессиональный, дружелюбный и эрудированный ИИ-гид. Ты сопровождаешь путешественника.
${realityContext}

КОНТЕКСТ ВСЕГО ПУТЕШЕСТВИЯ:
- Название: ${context.title || "Мое путешествие"}
- Всего дней: ${(context.upcomingSteps?.length || 0) + (context.completedSteps?.length || 0)}
- Пройдено этапов: ${context.completedSteps?.length || 0}
- Осталось этапов: ${context.upcomingSteps?.length || 0}
- Ближайшие планы: ${context.upcomingSteps?.slice(0, 5).join(", ") || "Финиш"}...

ТВОЯ ЗАДАЧА:
1. Отвечать на ОБЩИЕ вопросы по маршруту (логистика, бюджет, погода в целом).
2. Помогать планировать следующие шаги.
3. Быть полезным и кратким.

Пользователь спрашивает о маршруте в целом: "${message}"`
        } else {
            // Local mode
            systemPrompt = `Ты — профессиональный, дружелюбный и эрудированный ИИ-гид. Ты сопровождаешь путешественника в реальном времени.

КОНТЕКСТ ПУТЕШЕСТВИЯ:
- Название: ${context.title}
- Текущая локация: ${context.currentLocation || "Неизвестно"}
- Текущий день: ${context.currentDay || 1}
- Уже посещено: ${context.completedSteps?.join(", ") || "Ничего пока"}
- Предстоит: ${context.upcomingSteps?.slice(0, 3).join(", ") || "Финиш"}...

ТВОЯ ЗАДАЧА:
1. Отвечать на вопросы пользователя, учитывая ТОЛЬКО ТЕКУЩИЙ КОНТЕКСТ (где он находится ПРЯМО СЕЙЧАС - ${context.currentLocation}).
2. Давать практические советы (где поесть рядом, как пройти, лайфхаки ЭТОГО места).
3. Рассказывать факты об ЭТОМ месте.

Пользователь спрашивает о текущем месте: "${message}"`
        }

        const reply = await openrouterInference(
            [
                { role: "system", content: systemPrompt },
                { role: "user", content: message }
            ],
            { temperature: 0.7, maxTokens: 500 }
        )

        return NextResponse.json({ reply })
    } catch (error: any) {
        console.error("Guide Chat Error:", error)
        return NextResponse.json(
            { error: "Failed to process chat message" },
            { status: 500 }
        )
    }
}
