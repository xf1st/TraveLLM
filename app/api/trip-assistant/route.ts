import { NextResponse } from "next/server"
import { geminiInferenceWithUsage } from "@/lib/gemini"
import { deepseekInferenceWithUsage } from "@/lib/deepseek"
import { GROUNDING_DATA_2026 } from "@/lib/grounding"
import { getRequestUserId, recordAiUsageEvent } from "@/lib/ai-usage-events"
import { checkChatLimit, getUserSubscription } from "@/lib/subscription"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"

// Helper to extract city from day title
function extractCity(title: string): string {
    if (!title) return "Unknown"
    const colonIndex = title.indexOf(":")
    if (colonIndex > 0) {
        return title.substring(0, colonIndex).trim()
    }
    return title.split(" ")[0].trim()
}

export async function POST(req: Request) {
    try {
        const userId = await getRequestUserId()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const rl = checkRateLimit(userId, "trip-assistant", 15)
        if (!rl.allowed) return rateLimitResponse(rl)

        const { tripData, userMessage, tripId, userLocation: reqUserLocation } = await req.json()

        if (!tripData || !userMessage) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        if (typeof userMessage !== "string" || userMessage.length > 2000) {
            return NextResponse.json({ error: "Invalid userMessage" }, { status: 400 })
        }

        // Check chat limit
        let userTier = "free";
        if (tripId) {
            const chatCheck = await checkChatLimit(userId, tripId)
            userTier = chatCheck.tier;
            if (!chatCheck.allowed) {
                return NextResponse.json({
                    error: `Лимит сообщений для этого маршрута исчерпан (${chatCheck.used}/${chatCheck.limit}). Обновите подписку на странице /subscribe.`,
                    code: 'CHAT_LIMIT_EXCEEDED'
                }, { status: 429 })
            }
        } else {
            const sub = await getUserSubscription(userId);
            userTier = sub.tier;
        }

        const aiEngine = userTier === "free" ? "deepseek" : "gemini";
        const inferenceFn = aiEngine === "deepseek" ? deepseekInferenceWithUsage : geminiInferenceWithUsage;

        // Handle both array (just itinerary) and object (full trip) formats
        const itinerary = Array.isArray(tripData) ? tripData : (tripData.itinerary || [])
        const tripTitle = tripData.title || "Путешествие"
        const tripBudget = tripData.totalBudget || "Не указан"
        const destination = tripData.destination || tripData.countries?.[0]?.name || "неизвестно"

        // Build context for AI
        const itineraryContext = itinerary.map((day: any) =>
            `День ${day.day}: ${day.title}\n  Активности: ${day.activities?.map((a: any) => `${a.time}: ${a.placeName}`).join(', ') || 'нет'}`
        ).join('\n')

        // Classify intent AND parse modification in a single call (saves 1 AI round-trip)
        const classifyAndParsePrompt = `Проанализируй сообщение пользователя о маршруте путешествия.

МАРШРУТ "${tripTitle}" (${destination}):
${itineraryContext}

СООБЩЕНИЕ: "${userMessage}"

Если пользователь хочет ИЗМЕНИТЬ маршрут — верни JSON с деталями изменения:

Вариант 1 — редактировать/заменить активность:
{"intent":"MODIFY","action":"edit_activity","dayNumber":N,"timeSlot":"Утро/День/Вечер или null","currentActivity":"текущее название или null","newActivityRequest":"что хочет","explanation":"кратко что сделано"}

Вариант 2 — добавить активность:
{"intent":"MODIFY","action":"add_activity","dayNumber":N,"timeSlot":"Вечер","newActivityRequest":"что добавить","explanation":"..."}

Вариант 3 — перераспределить дни:
{"intent":"MODIFY","action":"redistribute","changes":[{"city":"X","currentDays":N,"newDays":M}],"explanation":"..."}

Если пользователь задаёт ВОПРОС (не хочет ничего менять):
{"intent":"QUESTION"}

Верни ТОЛЬКО JSON, без markdown.`

        const classifyRawResponse = await inferenceFn([
            { role: "system", content: "Анализатор намерений и запросов на изменение маршрутов. Отвечай только JSON." },
            { role: "user", content: classifyAndParsePrompt }
        ], { maxTokens: 300, temperature: 0.1, responseFormat: "json_object" })

        const classifyRaw = classifyRawResponse.content
        // Use a dummy parseRawResponse object to keep usage aggregation working below
        const parseRawResponse = { content: "{}", usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, costUsd: 0, costRub: 0, model: "" } }

        let intent = "QUESTION"
        let parsedRequest: any = null
        try {
            const match = classifyRaw.match(/\{[\s\S]*\}/)?.[0]
            if (match) {
                const parsed = JSON.parse(match)
                intent = parsed.intent || "QUESTION"
                if (intent === "MODIFY") parsedRequest = parsed
            }
        } catch {
            // Default to question if parsing fails
        }

        console.log(`Trip Assistant: Intent = ${intent}, Message = "${userMessage}"`)

        // Handle MODIFY intent
        if (intent === "MODIFY") {
            if (!parsedRequest) {
                return NextResponse.json({
                    type: "message",
                    reply: "Не совсем понял, что изменить. Попробуйте:\n• \"Замени музей на кафе в день 2\"\n• \"Добавь вечерний бар в день 3\"\n• \"Сократи Сочи до 3 дней\""
                })
            }

            // Handle edit_activity
            if (parsedRequest.action === "edit_activity" || parsedRequest.action === "add_activity") {
                const { dayNumber, timeSlot, currentActivity, newActivityRequest } = parsedRequest
                const targetDay = itinerary.find((d: any) => d.day === dayNumber)

                if (!targetDay) {
                    return NextResponse.json({
                        type: "message",
                        reply: `День ${dayNumber} не найден в маршруте. У вас ${itinerary.length} дней.`
                    })
                }

                const city = extractCity(targetDay.title)

                // Generate new activity
                const activityPrompt = `Сгенерируй активность для путешествия.
Город: ${city}
Запрос: "${newActivityRequest}"
Время: ${timeSlot || "День"}

Верни JSON:
{
  "time": "${timeSlot || "День"}",
  "placeName": "КОНКРЕТНОЕ название",
  "desc": "2-3 предложения",
  "cost": "цена ₽",
  "ticketsRequired": false,
  "mapLink": "https://www.google.com/maps/search/?api=1&query=...",
  "link": ""
}`

                const activityRawResponse = await inferenceFn([
                    { role: "system", content: "Генератор туристических активностей." },
                    { role: "user", content: activityPrompt }
                ], { maxTokens: 400, temperature: 0.7, responseFormat: "json_object" })
                
                const activityRaw = activityRawResponse.content

                let newActivity
                try {
                    const clean = activityRaw.match(/\{[\s\S]*\}/)?.[0] || activityRaw
                    newActivity = JSON.parse(clean)
                } catch {
                    return NextResponse.json({
                        type: "message",
                        reply: "Не удалось сгенерировать активность. Попробуйте еще раз."
                    })
                }

                // Build new itinerary
                const newItinerary = itinerary.map((day: any) => {
                    if (day.day !== dayNumber) return day

                    let updatedActivities = [...(day.activities || [])]

                    if (parsedRequest.action === "add_activity") {
                        updatedActivities.push(newActivity)
                    } else if (timeSlot) {
                        const idx = updatedActivities.findIndex((a: any) =>
                            a.time?.toLowerCase() === timeSlot.toLowerCase()
                        )
                        if (idx >= 0) {
                            updatedActivities[idx] = { ...newActivity, time: timeSlot }
                        } else {
                            updatedActivities.push({ ...newActivity, time: timeSlot })
                        }
                    } else if (currentActivity) {
                        const idx = updatedActivities.findIndex((a: any) =>
                            a.placeName?.toLowerCase().includes(currentActivity.toLowerCase())
                        )
                        if (idx >= 0) {
                            updatedActivities[idx] = newActivity
                        } else {
                            updatedActivities.push(newActivity)
                        }
                    } else {
                        updatedActivities.push(newActivity)
                    }

                    const dayTotal = updatedActivities.reduce((sum: number, a: any) => {
                        return sum + (parseInt(String(a.cost || "0").replace(/[^0-9]/g, "")) || 0)
                    }, 0)

                    return { ...day, activities: updatedActivities, dayTotal: `${dayTotal.toLocaleString("ru-RU")} ₽` }
                })

                // Aggregate usage from classify+parse call and activity generation call
                const totalUsage = {
                    promptTokens: (classifyRawResponse.usage?.promptTokens || 0) + (parseRawResponse.usage?.promptTokens || 0) + (activityRawResponse.usage?.promptTokens || 0),
                    completionTokens: (classifyRawResponse.usage?.completionTokens || 0) + (parseRawResponse.usage?.completionTokens || 0) + (activityRawResponse.usage?.completionTokens || 0),
                    totalTokens: (classifyRawResponse.usage?.totalTokens || 0) + (parseRawResponse.usage?.totalTokens || 0) + (activityRawResponse.usage?.totalTokens || 0),
                    costUsd: (classifyRawResponse.usage?.costUsd || 0) + (parseRawResponse.usage?.costUsd || 0) + (activityRawResponse.usage?.costUsd || 0),
                    costRub: (classifyRawResponse.usage?.costRub || 0) + (parseRawResponse.usage?.costRub || 0) + (activityRawResponse.usage?.costRub || 0),
                    model: classifyRawResponse.usage?.model || "gemini"
                }
                
                await recordAiUsageEvent({ userId, source: "trip-assistant", tripId, provider: "gemini", usage: totalUsage })
                return NextResponse.json({
                    type: "modification",
                    reply: `✅ ${parsedRequest.explanation || `Обновил день ${dayNumber}`}`,
                    modifications: [{ type: "replace_all_days", newItinerary }]
                })
            }

            // Handle redistribute (simplified - just acknowledge)
            if (parsedRequest.action === "redistribute") {
                return NextResponse.json({
                    type: "message",
                    reply: "Для изменения количества дней используйте конкретные примеры:\n• \"Сократи Сочи до 3 дней\"\n• \"Добавь 2 дня в Токио\"\n\nИли измените отдельные активности."
                })
            }
        }

        // Handle QUESTION intent - answer about the trip
        const currentDate = new Date().toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        const locationStr = reqUserLocation ? `${reqUserLocation.lat.toFixed(4)}, ${reqUserLocation.lng.toFixed(4)}` : "Неизвестно"

        // Check safety
        const closedAirport = GROUNDING_DATA_2026.closedAirports.find(a => destination.toLowerCase().includes(a.city.toLowerCase()))
        const safetyWarning = closedAirport 
            ? `⚠️ ВНИМАНИЕ: Аэропорт ${closedAirport.city} (${closedAirport.iata}) ЗАКРЫТ. Добраться можно только на поезде или автобусе из Сочи/Минвод.`
            : ""

        const answerPrompt = `Ты — умный ИИ-помощник по путешествиям. Пользователь просматривает маршрут.

СЕГОДНЯ: ${currentDate}
ТЕКУЩАЯ ГЕОЛОКАЦИЯ ПОЛЬЗОВАТЕЛЯ: ${locationStr}

КОНТЕКСТ ПУТЕШЕСТВИЯ:
- Название: ${tripTitle}
- Направление: ${destination}
- Бюджет: ${tripBudget}
- Дней: ${itinerary.length}

МАРШРУТ:
${itineraryContext}

РЕАЛЬНОСТЬ (2026):
${GROUNDING_DATA_2026.globalRestrictions.join(' ')}
${safetyWarning}

ВОПРОС ПОЛЬЗОВАТЕЛЯ: "${userMessage}"

ПРАВИЛА:
1. Если пользователь спрашивает "где я?" или "что рядом?", используй его геолокацию.
2. Отвечай кратко и по делу (2-4 предложения).
3. Давай практичные советы.
4. Если вопрос про редактирование — напомни, что можно попросить "Замени X на Y в день N".
5. Будь дружелюбным.

Ответ:`

        const replyResponse = await inferenceFn([
            { role: "system", content: "Ты полезный ассистент по путешествиям." },
            { role: "user", content: answerPrompt }
        ], { maxTokens: 400, temperature: 0.7 })
        
        const reply = replyResponse.content

        // Aggregate usage from classification and reply
        const totalUsage = {
            promptTokens: (classifyRawResponse.usage?.promptTokens || 0) + (replyResponse.usage?.promptTokens || 0),
            completionTokens: (classifyRawResponse.usage?.completionTokens || 0) + (replyResponse.usage?.completionTokens || 0),
            totalTokens: (classifyRawResponse.usage?.totalTokens || 0) + (replyResponse.usage?.totalTokens || 0),
            costUsd: (classifyRawResponse.usage?.costUsd || 0) + (replyResponse.usage?.costUsd || 0),
            costRub: (classifyRawResponse.usage?.costRub || 0) + (replyResponse.usage?.costRub || 0),
            model: replyResponse.usage?.model || aiEngine
        }
        
        await recordAiUsageEvent({ userId, source: "trip-assistant", tripId, provider: aiEngine, usage: totalUsage })
        return NextResponse.json({
            type: "message",
            reply: reply.trim()
        })

    } catch (error: any) {
        console.error("Trip Assistant Error:", error)
        return NextResponse.json({
            error: error.message || "Unknown error"
        }, { status: 500 })
    }
}
