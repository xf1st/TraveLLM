import { NextResponse } from "next/server"
import { deepseekInference } from "@/lib/deepseek"
import { GROUNDING_DATA_2026 } from "@/lib/grounding"

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
        const { tripData, userMessage, tripId } = await req.json()

        if (!tripData || !userMessage) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        // Handle both array (just itinerary) and object (full trip) formats
        const itinerary = Array.isArray(tripData) ? tripData : (tripData.itinerary || [])
        const tripTitle = tripData.title || "Путешествие"
        const tripBudget = tripData.totalBudget || "Не указан"
        const destination = tripData.destination || tripData.countries?.[0]?.name || "неизвестно"

        // Build context for AI
        const itineraryContext = itinerary.map((day: any) =>
            `День ${day.day}: ${day.title}\n  Активности: ${day.activities?.map((a: any) => `${a.time}: ${a.placeName}`).join(', ') || 'нет'}`
        ).join('\n')

        // First, classify the intent
        const classifyPrompt = `Проанализируй сообщение пользователя и определи его намерение.

КОНТЕКСТ: Пользователь просматривает маршрут путешествия "${tripTitle}" в ${destination}.

СООБЩЕНИЕ: "${userMessage}"

Определи тип:
1. MODIFY - пользователь хочет ИЗМЕНИТЬ маршрут (заменить, добавить, удалить, сократить дни)
   Примеры: "замени музей на кафе", "добавь ресторан в день 2", "сократи до 5 дней"
   
2. QUESTION - пользователь задает ВОПРОС о маршруте или месте (не хочет ничего менять)
   Примеры: "что посмотреть рядом?", "какая погода будет?", "нужна ли виза?", "расскажи про это место"

Верни ТОЛЬКО JSON:
{"intent": "MODIFY" или "QUESTION"}`

        const classifyRaw = await deepseekInference([
            { role: "system", content: "Классификатор намерений." },
            { role: "user", content: classifyPrompt }
        ], { maxTokens: 100, temperature: 0.1 })

        let intent = "QUESTION" // Default to question
        try {
            const match = classifyRaw.match(/\{[\s\S]*\}/)?.[0]
            if (match) {
                const parsed = JSON.parse(match)
                intent = parsed.intent || "QUESTION"
            }
        } catch {
            // Default to question if parsing fails
        }

        console.log(`Trip Assistant: Intent = ${intent}, Message = "${userMessage}"`)

        // Handle MODIFY intent - call modify-itinerary logic
        if (intent === "MODIFY") {
            // Parse the modification request
            const parsePrompt = `Проанализируй запрос на изменение маршрута.

ТЕКУЩИЙ МАРШРУТ:
${itineraryContext}

ЗАПРОС: "${userMessage}"

Определи тип изменения:

ТИП 1 - РЕДАКТИРОВАНИЕ АКТИВНОСТИ:
{"action": "edit_activity", "dayNumber": N, "timeSlot": "Утро/День/Вечер" или null, "currentActivity": "название" или null, "newActivityRequest": "что хочет", "explanation": "..."}

ТИП 2 - ДОБАВЛЕНИЕ АКТИВНОСТИ:
{"action": "add_activity", "dayNumber": N, "timeSlot": "Вечер", "newActivityRequest": "что добавить", "explanation": "..."}

ТИП 3 - ПЕРЕРАСПРЕДЕЛЕНИЕ ДНЕЙ:
{"action": "redistribute", "changes": [{"city": "X", "currentDays": N, "newDays": M}], "explanation": "..."}

Верни JSON без markdown!`

            const parseRaw = await deepseekInference([
                { role: "system", content: "Анализатор запросов на изменение маршрутов." },
                { role: "user", content: parsePrompt }
            ], { maxTokens: 500, temperature: 0.3 })

            let parsedRequest
            try {
                const clean = parseRaw.match(/\{[\s\S]*\}/)?.[0] || parseRaw
                parsedRequest = JSON.parse(clean)
            } catch {
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

                const activityRaw = await deepseekInference([
                    { role: "system", content: "Генератор туристических активностей." },
                    { role: "user", content: activityPrompt }
                ], { maxTokens: 400, temperature: 0.7 })

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
        const answerPrompt = `Ты — умный ИИ-помощник по путешествиям. Пользователь просматривает маршрут.

КОНТЕКСТ ПУТЕШЕСТВИЯ:
- Название: ${tripTitle}
- Направление: ${destination}
- Бюджет: ${tripBudget}
- Дней: ${itinerary.length}

МАРШРУТ:
${itineraryContext}

РЕАЛЬНОСТЬ (2026):
${GROUNDING_DATA_2026.globalRestrictions.join(' ')}

ВОПРОС ПОЛЬЗОВАТЕЛЯ: "${userMessage}"

ПРАВИЛА:
1. Отвечай кратко и по делу (2-4 предложения)
2. Давай практичные советы
3. Если вопрос про редактирование — напомни, что можно попросить "Замени X на Y в день N"
4. Будь дружелюбным

Ответ:`

        const reply = await deepseekInference([
            { role: "system", content: "Ты полезный ассистент по путешествиям." },
            { role: "user", content: answerPrompt }
        ], { maxTokens: 400, temperature: 0.7 })

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
