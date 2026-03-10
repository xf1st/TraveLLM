// DeepSeek (Primary) -> Gemini (Fallback)
import { deepseekInference, getSessionUsage, resetSessionUsage } from "@/lib/deepseek"
import { geminiInference } from "@/lib/gemini"
import { NextResponse } from "next/server"
import { getDestinationImage } from "@/lib/images"
import { GROUNDING_DATA_2026 } from "@/lib/grounding"
import { createClient } from '@supabase/supabase-js'
import { getRequestUserId, recordAiUsageEvent } from "@/lib/ai-usage-events"
import { checkGenerationLimit, incrementGenerationCount } from "@/lib/subscription"
// Real-time validation imports
import { validateRouteRequest, type ValidationResult } from "@/lib/real-time-validation"
import { collectDynamicContext, formatDynamicContextForPrompt } from "@/lib/context/dynamic-context"
import { formatTravelStyleForPrompt } from "@/lib/travel-styles"
import { getApplicableRules, ITINERARY_STRUCTURE } from "@/lib/strict-rules"
import { getFlightSearchLink, getTrainSearchLink, parseCityIata, getIataCode } from "@/lib/travelpayouts"
import { googleSearch } from "@/lib/google-search"
import { determineOptimalTransport } from "@/lib/api/logistics-orchestrator"

function enrichTransportLinks(routeData: any, origin: string, mainDestination: string, startDate?: string, endDate?: string) {
    if (!Array.isArray(routeData?.itinerary)) return routeData

    // Resolve origin IATA upfront
    const originParsed = parseCityIata(origin)
    if (!originParsed.iata) originParsed.iata = getIataCode(origin) || ""

    let currentIata = originParsed.iata
    let currentCity = originParsed.city || origin
    const days = routeData.itinerary

    for (let i = 0; i < days.length; i++) {
        const day = days[i]
        if (!Array.isArray(day.activities)) continue

        // Prefer logistics.to for reliable city/IATA (AI outputs "Тбилиси (TBS)" format)
        const logistics = day.logistics
        let dayToIata = ""
        let dayToCity = ""
        if (logistics?.to) {
            const toP = parseCityIata(logistics.to)
            dayToIata = toP.iata
            dayToCity = toP.city || logistics.to
        }

        for (const act of day.activities) {
            if (act.type === 'transport') {
                const originalTitle = act.title || ""
                const titleLower = originalTitle.toLowerCase()
                const isFlight = /перелёт|перелет|рейс|вылет|прибытие|самолет|flight/i.test(titleLower)

                if (isFlight) {
                    // Strategy 1: Extract IATA codes directly from title brackets
                    // Handles: "Перелёт Москва (SVO) → Стамбул (IST)"
                    const titleIataMatch = originalTitle.match(/\b([A-Z]{3})\b[^A-Z]*\b([A-Z]{3})\b/)
                    const fromIataFromTitle = titleIataMatch?.[1] || ""
                    const toIataFromTitle = titleIataMatch?.[2] || ""

                    // Strategy 2: IATA from logistics.to ("Стамбул (IST)" format)
                    let toIata = dayToIata || toIataFromTitle
                    let toCity = dayToCity || mainDestination

                    // Strategy 3: Dictionary lookup fallback
                    if (!toIata) {
                        toIata = getIataCode(toCity) || getIataCode(mainDestination) || ""
                    }

                    // Use origin IATA from title if currentIata is empty
                    const origIata = currentIata || fromIataFromTitle

                    // Determine date for this day
                    let date = startDate
                    if (startDate && i > 0) {
                        const d = new Date(startDate)
                        d.setDate(d.getDate() + i)
                        date = d.toISOString().split('T')[0]
                    }

                    act.link = getFlightSearchLink({
                        originIata: origIata,
                        origin: currentCity,
                        destination: toCity,
                        destinationIata: toIata,
                        departDate: date,
                        subId: `flight_day_${i+1}`
                    })

                    // Advance position tracker
                    if (toIata) currentIata = toIata
                    if (toCity) currentCity = toCity
                }
            }
        }
    }

    return routeData
}


