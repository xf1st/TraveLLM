import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { geminiInferenceWithUsage, type GeminiContentPart } from "@/lib/gemini"
import { GROUNDING_DATA_2026 } from "@/lib/grounding"
import {
    getRequestUserId,
    recordAiUsageEvent,
    checkMonthlyChatAiLimit,
    monthlyChatAiLimitResponse,
} from "@/lib/ai-usage-events"
import { enforceAiAccess } from "@/lib/server/user-access"
import { fetchTripOwnedByUser, tripRowToAssistantPayload } from "@/lib/server/trip-for-ai"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import {
    buildCompactItinerarySummary,
    buildSegmentEdgeContext,
    mergeSegmentIntoItinerary,
    validateSegmentDays,
    type TripAssistantLocale,
} from "@/lib/trip-assistant-segment"
import {
    captionInstruction,
    captionSystem,
    classifierSystem,
    buildClassifierPrompt,
    buildAnswerPrompt,
    segmentSystem,
    buildSegmentUserPrompt,
    activitySystem,
    buildActivityUserPrompt,
} from "@/lib/trip-assistant-prompts"
import {
    parseConversationHistory,
    formatConversationBlock,
} from "@/lib/trip-assistant-conversation"
import { sanitizeMislabeledForeignCosts } from "@/lib/cost-sanity"

const MAX_MESSAGE_LEN = 2000
const MAX_IMAGES = 3
const MAX_IMAGE_BYTES = 2_000_000

/** Нормализует start/end для rewrite_segment: хвост до конца, «rewriteToEnd», контекстный день. */
function normalizeRewriteSegmentDays(
    parsed: any,
    tripDaysCount: number,
    contextDay?: number
): { startDay: number; endDay: number } | null {
    if (tripDaysCount < 1) return null

    const rawEnd = parsed?.endDay
    const endStr = typeof rawEnd === "string" ? rawEnd.toLowerCase().trim() : ""
    const rewriteToEnd =
        parsed?.rewriteToEnd === true ||
        endStr === "last" ||
        endStr === "end"

    let endDay: number
    if (rewriteToEnd) {
        endDay = tripDaysCount
    } else {
        endDay = Number(rawEnd)
    }

    let startDay = Number(parsed?.startDay)
    if (!Number.isFinite(startDay)) {
        if (
            contextDay != null &&
            contextDay >= 1 &&
            contextDay <= tripDaysCount
        ) {
            startDay = contextDay
        } else {
            return null
        }
    }

    if (!Number.isFinite(endDay) || endDay < 1) {
        endDay = tripDaysCount
    }

    if (startDay < 1) startDay = 1
    if (endDay > tripDaysCount) endDay = tripDaysCount
    if (endDay < startDay) return null

    return { startDay, endDay }
}

