// Gemini (Primary) -> DeepSeek (Fallback)
import { jsonrepair } from "jsonrepair"
import { geminiInference, getGeminiSessionUsage, resetGeminiSessionUsage } from "@/lib/gemini"
import { deepseekInference, getSessionUsage as getDeepSeekSessionUsage, resetSessionUsage as resetDeepSeekSessionUsage } from "@/lib/deepseek"
import { NextResponse } from "next/server"
import { getDestinationImage } from "@/lib/images"
import { createClient } from '@supabase/supabase-js'
import {
    getRequestUserId,
    recordAiUsageEvent,
    checkMonthlyGenerationLimit,
    monthlyGenerationBackendUnavailableResponse,
} from "@/lib/ai-usage-events"
import { enforceAiAccess } from "@/lib/server/user-access"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { validateRouteRequest, type ValidationResult } from "@/lib/real-time-validation"
import { collectDynamicContext, formatDynamicContextForPrompt } from "@/lib/context/dynamic-context"
import { 
    enrichTransportLinks, 
    sanitizeClosedAirportLogistics, 
    normalizeActivityTypes, 
    collectRealTimeSearchContext,
    removeSameCityFlights,
    enrichViralSpotsWithWebSearch
} from "@/lib/api/route-pipeline"
import { checkDirectFlightsLive } from "@/lib/travelpayouts"
import { validateAirports } from "@/lib/api/airport-validator"
import { buildEnrichedPrompt, buildMetadataPrompt, buildDayChunkPrompt } from "@/lib/prompt-builder"
import { normalizeTravelMode } from "@/lib/travel-mode"
import { type RouteData, type ItineraryDay } from "@/types/itinerary"

export const maxDuration = 60; // Allow long-running generations

