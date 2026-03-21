import { NextResponse } from "next/server"
import { geminiInferenceWithUsage, type GeminiContentPart } from "@/lib/gemini"
import { GROUNDING_DATA_2026 } from "@/lib/grounding"
import { getRequestUserId, recordAiUsageEvent } from "@/lib/ai-usage-events"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import {
    buildCompactItinerarySummary,
    buildSegmentEdgeContext,
    mergeSegmentIntoItinerary,
    validateSegmentDays,
    normalizeDay,
} from "@/lib/trip-assistant-segment"

const MAX_MESSAGE_LEN = 2000
const MAX_IMAGES = 3
const MAX_IMAGE_BYTES = 2_000_000

function extractCity(title: string): string {
    if (!title) return "Unknown"
    const colonIndex = title.indexOf(":")
    if (colonIndex > 0) {
        return title.substring(0, colonIndex).trim()
    }
    return title.split(" ")[0].trim()
}

type TokenUsageAgg = {
    promptTokens: number
    completionTokens: number
    totalTokens: number
    costUsd: number
    costRub: number
    model: string
}

function emptyUsage(): TokenUsageAgg {
    return {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        costUsd: 0,
        costRub: 0,
        model: "",
    }
}

function addUsage(
    acc: TokenUsageAgg,
    u: { promptTokens?: number; completionTokens?: number; totalTokens?: number; costUsd?: number; costRub?: number; model?: string } | null | undefined
) {
    if (!u) return
    acc.promptTokens += u.promptTokens || 0
    acc.completionTokens += u.completionTokens || 0
    acc.totalTokens += u.totalTokens || 0
    acc.costUsd += u.costUsd || 0
    acc.costRub += u.costRub || 0
    if (u.model) acc.model = u.model
}

async function captionImages(
    imageDataUrls: string[],
    inferenceFn: typeof geminiInferenceWithUsage
): Promise<{ caption: string; usage: TokenUsageAgg }> {
    const acc = emptyUsage()
    if (imageDataUrls.length === 0) return { caption: "", usage: acc }

    const parts: GeminiContentPart[] = [
        {
            type: "text",
            text: `Опиши кратко (1–3 предложения на русском), что на фото и как это может относиться к планированию поездки (место, еда, достопримечательность, атмосфера). Без JSON, без списков.`,
        },
    ]
    for (const url of imageDataUrls) {
        parts.push({ type: "image_url", image_url: { url } })
    }

    const res = await inferenceFn(
        [
            {
                role: "system",
                content:
                    "Ты помощник для краткого описания изображений для туристического чата. Отвечай только описанием.",
            },
            { role: "user", content: parts },
        ],
        { maxTokens: 250, temperature: 0.2 }
    )
    addUsage(acc, res.usage)
    return { caption: res.content.trim(), usage: acc }
}

