import { NextResponse } from "next/server"
import { openrouterInference } from "@/lib/openrouter"
import { GROUNDING_DATA_2026 } from "@/lib/grounding"
import {
    getRequestUserId,
    recordAiUsageEvent,
    checkMonthlyChatAiLimit,
    monthlyChatAiLimitResponse,
} from "@/lib/ai-usage-events"
import { enforceAiAccess } from "@/lib/server/user-access"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"

export async function POST(req: Request) {
    try {
        const userId = await getRequestUserId()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const accessErr = await enforceAiAccess(userId)
        if (accessErr) return accessErr

        const rl = await checkRateLimit(userId, "main-chat", 30)
        if (!rl.allowed) return rateLimitResponse(rl)

        const { message, history = [], tripContext } = await req.json()

        if (!message || typeof message !== "string" || message.length > 2000) {
            return NextResponse.json({ error: "Invalid message" }, { status: 400 })
        }

        let systemPrompt = `Ты — центральный ИИ-ассистент TraveLLM. Твоя главная задача — помогать пользователю планировать идеальные путешествия.
Будь дружелюбным, современным, профессиональным и кратким. Отвечай на русском языке. Используй эмодзи и Markdown.

ПРАВИЛА РАБОТЫ С МАРШРУТАМИ:
1. НИКОГДА не генерируй маршрут по дням в текстовом ответе — для этого есть отдельная система генерации.
2. Если пользователь просит создать, спланировать или составить маршрут/поездку — добавь в КОНЕЦ своего сообщения токен [TRIP_WIZARD].
   Пример: "Отличная идея! Заполни форму ниже — укажи откуда летим, куда, даты, бюджет, и я сгенерирую полный маршрут! [TRIP_WIZARD]"
   Форма автоматически появится у пользователя и соберёт: город отправления, направление, даты, бюджет, компанию и стиль.
   После заполнения формы система запустит генерацию реального маршрута через AI.
3. Используй [TRIP_WIZARD] при ЛЮБОМ запросе на создание маршрута, если пользователь ещё не указал все детали.
4. НЕ используй [TRIP_WIZARD] если пользователь уже заполнил форму (это будет видно в истории сообщений).
5. После генерации маршрута (пользователь написал "Создай маршрут: ...") — помоги обсудить детали, ответь на вопросы, предложи изменения.

СОВЕТЫ И ИНФОРМАЦИЯ:
- Отвечай кратко (2-4 предложения). Если нужно больше — структурируй через списки.
- На вопросы о визах, ценах, погоде — давай конкретные актуальные ответы.

Актуальные данные для 2026 года:
- Ограничения: ${GROUNDING_DATA_2026.globalRestrictions.join(' ')}
- Авиасообщение: ${GROUNDING_DATA_2026.flightConnectivity.join(' ')}
`
        // Add trip context if one is active in the chat
        if (tripContext && (tripContext.destination || tripContext.title)) {
            const itineraryPreview = Array.isArray(tripContext.itinerary)
                ? tripContext.itinerary.slice(0, 5).map((d: any) => `День ${d.day}: ${d.title}`).join("; ")
                : null
            systemPrompt += `\n\nТЕКУЩИЙ СГЕНЕРИРОВАННЫЙ МАРШРУТ:
- Название: ${tripContext.title || "Не указано"}
- Место: ${tripContext.destination || "Не указано"}
- Бюджет: ${tripContext.totalBudget || "Не указан"}
- Дней: ${Array.isArray(tripContext.itinerary) ? tripContext.itinerary.length : "Не указано"}
${itineraryPreview ? `- Первые дни: ${itineraryPreview}` : ""}
Пользователь может спрашивать об изменениях, деталях маршрута, советах. Помоги разобраться на основе этих данных.`
        }

        // Prepare the messages array for the model
        const openRouterMessages = [
            { role: "system", content: systemPrompt },
            // Keep the last 10 messages from history to maintain context
            ...history.slice(-10).map((m: any) => ({
                role: m.role,
                content: m.content
            })),
            { role: "user", content: message }
        ]

        const reply = await openrouterInference(openRouterMessages, { temperature: 0.7, maxTokens: 1000 })

        await recordAiUsageEvent({
            userId,
            source: "main-chat",
            provider: "openrouter",
        })

        return NextResponse.json({ reply })
    } catch (error: any) {
        console.error("Main Chat Error:", error)
        return NextResponse.json(
            { error: "Failed to process chat message" },
            { status: 500 }
        )
    }
}