async function sanitizeClosedAirportLogistics(
    routeData: any,
    departureCity?: string,
    startDate?: string
) {
    const itinerary = Array.isArray(routeData?.itinerary) ? routeData.itinerary : []

    const closed = (GROUNDING_DATA_2026 as any).closedAirports || []
    const closedTokens = closed
        .flatMap((a: any) => [a?.city, a?.iata, `${a?.city} (${a?.iata})`])
        .filter(Boolean)
        .map((s: string) => String(s).toLowerCase())

    const isClosedMentioned = (text: unknown) => {
        if (!text) return false
        const t = String(text).toLowerCase()
        return closedTokens.some((token: string) => token && t.includes(token))
    }

    const isFlightMentioned = (text: unknown) => {
        if (!text) return false
        const t = String(text).toLowerCase()
        return t.includes('самол') || t.includes('flight') || t.includes('plane') || t.includes('перелет') || t.includes('перелёт') || t.includes('рейс') || t.includes('вылет') || t.includes('аэропорт') || t.includes('airport')
    }

    let currentCity = departureCity || "Москва"

    for (let i = 0; i < itinerary.length; i++) {
        const day = itinerary[i]
        const lg = day?.logistics
        
        let needsSanitization = false;

        if (lg) {
            const targetsClosed = isClosedMentioned(lg.to) || isClosedMentioned(lg.from) || isClosedMentioned(lg.bookingLink) || isClosedMentioned(day?.title)
            const hasFlightConcepts = isFlightMentioned(lg.mode) || isFlightMentioned(lg.title) || isFlightMentioned(day?.title)
            
            if (targetsClosed && hasFlightConcepts) {
                needsSanitization = true;
            }
        }

        if (Array.isArray(day?.activities)) {
            for (const a of day.activities) {
                if (a?.type === 'transport' && (isFlightMentioned(a?.title) || isFlightMentioned(a?.desc))) {
                    if (isClosedMentioned(a?.title) || isClosedMentioned(a?.desc) || isClosedMentioned(a?.placeName) || isClosedMentioned(lg?.to) || isClosedMentioned(lg?.from) || isClosedMentioned(day?.title)) {
                        needsSanitization = true;
                    }
                }
            }
        }

        if (needsSanitization) {
            // Fix fromCity: Use tracked currentCity to avoid "Sevastopol -> Sevastopol"
            const rawToCity = lg?.to || day?.title || "Пункт назначения"
            const toClean = String(rawToCity).replace(/\s*\(.*?\)\s*/g, '').trim()
            
            // If the day is a travel day, the starting point is where we were at the end of previous day
            const fromCity = currentCity
            const fromClean = String(fromCity).replace(/\s*\(.*?\)\s*/g, '').trim()

            // Generate real Yandex Travel train link
            let trainLink = "https://www.rzd.ru/"
            try {
                let departDate = startDate
                if (startDate && i > 0) {
                    const d = new Date(startDate)
                    d.setDate(d.getDate() + i)
                    departDate = d.toISOString().split('T')[0]
                }
                trainLink = await getTrainSearchLink({
                    origin: fromClean,
                    destination: toClean,
                    departDate,
                    subId: `train_closed_day_${i + 1}`
                })
            } catch (trainErr) {
                console.error("[Sanitize] Failed to generate train link:", trainErr)
            }

            if (!day.logistics) day.logistics = {}
            
            const aiTitle = String(day.title || "").toLowerCase()
            const aiLogisticsMode = String(lg?.mode || "").toLowerCase()
            let detectedMode = "Поезд"
            if (aiTitle.includes("автобус") || aiLogisticsMode.includes("автобус")) detectedMode = "Автобус"
            
            day.logistics.mode = detectedMode
            day.logistics.from = fromClean
            day.logistics.to = toClean
            day.logistics.distance = lg?.distance || "—"
            day.logistics.duration = lg?.duration || "—"
            
            // Collect price from activities to keep it consistent
            let bestPrice = lg?.price && lg.price !== "0 ₽" && lg.price !== "—" ? lg.price : "от 5 000 ₽"
            
            if (Array.isArray(day.activities)) {
                for (const a of day.activities) {
                    if (a?.placeName && isClosedMentioned(a.placeName)) {
                        a.placeName = String(a.placeName).replace(/\(.*?\)/g, '').trim()
                    }
                    if (a?.title && a?.type === 'transport' && isFlightMentioned(a.title)) {
                        a.title = `Прибытие в ${toClean}`
                        if (a.cost && a.cost !== "0 ₽" && a.cost !== "—") {
                            bestPrice = a.cost
                        }
                    }
                    if (a?.desc && a?.type === 'transport' && isFlightMentioned(a.desc)) {
                        a.desc = `Аэропорт закрыт. Добираемся на ${detectedMode.toLowerCase()}е из ${fromClean}.`
                    }
                }
                
                // Deduplicate transport activity if it's identical to logistics move
                day.activities = day.activities.filter((act: any, idx: number, arr: any[]) => {
                    if (act.type === 'transport' && idx > 0) {
                        const prevAct = arr[idx - 1]
                        if (prevAct.type === 'transport') {
                            const title1 = String(prevAct.title || "").toLowerCase()
                            const title2 = String(act.title || "").toLowerCase()
                            if (title1 === title2 || title2 === "трансфер" || title2 === "transfer") return false
                        }
                    }
                    return true
                })
            }

            day.logistics.price = bestPrice
            day.logistics.bookingLink = trainLink
            day.logistics.note = `Аэропорт в г. ${toClean} закрыт. Рекомендуем фирменный поезд или автобус. Билеты: ${trainLink}`

            if (typeof day.title === 'string' && isFlightMentioned(day.title)) {
                day.title = day.title
                    .replace(/перелёт|перелет|рейс|вылет|авиаперелет/ig, "переезд")
                    .replace(/аэрофлот|победа|s7\s*airlines|ural\s*airlines|смартавиа|smartavia/ig, "")
                    .replace(/\(.*?\)/g, '')
                    .trim()
            }
        }

        // Update current city for the next day's 'from' location
        const nextCityRaw = lg?.to || day.title || ""
        if (nextCityRaw) {
            const cleanNext = String(nextCityRaw).replace(/\s*\(.*?\)\s*/g, '').trim()
            if (cleanNext && cleanNext.length > 2) {
                currentCity = cleanNext
            }
        }
    }

    routeData.itinerary = itinerary
    return routeData
}

