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
import { validateRouteRequest } from "@/lib/real-time-validation"
import { collectDynamicContext, formatDynamicContextForPrompt } from "@/lib/context/dynamic-context"
import {
    enrichTransportLinks,
    enrichFlightCosts,
    enrichHotelCosts,
    sanitizeClosedAirportLogistics,
    normalizeActivityTypes,
    collectRealTimeSearchContext,
    removeSameCityFlights,
    enrichViralSpotsWithWebSearch,
    sanitizeActivityUrls,
    recalculateDayTotals,
    enforceTravelModeConsistency,
} from "@/lib/api/route-pipeline"
import { sanitizeBookingLinks } from "@/lib/api/link-sanitizer"
import { checkDirectFlightsLive } from "@/lib/travelpayouts"
import { validateAirports } from "@/lib/api/airport-validator"
import { buildEnrichedPrompt, buildMetadataPrompt, buildDayChunkPrompt } from "@/lib/prompt-builder"
import { normalizeTravelMode } from "@/lib/travel-mode"
import { type RouteData, type ItineraryDay } from "@/types/itinerary"
import {
    type DiscoveryReelRecord,
    itineraryContainsAnchor,
    injectAnchorIntoItinerary,
} from "@/lib/reel-anchor"
import { buildReelMandatoryPromptBlock } from "@/lib/reel-prompt"
import { getBookingMarketFromRequest } from "@/lib/booking-market"
import {
    buildSafePreferences,
    computeDurationDays,
    normalizeTravelStyleIds,
    sanitizeDestinationList,
    sanitizeRouteUserText,
    tripDurationError,
} from "@/lib/route-generation-guard"
import {
    combineRouteGenerationUsage,
    getRouteGenerationProviderLabel,
    resolveChunkDestination,
} from "@/lib/route-generation-utils"

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
        const rl = await checkRateLimit(userId, "gemini-generation", 5)
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
        const bookingMarket = getBookingMarketFromRequest(req)
        const {
            departureCity, destinationType, countryCount, budget, startDate, endDate,
            travelStyle, companions, preferences, paymentMethods, requireRussianGuide,
            customDestination, customBudget, travelers, filterByDocuments, tripHighlight, tripVibe,
            strictDestinations, locale, travelMode: travelModeBody, reelId: reelIdRaw,
        } = body
        const userLocale: 'ru' | 'en' = locale === 'en' ? 'en' : 'ru'
        const travelMode = normalizeTravelMode(travelModeBody)

        const safePreferences = buildSafePreferences(preferences)
        const travelStyles = normalizeTravelStyleIds(travelStyle)
        const destinations = sanitizeDestinationList(customDestination, strictDestinations)
        const durationDays = computeDurationDays(startDate, endDate)
        const durationErr = tripDurationError(durationDays, userLocale)
        if (durationErr) {
            return NextResponse.json(durationErr.body, { status: durationErr.status })
        }

        let reelRecord: DiscoveryReelRecord | null = null
        let reelAnchorPrompt: string | undefined
        const reelId = typeof reelIdRaw === "string" ? reelIdRaw.trim() : ""
        if (reelId) {
            const uuidOk = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(reelId)
            if (!uuidOk) {
                return NextResponse.json({ error: "invalid_reel" }, { status: 400 })
            }
            const { data: reelRow, error: reelErr } = await supabase
                .from("discovery_reels")
                .select("*")
                .eq("id", reelId)
                .eq("published", true)
                .maybeSingle()
            if (reelErr || !reelRow) {
                return NextResponse.json({
                    error: "reel_not_found",
                    message: userLocale === "en"
                        ? "This reel was not found or is not published."
                        : "Рилс не найден или не опубликован.",
                }, { status: 400 })
            }
            reelRecord = reelRow as DiscoveryReelRecord
            reelAnchorPrompt = buildReelMandatoryPromptBlock(reelRecord, userLocale)
        }

        let safeHighlight = tripHighlight ? sanitizeRouteUserText(String(tripHighlight), 300) : ""
        if (reelRecord) {
            const prefix = userLocale === "en"
                ? `[Inspired by reel: ${reelRecord.title}] `
                : `[Из рилса: ${reelRecord.title}] `
            safeHighlight = (prefix + safeHighlight).trim().slice(0, 500)
        }
        const safeTripVibe = tripVibe ? sanitizeRouteUserText(String(tripVibe), 2000) : ""
        const companionsSafe = companions ? sanitizeRouteUserText(String(companions), 220) : ""
        const effectiveDepartureCity =
            sanitizeRouteUserText(String(departureCity || safePreferences.departureCity || "Москва"), 120) || "Москва"
        const travelersRaw = parseInt(String(travelers), 10)
        const travelersCount =
            Number.isFinite(travelersRaw) && travelersRaw >= 1 && travelersRaw <= 50 ? travelersRaw : 2

        if (reelRecord && durationDays < reelRecord.anchor_day) {
            return NextResponse.json({
                error: "anchor_day_too_late",
                message: userLocale === "en"
                    ? `Trip must be at least ${reelRecord.anchor_day} days to include the reel activity.`
                    : `Поездка должна быть не короче ${reelRecord.anchor_day} дней, чтобы включить активность из рилса.`,
            }, { status: 400 })
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

        // budgetDesc is computed after validation so adjustedBudget is used when budget is too low
        let budgetDesc = ""

        if (reelRecord) {
            if (destinations.length === 0) {
                return NextResponse.json({
                    error: "destination_required",
                    message: userLocale === "en"
                        ? "Destination is required when building a trip from a reel."
                        : "Укажите направление для маршрута из рилса.",
                }, { status: 400 })
            }
            const destBlob = destinations.join(" ").toLowerCase()
            const c = reelRecord.country.toLowerCase().trim()
            if (c && !destBlob.includes(c)) {
                return NextResponse.json({
                    error: "destination_mismatch",
                    message: userLocale === "en"
                        ? `Destination must include the reel country: ${reelRecord.country}.`
                        : `Направление должно включать страну рилса: ${reelRecord.country}.`,
                }, { status: 400 })
            }
        }

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
                    citizenship: safePreferences.citizenship || "RU",
                    travelMode,
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
                    interests: safePreferences.interestsDetailed || [],
                    travelStyle: travelStyles[0] || ""
                })
                dynamicContextStr = formatDynamicContextForPrompt(dynamicContext)
            } catch (e) {
                console.error("[Validation Error]", e)
            }
        }

        // Use adjustedBudget when validation raised it (e.g. 15 000 ₽ for Tokyo is unrealistic)
        {
            const effectiveBudgetForPrompt = adjustedBudget > budgetCap ? adjustedBudget : budgetCap
            const originalNote = adjustedBudget > budgetCap
                ? (userLocale === 'en'
                    ? ` (your original $${Math.round(budgetCap / 90).toLocaleString('en-US')} was adjusted — too low for this destination)`
                    : ` (ваш исходный бюджет ${budgetCap.toLocaleString('ru-RU')} ₽ был скорректирован — слишком низкий для данного направления)`)
                : ""
            budgetDesc = userLocale === 'en'
                ? `Budget: $${Math.round(effectiveBudgetForPrompt / 90).toLocaleString('en-US')} for ${durationDays} days${originalNote}`
                : `Бюджет: ${effectiveBudgetForPrompt.toLocaleString('ru-RU')} ₽ на ${durationDays} дней${originalNote}`
        }

        // Live check for first destination (flight-oriented; skip when user chose train/car as primary mode)
        if (destinations.length > 0) {
            try {
                if (travelMode === "flight") {
                    const flightCheck = await checkDirectFlightsLive(effectiveDepartureCity, destinations[0], startDate)
                    if (flightCheck.hasDirect && flightCheck.minPrice != null) {
                        dynamicContextStr += `\n🛫 Прямые рейсы в ${destinations[0]} доступны от ${flightCheck.minPrice} ${flightCheck.currency}.`
                    } else if (flightCheck.hasDirect) {
                        dynamicContextStr += `\n🛫 По данным API цен для маршрута есть варианты без пересадок; точное расписание — по ссылке Aviasales в активности.`
                    } else if (flightCheck.flightDataReliable) {
                        dynamicContextStr += `\n🚆 В выборке API цен на выбранный месяц нет прямого рейса с минимальной ценой — предложи пересадку или поезд; не утверждай, что прямых рейсов не существует вообще (проверка по кэшу, не полное расписание).`
                    } else {
                        dynamicContextStr += `\n🛫 Расписание и прямые рейсы не проверены кэшем цен (нет данных или токена). Не утверждай отсутствие прямых рейсов; для популярных внутренних линий (например Москва — Сочи/Адлер) прямые рейсы обычно есть — укажи авиа как норму и дай ссылку Aviasales.`
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
                }
            } catch (e) {
                console.error("[Airport Validation Error]", e)
            }
        }

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
            companions: companionsSafe,
            travelers: travelersCount,
            preferences: safePreferences,
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
            reelAnchorPrompt,
            bookingMarket,
        })

        const { systemPrompt, userPrompt: prompt } = enriched
        const aiTemperature =
            (body.aiCreativity === "creative" || safePreferences.aiCreativity === "creative") ? 0.8 : 0.6

        function stripJsonFences(raw: string): string {
            return raw.replace(/```json\s*/g, "").replace(/```\s*/g, "")
        }

        function parseJsonObjectResponse(raw: string, source: string): any {
            if (!raw) throw new Error(`Empty response from ${source}`)
            const clean = stripJsonFences(raw.match(/\{[\s\S]*\}/)?.[0] ?? raw)
            try {
                return JSON.parse(clean)
            } catch {
                console.warn(`[${source}] JSON malformed, attempting repair...`)
                try {
                    return JSON.parse(jsonrepair(clean))
                } catch (e2) {
                    console.error(`[${source}] JSON repair failed`, e2)
                    throw new Error(`JSON parse failed after repair attempt: ${(e2 as Error).message}`)
                }
            }
        }

        function parseJsonArrayResponse(raw: string, source: string): ItineraryDay[] {
            if (!raw) throw new Error(`Empty response from ${source}`)
            const clean = stripJsonFences(raw.match(/\[[\s\S]*\]/)?.[0] ?? raw)
            try {
                return JSON.parse(clean)
            } catch {
                console.warn(`[${source}] JSON array malformed, attempting repair...`)
                try {
                    return JSON.parse(jsonrepair(clean))
                } catch (e2) {
                    console.error(`[${source}] JSON array repair failed`, e2)
                    throw new Error(`JSON array parse failed after repair attempt: ${(e2 as Error).message}`)
                }
            }
        }

        function toDeepSeekMessages(messages: Array<{ role: "system" | "user" | "assistant"; content: string | unknown[] }>) {
            return messages.map((message) => ({
                role: message.role,
                content: typeof message.content === "string"
                    ? message.content
                    : message.content
                        .map((part) => typeof part === "string" ? part : JSON.stringify(part))
                        .join("\n"),
            }))
        }

        async function generateObjectWithFallback(params: {
            geminiSource: string
            deepseekSource: string
            messages: Array<{ role: "system" | "user" | "assistant"; content: string }>
            maxTokens: number
        }): Promise<any> {
            try {
                const raw = await geminiInference(params.messages, {
                    maxTokens: params.maxTokens,
                    temperature: aiTemperature,
                })
                return parseJsonObjectResponse(raw, params.geminiSource)
            } catch (geminiError) {
                console.warn(`[${params.geminiSource}] Gemini failed, falling back to DeepSeek`, geminiError)
                const raw = await deepseekInference(toDeepSeekMessages(params.messages), {
                    maxTokens: params.maxTokens,
                    temperature: aiTemperature,
                    tripDays: durationDays,
                    responseFormat: "json_object",
                })
                return parseJsonObjectResponse(raw, params.deepseekSource)
            }
        }

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
                safeHighlight, warningsStr, preferences: safePreferences,
                tripVibe: safeTripVibe || undefined,
                travelMode,
                strictDestinations,
                reelAnchorPrompt,
            })
            const messages = [{ role: "system" as const, content: systemPrompt }, { role: "user" as const, content: metaPrompt }]
            return generateObjectWithFallback({
                geminiSource: "Gemini-Meta",
                deepseekSource: "DeepSeek-Meta",
                messages,
                maxTokens: 2000,
            })
        }

        async function generateDayChunk(startDay: number, endDay: number, destination: string, previousContext: any, tripPlan: any): Promise<ItineraryDay[]> {
            const chunkReelPrompt =
                reelRecord && startDay <= reelRecord.anchor_day && endDay >= reelRecord.anchor_day
                    ? reelAnchorPrompt
                    : undefined
            const chunkPrompt = buildDayChunkPrompt({
                startDay, endDay, durationDays, departureCity: effectiveDepartureCity,
                destination, budgetDesc, travelStyle: travelStyles, preferences: safePreferences,
                safeHighlight, warningsStr, previousContext,
                tripVibe: safeTripVibe || undefined,
                locale: userLocale,
                travelMode,
                reelAnchorPrompt: chunkReelPrompt,
                tripStartDate: startDate,
                planForChunk: (tripPlan || []).filter((s: any) => s.startDay <= endDay && s.endDay >= startDay)
                    .map((s: any) => `Дни ${Math.max(s.startDay, startDay)}-${Math.min(s.endDay, endDay)}: ${s.city}`).join('\n')
            })
            const messages = [{ role: "system" as const, content: systemPrompt }, { role: "user" as const, content: chunkPrompt }]

            const tryParse = async (attempt: number): Promise<ItineraryDay[]> => {
                try {
                    const raw = await geminiInference(messages, {
                        maxTokens: 16000,
                        temperature: attempt === 1 ? aiTemperature : Math.min(aiTemperature + 0.1, 1.0),
                    })
                    return parseJsonArrayResponse(raw, `Gemini-Chunk ${startDay}-${endDay}`)
                } catch (geminiError) {
                    if (attempt < 2) {
                        console.warn(`[Gemini-Chunk ${startDay}-${endDay}] Gemini attempt ${attempt} failed, retrying...`, geminiError)
                        return tryParse(attempt + 1)
                    }

                    console.warn(`[Gemini-Chunk ${startDay}-${endDay}] Gemini exhausted, falling back to DeepSeek`, geminiError)
                    const raw = await deepseekInference(toDeepSeekMessages(messages), {
                        maxTokens: 16000,
                        temperature: aiTemperature,
                        tripDays: durationDays,
                    })
                    return parseJsonArrayResponse(raw, `DeepSeek-Chunk ${startDay}-${endDay}`)
                }
            }

            return tryParse(1)
        }

        /**
         * Извлекает последний известный город из завершённого чанка.
         * Порядок приоритетов:
         *  1. lastDay.city — AI почти всегда заполняет это поле ("Хаконэ / Токио" → берём последний)
         *  2. endCity / logistics.to — поля которые AI иногда добавляет
         *  3. Город из hotel-активности дня (placeName)
         *  4. Fallback на destination — НЕ на город отправления (иначе следующий чанк генерирует вылет из Москвы)
         */
        function extractLastCityFromChunk(lastDay: ItineraryDay | undefined, destination: string): string {
            if (!lastDay) return destination;

            // 1. Поле city ("Хаконэ / Токио" → берём правую часть как более позднюю)
            const cityField = (lastDay as any).city;
            if (cityField && typeof cityField === "string" && cityField.trim()) {
                const parts = cityField.split(/[\/,]/).map((s: string) => s.trim()).filter(Boolean);
                return parts[parts.length - 1] || destination;
            }

            // 2. Явные поля переезда
            if ((lastDay as any).endCity) return (lastDay as any).endCity;
            if ((lastDay as any).logistics?.to) return (lastDay as any).logistics.to;

            // 3. Город из hotel-активности (название вида "Hotel Granvia Kyoto" не годится, пропускаем)
            const hotelActivity = lastDay.activities?.find((a: any) => a.type === "hotel") as any;
            if (hotelActivity?.city) return hotelActivity.city as string;

            // 4. Fallback — destination (НЕ departure city)
            return destination;
        }

        async function generateParallel(): Promise<RouteData> {
            // Single-shot for ≤14 days: ~930 tokens/day × 14 = ~13K, fits in 16K limit
            // Longer trips chunk into 4-day segments to stay within output limits
            const USE_SEQUENTIAL_CHUNKS = durationDays > 14;
            if (!USE_SEQUENTIAL_CHUNKS) {
                const messages = [{ role: "system" as const, content: systemPrompt }, { role: "user" as const, content: prompt }]
                return generateObjectWithFallback({
                    geminiSource: "Gemini",
                    deepseekSource: "DeepSeek",
                    messages,
                    maxTokens: 16000,
                })
            }

            const metadata = await generateMetadata();
            const tripPlan = metadata.tripPlan || [];
            const chunks = [];
            // 7-day chunks: ~6500 tokens each, safely within 16K token limit
            for (let i = 1; i <= durationDays; i += 7) chunks.push({ start: i, end: Math.min(i + 6, durationDays) });

            let previousContext = {
                lastCity: effectiveDepartureCity,
                visitedPlaces: [] as string[],
                visitedCities: [] as string[],
                highlightFulfilled: false
            };
            const allDays: ItineraryDay[] = [];

            for (const chunk of chunks) {
                const chunkDestination = resolveChunkDestination(
                    tripPlan,
                    chunk.start,
                    chunk.end,
                    destinations[0] || "Destination"
                )
                let chunkDays = await generateDayChunk(chunk.start, chunk.end, chunkDestination, previousContext, tripPlan);
                
                const expectedLength = chunk.end - chunk.start + 1;
                if (chunkDays.length > expectedLength) {
                    console.warn(`[Pipeline] Chunk ${chunk.start}-${chunk.end} over-generated ${chunkDays.length} days, slicing to ${expectedLength}`);
                    chunkDays = chunkDays.slice(0, expectedLength);
                }
                // Enforce proper day numbering unconditionally so chunks never overlap
                chunkDays = chunkDays.map((d: any, idx: number) => ({ ...d, day: chunk.start + idx }));

                allDays.push(...chunkDays);
                const lastDay = chunkDays[chunkDays.length - 1];
                const chunkStr = JSON.stringify(chunkDays);
                
                const newCities = chunkDays.map((d: any) => extractLastCityFromChunk(d, chunkDestination));
                const allVisitedCities = Array.from(new Set([...previousContext.visitedCities, ...newCities].filter(Boolean)));
                
                let isHighlightFulfilled = previousContext.highlightFulfilled || chunkStr.includes('✨') || chunkStr.includes('ПРИОРИТЕТ');
                if (safeHighlight && chunkStr.toLowerCase().includes(safeHighlight.split(' ')[0].toLowerCase())) {
                    isHighlightFulfilled = true;
                }

                previousContext = {
                    lastCity: extractLastCityFromChunk(lastDay, chunkDestination),
                    visitedPlaces: [...previousContext.visitedPlaces, ...chunkDays.flatMap((d: any) => d.activities?.map((a: any) => a.placeName || a.title) || [])],
                    visitedCities: allVisitedCities,
                    highlightFulfilled: isHighlightFulfilled
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

                    // Validate day count — AI sometimes skips or adds extra days
                    if (Array.isArray(routeData.itinerary)) {
                        const got = routeData.itinerary.length
                        if (got !== durationDays) {
                            console.warn(`[DayCount] Expected ${durationDays} days, got ${got}`)
                            routeData.itinerary = routeData.itinerary
                                .sort((a: any, b: any) => (a.day ?? 0) - (b.day ?? 0))
                                .slice(0, durationDays) // trim extra days AI may have added
                                .map((d: any, i: number) => ({ ...d, day: i + 1 }))
                        }
                    }

                    // Fallback title if missing
                    if (!routeData.title || routeData.title === "Название маршрута" || routeData.title === "Новый маршрут") {
                        const dest = destinations[0] || "новым местам";
                        routeData.title = `Путешествие по ${dest}`;
                    }
                    
                    // Post-processing
                    routeData = sanitizeActivityUrls(routeData);
                    await sanitizeClosedAirportLogistics(routeData, effectiveDepartureCity, startDate, bookingMarket);
                    routeData = await enrichViralSpotsWithWebSearch(routeData);
                    routeData = normalizeActivityTypes(routeData);
                    routeData = enforceTravelModeConsistency(routeData, travelMode);
                    routeData = removeSameCityFlights(routeData);
                    routeData = enrichTransportLinks(routeData, effectiveDepartureCity, destinations[0] || "", startDate, bookingMarket);
                    routeData = await enrichFlightCosts(routeData, effectiveDepartureCity, startDate);
                    routeData = await enrichHotelCosts(routeData, startDate);
                    routeData = recalculateDayTotals(routeData);
                    routeData.itinerary = await sanitizeBookingLinks(routeData.itinerary) as typeof routeData.itinerary;

                    if (reelRecord && Array.isArray(routeData.itinerary)) {
                        if (!itineraryContainsAnchor(routeData.itinerary, reelRecord)) {
                            injectAnchorIntoItinerary(
                                routeData.itinerary as unknown as Parameters<typeof injectAnchorIntoItinerary>[0],
                                reelRecord
                            )
                        }
                    }
                    
                    const geminiUsage = getGeminiSessionUsage();
                    const deepseekUsage = getDeepSeekSessionUsage();
                    routeData.tokenUsage = combineRouteGenerationUsage(geminiUsage, deepseekUsage) ?? geminiUsage;
                    await recordAiUsageEvent({
                        userId,
                        source: "route-generation",
                        provider: getRouteGenerationProviderLabel(geminiUsage, deepseekUsage),
                        usage: routeData.tokenUsage,
                    });

                    // Fetch cover image for the trip
                    if (!routeData.coverImage) {
                        try {
                            const imageQuery = destinations.length > 0 
                                ? `${destinations.slice(0, 2).join(" ")} travel landmark` 
                                : "travel landmark";
                            routeData.coverImage = await getDestinationImage(imageQuery);
                        } catch (imgErr) {
                            console.warn("[CoverImage] Failed to fetch cover image:", imgErr);
                        }
                    }

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