export async function POST(req: Request) {
    try {
        const userId = await getRequestUserId()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const contentType = req.headers.get("content-type") || ""
        let tripData: any
        let userMessage = ""
        let tripId: string | undefined
        let reqUserLocation: { lat: number; lng: number } | undefined
        const imageDataUrls: string[] = []

        if (contentType.includes("multipart/form-data")) {
            const form = await req.formData()
            const rawTrip = form.get("tripData")
            tripData =
                typeof rawTrip === "string" && rawTrip
                    ? JSON.parse(rawTrip)
                    : {}
            userMessage = String(form.get("userMessage") ?? "").trim()
            const tid = form.get("tripId")
            tripId = tid ? String(tid) : undefined
            const loc = form.get("userLocation")
            if (loc && typeof loc === "string") {
                try {
                    const p = JSON.parse(loc)
                    if (
                        typeof p?.lat === "number" &&
                        typeof p?.lng === "number"
                    ) {
                        reqUserLocation = p
                    }
                } catch {
                    /* ignore */
                }
            }
            const files = form
                .getAll("images")
                .filter((f): f is File => f instanceof File)
            for (const f of files.slice(0, MAX_IMAGES)) {
                const buf = Buffer.from(await f.arrayBuffer())
                if (buf.length > MAX_IMAGE_BYTES) continue
                const mime = f.type && f.type.startsWith("image/") ? f.type : "image/jpeg"
                imageDataUrls.push(
                    `data:${mime};base64,${buf.toString("base64")}`
                )
            }
        } else {
            const body = await req.json()
            tripData = body.tripData
            userMessage = String(body.userMessage ?? "").trim()
            tripId = body.tripId
            reqUserLocation = body.userLocation
        }

        if (!tripData || !userMessage) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            )
        }

        if (userMessage.length > MAX_MESSAGE_LEN) {
            return NextResponse.json(
                { error: "Invalid userMessage" },
                { status: 400 }
            )
        }

        const hasImages = imageDataUrls.length > 0
        const maxPerMinute = hasImages ? 8 : 15
        const rl = checkRateLimit(userId, "trip-assistant", maxPerMinute)
        if (!rl.allowed) return rateLimitResponse(rl)

        const inferenceFn = geminiInferenceWithUsage
        const usageTotal = emptyUsage()

        const itinerary = Array.isArray(tripData)
            ? tripData
            : tripData.itinerary || []
        const tripTitle = tripData.title || "Путешествие"
        const tripBudget = tripData.totalBudget || "Не указан"
        const destination =
            tripData.destination || tripData.countries?.[0]?.name || "неизвестно"
        const tripDaysCount = itinerary.length

        const compactSummary = buildCompactItinerarySummary(itinerary)

        let imageContext = ""
        if (hasImages) {
            const cap = await captionImages(imageDataUrls, inferenceFn)
            addUsage(usageTotal, cap.usage)
            imageContext = cap.caption
        }

        const classifyAndParsePrompt = `Проанализируй сообщение пользователя о маршруте путешествия.

ПУТЕШЕСТВИЕ: "${tripTitle}"
Направление: ${destination}
Бюджет (справочно): ${tripBudget}
Дней в маршруте: ${tripDaysCount}

КРАТКИЙ ОБЗОР ДНЕЙ (без полного JSON):
${compactSummary}
${imageContext ? `\nКОНТЕКСТ ФОТО (если были вложения): ${imageContext}\n` : ""}
СООБЩЕНИЕ: "${userMessage}"

Если пользователь хочет ИЗМЕНИТЬ маршрут — верни JSON:

Вариант 1 — редактировать/заменить одну активность:
{"intent":"MODIFY","action":"edit_activity","dayNumber":N,"timeSlot":"Утро/День/Вечер или null","currentActivity":"текущее название или null","newActivityRequest":"что хочет","explanation":"кратко"}

Вариант 2 — добавить активность в день:
{"intent":"MODIFY","action":"add_activity","dayNumber":N,"timeSlot":"Вечер","newActivityRequest":"что добавить","explanation":"..."}

Вариант 3 — ПЕРЕПИСАТЬ НЕСКОЛЬКО ДНЕЙ ПОДРЯД (заменить целиком дни startDay..endDay):
{"intent":"MODIFY","action":"rewrite_segment","startDay":A,"endDay":B,"newSegmentRequest":"что именно переделать в этих днях","explanation":"..."}

Вариант 4 — перераспределить дни по городам:
{"intent":"MODIFY","action":"redistribute","changes":[{"city":"X","currentDays":N,"newDays":M}],"explanation":"..."}

Если пользователь задаёт ВОПРОС (не хочет менять маршрут):
{"intent":"QUESTION"}

Верни ТОЛЬКО JSON, без markdown.`

        const classifyRawResponse = await inferenceFn(
            [
                {
                    role: "system",
                    content:
                        "Анализатор намерений и запросов на изменение маршрутов. Отвечай только JSON.",
                },
                { role: "user", content: classifyAndParsePrompt },
            ],
            { maxTokens: 400, temperature: 0.1, responseFormat: "json_object" }
        )
        addUsage(usageTotal, classifyRawResponse.usage)

        const classifyRaw = classifyRawResponse.content
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
            /* default question */
        }

        console.log(
            `Trip Assistant: Intent = ${intent}, Message = "${userMessage.slice(0, 80)}"`
        )

        if (intent === "MODIFY" && !parsedRequest) {
            await recordAiUsageEvent({
                userId,
                source: "trip-assistant",
                tripId,
                provider: "gemini",
                usage: usageTotal,
            })
            return NextResponse.json({
                type: "message",
                reply: "Не совсем понял, что изменить. Попробуйте:\n• \"Замени музей на кафе в день 2\"\n• \"Добавь вечерний бар в день 3\"\n• \"Перепиши дни 3–5 под семейный формат\"",
            })
        }

        if (intent === "MODIFY" && parsedRequest) {
            if (parsedRequest.action === "rewrite_segment") {
                const startDay = Number(parsedRequest.startDay)
                const endDay = Number(parsedRequest.endDay)
                if (
                    !Number.isFinite(startDay) ||
                    !Number.isFinite(endDay) ||
                    startDay < 1 ||
                    endDay < startDay ||
                    endDay > tripDaysCount
                ) {
                    return NextResponse.json({
                        type: "message",
                        reply: `Некорректный диапазон дней. В маршруте ${tripDaysCount} дн.`,
                    })
                }

                const segmentSlice = itinerary.filter(
                    (d: any) =>
                        typeof d?.day === "number" &&
                        d.day >= startDay &&
                        d.day <= endDay
                )
                if (segmentSlice.length !== endDay - startDay + 1) {
                    return NextResponse.json({
                        type: "message",
                        reply: "Не удалось сопоставить дни маршрута. Обновите страницу и попробуйте снова.",
                    })
                }

                const edges = buildSegmentEdgeContext(
                    itinerary,
                    startDay,
                    endDay
                )
                const segmentJson = JSON.stringify(segmentSlice, null, 0)

                const segmentPrompt = `Ты переписываешь ФРАГМЕНТ маршрута путешествия (несколько дней подряд). Сохраняй реалистичную логистику и согласованность с соседними днями.

ПУТЕШЕСТВИЕ: ${tripTitle}
Направление: ${destination}
Бюджет: ${tripBudget}

СОСЕДИ (не переписывай их целиком — только учитывай для стыковки):
${edges.before}
${edges.after}

ЗАПРОС ПОЛЬЗОВАТЕЛЯ: ${parsedRequest.newSegmentRequest || userMessage}
${imageContext ? `\nФОТО/КОНТЕКСТ: ${imageContext}\n` : ""}

ТЕКУЩИЙ СЕГМЕНТ (дни ${startDay}–${endDay}) — JSON:
${segmentJson}

Верни ТОЛЬКО JSON вида:
{ "days": [ /* массив дней; каждый день: day, title, tips (опционально), activities: [{ time, type, title, placeName, desc, cost, mapLink, link?, bookingUrl?, ticketUrl? }] */ ] }

Правила:
- Ровно ${endDay - startDay + 1} дней. Поля day должны идти подряд от ${startDay} до ${endDay}.
- type активности: transport | hotel | food | activity | free
- mapLink: Google Maps поиск места (https://www.google.com/maps/search/?api=1&query=...)
- Короткие описания, конкретные названия мест.
- Согласуй переезды/отели с соседями, если запрос это подразумевает.

JSON:`

                const segmentRawResponse = await inferenceFn(
                    [
                        {
                            role: "system",
                            content:
                                "Генератор фрагментов туристического маршрута. Отвечай только JSON.",
                        },
                        { role: "user", content: segmentPrompt },
                    ],
                    {
                        maxTokens: 8192,
                        temperature: 0.55,
                        responseFormat: "json_object",
                    }
                )
                addUsage(usageTotal, segmentRawResponse.usage)

                let parsedSegment: any
                try {
                    const clean =
                        segmentRawResponse.content.match(/\{[\s\S]*\}/)?.[0] ||
                        segmentRawResponse.content
                    parsedSegment = JSON.parse(clean)
                } catch {
                    return NextResponse.json({
                        type: "message",
                        reply: "Не удалось разобрать ответ для сегмента маршрута. Сформулируйте запрос короче и попробуйте снова.",
                    })
                }

                const segmentDays = parsedSegment?.days ?? parsedSegment
                const vErr = validateSegmentDays(
                    Array.isArray(segmentDays) ? segmentDays : [],
                    startDay,
                    endDay
                )
                if (vErr) {
                    return NextResponse.json({
                        type: "message",
                        reply: `Не прошла проверка маршрута: ${vErr}. Уточните запрос (город, даты, стиль дня).`,
                    })
                }

                let newItinerary: any[]
                try {
                    const normalizedSeg = (
                        segmentDays as any[]
                    ).map((d) => normalizeDay(d))
                    newItinerary = mergeSegmentIntoItinerary(
                        itinerary,
                        normalizedSeg,
                        startDay,
                        endDay
                    )
                } catch (e: any) {
                    return NextResponse.json({
                        type: "message",
                        reply: e?.message || "Не удалось объединить сегмент с маршрутом.",
                    })
                }

                await recordAiUsageEvent({
                    userId,
                    source: "trip-assistant",
                    tripId,
                    provider: "gemini",
                    usage: usageTotal,
                })

                return NextResponse.json({
                    type: "modification",
                    reply: `✅ ${parsedRequest.explanation || `Обновлены дни ${startDay}–${endDay}`}`,
                    modifications: [{ type: "replace_all_days", newItinerary }],
                })
            }

            if (
                parsedRequest.action === "edit_activity" ||
                parsedRequest.action === "add_activity"
            ) {
                const { dayNumber, timeSlot, currentActivity, newActivityRequest } =
                    parsedRequest
                const targetDay = itinerary.find(
                    (d: any) => d.day === dayNumber
                )

                if (!targetDay) {
                    return NextResponse.json({
                        type: "message",
                        reply: `День ${dayNumber} не найден в маршруте. У вас ${itinerary.length} дней.`,
                    })
                }

                const city = extractCity(targetDay.title)

                const activityPrompt = `Сгенерируй активность для путешествия.
Город: ${city}
Запрос: "${newActivityRequest}"
Время: ${timeSlot || "День"}

Поля type: activity | food | hotel | transport | free
Верни JSON:
{
  "time": "${timeSlot || "День"}",
  "type": "activity",
  "title": "краткий заголовок",
  "placeName": "КОНКРЕТНОЕ название",
  "desc": "2-3 предложения",
  "cost": "цена ₽",
  "mapLink": "https://www.google.com/maps/search/?api=1&query=...",
  "link": ""
}`

                const activityRawResponse = await inferenceFn(
                    [
                        {
                            role: "system",
                            content: "Генератор туристических активностей.",
                        },
                        { role: "user", content: activityPrompt },
                    ],
                    { maxTokens: 500, temperature: 0.7, responseFormat: "json_object" }
                )
                addUsage(usageTotal, activityRawResponse.usage)

                const activityRaw = activityRawResponse.content

                let newActivity: any
                try {
                    const clean =
                        activityRaw.match(/\{[\s\S]*\}/)?.[0] || activityRaw
                    newActivity = JSON.parse(clean)
                } catch {
                    return NextResponse.json({
                        type: "message",
                        reply: "Не удалось сгенерировать активность. Попробуйте еще раз.",
                    })
                }

                const newItinerary = itinerary.map((day: any) => {
                    if (day.day !== dayNumber) return day

                    let updatedActivities = [...(day.activities || [])]

                    if (parsedRequest.action === "add_activity") {
                        updatedActivities.push(newActivity)
                    } else if (timeSlot) {
                        const idx = updatedActivities.findIndex(
                            (a: any) =>
                                a.time?.toLowerCase() ===
                                String(timeSlot).toLowerCase()
                        )
                        if (idx >= 0) {
                            updatedActivities[idx] = {
                                ...newActivity,
                                time: timeSlot,
                            }
                        } else {
                            updatedActivities.push({
                                ...newActivity,
                                time: timeSlot,
                            })
                        }
                    } else if (currentActivity) {
                        const idx = updatedActivities.findIndex((a: any) =>
                            a.placeName
                                ?.toLowerCase()
                                .includes(String(currentActivity).toLowerCase())
                        )
                        if (idx >= 0) {
                            updatedActivities[idx] = newActivity
                        } else {
                            updatedActivities.push(newActivity)
                        }
                    } else {
                        updatedActivities.push(newActivity)
                    }

                    const dayTotal = updatedActivities.reduce(
                        (sum: number, a: any) => {
                            return (
                                sum +
                                (parseInt(
                                    String(a.cost || "0").replace(/[^0-9]/g, ""),
                                    10
                                ) || 0)
                            )
                        },
                        0
                    )

                    return {
                        ...day,
                        activities: updatedActivities,
                        dayTotal: `${dayTotal.toLocaleString("ru-RU")} ₽`,
                    }
                })

                await recordAiUsageEvent({
                    userId,
                    source: "trip-assistant",
                    tripId,
                    provider: "gemini",
                    usage: usageTotal,
                })
                return NextResponse.json({
                    type: "modification",
                    reply: `✅ ${parsedRequest.explanation || `Обновил день ${dayNumber}`}`,
                    modifications: [{ type: "replace_all_days", newItinerary }],
                })
            }

            if (parsedRequest.action === "redistribute") {
                return NextResponse.json({
                    type: "message",
                    reply: "Для изменения количества дней используйте конкретные примеры:\n• \"Сократи Сочи до 3 дней\"\n• \"Добавь 2 дня в Токио\"\n\nИли измените отдельные активности / попросите переписать диапазон дней (например дни 3–5).",
                })
            }

            return NextResponse.json({
                type: "message",
                reply: "Не совсем понял, что изменить. Попробуйте:\n• \"Замени музей на кафе в день 2\"\n• \"Добавь вечерний бар в день 3\"\n• \"Перепиши дни 4–6 под более спокойный темп\"",
            })
        }

        const itineraryContext = itinerary
            .map(
                (day: any) =>
                    `День ${day.day}: ${day.title}\n  Активности: ${day.activities?.map((a: any) => `${a.time}: ${a.placeName}`).join(", ") || "нет"}`
            )
            .join("\n")

        const currentDate = new Date().toLocaleDateString("ru-RU", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        })
        const locationStr = reqUserLocation
            ? `${reqUserLocation.lat.toFixed(4)}, ${reqUserLocation.lng.toFixed(4)}`
            : "Неизвестно"

        const answerPrompt = `Ты — умный ИИ-помощник по путешествиям. Пользователь просматривает маршрут.

СЕГОДНЯ: ${currentDate}
ТЕКУЩАЯ ГЕОЛОКАЦИЯ ПОЛЬЗОВАТЕЛЯ: ${locationStr}
${imageContext ? `КОНТЕКСТ ВЛОЖЕННЫХ ФОТО: ${imageContext}\n` : ""}
КОНТЕКСТ ПУТЕШЕСТВИЯ:
- Название: ${tripTitle}
- Направление: ${destination}
- Бюджет: ${tripBudget}
- Дней: ${itinerary.length}

МАРШРУТ:
${itineraryContext}

РЕАЛЬНОСТЬ (2026):
${GROUNDING_DATA_2026.globalRestrictions.join(" ")}

ВОПРОС ПОЛЬЗОВАТЕЛЯ: "${userMessage}"

ПРАВИЛА:
1. Если пользователь спрашивает "где я?" или "что рядом?", используй его геолокацию.
2. Отвечай кратко и по делу (2-5 предложений). Давай полезные ссылки только если уверен (официальные сайты, карты).
3. Практичные советы.
4. Если вопрос про редактирование — напомни, что можно попросить "Замени X на Y в день N" или "Перепиши дни A–B под ...".
5. Будь дружелюбным.

Ответ:`

        const replyResponse = await inferenceFn(
            [
                {
                    role: "system",
                    content: "Ты полезный ассистент по путешествиям.",
                },
                { role: "user", content: answerPrompt },
            ],
            { maxTokens: 500, temperature: 0.7 }
        )
        addUsage(usageTotal, replyResponse.usage)

        const reply = replyResponse.content

        await recordAiUsageEvent({
            userId,
            source: "trip-assistant",
            tripId,
            provider: "gemini",
            usage: usageTotal,
        })
        return NextResponse.json({
            type: "message",
            reply: reply.trim(),
        })
    } catch (error: any) {
        console.error("Trip Assistant Error:", error)
        return NextResponse.json(
            {
                error: error.message || "Unknown error",
            },
            { status: 500 }
        )
    }
}