function normalizeActivityTypes(routeData: any) {
  if (!Array.isArray(routeData?.itinerary)) return routeData

  for (const day of routeData.itinerary) {
    if (!Array.isArray(day.activities)) continue

    const newActivities = []
    for (const act of day.activities) {
      const text = `${act.title || ""} ${act.desc || ""} ${act.time || ""}`.toLowerCase()
      
      // Normalize "check-in" → "hotel" (old AI output format)
      if (act.type === "check-in" || act.type === "checkin") {
        act.type = "hotel"
      }

      // Auto-detect type if missing
      if (!act.type || act.type === "activity") {
        if (/перелёт|перелет|рейс|аэропорт|вылет|прибытие|трансфер|поезд|автобус|такси|переезд|трасса|дорога|м-4|билет/.test(text)) {
          act.type = "transport"
        } else if (/заселение|отель|hotel|check.?in|гостиница|хостел|заезд|номер/.test(text)) {
          act.type = "hotel"
        } else if (/ресторан|кафе|завтрак|обед|ужин|бар|еда|кухня|дегустация|стейк|суши|пицца|кофе/.test(text)) {
          act.type = "food"
        }
      }

      // SPLITTING LOGIC: If title looks combined (e.g. "Hotel and Dinner")
      const title = (act.title || "").toLowerCase()
      const hasHotel = /заселение|отель|hotel|гостиница/.test(title)
      const hasFood = /ужин|обед|завтрак|ресторан|кафе/.test(title)
      const hasActivity = /прогулка|экскурсия|музей|парк/.test(title)
      
      const isMerged = (hasHotel && (hasFood || hasActivity)) || (hasFood && hasActivity)
      
      if (isMerged && (title.includes(" и ") || title.includes(" + ") || title.includes(" with "))) {
        const parts = act.title.split(/\s+(?:и|\+|\&|with)\s+/i)
        if (parts.length >= 2) {
            for (const part of parts) {
                const partTitle = part.trim()
                const pText = partTitle.toLowerCase()
                let pType = "activity"
                
                if (/перелёт|перелет|рейс|вылет|прибытие|поезд/.test(pText)) pType = "transport"
                else if (/заселение|отель|hotel|гостиница/.test(pText)) pType = "hotel"
                else if (/ресторан|кафе|ужин|обед|завтрак/.test(pText)) pType = "food"
                
                newActivities.push({
                    ...act,
                    title: partTitle,
                    type: pType,
                    // If second part, maybe clear placeName if it doesn't fit?
                    // For now keep it.
                })
            }
            continue 
        }
      }

      // Fix 0₽ prices on transport
      if (act.type === "transport" && (!act.cost || act.cost === "0 ₽" || act.cost === "0₽")) {
        act.cost = "Цену уточнять"
      }

      newActivities.push(act)
    }
    day.activities = newActivities
  }

  return routeData
}