export async function POST(req: Request) {
    try {
        const userId = await getRequestUserId()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const accessErr = await enforceAiAccess(userId)
        if (accessErr) return accessErr

        // Rate limit: max 5 generation requests per minute per user
        const rl = checkRateLimit(userId, "gemini-generation", 5)
        if (!rl.allowed) return rateLimitResponse(rl)

        // Monthly generation limit: 10 per user
        const genLimit = await checkMonthlyGenerationLimit(userId)
        if (!genLimit.allowed) {
            if (genLimit.backendUnavailable) {
                return monthlyGenerationBackendUnavailableResponse()
            }
            return NextResponse.json({
                error: "Лимит исчерпан",
                message: `Вы использовали все ${genLimit.limit} генераций в этом месяце. Лимит обновится ${new Date(genLimit.resetAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}.`,
                limitExceeded: true,
                count: genLimit.count,
                limit: genLimit.limit,
                resetAt: genLimit.resetAt,
            }, { status: 429 })
        }

        // Check maintenance mode & block status
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
        }
        const supabase = createClient(supabaseUrl, supabaseKey)

        const { data: settings } = await supabase.from('app_settings').select('maintenance_mode, maintenance_message').single()
        if (settings?.maintenance_mode) {
            return NextResponse.json({ error: 'Maintenance', message: settings.maintenance_message }, { status: 503 })
        }

        const body = await req.json()
        const {
            departureCity, destinationType, countryCount, budget, startDate, endDate,
            travelStyle, companions, preferences, paymentMethods, requireRussianGuide,
            customDestination, customBudget, travelers, filterByDocuments, tripHighlight, tripVibe,
            strictDestinations, locale, travelMode: travelModeBody,
        } = body
        const userLocale: 'ru' | 'en' = locale === 'en' ? 'en' : 'ru'
        const travelMode = normalizeTravelMode(travelModeBody)

        const safeHighlight = tripHighlight ? String(tripHighlight).replace(/"/g, "'").slice(0, 300) : ''
        const safeTripVibe = tripVibe ? String(tripVibe).replace(/"/g, "'").slice(0, 2000) : ''
        const effectiveDepartureCity = departureCity || preferences?.departureCity || "Москва"
        const travelersCount = parseInt(travelers) || 2
        const durationDays = startDate && endDate
            ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
            : 7

        // Helper to safely convert value to array
        const toArray = (val: any): string[] => {
            if (!val) return []
            if (Array.isArray(val)) return val.filter(Boolean)
            if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean)
            return []
        }

        // Define budget caps (max 10M ₽ to prevent unrealistic values)
        const MAX_BUDGET = 10_000_000;
        let budgetCap = 15000 * durationDays;
        if (budget === "custom" && customBudget) {
            budgetCap = Math.min(parseInt(customBudget.replace(/\D/g, '')) || 100000, MAX_BUDGET);
        } else if (budget === "economy") budgetCap = 7500 * durationDays;
        else if (budget === "comfort") budgetCap = 20000 * durationDays;
        else if (budget === "premium" || budget === "luxury") budgetCap = 50000 * durationDays;
        budgetCap = Math.min(budgetCap, MAX_BUDGET);

        const budgetDesc = userLocale === 'en'
            ? `Budget: $${Math.round(budgetCap / 90).toLocaleString('en-US')} for ${durationDays} days`
            : `Бюджет: ${budgetCap.toLocaleString('ru-RU')} ₽ на ${durationDays} дней`

        const destinations = strictDestinations === false ? [] : (customDestination ? customDestination.split(';').map((s: string) => s.trim()).filter(Boolean) : [])

        // =====================================
        // REAL-TIME VALIDATION & CONTEXT
        // =====================================
        let dynamicContextStr = ""
        let adjustedBudget = budgetCap
        let warningsStr = ""

        if (destinations.length > 0 && startDate && endDate) {
            try {
                const validation = await validateRouteRequest({
                    departureCity: effectiveDepartureCity,
                    destinations,
                    startDate,
                    endDate,
                    budget: budgetCap,
                    citizenship: preferences?.citizenship || "RU"
                })

                if (validation.blockers.length > 0) {
                    return NextResponse.json({ error: validation.blockers[0].message }, { status: 400 })
                }

                adjustedBudget = validation.adjustedBudget || budgetCap
                warningsStr = validation.warnings?.map(w => w.message).join('; ') || ''

                const dynamicContext = await collectDynamicContext({
                    departureCity: effectiveDepartureCity,
                    destinations,
                    startDate,
                    endDate,
                    interests: toArray(preferences?.interestsDetailed),
                    travelStyle: toArray(travelStyle)[0]
                })
                dynamicContextStr = formatDynamicContextForPrompt(dynamicContext)
            } catch (e) {
                console.error("[Validation Error]", e)
            }
        }

        // Live check for first destination (flight-oriented; skip when user chose train/car as primary mode)
        if (destinations.length > 0) {
            try {
                if (travelMode === "flight") {
                    const flightCheck = await checkDirectFlightsLive(effectiveDepartureCity, destinations[0], startDate)
                    if (flightCheck.hasDirect) {
                        dynamicContextStr += `\n🛫 Прямые рейсы в ${destinations[0]} доступны от ${flightCheck.minPrice} ${flightCheck.currency}.`
                    } else {
                        dynamicContextStr += `\n🚆 Прямых рейсов в ${destinations[0]} нет, предложи поезд или рейс с пересадкой.`
                    }
                } else if (travelMode === "train") {
                    dynamicContextStr += `\n🚆 РЕЖИМ МАРШРУТА: пользователь выбрал ж/д как основной транспорт — не навязывай авиа без необходимости.`
                } else {
                    dynamicContextStr += `\n🚗 РЕЖИМ МАРШРУТА: пользователь выбрал автопутешествие — планируй переезды на машине; авиа только если дорога нереалистична.`
                }
                const searchContext = await collectRealTimeSearchContext(effectiveDepartureCity, destinations, startDate)
                if (searchContext) dynamicContextStr += searchContext
            } catch (e) {
                console.error("[Pre-Check Error]", e)
            }
        }

        // Validate destination airports via AeroDataBox (dynamic, not static)
        let airportValidationContext = ""
        if (destinations.length > 0) {
            try {
                const validation = await validateAirports(destinations)
                if (!validation.allOpen && validation.closedAirports.length > 0) {
                    airportValidationContext = `СТАТУС АЭРОПОРТОВ: ${validation.closedAirports.join('; ')} — авиаперелёт НЕДОСТУПЕН, используй наземный транспорт или хаб пересадки.`
                    console.log(`[AirportValidation] Closed: ${validation.closedAirports.join(', ')}`)
                }
            } catch (e) {
                console.error("[Airport Validation Error]", e)
            }
        }

        const travelStyles = toArray(travelStyle)
        const enriched = await buildEnrichedPrompt({
            locale: userLocale,
            departureCity: effectiveDepartureCity,
            destinations,
            startDate,
            endDate,
            budget: budgetCap,
            adjustedBudget,
            budgetDesc,
            travelStyle: travelStyles,
            companions,
            travelers: travelersCount,
            preferences,
            dynamicContextStr,
            warningsStr,
            safeHighlight,
            tripVibe: safeTripVibe || undefined,
            destinationType,
            strictDestinations,
            countryCount,
            filterByDocuments,
            airportValidationContext,
            travelMode,
        })

        const { systemPrompt, userPrompt: prompt } = enriched
        const aiTemperature = (body.aiCreativity || preferences?.aiCreativity) === "creative" ? 0.8 : 0.6

        // Helper to parse JSON from AI response (with jsonrepair fallback)
        function parseJsonResponse(raw: string, source: string): any {
            if (!raw) throw new Error(`Empty response from ${source}`)
            const clean = (raw.match(/\{[\s\S]*\}/)?.[0] ?? raw)
                .replace(/```json\s*/g, '').replace(/```\s*/g, '')
            try {
                return JSON.parse(clean)
            } catch {
                console.warn(`[${source}] JSON malformed, attempting repair…`)
                try {
                    return JSON.parse(jsonrepair(clean))
                } catch (e2) {
                    console.error(`[${source}] JSON repair failed`, e2)
                    throw new Error(`JSON parse failed after repair attempt: ${(e2 as Error).message}`)
                }
            }
        }

        async function generateMetadata(): Promise<any> {
            const metaPrompt = buildMetadataPrompt({
                locale: userLocale,
                departureCity: effectiveDepartureCity, destinations, startDate, endDate,
                budget: budgetCap, budgetDesc, travelStyle: travelStyles, countryCount,
                safeHighlight, warningsStr, preferences,
                tripVibe: safeTripVibe || undefined,
                travelMode,
                strictDestinations,
            })
            const messages = [{ role: "system" as const, content: systemPrompt }, { role: "user" as const, content: metaPrompt }]
            const raw = await geminiInference(messages, { maxTokens: 2000, temperature: aiTemperature });
            return parseJsonResponse(raw, "Gemini-Meta");
        }

        async function generateDayChunk(startDay: number, endDay: number, destination: string, previousContext: any, tripPlan: any): Promise<ItineraryDay[]> {
            const chunkPrompt = buildDayChunkPrompt({
                startDay, endDay, durationDays, departureCity: effectiveDepartureCity,
                destination, budgetDesc, travelStyle: travelStyles, preferences,
                safeHighlight, warningsStr, previousContext,
                tripVibe: safeTripVibe || undefined,
                locale: userLocale,
                travelMode,
                planForChunk: (tripPlan || []).filter((s: any) => s.startDay <= endDay && s.endDay >= startDay)
                    .map((s: any) => `Дни ${Math.max(s.startDay, startDay)}-${Math.min(s.endDay, endDay)}: ${s.city}`).join('\n')
            })
            const messages = [{ role: "system" as const, content: systemPrompt }, { role: "user" as const, content: chunkPrompt }]
            const raw = await geminiInference(messages, { maxTokens: 8192, temperature: aiTemperature });
            const clean = (raw.match(/\[[\s\S]*\]/)?.[0] ?? raw)
                .replace(/```json\s*/g, '').replace(/```\s*/g, '')
            try {
                return JSON.parse(clean)
            } catch {
                console.warn(`[Gemini-Chunk] JSON malformed, attempting repair…`)
                return JSON.parse(jsonrepair(clean))
            }
        }

        async function generateParallel(): Promise<RouteData> {
            const USE_SEQUENTIAL_CHUNKS = durationDays > 17;
            if (!USE_SEQUENTIAL_CHUNKS) {
                const messages = [{ role: "system" as const, content: systemPrompt }, { role: "user" as const, content: prompt }]
                const raw = await geminiInference(messages, { maxTokens: 8192, temperature: aiTemperature });
                return parseJsonResponse(raw, "Gemini");
            }

            const metadata = await generateMetadata();
            const tripPlan = metadata.tripPlan || [];
            const chunks = [];
            for (let i = 1; i <= durationDays; i += 14) chunks.push({ start: i, end: Math.min(i + 13, durationDays) });

            let previousContext = { lastCity: effectiveDepartureCity, visitedPlaces: [] as string[] };
            const allDays: ItineraryDay[] = [];

            for (const chunk of chunks) {
                const chunkDays = await generateDayChunk(chunk.start, chunk.end, destinations[0] || "Destination", previousContext, tripPlan);
                allDays.push(...chunkDays);
                const lastDay = chunkDays[chunkDays.length - 1];
                previousContext = {
                    lastCity: lastDay?.endCity || lastDay?.logistics?.to || effectiveDepartureCity,
                    visitedPlaces: [...previousContext.visitedPlaces, ...chunkDays.flatMap(d => d.activities.map(a => a.placeName))]
                };
            }

            return { ...metadata, itinerary: allDays.sort((a, b) => a.day - b.day) };
        }

        const encoder = new TextEncoder()
        const stream = new ReadableStream({
            async start(controller) {
                const sendEvent = (data: object) => { try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)) } catch {} }
                const keepalive = setInterval(() => { try { controller.enqueue(encoder.encode(': keepalive\n\n')) } catch {} }, 15000)

                try {
                    resetGeminiSessionUsage();
                    resetDeepSeekSessionUsage();

                    let routeData = await generateParallel();
                    
                    // Fallback title if missing
                    if (!routeData.title || routeData.title === "Название маршрута" || routeData.title === "Новый маршрут") {
                        const dest = destinations[0] || "новым местам";
                        routeData.title = `Путешествие по ${dest}`;
                    }
                    
                    // Post-processing
                    await sanitizeClosedAirportLogistics(routeData, effectiveDepartureCity, startDate);
                    routeData = await enrichViralSpotsWithWebSearch(routeData);
                    routeData = normalizeActivityTypes(routeData);
                    routeData = removeSameCityFlights(routeData);
                    routeData = enrichTransportLinks(routeData, effectiveDepartureCity, destinations[0] || "", startDate);
                    
                    routeData.tokenUsage = getGeminiSessionUsage();
                    await recordAiUsageEvent({ userId, source: "route-generation", provider: "gemini", usage: routeData.tokenUsage });

                    sendEvent({ type: 'result', data: routeData })
                } catch (e: any) {
                    console.error("Generation failed:", e)
                    sendEvent({ type: 'error', message: 'Generation failed' })
                } finally {
                    clearInterval(keepalive);
                    controller.close();
                }
            }
        })

        return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } })
    } catch (error: any) {
        console.error("Gemini route error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
