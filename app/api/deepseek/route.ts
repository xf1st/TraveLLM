// DeepSeek (Primary) -> Gemini (Fallback)
import { jsonrepair } from "jsonrepair"
import { deepseekInference, getSessionUsage, resetSessionUsage } from "@/lib/deepseek"
import { geminiInference } from "@/lib/gemini"
import { NextResponse } from "next/server"
import { getDestinationImage } from "@/lib/images"
import { createClient } from '@supabase/supabase-js'
import { getRequestUserId, recordAiUsageEvent } from "@/lib/ai-usage-events"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { checkGenerationLimit, incrementGenerationCount } from "@/lib/subscription"
import { validateRouteRequest } from "@/lib/real-time-validation"
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
import { buildEnrichedPrompt } from "@/lib/prompt-builder"
import { type RouteData } from "@/types/itinerary"

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const userId = await getRequestUserId()
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        // Rate limit: max 5 generation requests per minute per user
        const rl = checkRateLimit(userId, "deepseek-generation", 5)
        if (!rl.allowed) return rateLimitResponse(rl)

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        if (!supabaseUrl || !supabaseKey) return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
        const supabase = createClient(supabaseUrl, supabaseKey)

        const limitCheck = await checkGenerationLimit(userId)
        if (!limitCheck.allowed) return NextResponse.json({ error: "Limit exceeded", code: 'GENERATION_LIMIT_EXCEEDED' }, { status: 429 })

        const body = await req.json()
        const {
            departureCity, destinationType, countryCount, budget, startDate, endDate,
            travelStyle, companions, preferences, paymentMethods, customDestination, 
            customBudget, travelers, filterByDocuments, tripHighlight, strictDestinations
        } = body

        const safeHighlight = tripHighlight ? String(tripHighlight).replace(/"/g, "'").slice(0, 300) : ''
        const effectiveDepartureCity = departureCity || preferences?.departureCity || "Москва"
        const durationDays = startDate && endDate
            ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
            : 7

        const toArray = (val: any): string[] => {
            if (!val) return []
            if (Array.isArray(val)) return val.filter(Boolean)
            if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean)
            return []
        }

        const MAX_BUDGET = 10_000_000;
        let budgetCap = 15000 * durationDays;
        if (budget === "custom" && customBudget) {
            budgetCap = Math.min(parseInt(customBudget.replace(/\D/g, '')) || 100000, MAX_BUDGET);
        } else if (budget === "economy") budgetCap = 7500 * durationDays;
        else if (budget === "comfort") budgetCap = 20000 * durationDays;
        else if (budget === "premium" || budget === "luxury") budgetCap = 50000 * durationDays;
        budgetCap = Math.min(budgetCap, MAX_BUDGET);

        const budgetDesc = `Бюджет: ${budgetCap.toLocaleString('ru-RU')} ₽ на ${durationDays} дней`;
        const destinations = strictDestinations === false ? [] : (customDestination ? customDestination.split(';').map((s: string) => s.trim()).filter(Boolean) : [])

        let dynamicContextStr = ""
        let adjustedBudget = budgetCap
        let warningsStr = ""

        if (destinations.length > 0 && startDate && endDate) {
            try {
                const validation = await validateRouteRequest({
                    departureCity: effectiveDepartureCity, destinations, startDate, endDate, budget: budgetCap, citizenship: preferences?.citizenship || "RU"
                })
                if (validation.blockers.length > 0) return NextResponse.json({ error: validation.blockers[0].message }, { status: 400 })
                adjustedBudget = validation.adjustedBudget || budgetCap
                warningsStr = validation.warnings?.map(w => w.message).join('; ') || ''

                const dynamicContext = await collectDynamicContext({
                    departureCity: effectiveDepartureCity, destinations, startDate, endDate, interests: toArray(preferences?.interestsDetailed), travelStyle: toArray(travelStyle)[0]
                })
                dynamicContextStr = formatDynamicContextForPrompt(dynamicContext)
            } catch (e) { console.error("[Validation Error]", e) }
        }

        if (destinations.length > 0) {
            try {
                const flightCheck = await checkDirectFlightsLive(effectiveDepartureCity, destinations[0], startDate)
                if (flightCheck.hasDirect) dynamicContextStr += `\n🛫 Прямые рейсы доступны от ${flightCheck.minPrice} ${flightCheck.currency}.`
                else dynamicContextStr += `\n🚆 Прямых рейсов нет, используй поезд или пересадку.`
                const searchContext = await collectRealTimeSearchContext(effectiveDepartureCity, destinations, startDate)
                if (searchContext) dynamicContextStr += searchContext
            } catch (e) { console.error("[Pre-Check Error]", e) }
        }

        const enriched = await buildEnrichedPrompt({
            departureCity: effectiveDepartureCity, destinations, startDate, endDate,
            budget: budgetCap, adjustedBudget, budgetDesc, travelStyle: toArray(travelStyle),
            companions, travelers: parseInt(travelers) || 2, preferences, dynamicContextStr,
            warningsStr, safeHighlight, destinationType, strictDestinations, countryCount, filterByDocuments
        })

        const { systemPrompt, userPrompt: prompt } = enriched
        const aiTemperature = (body.aiCreativity || preferences?.aiCreativity) === "creative" ? 1.0 : 0.6

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
            await sanitizeClosedAirportLogistics(routeData, effectiveDepartureCity, startDate);
            routeData = await enrichViralSpotsWithWebSearch(routeData);
            routeData = normalizeActivityTypes(routeData);
            routeData = removeSameCityFlights(routeData);
            routeData = enrichTransportLinks(routeData, effectiveDepartureCity, destinations[0] || "", startDate);
            
            routeData.tokenUsage = getSessionUsage();
            await incrementGenerationCount(userId);
            await recordAiUsageEvent({ userId, source: "route-generation", provider: "deepseek", usage: routeData.tokenUsage });

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
            await sanitizeClosedAirportLogistics(routeData, effectiveDepartureCity, startDate);
            routeData = normalizeActivityTypes(routeData);
            routeData = removeSameCityFlights(routeData);
            routeData = enrichTransportLinks(routeData, effectiveDepartureCity, destinations[0] || "", startDate);

            await incrementGenerationCount(userId);
            return NextResponse.json(routeData);
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