async function collectRealTimeSearchContext(departureCity: string, destinations: string[], startDate?: string) {
    if (!destinations || destinations.length === 0) return ""

    const mainDest = destinations[0]
    const dateStr = startDate ? `в ${startDate}` : "в ближайшее время"
    
    // 1. Generate search queries
    const queries = [
        `актуальный статус рейсов и аэропорта ${mainDest} ${new Date().getFullYear()}`,
        `погода и одежда для туристов в ${mainDest} ${dateStr}`,
        `фестивали и крупные события в ${mainDest} ${dateStr}`,
        `новые рестораны и модные места в ${mainDest} ${new Date().getFullYear()}`
    ]

    console.log(`[Google Search] Collecting real-time data for: ${mainDest}...`)
    
    try {
        // 2. Execute parallel searches
        const searchPromises = queries.map(q => googleSearch(q, { num: 3 }))
        const allResults = await Promise.all(searchPromises)
        const flatResults = allResults.flat()

        if (flatResults.length === 0) return ""

        // 3. Format context string
        let context = "\n--- GOOGLE REAL-TIME DATA (GROUNDING) ---\n"
        context += `Данные получены в реальном времени (${new Date().toLocaleDateString('ru-RU')}):\n`
        
        flatResults.forEach((res, i) => {
            context += `- [${res.title}]: ${res.snippet}\n`
        })
        
        context += "------------------------------------------\n"
        return context
    } catch (e) {
        console.error("[Google Search] Integration failed:", e)
        return ""
    }
}