function parseOptionalContextDay(
    raw: unknown,
    tripDaysCount: number
): number | undefined {
    if (raw === undefined || raw === null || raw === "") return undefined
    const n = Number(raw)
    if (!Number.isFinite(n)) return undefined
    const d = Math.floor(n)
    if (d < 1 || d > tripDaysCount) return undefined
    return d
}

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
    inferenceFn: typeof geminiInferenceWithUsage,
    locale: TripAssistantLocale
): Promise<{ caption: string; usage: TokenUsageAgg }> {
    const acc = emptyUsage()
    if (imageDataUrls.length === 0) return { caption: "", usage: acc }

    const parts: GeminiContentPart[] = [
        {
            type: "text",
            text: captionInstruction(locale),
        },
    ]
    for (const url of imageDataUrls) {
        parts.push({ type: "image_url", image_url: { url } })
    }

    const res = await inferenceFn(
        [
            {
                role: "system",
                content: captionSystem(locale),
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

        const accessErr = await enforceAiAccess(userId)
        if (accessErr) return accessErr

        const contentType = req.headers.get("content-type") || ""
        let tripData: any
        let userMessage = ""
        let tripId: string | undefined
        let reqUserLocation: { lat: number; lng: number } | undefined
        let rawContextDay: unknown
        let rawConversationHistory: unknown
        const imageDataUrls: string[] = []
        let locale: TripAssistantLocale = "ru"

        // Reject oversized requests before parsing (DoS protection)
        const contentLength = parseInt(req.headers.get("content-length") || "0", 10)
        if (contentLength > 10 * 1024 * 1024) {
            return NextResponse.json({ error: "Payload too large" }, { status: 413 })
        }

        if (contentType.includes("multipart/form-data")) {
            const form = await req.formData()
            const rawTrip = form.get("tripData")
            tripData =
                typeof rawTrip === "string" && rawTrip
                    ? JSON.parse(rawTrip)
                    : {}
            userMessage = String(form.get("userMessage") ?? "").trim()
            const locField = form.get("locale")
            if (locField === "en" || locField === "ru") locale = locField
            const tid = form.get("tripId")
            tripId = tid ? String(tid) : undefined
            rawContextDay = form.get("contextDay")
            const histField = form.get("conversationHistory")
            if (typeof histField === "string" && histField.trim()) {
                try {
                    rawConversationHistory = JSON.parse(histField)
                } catch {
                    rawConversationHistory = undefined
                }
            }
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
            rawContextDay = body.contextDay
            rawConversationHistory = body.conversationHistory
            if (body.locale === "en" || body.locale === "ru") locale = body.locale
        }

        if (!tripData || !userMessage) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            )
        }

        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        let normalizedTripId: string | undefined
        if (tripId != null && String(tripId).trim() !== "") {
            const tid = String(tripId).trim()
            if (!UUID_RE.test(tid)) {
                return NextResponse.json({ error: "Invalid tripId" }, { status: 400 })
            }
            normalizedTripId = tid
        }

        if (normalizedTripId) {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
            const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
            if (!supabaseUrl || !supabaseKey) {
                return NextResponse.json({ error: "Server misconfigured" }, { status: 503 })
            }
            const admin = createClient(supabaseUrl, supabaseKey, {
                auth: { autoRefreshToken: false, persistSession: false },
            })
            const owned = await fetchTripOwnedByUser(admin, normalizedTripId, userId)
            if (!owned.ok) {
                return NextResponse.json(
                    { error: "Trip not found or access denied" },
                    { status: 403 },
                )
            }
            tripData = tripRowToAssistantPayload(owned.trip)
            tripId = normalizedTripId
        } else {
            const rawIt = Array.isArray(tripData) ? tripData : tripData?.itinerary
            if (Array.isArray(rawIt) && rawIt.length > 60) {
                return NextResponse.json(
                    {
                        error: "Itinerary too large without tripId. Open a saved trip or shorten the plan.",
                    },
                    { status: 400 },
                )
            }
        }

        if (userMessage.length > MAX_MESSAGE_LEN) {
            return NextResponse.json(
                { error: "Invalid userMessage" },
                { status: 400 }
            )
        }

        const chatLimit = await checkMonthlyChatAiLimit(userId)
        if (!chatLimit.allowed) return monthlyChatAiLimitResponse(chatLimit)

        const hasImages = imageDataUrls.length > 0
        const maxPerMinute = hasImages ? 8 : 15
        const rl = checkRateLimit(userId, "trip-assistant", maxPerMinute)
        if (!rl.allowed) return rateLimitResponse(rl)

        const inferenceFn = geminiInferenceWithUsage
        const usageTotal = emptyUsage()

        const itinerary = Array.isArray(tripData)
            ? tripData
            : tripData.itinerary || []
        const tripDaysCount = itinerary.length
        const contextDay = parseOptionalContextDay(rawContextDay, tripDaysCount)
        const historyMessages = parseConversationHistory(rawConversationHistory)
        const conversationBlock = formatConversationBlock(locale, historyMessages)
        const tripTitle =
            tripData.title || (locale === "en" ? "Trip" : "Путешествие")
        const tripBudget =
            tripData.totalBudget ||
            (locale === "en" ? "Not specified" : "Не указан")
        const destination =
            tripData.destination ||
            tripData.countries?.[0]?.name ||
            (locale === "en" ? "unknown" : "неизвестно")

        const compactSummary = buildCompactItinerarySummary(itinerary, locale)

        let imageContext = ""
        if (hasImages) {
            const cap = await captionImages(imageDataUrls, inferenceFn, locale)
            addUsage(usageTotal, cap.usage)
            imageContext = cap.caption
        }

        const classifyAndParsePrompt = buildClassifierPrompt(locale, {
            tripTitle,
            destination,
            tripBudget,
            tripDaysCount,
            compactSummary,
            imageContext,
            userMessage,
            contextDay,
            conversationBlock,
        })

        const classifyRawResponse = await inferenceFn(
            [
                {
                    role: "system",
                    content: classifierSystem(locale),
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
                reply:
                    locale === "en"
                        ? "I’m not sure what to change. Try:\n• “Replace the museum with a café on day 2”\n• “Add an evening bar on day 3”\n• “Rewrite days 3–5 for a slower pace”"
                        : "Не совсем понял, что изменить. Попробуйте:\n• \"Замени музей на кафе в день 2\"\n• \"Добавь вечерний бар в день 3\"\n• \"Перепиши дни 3–5 под семейный формат\"",
            })
        }

        if (intent === "MODIFY" && parsedRequest) {
            if (parsedRequest.action === "rewrite_segment") {
                const normalized = normalizeRewriteSegmentDays(
                    parsedRequest,
                    tripDaysCount,
                    contextDay
                )
                if (!normalized) {
                    return NextResponse.json({
                        type: "message",
                        reply:
                            locale === "en"
                                ? `Invalid day range. This itinerary has ${tripDaysCount} day(s). Say which days to rewrite (e.g. days 3–5 or “rest of trip”).`
                                : `Некорректный диапазон дней. В маршруте ${tripDaysCount} дн. Укажите дни (например 3–5 или «остаток с текущего дня»).`,
                    })
                }
                const { startDay, endDay } = normalized

                const segmentSlice = itinerary.filter(
                    (d: any) =>
                        typeof d?.day === "number" &&
                        d.day >= startDay &&
                        d.day <= endDay
                )
                if (segmentSlice.length !== endDay - startDay + 1) {
                    return NextResponse.json({
                        type: "message",
                        reply:
                            locale === "en"
                                ? "Could not match itinerary days. Refresh the page and try again."
                                : "Не удалось сопоставить дни маршрута. Обновите страницу и попробуйте снова.",
                    })
                }

                const edges = buildSegmentEdgeContext(
                    itinerary,
                    startDay,
                    endDay,
                    locale
                )
                const segmentJson = JSON.stringify(segmentSlice, null, 0)

                const segmentPrompt = buildSegmentUserPrompt(locale, {
                    tripTitle,
                    destination,
                    tripBudget,
                    edgesBefore: edges.before,
                    edgesAfter: edges.after,
                    userRequest: parsedRequest.newSegmentRequest || userMessage,
                    imageContext,
                    segmentJson,
                    startDay,
                    endDay,
                    priorChatSummary: conversationBlock || undefined,
                })

                const segmentRawResponse = await inferenceFn(
                    [
                        {
                            role: "system",
                            content: segmentSystem(locale),
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
                        reply:
                            locale === "en"
                                ? "Could not parse the segment response. Try a shorter request."
                                : "Не удалось разобрать ответ для сегмента маршрута. Сформулируйте запрос короче и попробуйте снова.",
                    })
                }

                const segmentDays = parsedSegment?.days ?? parsedSegment
                const vErr = validateSegmentDays(
                    Array.isArray(segmentDays) ? segmentDays : [],
                    startDay,
                    endDay,
                    locale
                )
                if (vErr) {
                    return NextResponse.json({
                        type: "message",
                        reply:
                            locale === "en"
                                ? `Validation failed: ${vErr}. Add more detail (city, dates, pace).`
                                : `Не прошла проверка маршрута: ${vErr}. Уточните запрос (город, даты, стиль дня).`,
                    })
                }

                let newItinerary: any[]
                try {
                    newItinerary = mergeSegmentIntoItinerary(
                        itinerary,
                        Array.isArray(segmentDays) ? segmentDays : [],
                        startDay,
                        endDay,
                        locale
                    )
                    const mergedRoute = { ...tripData, itinerary: newItinerary }
                    sanitizeMislabeledForeignCosts(mergedRoute)
                    newItinerary = mergedRoute.itinerary
                } catch (e: any) {
                    return NextResponse.json({
                        type: "message",
                        reply:
                            e?.message ||
                            (locale === "en"
                                ? "Could not merge the segment into the itinerary."
                                : "Не удалось объединить сегмент с маршрутом."),
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
                    reply: `✅ ${
                        parsedRequest.explanation ||
                        (locale === "en"
                            ? `Updated days ${startDay}–${endDay}`
                            : `Обновлены дни ${startDay}–${endDay}`)
                    }`,
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
                        reply:
                            locale === "en"
                                ? `Day ${dayNumber} not found. This itinerary has ${itinerary.length} day(s).`
                                : `День ${dayNumber} не найден в маршруте. У вас ${itinerary.length} дней.`,
                    })
                }

                const city = extractCity(targetDay.title)

                const activityPrompt = buildActivityUserPrompt(locale, {
                    city,
                    newActivityRequest: String(newActivityRequest ?? ""),
                    timeSlot: String(timeSlot ?? ""),
                    priorChatSummary: conversationBlock || undefined,
                })

                const activityRawResponse = await inferenceFn(
                    [
                        {
                            role: "system",
                            content: activitySystem(locale),
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
                        reply:
                            locale === "en"
                                ? "Could not generate the activity. Please try again."
                                : "Не удалось сгенерировать активность. Попробуйте еще раз.",
                    })
                }

                const locTag = locale === "en" ? "en-US" : "ru-RU"
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
                        dayTotal: `${dayTotal.toLocaleString(locTag)} ₽`,
                    }
                })

                const mergedActRoute = { ...tripData, itinerary: newItinerary }
                sanitizeMislabeledForeignCosts(mergedActRoute)
                const finalItinerary = mergedActRoute.itinerary

                await recordAiUsageEvent({
                    userId,
                    source: "trip-assistant",
                    tripId,
                    provider: "gemini",
                    usage: usageTotal,
                })
                return NextResponse.json({
                    type: "modification",
                    reply: `✅ ${
                        parsedRequest.explanation ||
                        (locale === "en"
                            ? `Updated day ${dayNumber}`
                            : `Обновил день ${dayNumber}`)
                    }`,
                    modifications: [{ type: "replace_all_days", newItinerary: finalItinerary }],
                })
            }

            if (parsedRequest.action === "redistribute") {
                return NextResponse.json({
                    type: "message",
                    reply:
                        locale === "en"
                            ? "To change how many days you spend in each place, use concrete examples:\n• “Shorten Sochi to 3 days”\n• “Add 2 days in Tokyo”\n\nOr edit single activities / ask to rewrite a range of days (e.g. days 3–5)."
                            : "Для изменения количества дней используйте конкретные примеры:\n• \"Сократи Сочи до 3 дней\"\n• \"Добавь 2 дня в Токио\"\n\nИли измените отдельные активности / попросите переписать диапазон дней (например дни 3–5).",
                })
            }

            return NextResponse.json({
                type: "message",
                reply:
                    locale === "en"
                        ? "I’m not sure what to change. Try:\n• “Replace the museum with a café on day 2”\n• “Add an evening bar on day 3”\n• “Rewrite days 4–6 for a calmer pace”"
                        : "Не совсем понял, что изменить. Попробуйте:\n• \"Замени музей на кафе в день 2\"\n• \"Добавь вечерний бар в день 3\"\n• \"Перепиши дни 4–6 под более спокойный темп\"",
            })
        }

        const dayWord = locale === "en" ? "Day" : "День"
        const actWord = locale === "en" ? "Activities" : "Активности"
        const noneAct = locale === "en" ? "none" : "нет"
        const itineraryContext = itinerary
            .map(
                (day: any) =>
                    `${dayWord} ${day.day}: ${day.title}\n  ${actWord}: ${day.activities?.map((a: any) => `${a.time}: ${a.placeName}`).join(", ") || noneAct}`
            )
            .join("\n")

        const currentDate = new Date().toLocaleDateString(
            locale === "en" ? "en-US" : "ru-RU",
            {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
            }
        )
        const locationStr = reqUserLocation
            ? `${reqUserLocation.lat.toFixed(4)}, ${reqUserLocation.lng.toFixed(4)}`
            : locale === "en"
              ? "Unknown"
              : "Неизвестно"

        const { system: answerSystem, user: answerUser } = buildAnswerPrompt(
            locale,
            {
                currentDate,
                locationStr,
                imageContext,
                tripTitle,
                destination,
                tripBudget,
                dayCount: itinerary.length,
                itineraryContext,
                grounding: GROUNDING_DATA_2026.globalRestrictions.join(" "),
                userMessage,
                contextDay,
                conversationBlock,
            }
        )

        const replyResponse = await inferenceFn(
            [
                {
                    role: "system",
                    content: answerSystem,
                },
                { role: "user", content: answerUser },
            ],
            { maxTokens: 600, temperature: 0.7 }
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
                error: "Internal server error",
            },
            { status: 500 }
        )
    }
}
