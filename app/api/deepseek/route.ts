// DeepSeek (Primary) -> Gemini (Fallback)
import { jsonrepair } from "jsonrepair"
import { deepseekInference, getSessionUsage, resetSessionUsage } from "@/lib/deepseek"
import { geminiInference } from "@/lib/gemini"
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
} from "@/lib/api/route-pipeline"
import { sanitizeBookingLinks } from "@/lib/api/link-sanitizer"
import { checkDirectFlightsLive } from "@/lib/travelpayouts"
import { buildEnrichedPrompt } from "@/lib/prompt-builder"
import { normalizeTravelMode } from "@/lib/travel-mode"
import { type RouteData } from "@/types/itinerary"
import {
    buildSafePreferences,
    computeDurationDays,
    normalizeTravelStyleIds,
    sanitizeDestinationList,
    sanitizeRouteUserText,
    tripDurationError,
} from "@/lib/route-generation-guard"
import { getBookingMarketFromRequest } from "@/lib/booking-market"

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const userId = await getRequestUserId()
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const accessErr = await enforceAiAccess(userId)
        if (accessErr) return accessErr

        // Rate limit: max 5 generation requests per minute per user
        const rl = checkRateLimit(userId, "deepseek-generation", 5)
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

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !supabaseKey) return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
        const supabase = createClient(supabaseUrl, supabaseKey)

        const body = await req.json()
        const bookingMarket = getBookingMarketFromRequest(req)
        const {
            departureCity, destinationType, countryCount, budget, startDate, endDate,
            travelStyle, companions, preferences, paymentMethods, customDestination,
            customBudget, travelers, filterByDocuments, tripHighlight, tripVibe, strictDestinations, locale,
            travelMode: travelModeBody,
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

        const safeHighlight = tripHighlight ? sanitizeRouteUserText(String(tripHighlight), 300) : ""
        const safeTripVibe = tripVibe ? sanitizeRouteUserText(String(tripVibe), 2000) : ""
        const companionsSafe = companions ? sanitizeRouteUserText(String(companions), 220) : ""
        const effectiveDepartureCity =
            sanitizeRouteUserText(String(departureCity || safePreferences.departureCity || "Москва"), 120) || "Москва"
        const travelersRaw = parseInt(String(travelers), 10)
        const travelersCount =
            Number.isFinite(travelersRaw) && travelersRaw >= 1 && travelersRaw <= 50 ? travelersRaw : 2

        const MAX_BUDGET = 10_000_000;
        let budgetCap = 15000 * durationDays;
        if (budget === "custom" && customBudget) {
            budgetCap = Math.min(parseInt(customBudget.replace(/\D/g, '')) || 100000, MAX_BUDGET);
        } else if (budget === "economy") budgetCap = 7500 * durationDays;
        else if (budget === "comfort") budgetCap = 20000 * durationDays;
        else if (budget === "premium" || budget === "luxury") budgetCap = 50000 * durationDays;
        budgetCap = Math.min(budgetCap, MAX_BUDGET);

        // budgetDesc computed after validation (BUG-07 fix)
        let budgetDesc = ""
        let dynamicContextStr = ""
        let adjustedBudget = budgetCap
        let warningsStr = ""

        if (destinations.length > 0 && startDate && endDate) {
            try {
                const validation = await validateRouteRequest({
                    departureCity: effectiveDepartureCity, destinations, startDate, endDate, budget: budgetCap, citizenship: safePreferences.citizenship || "RU"
                })
                if (validation.blockers.length > 0) return NextResponse.json({ error: validation.blockers[0].message }, { status: 400 })
                adjustedBudget = validation.adjustedBudget || budgetCap
                warningsStr = validation.warnings?.map(w => w.message).join('; ') || ''

                const dynamicContext = await collectDynamicContext({
                    departureCity: effectiveDepartureCity,
                    destinations,
                    startDate,
                    endDate,
                    interests: safePreferences.interestsDetailed || [],
                    travelStyle: travelStyles[0] || "",
                })
                dynamicContextStr = formatDynamicContextForPrompt(dynamicContext)
            } catch (e) { console.error("[Validation Error]", e) }
        }

        // BUG-07: compute budgetDesc using adjustedBudget if validation raised it
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

        if (destinations.length > 0) {
            try {
                if (travelMode === "flight") {
                    const flightCheck = await checkDirectFlightsLive(effectiveDepartureCity, destinations[0], startDate)
                    if (flightCheck.hasDirect && flightCheck.minPrice != null) {
                        dynamicContextStr += `\n🛫 Прямые рейсы доступны от ${flightCheck.minPrice} ${flightCheck.currency}.`
                    } else if (flightCheck.hasDirect) {
                        dynamicContextStr += `\n🛫 По данным API цен есть варианты без пересадок; точное расписание — Aviasales.`
                    } else if (flightCheck.flightDataReliable) {
                        dynamicContextStr += `\n🚆 В кэше цен на месяц нет прямого рейса с минимальной ценой — предложи пересадку или поезд; не утверждай, что прямых рейсов нет вообще.`
                    } else {
                        dynamicContextStr += `\n🛫 Прямые рейсы кэшем не проверены. Не утверждай их отсутствие; популярные внутренние маршруты (Москва — Сочи и т.п.) обычно с прямыми рейсами — авиа + ссылка Aviasales.`
                    }
                } else if (travelMode === "train") {
                    dynamicContextStr += `\n🚆 РЕЖИМ МАРШРУТА: пользователь выбрал ж/д как основной транспорт — не навязывай авиа без необходимости.`
                } else {
                    dynamicContextStr += `\n🚗 РЕЖИМ МАРШРУТА: пользователь выбрал автопутешествие — планируй переезды на машине; авиа только если дорога нереалистична.`
                }
                const searchContext = await collectRealTimeSearchContext(effectiveDepartureCity, destinations, startDate)
                if (searchContext) dynamicContextStr += searchContext
            } catch (e) { console.error("[Pre-Check Error]", e) }
        }

        const enriched = await buildEnrichedPrompt({
            locale: userLocale,
            departureCity: effectiveDepartureCity, destinations, startDate, endDate,
            budget: budgetCap, adjustedBudget, budgetDesc, travelStyle: travelStyles,
            companions: companionsSafe, travelers: travelersCount, preferences: safePreferences, dynamicContextStr,
            warningsStr, safeHighlight, tripVibe: safeTripVibe || undefined, destinationType, strictDestinations, countryCount, filterByDocuments,
            travelMode,
            bookingMarket,
        })

        const { systemPrompt, userPrompt: prompt } = enriched
        const aiTemperature =
            (body.aiCreativity === "creative" || safePreferences.aiCreativity === "creative") ? 1.0 : 0.6

        resetSessionUsage();
        try {
            console.log("DeepSeek: Starting generation...");
            const raw = await deepseekInference([
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ], { maxTokens: 8000, temperature: aiTemperature, responseFormat: "json_object" });

            const clean1 = (raw.match(/\{[\s\S]*\}/)?.[0] ?? raw).replace(/```json\s*/g, '').replace(/```\s*/g, '')
            let routeData: RouteData
            try { routeData = JSON.parse(clean1) } catch {
                console.warn('[DeepSeek] JSON malformed, attempting repair…')
                routeData = JSON.parse(jsonrepair(clean1))
            }

            // Post-processing
            routeData = sanitizeActivityUrls(routeData);
            await sanitizeClosedAirportLogistics(routeData, effectiveDepartureCity, startDate, bookingMarket);
            routeData = await enrichViralSpotsWithWebSearch(routeData);
            routeData = normalizeActivityTypes(routeData);
            routeData = removeSameCityFlights(routeData);
            routeData = enrichTransportLinks(routeData, effectiveDepartureCity, destinations[0] || "", startDate, bookingMarket);
            routeData = await enrichFlightCosts(routeData, effectiveDepartureCity, startDate);
            routeData = await enrichHotelCosts(routeData, startDate);
            routeData = recalculateDayTotals(routeData); // BUG-06
            routeData.itinerary = await sanitizeBookingLinks(routeData.itinerary) as typeof routeData.itinerary;

            routeData.tokenUsage = getSessionUsage();
            await recordAiUsageEvent({ userId, source: "route-generation", provider: "deepseek", usage: routeData.tokenUsage });

            // Fetch cover image (BUG-03: was imported but never called)
            if (!routeData.coverImage) {
                try {
                    const imageQuery = destinations[0] || safeHighlight || "travel";
                    routeData.coverImage = await getDestinationImage(imageQuery);
                } catch (imgErr) {
                    console.warn("[CoverImage] Failed to fetch cover image:", imgErr);
                }
            }

            return NextResponse.json(routeData);
        } catch (e: any) {
            console.error("DeepSeek failed, falling back to Gemini:", e.message);
            const raw = await geminiInference([
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ], { maxTokens: 8000, temperature: 0.6 });

            const clean2 = (raw.match(/\{[\s\S]*\}/)?.[0] ?? raw).replace(/```json\s*/g, '').replace(/```\s*/g, '')
            let routeData: RouteData
            try { routeData = JSON.parse(clean2) } catch {
                console.warn('[Gemini-Fallback] JSON malformed, attempting repair…')
                routeData = JSON.parse(jsonrepair(clean2))
            }
            routeData = sanitizeActivityUrls(routeData);
            await sanitizeClosedAirportLogistics(routeData, effectiveDepartureCity, startDate, bookingMarket);
            routeData = normalizeActivityTypes(routeData);
            routeData = removeSameCityFlights(routeData);
            routeData = enrichTransportLinks(routeData, effectiveDepartureCity, destinations[0] || "", startDate, bookingMarket);
            routeData = await enrichFlightCosts(routeData, effectiveDepartureCity, startDate);
            routeData = await enrichHotelCosts(routeData, startDate);
            routeData = recalculateDayTotals(routeData); // BUG-06
            routeData.itinerary = await sanitizeBookingLinks(routeData.itinerary) as typeof routeData.itinerary;

            return NextResponse.json(routeData);
        }
    } catch (error: any) {
        console.error("DeepSeek route error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