export async function POST(req: Request) {
    try {
        const userId = await getRequestUserId()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Check maintenance mode
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseKey) {
            console.error("Supabase credentials not configured")
            return NextResponse.json(
                { error: "Сервис временно недоступен. Попробуйте позже." },
                { status: 503 }
            )
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        const { data: settings } = await supabase
            .from('app_settings')
            .select('maintenance_mode, maintenance_message, maintenance_allow_admin_bypass')
            .single()

        if (settings?.maintenance_mode) {
            let canBypass = false

            if (settings.maintenance_allow_admin_bypass) {
                const { data: roleProfile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', userId)
                    .single()

                canBypass = roleProfile?.role === 'admin' || roleProfile?.role === 'super_admin'
            }

            if (!canBypass) {
                return NextResponse.json(
                    { error: 'Maintenance', message: settings.maintenance_message || 'Service is temporarily unavailable' },
                    { status: 503 }
                )
            }
        }

        // Check user access mode (block AI generation if blocked)
        const { data: profile } = await supabase
            .from('profiles')
            .select('access_mode, block_reason, blocked_until')
            .eq('id', userId)
            .single()

        if (profile) {
            if (profile.blocked_until) {
                const blockedUntil = new Date(profile.blocked_until)
                if (blockedUntil < new Date()) {
                    await supabase
                        .from('profiles')
                        .update({ access_mode: 'active', block_reason: null, blocked_until: null })
                        .eq('id', userId)
                } else if (profile.access_mode === 'ai_blocked' || profile.access_mode === 'full_blocked') {
                    return NextResponse.json(
                        { error: 'Route generation is temporarily unavailable for this account', reason: profile.block_reason },
                        { status: 403 }
                    )
                }
            } else if (profile.access_mode === 'ai_blocked' || profile.access_mode === 'full_blocked') {
                return NextResponse.json(
                    { error: 'Route generation is temporarily unavailable for this account', reason: profile.block_reason },
                    { status: 403 }
                )
            }
        }

        // Check generation limit
        const limitCheck = await checkGenerationLimit(userId)
        if (!limitCheck.allowed) {
            return NextResponse.json({
                error: `Лимит генераций исчерпан (${limitCheck.used}/${limitCheck.limit} в этом месяце). Обновите подписку на странице /subscribe.`,
                code: 'GENERATION_LIMIT_EXCEEDED'
            }, { status: 429 })
        }

        const body = await req.json()
        const {
            departureCity,
            destinationType,
            countryCount,
            budget,
            startDate,
            endDate,
            travelStyle,
            companions,
            preferences,
            paymentMethods,
            requireRussianGuide,
            customDestination,
            customBudget,
            travelers,
            filterByDocuments,
            tripHighlight,
            strictDestinations
        } = body

        // Server-side content filter for tripHighlight
        if (tripHighlight && typeof tripHighlight === 'string') {
            const highlightLower = tripHighlight.toLowerCase()
            const FORBIDDEN_STEMS = [
                'хуй', 'хуе', 'хуи', 'хуя', 'пизд',
                'ебал', 'ебать', 'ебан', 'ёбал', 'ёбать', 'ёбан',
                'блять', 'блядь', 'мудак', 'залупа',
                'наркотик', 'героин', 'кокаин', 'метамфет',
                'проститут', 'бордел', 'стриптиз', 'порно',
                'ignore previous', 'system prompt', 'jailbreak', 'dan mode',
                'забудь всё', 'забудь все', 'respond only',
            ]
            for (const stem of FORBIDDEN_STEMS) {
                if (highlightLower.includes(stem)) {
                    return NextResponse.json({ error: 'Недопустимый контент в поле «Изюминка поездки»' }, { status: 400 })
                }
            }
        }
        const safeHighlight = tripHighlight ? String(tripHighlight).replace(/"/g, "'").slice(0, 300) : ''

        const effectiveDepartureCity = departureCity || preferences?.departureCity || "Москва"

        // Calculate AI Temperature based on creativity setting
        const creativity = body.aiCreativity || preferences?.aiCreativity || "balanced"
        const aiTemperature = creativity === "creative" ? 1.0 : creativity === "conservative" ? 0.3 : 0.6

        let creativityInstruction = "";
        if (creativity === "creative") {
            creativityInstruction = `
УРОВЕНЬ КРЕАТИВНОСТИ: МАКСИМАЛЬНЫЙ (CREATIVE)
- Ищи скрытые жемчужины, локальные места, необычные активности.
- Предлагай альтернативные точки обзора для популярных мест.
- Будь смелее в выборе мест, избегай банальных "топ-10" списков, если это возможно.
`;
        } else if (creativity === "conservative") {
            creativityInstruction = `
УРОВЕНЬ КРЕАТИВНОСТИ: КОНСЕРВАТИВНЫЙ (CONSERVATIVE)
- Строго придерживайся проверенных, надежных и популярных маршрутов.
- Главный приоритет — комфорт, безопасность и предсказуемость.
- Избегай сомнительных или малоизвестных мест.
`;
        } else {
            creativityInstruction = `
УРОВЕНЬ КРЕАТИВНОСТИ: СБАЛАНСИРОВАННЫЙ
- Сочетай главные достопримечательности с интересными локальными местами.
`;
        }

        // Helper to safely convert value to array (handles strings, arrays, null/undefined)
        const toArray = (val: any): string[] => {
            if (!val) return []
            if (Array.isArray(val)) return val.filter(Boolean)
            if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean)
            return []
        }

        // Helper to extract City (Country) from "City, Region, Country" format
        const parseDestination = (dest: string): string => {
            const parts = dest.split(',').map(s => s.trim()).filter(Boolean)
            if (parts.length === 0) return dest
            if (parts.length === 1) return parts[0]
            const city = parts[0]
            const country = parts[parts.length - 1]
            return `${city} (${country})`
        }

        const durationDays = startDate && endDate
            ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
            : (parseInt(preferences?.defaultTripDuration) || 7)

        // Define strict budget caps
        let budgetCap = 0;
        let budgetDesc = "";

        if (budget === "custom" && customBudget) {
            budgetCap = parseInt(customBudget.replace(/\D/g, '')) || 100000;
            const perDay = Math.round(budgetCap / durationDays);
            const style = perDay < 10000 ? "ЭКОНОМ" : perDay < 30000 ? "КОМФОРТ" : "ЛЮКС";
            budgetDesc = `Бюджет: ${budgetCap.toLocaleString('ru-RU')} ₽ на ${durationDays} дней. Стиль: ${style}`;
        } else {
            switch (budget) {
                case "economy": budgetCap = 7500 * durationDays; budgetDesc = "Economy"; break;
                case "comfort": budgetCap = 20000 * durationDays; budgetDesc = "Comfort"; break;
                case "premium": case "luxury": budgetCap = 50000 * durationDays; budgetDesc = "Premium"; break;
                default: budgetCap = 15000 * durationDays; budgetDesc = "Moderate";
            }
        }

        const destinations = customDestination ? customDestination.split(';').map((s: string) => s.trim()).filter(Boolean) : []
        const targetDescription = customDestination ? `Request: ${destinations.map(parseDestination).join(', ')}` : "Various"

        let dynamicContextStr = ""
        if (destinations.length > 0 && effectiveDepartureCity) {
            try {
                const mainDest = destinations[0]
                console.log(`[Pre-Check] Checking ${effectiveDepartureCity} → ${mainDest}...`)
                
                const closed = (GROUNDING_DATA_2026 as any).closedAirports || []
                const closedTokens = closed.flatMap((a: any) => [a?.city, a?.iata]).filter(Boolean).map((s: string) => String(s).toLowerCase())

                const isClosed = closedTokens.some((t: string) => mainDest.toLowerCase().includes(t))

                let flightContextLine = ""
                if (isClosed) {
                    flightContextLine = `\n🚆 LIVE DATA: Аэропорт в г. ${mainDest} ЗАКРЫТ. СТРОГО ИСПОЛЬЗУЙ ПОЕЗД или автобус.`
                } else {
                    flightContextLine = `\n🚆 LIVE DATA: Для маршрута ${effectiveDepartureCity} → ${mainDest} ПРЕДПОЧИТАЙ прямой перелёт или комфортный ПОЕЗД.`
                }
                
                dynamicContextStr += flightContextLine

                const searchContext = await collectRealTimeSearchContext(effectiveDepartureCity, destinations, startDate)
                if (searchContext) dynamicContextStr += searchContext
            } catch (e) {}
        }

        const systemPrompt = `Ты — эксперт-планировщик путешествий TraveLLM. Отвечаешь ТОЛЬКО JSON.

<rules>
${ITINERARY_STRUCTURE}
10. СООТВЕТСТВИЕ ЗАГОЛОВКА И АКТИВНОСТЕЙ (КРИТИЧНО):
   - Если заголовок дня содержит слово "Переезд", ПЕРВАЯ активность ОБЯЗАНА иметь type: "transport".
   - НЕЛЬЗЯ писать в заголовке "Переезд", если в списке активностей нет самого переезда.
</rules>`

        const prompt = `Генерируй маршрут на ${durationDays} дней в ${targetDescription} из ${effectiveDepartureCity}.
Бюджет: ${budgetDesc}. Стиль: ${toArray(travelStyle).join(', ')}.
${dynamicContextStr}
${safeHighlight ? `ОСОБОЕ ПОЖЕЛАНИЕ: ${safeHighlight}` : ''}
Отвечай ТОЛЬКО валидным JSON.`

        resetSessionUsage();
        try {
            console.log("Using DeepSeek...");
            const raw = await deepseekInference([
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ], { maxTokens: 8000, temperature: aiTemperature, responseFormat: "json_object" });

            let routeData = JSON.parse(raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim());
            
            // Apply sanitization and tracking
            routeData = await sanitizeClosedAirportLogistics(routeData, effectiveDepartureCity, startDate);
            routeData = normalizeActivityTypes(routeData);
            
            await incrementGenerationCount(userId)
            await recordAiUsageEvent({ userId, source: "deepseek-route", provider: "deepseek", usage: getSessionUsage() })

            return NextResponse.json(routeData);
        } catch (e: any) {
            console.error("Fallback to Gemini...");
            const raw = await geminiInference([
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ], { maxTokens: 8000, temperature: 0.6 });

            let routeData = JSON.parse(raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim());
            routeData = await sanitizeClosedAirportLogistics(routeData, effectiveDepartureCity, startDate);
            routeData = normalizeActivityTypes(routeData);

            await incrementGenerationCount(userId)
            return NextResponse.json(routeData);
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
