// Gemini (Primary) -> DeepSeek (Fallback)
import { geminiInference, getGeminiSessionUsage, resetGeminiSessionUsage } from "@/lib/gemini"
import { deepseekInference, getSessionUsage as getDeepSeekSessionUsage, resetSessionUsage as resetDeepSeekSessionUsage } from "@/lib/deepseek"
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
import { getFlightSearchLink, parseCityIata, getIataCode, checkDirectFlightsLive, getTrainSearchLink } from "@/lib/travelpayouts"
import { googleSearch } from "@/lib/google-search"

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
                    let fromIataFromTitle = titleIataMatch?.[1] || ""
                    let toIataFromTitle = titleIataMatch?.[2] || ""

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
            const fromCity = lg?.from || departureCity || "Отправление"
            const toCity = lg?.to || day?.title || "Пункт назначения"

            const fromClean = String(fromCity).replace(/\s*\(.*?\)\s*/g, '').trim()
            const toClean = String(toCity).replace(/\s*\(.*?\)\s*/g, '').trim()

            // Generate real Yandex Travel train link instead of generic rzd.ru
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
                console.log(`[Sanitize] Train link for ${fromClean} → ${toClean}: ${trainLink}`)
            } catch (trainErr) {
                console.error("[Sanitize] Failed to generate train link:", trainErr)
            }

            if (!day.logistics) day.logistics = {}
            
            // Determine a cleaner mode based on AI content or default to "Поезд"
            const aiTitle = String(day.title || "").toLowerCase()
            const aiLogisticsMode = String(lg?.mode || "").toLowerCase()
            let detectedMode = "Поезд"
            if (aiTitle.includes("автобус") || aiLogisticsMode.includes("автобус")) detectedMode = "Автобус"
            
            day.logistics.mode = detectedMode
            day.logistics.from = fromCity
            day.logistics.to = toCity
            day.logistics.distance = lg?.distance || "—"
            day.logistics.duration = lg?.duration || "—"
            
            // Preserve price from AI if it provided one, otherwise use "—"
            const aiPrice = lg?.price && lg.price !== "0 ₽" && lg.price !== "—" ? lg.price : "от 5 000 ₽"
            day.logistics.price = aiPrice
            
            day.logistics.bookingLink = trainLink
            day.logistics.note = `Аэропорт в г. ${toClean} закрыт. Рекомендуем фирменный поезд или автобус. Купить билеты: ${trainLink}`

            // Only replace titles if they still mention flights
            if (typeof day.title === 'string' && isFlightMentioned(day.title)) {
                day.title = day.title
                    .replace(/прямой\s+рейс/ig, "наземный переезд")
                    .replace(/перелёт|перелет|рейс|вылет|авиаперелет/ig, "поездка")
                    .replace(/аэрофлот|победа|s7\s*airlines|ural\s*airlines|смартавиа|smartavia/ig, "")
                    .replace(/\(.*?\)/g, '')
                    .trim()
            }
            if (Array.isArray(day.activities)) {
                for (const a of day.activities) {
                    if (a?.placeName && isClosedMentioned(a.placeName)) {
                        a.placeName = String(a.placeName).replace(/\(.*?\)/g, '').trim()
                    }
                    if (a?.title && a?.type === 'transport' && isFlightMentioned(a.title)) {
                        a.title = String(a.title)
                            .replace(/перелёт|перелет|рейс|вылет|авиаперелет/ig, "ЖД поезд / Автобус")
                            .replace(/\(.*?\)/g, '').trim()
                    }
                    if (a?.desc && a?.type === 'transport' && isFlightMentioned(a.desc)) {
                        a.desc = String(a.desc)
                            .replace(/прямой\s+рейс.*?(\.|$)/ig, "Аэропорт закрыт — используйте наземный транспорт.")
                            .replace(/Рейс.*?\(.*?\)\./ig, "Трансфер.")
                            .replace(/перелёт|перелет|вылет|рейс/ig, "поездка")
                            .replace(/аэрофлот|победа|s7\s*airlines|ural\s*airlines|смартавиа|smartavia/ig, "")
                            .replace(/\(.*?\)/g, '').trim()
                    }
                }
                
                // Merge duplicate transport activities if the AI created two of them.
                day.activities = day.activities.filter((act: any, idx: number, arr: any[]) => {
                    if (act.type === 'transport' && idx > 0) {
                        const prevAct = arr[idx - 1]
                        if (prevAct.type === 'transport') {
                            // Drop consecutive transport node on a closed airport travel day
                            return false;
                        }
                    }
                    return true;
                })
            }
        }
    }

    routeData.itinerary = itinerary
    return routeData
}

// Metropolitan airport groups — airports that serve the same city
const METRO_AIRPORT_GROUPS: Record<string, string> = {
    SVO: 'MOW', VKO: 'MOW', DME: 'MOW', ZIA: 'MOW', MOW: 'MOW', // Moscow
    LED: 'LED', RVH: 'LED', // Saint Petersburg
}

/**
 * Remove flights where origin and destination are in the same metropolitan area
 * (e.g. Москва SVO → Москва VKO is not a real trip).
 */
function removeSameCityFlights(routeData: any): any {
    if (!Array.isArray(routeData?.itinerary)) return routeData

    for (const day of routeData.itinerary) {
        if (!Array.isArray(day.activities)) continue
        day.activities = day.activities.filter((act: any) => {
            if (act.type !== 'transport') return true
            const isFlight = /перелёт|перелет|рейс|вылет|самолет|самолёт|flight/i.test(act.title || '')
            if (!isFlight) return true
            const iataMatch = (act.title || '').match(/\b([A-Z]{3})\b[^A-Z]*\b([A-Z]{3})\b/)
            if (!iataMatch) return true
            const [, fromIata, toIata] = iataMatch
            const fromCity = METRO_AIRPORT_GROUPS[fromIata] || fromIata
            const toCity = METRO_AIRPORT_GROUPS[toIata] || toIata
            if (fromCity === toCity) {
                console.log(`[sanitize] Removed same-city flight: ${act.title}`)
                return false
            }
            return true
        })
    }
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
      if (!act.type) {
        if (/перелёт|перелет|рейс|аэропорт|вылет|прибытие|трансфер|поезд/.test(text)) {
          act.type = "transport"
        } else if (/заселение|отель|hotel|check.?in|гостиница|хостел/.test(text)) {
          act.type = "hotel"
        } else if (/ресторан|кафе|завтрак|обед|ужин|бар|еда|кухня/.test(text)) {
          act.type = "food"
        } else {
          act.type = "activity"
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

async function enrichViralSpotsWithWebSearch(routeData: any) {
  if (!Array.isArray(routeData?.viralSpots) || routeData.viralSpots.length === 0) return routeData

  console.log(`[Search Optimization] Parallel searching for ${routeData.viralSpots.length} viral spots...`)
  
  try {
    const searchPromises = routeData.viralSpots.map(async (spot: { name?: string }) => {
      if (!spot.name) return spot
      const results = await googleSearch(`${spot.name} ${routeData.title || ''} viral spot tiktok instagram`, { num: 1 })
      if (results.length > 0) {
        return {
          ...spot,
          realLink: results[0].link,
          snippet: results[0].snippet
        }
      }
      return spot
    })

    routeData.viralSpots = await Promise.all(searchPromises)
  } catch (e) {
    console.error("[Search Optimization] Failed to enrich viral spots:", e)
  }

  return routeData
}

import { googleSearch, type SearchResult } from "@/lib/google-search"

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

        // Always use Gemini as primary. DeepSeek will be used natively as fallback on error.
        const aiEngine: string = 'gemini';
        console.log(`Using AI Engine: ${aiEngine} for tier: ${limitCheck.tier}`);

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

        // Apply profile preferences if fields are missing

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
        // e.g. "Москва, Московская область, Россия" -> "Москва (Россия)"
        const parseDestination = (dest: string): string => {
            const parts = dest.split(',').map(s => s.trim()).filter(Boolean)
            if (parts.length === 0) return dest
            if (parts.length === 1) return parts[0]
            // Return "City (Country)" - first and last parts
            const city = parts[0]
            const country = parts[parts.length - 1]
            return `${city} (${country})`
        }

        const durationDays = startDate && endDate
            ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
            : (parseInt(preferences?.defaultTripDuration) || 7)

        // Define strict budget caps (updated to match new UI ranges)
        let budgetCap = 0;
        let budgetDesc = "";

        if (budget === "custom" && customBudget) {
            budgetCap = parseInt(customBudget.replace(/\D/g, '')) || 100000;
            const perDay = Math.round(budgetCap / durationDays);
            const style = perDay < 10000
                ? "ЭКОНОМ (хостелы/гестхаусы, уличная еда, общ. транспорт)"
                : perDay < 18000
                    ? "КОМФОРТ-ЛАЙТ (3* отели, кафе, автобусы/метро)"
                    : perDay < 30000
                        ? "КОМФОРТ (3-4* отели, рестораны, такси)"
                        : perDay < 50000
                            ? "БИЗНЕС (4* отели, рестораны выше среднего, такси)"
                            : "ЛЮКС (5* отели, бизнес-класс, VIP)";
            budgetDesc = `Бюджет пользователя: ${budgetCap.toLocaleString('ru-RU')} ₽ ИТОГО на ${durationDays} дней (≈${perDay.toLocaleString('ru-RU')} ₽/день). Стиль: ${style}`;
        } else {
            switch (budget) {
                case "economy":
                    budgetCap = 7500 * durationDays;
                    budgetDesc = `Economy (~7.5k RUB/day - Хостелы, публичный транспорт, бесплатные активности)`;
                    break;
                case "comfort":
                    budgetCap = 20000 * durationDays;
                    budgetDesc = `Comfort (~20k RUB/day - Отели 3-4*, такси, хорошие рестораны)`;
                    break;
                case "premium":
                case "luxury":
                    budgetCap = 50000 * durationDays;
                    budgetDesc = `Premium (~50k RUB/day - 5* отели, бизнес-класс, VIP)`;
                    break;
                default:
                    budgetCap = 15000 * durationDays;
                    budgetDesc = "Moderate (~15k RUB/day)";
            }
        }


        // Parse multiple destinations from semicolon-separated string
        // If strictDestinations===false (user chose "let AI pick"), ignore customDestination
        const effectiveCustomDestination = strictDestinations === false ? undefined : customDestination

        const destinations = effectiveCustomDestination
            ? effectiveCustomDestination.split(';').map((s: string) => s.trim()).filter(Boolean)
            : [] // Will be determined by AI if not specified

        const targetDescription = effectiveCustomDestination
            ? destinations.length > 1
                ? `Конкретные пункты назначения (${destinations.length}): ${destinations.map(parseDestination).join(', ')}`
                : `Specific User Request: ${parseDestination(destinations[0])}`
            : destinationType === 'mixed' ? 'Смешанный (Россия + зарубеж)' : destinationType === 'russia' ? 'ТОЛЬКО города России (РФ). ЗАПРЕЩЕНО: Грузия, Абхазия, Беларусь, Казахстан, Армения, Азербайджан и любые другие страны СНГ и зарубежья.' : 'За рубежом'

        // =====================================
        // REAL-TIME VALIDATION & CONTEXT
        // =====================================

        let validationResult: ValidationResult | null = null
        let dynamicContextStr = ""
        let adjustedBudget = budgetCap
        let warningsStr = ""

        // Only validate if we have explicit destinations
        if (destinations.length > 0 && startDate && endDate) {
            try {
                validationResult = await validateRouteRequest({
                    departureCity: effectiveDepartureCity,
                    destinations,
                    startDate,
                    endDate,
                    budget: budgetCap,
                    citizenship: preferences?.citizenship || "RU"
                })

                // Check for blockers
                if (validationResult.blockers.length > 0) {
                    const blockerMessages = validationResult.blockers.map(b => b.message).join("; ")
                    return NextResponse.json({
                        error: "Невозможно построить маршрут",
                        blockers: validationResult.blockers,
                        message: blockerMessages
                    }, { status: 400 })
                }

                // Apply budget adjustment if needed
                if (validationResult.adjustedBudget && validationResult.adjustedBudget > budgetCap) {
                    adjustedBudget = validationResult.adjustedBudget
                    console.log(`[Validation] Budget adjusted: ${budgetCap} → ${adjustedBudget}`)
                }

                warningsStr = validationResult.warnings?.map(w => w.message).join('; ') || ''

                // Collect dynamic context
                const dynamicContext = await collectDynamicContext({
                    departureCity: effectiveDepartureCity,
                    destinations,
                    startDate,
                    endDate,
                    interests: toArray(preferences?.interestsDetailed),
                    travelStyle: toArray(travelStyle)[0]
                })
                dynamicContextStr = formatDynamicContextForPrompt(dynamicContext)

            } catch (validationError) {
                console.error("[Validation] Error:", validationError)
                // Continue without validation on error
            }
        }

        // =====================================
        // LIVE FLIGHT & TRAIN PRE-CHECK 
        // =====================================
        if (destinations.length > 0 && effectiveDepartureCity) {
            try {
                const mainDest = destinations[0]
                console.log(`[Pre-Check] Checking ${effectiveDepartureCity} → ${mainDest}...`)
                
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

                const isClosed = isClosedMentioned(mainDest) || isClosedMentioned(effectiveDepartureCity)

                let flightContextLine = ""
                if (isClosed) {
                    const fromClean = String(effectiveDepartureCity).split(',')[0].trim();
                    const toClean = String(mainDest).split(',')[0].trim();
                    
                    flightContextLine = `\n🚆 LIVE DATA АЭРОПОРТ ЗАКРЫТ: Аэропорт в г. ${toClean} ЗАКРЫТ. 
СТРОГО ИСПОЛЬЗУЙ ЖД поезд (например, фирменный "Таврия") или комфортабельный автобус для маршрута ${fromClean} → ${toClean}. 
В ПОЛЕ title пиши детально: "Поезд [Номер/Название] ${fromClean} — ${toClean}". 
В ПОЛЕ desc опиши: время в пути (например, 28-33 часа), тип вагона (купе/плацкарт), вокзал отправления и прибытия. 
ОБЯЗАТЕЛЬНО укажи реалистичную стоимость билета в рублях (например, от 5 000 до 12 000 руб) в поле price. 
КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать слова "перелёт", "рейс", "вылет" или коды аэропортов.`
                } else {
                    const flightCheck = await checkDirectFlightsLive(effectiveDepartureCity, mainDest, startDate)

                    if (flightCheck.hasDirect && flightCheck.minPrice) {
                        flightContextLine = `\n🛫 LIVE DATA: Прямые авиарейсы ${effectiveDepartureCity} → ${mainDest} ЕСТЬ (от ${flightCheck.minPrice.toLocaleString('ru-RU')} ${flightCheck.currency.toUpperCase()}). СТРОЙ маршрут с ПРЯМЫМ перелётом.`
                    } else {
                        const estimatedPerDay = budgetCap / durationDays
                        const isBudget = estimatedPerDay < 10000 || budget === "economy"
                        const isRussia = destinationType === 'russia' || destinations.some((d: string) => d.toLowerCase().includes('россия'))
                        
                        if (isBudget || isRussia) {
                            flightContextLine = `\n🚆 LIVE DATA: Прямых авиарейсов ${effectiveDepartureCity} → ${mainDest} НЕТ. Чтобы сэкономить бюджет и избежать долгих пересадок, СТРОГО ПРЕДЛАГАЙ поездки на ПОЕЗДЕ (ЖД переезд). Оформи это в маршруте как ЖД Билет без кодов аэропортов.`
                        } else {
                            flightContextLine = `\n🛫 LIVE DATA: Прямых рейсов ${effectiveDepartureCity} → ${mainDest} НЕТ. Используй рейс С ПЕРЕСАДКОЙ (через крупные хабы) ИЛИ комфортный поезд.`
                        }
                    }
                }
                
                console.log(`[Pre-Check] Result: ${flightContextLine.trim()}`)
                dynamicContextStr += flightContextLine
            } catch (flightCheckErr) {
                console.error("[Pre-Check] Error:", flightCheckErr)
            }
        }

        // Apply travel style to prompt
        const styleStr = travelStyle ? formatTravelStyleForPrompt(toArray(travelStyle)[0] || "") : ""
        const rulesStr = getApplicableRules({
            travelStyle: toArray(travelStyle)[0]
        })

        const prompt = `
Создай детальный профессиональный маршрут путешествия на РУССКОМ языке.

ИСХОДНЫЕ ДАННЫЕ:
- Город отправления: ${departureCity}
- Направление: ${targetDescription}
${destinationType === 'russia' && !customDestination ? `⚠️ КРИТИЧНО: Маршрут ТОЛЬКО по России (РФ). Все города и места ОБЯЗАНЫ находиться на территории Российской Федерации. НЕЛЬЗЯ предлагать: Грузию, Батуми, Тбилиси, Беларусь, Казахстан, Армению, Азербайджан, Украину, любые страны СНГ и зарубежья.` : ''}
- Количество стран/городов: ${destinations.length > 0 ? destinations.length : (countryCount === "more" ? 4 : parseInt(countryCount as string) || 1)}
- ПРАВИЛО КОЛИЧЕСТВА СТРАН: Если количество > 1, ты ОБЯЗАН выбрать РАЗНЫЕ подходящие страны и обеспечить логистику (перелёты/поезда) между ними. Не ограничивайся одной страной.
- Даты: ${startDate || 'Гибкие'} — ${endDate || 'Гибкие'}
${warningsStr ? `⚠️ АКТУАЛЬНЫЕ ПРЕДУПРЕЖДЕНИЯ ДЛЯ ЭТИХ ДАТ: ${warningsStr}` : ''}${dynamicContextStr ? `\nАКТУАЛЬНЫЙ КОНТЕКСТ:\n${dynamicContextStr}` : ''}
- Длительность: СТРОГО ${durationDays} дней (сгенерируй ровно ${durationDays} дней)
- Сезонность: Проверь сезон и праздники. Зимой НЕТ пляжного отдыха (кроме тропиков). Учитывай Новый год, если попадает.
- Бюджет: ${budgetDesc}
⚠️ ЖЁСТКИЙ ЛИМИТ БЮДЖЕТА: ${budgetCap.toLocaleString('ru-RU')} ₽ МАКСИМУМ НА ВСЮ ПОЕЗДКУ. Сумма стоимостей всех активностей + отели + перелёты НЕ ДОЛЖНА превышать это число. Если бюджет небольшой — выбирай дешёвые отели и бесплатные/недорогие активности. НЕ ПРЕДЛАГАЙ дорогие рестораны, 5* отели или бизнес-класс если бюджет этого не позволяет.

${destinations.length > 0 ? `КРИТИЧНО — ОБЯЗАТЕЛЬНЫЕ ПУНКТЫ НАЗНАЧЕНИЯ:
Маршрут ДОЛЖЕН включать ВСЕ указанные ниже места. НЕ ПРОПУСКАЙ НИ ОДНО! ПРИОРИТЕТ ВЫШЕ ЧЕМ У "КОЛИЧЕСТВО СТРАН".
${destinations.map((d: string, i: number) => `${i + 1}. ${parseDestination(d)}`).join('\n')}
Распредели время равномерно между всеми пунктами!` : ''}

${strictDestinations === true && destinations.length > 0 ? `⚠️ ЖЁСТКИЙ ПРИОРИТЕТ — ЭКОНОМ В КОНКРЕТНЫХ ГОРОДАХ:
Пользователь НАСТАИВАЕТ на этих городах несмотря на эконом-бюджет.
Генерируй маршрут СТРОГО в указанных городах. Адаптируй стиль под бюджет: хостелы/гостевые дома,
уличная еда, бесплатные или дешёвые активности, бюджетный транспорт.
НЕ МЕНЯЙ ГОРОДА НИ ПРИ КАКИХ УСЛОВИЯХ.
		В поле советы объясни эконом-адаптацию: конкретные типы жилья и примерные цены, где есть бюджетно.` : ''}

${destinationType === 'russia' || (destinations.length > 0 && destinations.some((d: string) => d.toLowerCase().includes('россия'))) ? `
🇷🇺 ОСОБЕННОСТИ МАРШРУТОВ ПО РОССИИ (ЖЁСТКИЙ ПРИОРИТЕТ):
Пользователи считают стандартные "прогулки по площадям" и классические скучные музеи (вроде очередного краеведческого) слишком банальными.
Сделай путешествие по России ЯРКИМ, АКТИВНЫМ и АТМОСФЕРНЫМ.

1. ПРИРОДНЫЕ РЕГИОНЫ (Карелия, Камчатка, Кавказ, Алтай, Дальний Восток, Кольский п-ов, Сахалин):
   - МАКСИМУМ АКТИВНОСТИ: Добавляй треккинг, джип-туры, выходы в море, хаски-парки, наблюдение за китами, снегоходы, глэмпинги. Забудь про скучные городские променады — гони туристов на природу!
   - Указывай реальные природные споты (например, Сулакский каньон, Териберка, Рускеала, Халактырский пляж).
2. ЮЖНЫЕ КУРОРТЫ (Сочи, Крым, Дагестан):
   - КОМБИНИРУЙ: Не только пассивный пляж, но и горы (Красная Поляна, Роза Хутор, Ай-Петри), ущелья, водопады, сап-борды.
3. ИСТОРИЧЕСКИЕ И КРУПНЫЕ ГОРОДА (Москва, СПб, Казань, Нижний Новгород, Калининград, Золотое Кольцо, и другие):
   - МЕНЬШЕ МУЗЕЕВ, БОЛЬШЕ ЖИЗНИ: Смести фокус со скучных классических экскурсий на:
     * Современные креативные кластеры (Севкабель, Флакон, Смена и др.).
     * Местную гастрономию, стрит-фуд, необычные бары и спешлти-кофейни.
     * Центральные рынки (Даниловский, Василеостровский и т.д.) для погружения в культуру.` : ''}

ИВЕНТЫ И ПРАЗДНИКИ (КРИТИЧНО):
${travelStyle.includes('events') ? `Пользователь ВЫБРАЛ "ивенты" - ОБЯЗАТЕЛЬНО включи в маршрут:
  - Фестивали, концерты, выставки в даты ${startDate} - ${endDate}
  - Государственные праздники страны назначения
  - Карнавалы, местные традиции
  - Спортивные события (если есть)
  Для КАЖДОГО крупного события указывай название, дату и где купить билеты.` : 'Ивенты не в приоритете, но если даты попадают на крупный праздник (Новый Год, Рождество, Карнавал, 8 марта, 23 февраля) - упомяни это.'}

ПРОВЕРКА ПРАЗДНИКОВ:
- Если даты ${startDate} - ${endDate} включают 31 декабря - 7 января: добавь новогодние мероприятия
- Если даты включают 14 февраля: романтические события
- Если даты включают февраль-март в Европе: карнавалы (Венеция, Ницца)
- Если лето: фестивали (Sziget, Tomorrowland, Exit)

- Стиль: ${styleStr || travelStyle.join(', ')}
${rulesStr ? `ПРАВИЛА ДЛЯ ВЫБРАННОГО СТИЛЯ:\n${rulesStr}` : ''}
- Компания: ${companions} (${travelers || ((companions === 'family' || companions === 'friends') ? 2 : (companions === 'solo' ? 1 : 2))} чел.)

ПЕРСОНАЛИЗАЦИЯ:
- Гражданство: ${preferences?.citizenship || 'Не указано'}
- Пол: ${preferences?.gender === 'male' ? 'Мужской' : preferences?.gender === 'female' ? 'Женский' : 'Не указан'}
- Возраст: ${preferences?.age ? `${preferences.age} лет` : 'Не указан'}
- Документы: ${(() => {
  const DOC_LABELS: Record<string, string> = {
    ru_passport: 'Паспорт РФ (внутренний)', foreign_passport: 'Загранпаспорт РФ',
    schengen: 'Шенгенская виза (29 стран)', us_visa: 'Виза США', uk_visa: 'Виза Великобритании',
    canada_visa: 'Виза Канады (TRV)', australia_visa: 'Виза Австралии (Sub 600)', japan_visa: 'Виза Японии',
    korea_visa: 'Виза Южной Кореи (K-ETA)', india_evisa: 'E-виза Индии', thailand_evisa: 'Таиланд (Безвизовый штамп/Виза)',
    vietnam_evisa: 'E-виза Вьетнама', china_visa: 'Виза Китая', saudi_visa: 'Виза Саудовской Аравии',
    israel_visa: 'Израиль (ETA-IL)', albania_evisa: 'E-виза Албании', uae_visa: 'Виза ОАЭ (По прибытии)',
  }
  const docs = toArray(preferences?.documents)
  return docs.map((d: string) => {
    if (d.startsWith('passport:')) return `Паспорт ${d.split(':')[1]}`
    if (d.startsWith('id:')) return `ID-карта ${d.split(':')[1]}`
    if (d.startsWith('visa:')) return `Виза ${d.split(':')[1]}`
    return DOC_LABELS[d] || d
  }).join(', ') || 'Не указаны'
})()}
- Языки: ${toArray(preferences?.languages).join(', ') || 'Не указано'}
- Темп: ${preferences?.pace || 'moderate'} (slow = поздние подъёмы, много свободного времени; fast = насыщенный день)
- Диета: ${toArray(preferences?.dietaryRestrictions).join(', ') || 'Без ограничений'}, доп: ${preferences?.dietaryCustom || 'Нет'}
- Интересы: ${toArray(preferences?.interestsDetailed).join(', ') || 'Общие'}, доп: ${preferences?.interestsCustom || 'Нет'}
${filterByDocuments && toArray(preferences?.documents).length > 0 ? (() => {
  const docs = toArray(preferences?.documents)
  const has = (key: string) => docs.includes(key) || docs.some((d: string) => d.startsWith(key + ':'))
  const hasForeign = has('foreign_passport')
  const hasSchengen = has('schengen')
  const hasUs = has('us_visa')
  const hasUk = has('uk_visa')
  const hasCanada = has('canada_visa')
  const hasAustralia = has('australia_visa')
  const hasJapan = has('japan_visa')
  const hasKorea = has('korea_visa')
  const hasIndia = has('india_evisa')
  const hasAlbania = has('albania_evisa') || docs.some((d: string) => d.toLowerCase().includes('albani'))
  const hasSaudi = has('saudi_visa')

  const allowed: string[] = []
  const forbidden: string[] = []

  if (hasForeign) {
    allowed.push('Беларусь', 'Казахстан', 'Армения', 'Азербайджан', 'Узбекистан', 'Таджикистан', 'Кыргызстан', 'Туркменистан', 'Молдова', 'Грузия',
      'Сербия', 'Черногория', 'Северная Македония', 'Босния и Герцеговина',
      'Турция', 'Таиланд', 'Марокко', 'Тунис', 'Израиль', 'Иордания', 'ОАЭ', 'Катар', 'Бахрейн', 'Мальдивы',
      'Куба', 'Мексика', 'Бразилия', 'Аргентина', 'Колумбия', 'Эквадор', 'Перу', 'Чили', 'Доминиканская Республика',
      'Индонезия', 'Малайзия', 'Камбоджа', 'Лаос', 'Монголия', 'Вьетнам', 'Китай', 'Филиппины',
      'Египет', 'ЮАР', 'Танзания', 'Кения', 'Эфиопия', 'Намибия', 'Ботсвана', 'Зимбабве')
    if (!hasAlbania) forbidden.push('Албания (нужна e-виза, которой НЕТ у пользователя)')
    forbidden.push('Косово (нужна виза РФ граждан)')
    if (!hasSchengen) forbidden.push('Германия, Франция, Испания, Италия, Греция, Австрия, Чехия, Венгрия, Польша, Нидерланды и все страны Шенгена')
    if (!hasUs) forbidden.push('США, Канада (без соответствующей визы)')
    if (!hasUk) forbidden.push('Великобритания')
    if (!hasJapan) forbidden.push('Япония')
    if (!hasKorea) forbidden.push('Южная Корея')
    if (!hasAustralia) forbidden.push('Австралия, Новая Зеландия')
    if (!hasIndia) forbidden.push('Индия (нужна e-виза)')
    if (!hasSaudi) forbidden.push('Саудовская Аравия (нужна e-виза)')
  }
  if (hasSchengen) allowed.push('Германия', 'Франция', 'Испания', 'Италия', 'Греция', 'Австрия', 'Чехия', 'Венгрия', 'Польша', 'Нидерланды', 'Португалия', 'Бельгия', 'Швейцария', 'Норвегия', 'Швеция', 'Финляндия', 'Дания', 'Исландия', 'Мальта', 'Хорватия', 'Словения', 'Словакия', 'Латвия', 'Литва', 'Эстония', 'Люксембург', 'Румыния', 'Болгария')
  if (hasAlbania) allowed.push('Албания')
  if (hasUs) allowed.push('США')
  if (hasCanada) allowed.push('Канада')
  if (hasUk) allowed.push('Великобритания')
  if (hasJapan) allowed.push('Япония')
  if (hasKorea) allowed.push('Южная Корея')
  if (hasAustralia) allowed.push('Австралия', 'Новая Зеландия')
  if (hasIndia) allowed.push('Индия')
  if (hasSaudi) allowed.push('Саудовская Аравия')

  // Add countries from custom documents (passport:X, id:X, visa:X)
  docs.forEach((d: string) => {
    if (d.startsWith('passport:') || d.startsWith('id:') || d.startsWith('visa:')) {
      const country = d.split(':')[1]
      if (country) allowed.push(country)
    }
  })

  return `
🛂 СТРОГИЙ ФИЛЬТР ПО ДОКУМЕНТАМ АКТИВЕН — нарушение = критическая ошибка!
Доступные страны (разрешено предлагать): ${[...new Set(allowed)].join(', ')}
ЗАПРЕЩЕНО предлагать: ${forbidden.join('; ')}
ПРАВИЛО: Если страна не в списке "Доступные" — не предлагай её, даже если кажется что виза не нужна. При любом сомнении — НЕ предлагай эту страну.`
})() : ''}
- Способы оплаты: ${toArray(paymentMethods).join(', ') || 'Не указано'}
- Русскоговорящий гид: ${requireRussianGuide ? 'ДА' : 'НЕТ'}
- Посещённые страны: ${toArray(preferences?.visitedCountries).join(', ') || 'Нет'} (предлагай НОВЫЕ места, избегай повторов)

РЕАЛЬНОСТЬ ЯНВАРЯ 2026 (КРИТИЧНО):
- Ограничения: ${GROUNDING_DATA_2026.globalRestrictions.join('; ')}
- Аэропорты: ${GROUNDING_DATA_2026.airportStatus.join('; ')}
- Авиасообщение: ${GROUNDING_DATA_2026.flightConnectivity.join('; ')}
- ЗАКРЫТЫЕ АЭРОПОРТЫ (АБСОЛЮТНЫЙ ЗАПРЕТ НА ПОЛЁТЫ): ${(GROUNDING_DATA_2026 as any).closedAirports?.map((a: any) => `${a.city} (${a.iata})`).join(', ') || 'Анапа, Белгород, Брянск, Воронеж, Курск, Липецк, Ростов-на-Дону, Симферополь'}
  ⚠️ СТРОЖАЙШЕ ЗАПРЕЩЕНО ПЛАНИРОВАТЬ АВИАПЕРЕЛЁТЫ В ЭТИ ГОРОДА (особенно в Симферополь и Крым). Предлагай перелет в Сочи (AER) или Минводы (MRV), а оттуда - поезд или автобус!
- Тренды: ${JSON.stringify(GROUNDING_DATA_2026.trendingLocations)}

${safeHighlight ? `✨ ОСОБОЕ ЛИЧНОЕ ПОЖЕЛАНИЕ ПОЛЬЗОВАТЕЛЯ:
Пользователь написал: "${safeHighlight}"
ПРАВИЛА УЧЕТА ПОЖЕЛАНИЯ:
1. ВЫБОР СТРАНЫ: Если пожелание явно связано с конкретным регионом, ОБЯЗАТЕЛЬНО выбери эту страну.
2. ТЕМАТИКА И АТМОСФЕРА: Пожелание может задавать общую тему (например, "Как в аниме", "Гастротур", "Киберпанк"). В таком случае адаптируй ВЕСЬ маршрут под этот вайб. Распредели тематические события по разным дням (например, для аниме: день на пляже, летний фестиваль фейерверков, поход в колоритное кафе).
3. МАРКИРОВКА: Для активностей, которые напрямую реализуют это пожелание, добавляй в "desc" пометку "(✨ специально для тебя)". Их может быть несколько в разные дни.
4. КРИТИЧЕСКИЙ ЗАПРЕТ: КАТЕГОРИЧЕСКИ ЗАПРЕЩАЕТСЯ цитировать текст пожелания, комментировать его напрямую (например: "Учитывая ваше пожелание про аниме..."). Просто органично вплети эту концепцию в реальный план поездки и описание маршрута.
` : ''}
ПРАВИЛА ГЕНЕРАЦИИ:

${creativityInstruction}

0. ВЫБОР НАПРАВЛЕНИЯ (КРИТИЧНО):
   - Если пользователь выбрал "За границу" (Abroad) без конкретной страны:
     - НЕ ПРЕДЛАГАЙ ТУРЦИЮ, ЕГИПЕТ или ОАЭ каждый раз! Это банально.
     - Предлагай РАЗНООБРАЗНЫЕ направления: Япония (особенно если упомянута сакура, суши, аниме), Таиланд, Вьетнам, Сербия, Китай, Марокко, ЮАР, Латинская Америка, Мальдивы, Шри-Ланка, Узбекистан.
     - Используй "Internal Random Seed" чтобы каждый раз предлагать что-то новое.
     - Выбирай направление, идеально подходящее под "${travelStyle.join(', ')}" и "${safeHighlight}".

0.1. ТЕГИ (СТРОГО):
   - Генерируй теги ТОЛЬКО если они соответствуют ВЫБРАННЫМ интересам (${travelStyle.join(', ')}).
   - НЕ ДОБАВЛЯЙ "Ночная жизнь" или "Шопинг", если пользователь их не выбрал (если только это не ключевая особенность места, которую нельзя избежать).
   - Теги должны быть на РУССКОМ.

1. ЛОГИСТИКА: Полная door-to-door логистика от ${departureCity}.

2. СТОИМОСТЬ: Для КАЖДОЙ активности указывай реальную цену в рублях. НИКОГДА не пиши cost: "0 ₽". Для реально бесплатных мест пиши "Бесплатно (вход свободный)" или "~500 ₽ (вода/перекус)". Ужин = 1500-5000₽.

3. КОНКРЕТНЫЕ НАЗВАНИЯ (КРИТИЧНО):
   - ПЛОХО: "Местный ресторан", "Центральный парк", "Городской музей"
   - ХОРОШО: "Ресторан 'Dr. Живаго'", "Парк Зарядье", "Третьяковская галерея"

4. КОНТИНУИТЕТ И РЕАЛЬНЫЕ РЕЙСЫ (КРИТИЧНО):
   - День N заканчивается в городе A → День N+1 НАЧИНАЕТСЯ в городе A
   - Перемещение между городами = отдельная запись в logistics
   
   ПРЯМЫЕ РЕЙСЫ ИЗ МОСКВЫ (ПРИОРИТЕТ!):
   - Турция: Стамбул, Анталья, Бодрум, Мерсин — прямой рейс ~3-4ч
   - ОАЭ: Дубай, Абу-Даби, Шарджа — прямой рейс ~5-6ч  
   - ЕГИПЕТ: Хургада, Шарм-эль-Шейх, Каир — ПРЯМОЙ РЕЙС ~4-5ч
   - Таиланд: Бангкок, Пхукет, Паттайя — прямой рейс ~9-10ч
   - Китай: Пекин, Шанхай, Урумчи, Сиань — прямой рейс ~7-8ч
   - Сербия: Белград — прямой рейс ~3ч
   - Грузия: Тбилиси, Батуми, Кутаиси — прямой рейс ~2-3ч
   - Армения: Ереван, Гюмри — прямой рейс ~3ч
   - Казахстан: Алматы, Астана — прямой рейс ~3-4ч
   - Узбекистан: Ташкент, Самарканд — прямой рейс ~4ч
   - Мальдивы: Мале — прямой рейс ~9ч
   - Шри-Ланка: Коломбо, Хамбантота — прямой рейс ~9ч (сезонные)
   - Вьетнам: Хошимин, Нячанг, Фукуок — прямой рейс ~9-10ч
   - Индия: Гоа, Дели — прямой рейс ~6-7ч (сезонные)
   - Индонезия: Бали (Денпасар) — прямой рейс ~11ч
   - Израиль: Тель-Авив — прямой рейс ~4ч
   - Иордания: Амман — прямой рейс ~4ч (3 раза в неделю)
   - Куба: Варадеро, Кайо-Коко, Гавана — прямой рейс ~13-14ч
   - Венесуэла: Порламар — прямой рейс
   - Сейшелы: Маэ — прямой рейс (сезонные)
   - Катар: Доха — прямой рейс ~5ч
   - Оман: Маскат — прямой рейс ~5ч (4 раза в неделю)
   - Марокко: Касабланка — прямой рейс
   - Эфиопия: Аддис-Абеба — прямой рейс
   - Азербайджан: Баку — прямой рейс ~3ч
   - Кыргызстан: Бишкек — прямой рейс ~4ч
   - Таджикистан: Душанбе — прямой рейс ~4ч
   - Филиппины: Манила — прямой рейс (с октября 2025)
   - Мьянма — прямой рейс (с октября 2025)
   
   ⚠️ ЕСЛИ ЕСТЬ ПРЯМОЙ РЕЙС — ИСПОЛЬЗУЙ ЕГО! НЕ ЧЕРЕЗ ПЕРЕСАДКУ!
   
   ТОЛЬКО С ПЕРЕСАДКОЙ (Европа, США):
   - В ЕВРОПУ (кроме Сербии/Турции) и США прямых рейсов НЕТ
   - Пересадочные хабы: Стамбул, Белград, Баку, Ереван, Доха, Дубай
   
   - Расстояние < 600км = поезд вместо самолёта
   
   - ЦЕНЫ НА ПЕРЕЛЁТЫ 2025-2026 (в одну сторону, ориентировочно):
     • Москва-Стамбул: от 4 000₽ (лоукост) до 15 000₽ (средняя)
     • Москва-Дубай: от 5 000₽ (лоукост) до 25 000₽ (средняя)
     • Москва-Хургада: от 10 000₽ до 25 000₽
     • Москва-Пекин: от 15 000₽ до 35 000₽
     • Москва-Пхукет: от 25 000₽ до 50 000₽
     • Москва-Мальдивы: от 30 000₽ до 60 000₽

5. РЕАЛИЗМ ВРЕМЕНИ (КРИТИЧНО — НЕТ МГНОВЕННОЙ ТЕЛЕПОРТАЦИИ):
   - Если в logistics указан перелёт/поезд → ПЕРВАЯ активность дня ДОЛЖНА быть "Прибытие и заселение"
   - Перелёт 2-4 часа + трансфер = активности начинаются с "День" или "Вечер", НЕ с "Утро"
   - Перелёт 5+ часов = день посвящён перелёту, активности только вечером (ужин, прогулка)
   - ПЛОХО: logistics "Перелёт Белград→Стамбул 4ч" + Утро: "Прогулка по Балат"
   - ХОРОШО: logistics "Перелёт Белград→Стамбул 4ч" + Утро: "Перелёт и прибытие в Стамбул" + День: "Заселение в отель, район Бейоглу" + Вечер: "Прогулка по Балат"
   - Последний день = возвращение в ${departureCity} (весь день на обратный путь)
   - Цены 2026: Москва 4* = ~12000₽/ночь, Стамбул 3* = ~8000₽/ночь

6. VIRAL SPOTS: Добавь 3-5 популярных в TikTok/Instagram локаций в отдельный массив viralSpots.

7. СООТВЕТСТВИЕ НАЗВАНИЯ И МАРШРУТА (КРИТИЧНО):
   - Название маршрута ДОЛЖНО отражать РЕАЛЬНЫЕ страны/города в itinerary
   - ПЛОХО: title="Пекин и Гуанчжоу" но countries=["Болгария", "Греция"]
   - ХОРОШО: title="Балканское приключение" если едем в Болгарию и Грецию
   - Проверь: все страны в countries[] ДОЛЖНЫ быть в itinerary

8. ВИЗОВАЯ ИНФОРМАЦИЯ ДЛЯ КАЖДОЙ СТРАНЫ (КРИТИЧНО):
   - Поле visaAdvice должно содержать инфу для КАЖДОЙ страны в маршруте
   - Формат: "Страна1: требования. Страна2: требования."
   - Для Шенгена указать: "Болгария: НЕ входит в Шенген, нужна отдельная виза или мультивиза"
   - Для безвизовых: "Турция: безвизовый въезд до 60 дней"

9. РАБОЧИЕ ССЫЛКИ НА БРОНИРОВАНИЕ (КРИТИЧНО):
   - Авиабилеты: ВСЕГДА используй формат https://www.aviasales.ru/search/{ORIG}{DDMM}{DEST}1
     где {ORIG} и {DEST} — IATA коды аэропортов (3 буквы), {DDMM} — дата вылета
     ПРИМЕР: Москва(MOW) → Дубай(DXB) 15 февраля = https://www.aviasales.ru/search/MOW1502DXB1
     Если дата неизвестна, используй: https://www.aviasales.ru/search/{ORIG}{DEST}1
   - В title транспортной активности ВСЕГДА указывай IATA коды в скобках:
     ПРИМЕР: "Перелёт Москва (MOW) → Стамбул (IST)"
   - Поезда РЖД: https://ticket.rzd.ru/
   - Отели: https://ostrovok.ru/ или https://www.booking.com/
   - НЕ ВЫДУМЫВАЙ URL - используй только реальные сайты бронирования

10. КИЛОМЕТРАЖ И ВРЕМЯ В ЛОГИСТИКЕ (ОБЯЗАТЕЛЬНО):
   - В каждом logistics ОБЯЗАТЕЛЬНО указывай distance (расстояние) и duration (время в пути)
   - Пример: "distance": "2800 км", "duration": "4 ч 15 мин (перелёт)"
   - Для поездов: "distance": "700 км", "duration": "4 ч (Сапсан)"
   - Для такси/автобуса: "distance": "35 км", "duration": "45 мин"

JSON СХЕМА:
{
  "title": "Название маршрута",
  "description": "Описание",
  "totalBudget": "150 000 ₽",
  "budgetAnalysis": {
    "avgAccommodation": "5000 ₽/ночь",
    "avgFood": "3000 ₽/день",
    "avgTransport": "15000 ₽",
    "avgActivities": "5000 ₽/день",
    "avgMisc": "3000 ₽"
  },
  "visaAdvice": "Визовые требования для каждой страны...",
  "paymentAdvice": "Карты, наличные, обмен валюты...",
  "safetyInfo": { "rating": 8, "tips": "Советы по безопасности..." },
  "restrictions": "Ограничения...",
  "countries": [{"name": "Страна", "visaRequired": true}],
  "tags": ["тег1", "тег2"],
  "viralSpots": [{"name": "Место", "desc": "Почему популярно", "mapLink": "..."}],
  "flights": [
    { "dayNumber": 1, "direction": "outbound", "departureCode": "MOW", "arrivalCode": "IST", "airline": "Aeroflot", "price": 25000, "duration": "4ч 30м" }
  ],
  "hotels": [
    { "dayStart": 1, "dayEnd": 4, "hotelName": "Grand Hotel 4*", "city": "Стамбул", "pricePerNight": 8000, "totalPrice": 24000 }
  ],
  "itinerary": [
    {
      "day": 1, "title": "Прибытие в Стамбул", "dayTotal": "46 500 ₽",
      "activities": [
        { "time": "Утро", "type": "transport", "title": "Перелёт Москва (SVO) → Стамбул (IST)", "placeName": "Аэропорт Стамбул (IST)", "desc": "Прямой рейс Turkish Airlines TK414, 3.5 часа.", "cost": "15 000 ₽" },
        { "time": "День", "type": "hotel", "title": "Заселение в Pera Palace Hotel 5*", "placeName": "Pera Palace Hotel 5*", "imageQuery": "Art Deco hotel grand lobby marble columns Istanbul golden hour", "desc": "Легендарный отель в районе Бейоглу. Заселение с 14:00.", "cost": "12 000 ₽/ночь" },
        { "time": "Вечер", "type": "food", "title": "Ужин в ресторане Mikla", "placeName": "Ресторан Mikla", "imageQuery": "rooftop fine dining restaurant panoramic cityscape candlelit Istanbul Bosphorus", "desc": "Панорамный ресторан на крыше с видом на Золотой Рог. Авторская турецкая кухня.", "cost": "5 000 ₽" }
      ]
    }
  ]
}

Заполняй активности строго по шаблонам дней из системного промпта (ДЕНЬ ПРИБЫТИЯ, ОБЫЧНЫЙ ДЕНЬ, ДЕНЬ ПЕРЕЕЗДА, ПОСЛЕДНИЙ ДЕНЬ).

ПОЛЕ imageQuery — «Визуальный отпечаток» активности (ОБЯЗАТЕЛЬНО для hotel/food/activity):
- Добавляй поле "imageQuery" для type=hotel, food, activity — поисковый запрос СТРОГО на АНГЛИЙСКОМ для Pexels.
- Для type=transport — НЕ добавляй imageQuery.
- КОНЦЕПЦИЯ «Визуального отпечатка»: по запросу сразу должно быть понятно ЧТО, ГДЕ и В КАКОЙ АТМОСФЕРЕ.
- ОБЯЗАТЕЛЬНО включи минимум ОДИН из маркеров:
  • Архитектурный: "Art Deco facade", "Byzantine dome", "Soviet mosaic", "cobblestone alley", "wrought iron gate"
  • Культурный: "street food vendor steam", "open-air market stalls", "Buddhist shrine incense", "night bazaar neon"
  • Визуальный: "golden hour light", "morning mist", "candlelit interior", "cinematic aerial", "close-up texture"
- ЗАПРЕЩЕНЫ как главные слова без конкретики: "nature", "landscape", "outdoors", "flowers", "park", "street", "view", "building", "place"
- Формат: [конкретный визуальный элемент] + [тип места + маркер] + [город/страна]
  ✓ type=hotel   → "Art Deco hotel rooftop pool overlooking skyline Istanbul golden hour"
  ✓ type=hotel   → "grand marble lobby crystal chandelier boutique hotel Belgrade interior"
  ✓ type=food    → "steaming Carbonara pasta close-up rustic wooden table Trastevere Rome"
  ✓ type=food    → "open-air night hawker market neon lights Singapore street food"
  ✓ type=activity → "Senso-ji temple vermillion torii gate morning mist Asakusa Tokyo"
  ✓ type=activity → "gold-lit Eiffel Tower iron lattice structure Trocadero cinematic"
  ✓ type=activity → "medieval cobblestone alley lanterns twilight Tallinn old town"
  ✗ "Tokyo restaurant food"               ← нет конкретики
  ✗ "beautiful landscape nature"          ← запрещённые общие слова
  ✗ "Mikla restaurant Istanbul rooftop"   ← собственное имя (Pexels не найдёт)
  ✗ "Cabbages Condoms Bangkok"            ← слова из названия → НЕДОПУСТИМЫЙ контент
  ✗ "Ресторан красивый вид"              ← русский язык не работает
- КРИТИЧЕСКИ ВАЖНО — ЗАПРЕЩЕНО в imageQuery:
  • Собственные имена заведений, отелей, ресторанов из полей title/placeName
  • Любые слова, которые могут быть двусмысленными вне контекста (даже если они есть в названии места)
  • Пример: ресторан "Cabbages & Condoms" → imageQuery: "colorful Thai restaurant quirky interior Bangkok vegetables decor" (описание атмосферы, НЕ название)
- УНИКАЛЬНОСТЬ: каждый imageQuery в маршруте ОБЯЗАН быть визуально уникальным. Если в городе 5 активностей — у каждой свой архитектурный/культурный акцент, ни одного повтора ключевых слов.

ЯЗЫК: Строго РУССКИЙ.`;

        const systemPrompt = `Ты — эксперт-планировщик путешествий TraveLLM для русских туристов. Отвечаешь ТОЛЬКО JSON. Будь конкретен.

${ITINERARY_STRUCTURE}`


        // Helper to parse JSON from AI response
        function parseJsonResponse(raw: string, source: string): any {
            if (!raw) throw new Error(`Empty response from ${source}`)

            let clean = raw.match(/\{[\s\S]*\}/)?.[0] || raw

            // Remove markdown code blocks if present
            clean = clean.replace(/```json\s*/g, '').replace(/```\s*/g, '');

            // Basic repair for unquoted hashtags which DeepSeek sometimes outputs
            clean = clean.replace(/:\s*#([a-zA-Zа-яА-Я0-9_]+)/g, ': "#$1"'); // keys or values starting with #
            clean = clean.replace(/,\s*#([a-zA-Zа-яА-Я0-9_]+)/g, ', "#$1"'); // array items starting with #
            clean = clean.replace(/\[\s*#([a-zA-Zа-яА-Я0-9_]+)/g, '["#$1"'); // first array item

            // Fix missing colons after property names (common DeepSeek error)
            // Pattern: "propertyName" "value" -> "propertyName": "value"
            clean = clean.replace(/"([^"]+)"\s+"([^"]+)"/g, '"$1": "$2"');
            // Pattern: "propertyName" { -> "propertyName": {
            clean = clean.replace(/"([^"]+)"\s+\{/g, '"$1": {');
            // Pattern: "propertyName" [ -> "propertyName": [
            clean = clean.replace(/"([^"]+)"\s+\[/g, '"$1": [');
            // Pattern: "propertyName" number -> "propertyName": number
            clean = clean.replace(/"([^"]+)"\s+(\d+)/g, '"$1": $2');

            // Fix trailing commas before closing brackets
            clean = clean.replace(/,\s*}/g, '}');
            clean = clean.replace(/,\s*]/g, ']');

            if (!clean.trim().endsWith('}')) {
                console.warn(`${source} JSON appears truncated, attempting basic repair...`);
                let openBraces = (clean.match(/\{/g) || []).length;
                let closeBraces = (clean.match(/\}/g) || []).length;
                let openBrackets = (clean.match(/\[/g) || []).length;
                let closeBrackets = (clean.match(/\]/g) || []).length;
                while (openBrackets > closeBrackets) { clean += ']'; closeBrackets++; }
                while (openBraces > closeBraces) { clean += '}'; closeBraces++; }
            }

            try {
                return JSON.parse(clean);
            } catch (e) {
                // Last ditch: try to just regex out the whole tags array if it's the culprit
                console.warn("JSON repair failed, trying to strip problematic fields...", e);
                clean = clean.replace(/"tags":\s*\[[^\]]*\]/g, '"tags": []');
                clean = clean.replace(/"viralSpots":\s*\[[^\]]*\]/g, '"viralSpots": []');
                try {
                    return JSON.parse(clean);
                } catch (e2) {
                    console.error("Final JSON parse failed:", e2);
                    throw e2;
                }
            }
        }

        // Generate metadata (title, budget analysis, visa, safety) - small request
        async function generateMetadata(): Promise<any> {
            const metaPrompt = `
Generate ONLY the metadata for a travel itinerary. NO itinerary days needed.

DESTINATION: ${targetDescription}
DEPARTURE: ${departureCity}
DURATION: ${durationDays} days
${warningsStr ? `WARNINGS: ${warningsStr}` : ''}
BUDGET: ${budgetDesc} (max ${budgetCap} RUB)
STYLE: ${travelStyle.join(', ')}
⚠️ MANDATORY COUNTRIES COUNT: ${countryCount === "more" ? "4+" : (countryCount || "1")} — countries[] MUST contain EXACTLY ${countryCount === "more" ? "4 or more" : (countryCount || "1")} entries. ${parseInt(String(countryCount)) > 1 ? `Even if primary wish (e.g. sakura→Japan) leads to one country, you MUST add ${parseInt(String(countryCount)) - 1} more complementary country. Example: Japan + South Korea, or Japan + China. Returning fewer countries than requested is a CRITICAL ERROR.` : ""}
PACE: ${preferences?.pace || 'moderate'}
VISITED: ${toArray(preferences?.visitedCountries).join(', ') || 'None'}
PAYMENT METHODS: ${toArray(paymentMethods).join(', ') || 'Not specified'}
PERSONALIZATION: ${toArray(preferences?.interestsDetailed).join(', ') || 'General'}
DIETARY: ${toArray(preferences?.dietaryRestrictions).join(', ') || 'None'}
${safeHighlight ? `SPECIAL USER WISH: "${safeHighlight}" — если пожелание намекает на страну (сакура→Япония, пирамиды→Египет, фьорды→Норвегия), ВЫБЕРИ именно эту страну!` : ''}

CURRENT REALITY (JAN 2026):
- Restrictions: ${GROUNDING_DATA_2026.globalRestrictions.join(' ')}
- Flights: ${GROUNDING_DATA_2026.flightConnectivity.join(' ')}
- Prices are HIGH. Flights are expensive.
- Include "viralSpots" (Top 5 TikTok/Instagram spots for 2025/2026).

CRITICAL RULES:
1. Title MUST match the destination countries (if going to Bulgaria, don't call it "Beijing trip")
2. visaAdvice MUST include requirements for EACH country separately
3. countries[] must have visaRequired and visaType for each
4. COUNTRIES COUNT must be respected — if user wants 2 countries, put 2 DIFFERENT countries in countries[]
5. If SPECIAL USER WISH hints at a country (сакура→Japan, пирамиды→Egypt, кенгуру→Australia), CHOOSE that country

Output VALID JSON only (all strings must be in double quotes):
{
  "title": "Название маршрута (ДОЛЖНО соответствовать направлению: ${targetDescription}${safeHighlight ? `, учитывая пожелание: ${safeHighlight}` : ''})",
  "description": "Краткое описание на 2-3 предложения",
  "totalBudget": "Рассчитывается автоматически",
  "budgetAnalysis": {
    "avgAccommodation": "5000 ₽/ночь",
    "avgFood": "3000 ₽/день",
    "avgTransport": "15000 ₽",
    "avgActivities": "5000 ₽/день",
    "avgMisc": "3000 ₽"
  },
  "visaAdvice": "Страна1: требования для РФ граждан. Страна2: требования. (ДЛЯ КАЖДОЙ СТРАНЫ!)",
  "paymentAdvice": "Какие карты работают в каждой стране, где менять деньги",
  "safetyInfo": { "rating": 8, "tips": "Советы по безопасности" },
  "restrictions": "Текущие ограничения если есть или null",
  "countries": [{"name": "Страна", "visaRequired": true, "visaType": "Шенген/национальная/безвиз"}],
  "tags": ["вино", "горы", "море"],
  "viralSpots": [
    { "name": "Название места", "desc": "Почему это хайпово (TikTok/Insta)", "mapLink": "https://..." }
  ],
  "tripPlan": [
    { "startDay": 1, "endDay": 4, "city": "Токио", "country": "Япония" },
    { "startDay": 5, "endDay": 8, "city": "Тбилиси", "country": "Грузия" },
    { "startDay": 9, "endDay": ${durationDays}, "city": "Стамбул", "country": "Турция" }
  ]
}

CRITICAL:
- Output ONLY valid JSON, no markdown, no comments
- ALL values must be in double quotes (including tags like "#tag")
- NEVER use unquoted hashtags in the JSON
- Fill ALL fields with REAL data for this destination!
- Title MUST reflect the actual destination, NOT random cities!
- tripPlan MUST cover ALL ${durationDays} days (no gaps, no overlaps)
- tripPlan MUST visit EACH country in countries[] exactly ONCE — no returning to already-visited cities
- Last entry in tripPlan should end on day ${durationDays} (return day)
- Distribute days EVENLY: if 11 days and 3 countries, roughly 4+4+3 — NOT 2+3+3+3 with repeats!
${destinations.length > 0 ? `
⚠️ ЖЁСТКОЕ ТРЕБОВАНИЕ — ВСЕ ПУНКТЫ НАЗНАЧЕНИЯ ОБЯЗАТЕЛЬНЫ:
Пользователь ВЫБРАЛ следующие направления: ${destinations.map(parseDestination).join(', ')}.
tripPlan ОБЯЗАН включать КАЖДЫЙ из этих пунктов. НИ ОДИН нельзя пропускать.
Если какой-то город маленький или необычный — добавь к нему минимум 1 день.
Не заменяй города пользователя на другие «более популярные».` : ''}`;

            console.log("Parallel: Generating metadata...");
            const messages = [
                { role: "system" as const, content: systemPrompt },
                { role: "user" as const, content: metaPrompt }
            ]

            const raw = aiEngine === 'deepseek'
                ? await deepseekInference(messages, { maxTokens: 2000, temperature: aiTemperature, tripDays: 3, responseFormat: "json_object" })
                : await geminiInference(messages, { maxTokens: 2000, temperature: aiTemperature, tripDays: 3 });
            
            return parseJsonResponse(raw, `${aiEngine}-Meta`);
        }

        // Generate a chunk of days (e.g., days 1-4) with context from previous chunks
        async function generateDayChunk(
            startDay: number,
            endDay: number,
            destination: string,
            previousContext?: { lastCity: string; visitedPlaces: string[]; lastCountry?: string },
            tripPlan?: Array<{ startDay: number; endDay: number; city: string; country: string }>
        ): Promise<any[]> {
            const isFirstChunk = startDay === 1
            const isLastChunk = endDay === durationDays
            const startLocation = previousContext?.lastCity || effectiveDepartureCity
            const visitedPlaces = previousContext?.visitedPlaces || []

            // Find which city/country this chunk covers according to the plan
            const chunkSegments = (tripPlan || []).filter(s => s.startDay <= endDay && s.endDay >= startDay)
            const planForChunk = chunkSegments.length > 0
                ? chunkSegments.map(s => {
                    const dayFrom = Math.max(s.startDay, startDay)
                    const dayTo = Math.min(s.endDay, endDay)
                    return `Дни ${dayFrom}-${dayTo}: ${s.city} (${s.country})`
                }).join('\n  ')
                : null

            // Detect country change between previous chunk and this one
            const firstDaySegment = (tripPlan || []).find(s => s.startDay <= startDay && s.endDay >= startDay)
            const firstChunkCity = firstDaySegment?.city || ""
            const firstChunkCountry = firstDaySegment?.country || ""
            const previousCountry = previousContext?.lastCountry || ""
            const isCountryChange = !isFirstChunk && !!previousCountry && !!firstChunkCountry && previousCountry !== firstChunkCountry

            const chunkPrompt = `
Сгенерируй ДНИ ${startDay}-${endDay} из ${durationDays}-дневного маршрута.

КОНТЕКСТ МАРШРУТА:
- Направление: ${destination}
${destination ? `(ОБЯЗАТЕЛЬНЫЕ СТРАНЫ/ГОРОДА: ${destination})` : ''}
- Город отправления: ${departureCity}
- Стиль: ${toArray(travelStyle).join(', ') || 'Не указан'}
- Темп: ${preferences?.pace || 'moderate'}
- Диета: ${toArray(preferences?.dietaryRestrictions).join(', ') || 'Без ограничений'}
- Бюджет: ${budgetDesc}
- Даты: ${startDate || 'Гибкие'} — ${endDate || 'Гибкие'}
${warningsStr ? `⚠️ АКТУАЛЬНЫЕ ПРЕДУПРЕЖДЕНИЯ: ${warningsStr}` : ''}
${safeHighlight ? `- ОСОБОЕ ПОЖЕЛАНИЕ ПОЛЬЗОВАТЕЛЯ: "${safeHighlight}" — Адаптируй активности и атмосферу этих дней под данный запрос (если это общая тема, добавляй соответствующие элементы в разные дни). Помечай такие активности "(✨ специально для тебя)" в desc. КАТЕГОРИЧЕСКИ ЗАПРЕЩАЕТСЯ комментировать его напрямую или писать "Учитывая ваше пожелание..." в logistics.note и других полях.` : ''}

${planForChunk ? `⚠️ ПЛАН МАРШРУТА (СТРОГО СЛЕДУЙ — НЕ ОТСТУПАЙ):
  ${planForChunk}
Ты ОБЯЗАН генерировать активности ТОЛЬКО в указанных городах. НЕ возвращайся в уже посещённые города. НЕ добавляй лишние города.` : ""}

КРИТИЧНО — КОНТИНУИТЕТ МАРШРУТА:
${isFirstChunk
                    ? `- Это ПЕРВЫЙ сегмент. День 1 начинается в ${departureCity} (вылет/выезд).`
                    : `- День ${startDay} ОБЯЗАТЕЛЬНО начинается в городе: ${startLocation}
- УЖЕ посещённые места (НЕ ПОВТОРЯТЬ): ${visitedPlaces.join(', ') || 'Нет'}`
                }
${isLastChunk
                    ? `- Это ПОСЛЕДНИЙ сегмент. День ${endDay} должен завершиться возвращением в ${departureCity}.`
                    : `- В конце дня ${endDay} укажи город, где путешественник останется на ночь.`
                }
${isCountryChange ? `
🚨 СМЕНА СТРАНЫ — ОБЯЗАТЕЛЬНЫЙ ТРАНСПОРТ:
Предыдущий сегмент закончился в ${startLocation} (страна: ${previousCountry}).
Этот сегмент начинается в ${firstChunkCity} (страна: ${firstChunkCountry}).
ПУТЕШЕСТВЕННИК ЕЩЁ ФИЗИЧЕСКИ НАХОДИТСЯ В ${previousCountry}!
День ${startDay} ОБЯЗАН начинаться с активности type="transport" (перелёт ${startLocation} → ${firstChunkCity}).
ЗАПРЕЩЕНО начинать день ${startDay} с "food" или "activity" — человек ещё не прилетел!
Обязательный порядок дня ${startDay}: transport (перелёт) → hotel (заселение) → food/activity (знакомство с городом).` : ''}

ПРАВИЛА ЛОГИСТИКИ:
1. НЕТ ТЕЛЕПОРТАЦИИ: проверяй, где закончился предыдущий день
2. Перелёты Россия↔Европа/США = только с пересадкой
3. Утро первого дня после перелета = Трансфер/Отдых. НЕ АКТИВНОСТЬ.
4. СМЕНА СТРАНЫ = ПЕРЕЛЁТ. Нельзя оказаться в другой стране без активности type="transport".

Формат ответа — JSON массив. Следуй шаблонам дней из системного промпта.
${isFirstChunk ? 'День 1 = ДЕНЬ ПРИБЫТИЯ (transport → hotel → food/activity).' : ''}
${isLastChunk ? `День ${endDay} = ПОСЛЕДНИЙ ДЕНЬ (food → activity → transport обратно в ${departureCity}).` : ''}

Пример одного дня:
{
  "day": ${startDay}, "title": "Название дня", "dayTotal": "25 000 ₽",
  "activities": [
    { "time": "Утро", "type": "food", "title": "Завтрак в кафе Nama", "placeName": "Кафе Nama", "desc": "Авторские завтраки и свежий кофе.", "cost": "800 ₽" },
    { "time": "День", "type": "activity", "title": "Экскурсия по Старому городу", "placeName": "Старый город Котор", "desc": "Средневековые улочки, площадь Оружия, собор Святого Трифона.", "cost": "1 500 ₽" },
    { "time": "Вечер", "type": "food", "title": "Ужин в ресторане Galion", "placeName": "Ресторан Galion", "desc": "Рыбный ресторан на набережной с видом на бухту.", "cost": "3 000 ₽" }
  ]
}

Ровно ${endDay - startDay + 1} дней. Все поля обязательны (time, type, title, placeName, desc, cost).

ПОЛЕ imageQuery (ОБЯЗАТЕЛЬНО для hotel/food/activity):
- Запрос на АНГЛИЙСКОМ для Pexels. НЕ используй собственные имена заведений.
- Формат: [конкретный визуальный элемент] + [тип места + маркер] + [город/страна]
- Пример: "rooftop terrace sunset cocktails Tbilisi skyline"
- Для type=transport — НЕ добавляй imageQuery.

Ответ ТОЛЬКО JSON массив, без markdown. Язык: РУССКИЙ.`;

            console.log(`Parallel: Generating days ${startDay}-${endDay} (start: ${startLocation})...`);
            const messages = [
                { role: "system" as const, content: systemPrompt },
                { role: "user" as const, content: chunkPrompt }
            ]

            const tokensNeeded = (endDay - startDay + 1) * 1800;
            const inferenceParams = {
                maxTokens: Math.min(tokensNeeded, 8000),
                temperature: aiTemperature,
                tripDays: endDay - startDay + 1
            };
            
            const raw = aiEngine === 'deepseek'
                ? await deepseekInference(messages, { ...inferenceParams, responseFormat: "json_object" })
                : await geminiInference(messages, inferenceParams);

            let clean = raw.match(/\[[\s\S]*\]/)?.[0] || raw;
            return JSON.parse(clean);
        }

        // Main generation logic
        async function generateParallel(): Promise<any> {
            const CHUNK_SIZE = 4; // Days per chunk
            const USE_SEQUENTIAL_CHUNKS = durationDays > 7;

            const travelersCount = parseInt(travelers) || 2

            let routeData: any = {};

            if (!USE_SEQUENTIAL_CHUNKS) {
                // Short trip - use original single request
                console.log(`Short trip (${durationDays} days) - using single request`);
                const messages = [
                    { role: "system" as const, content: systemPrompt },
                    { role: "user" as const, content: prompt }
                ]
                
                const inferenceParams = { maxTokens: 8000, temperature: aiTemperature, tripDays: durationDays };
                const raw = aiEngine === 'deepseek'
                    ? await deepseekInference(messages, { ...inferenceParams, responseFormat: "json_object" })
                    : await geminiInference(messages, inferenceParams);
                    
                routeData = parseJsonResponse(raw, aiEngine === 'deepseek' ? "DeepSeek" : "Gemini");
            } else {
                // Long trip - split into chunks + metadata
                console.log(`Long trip (${durationDays} days) - using sequential chunks`);
                const startTime = Date.now();

                // 1. Metadata (Parallel)
                const metadata = await generateMetadata();

                // Use the AI-chosen destination from metadata for day chunks (prevents title/content mismatch)
                const resolvedDestination = metadata.countries?.length > 0
                    ? metadata.countries.map((c: any) => c.name).join(', ')
                    : targetDescription;
                console.log(`Metadata chose destination: ${resolvedDestination}`);

                // Extract the trip plan (day → city mapping) from metadata
                const tripPlan: Array<{ startDay: number; endDay: number; city: string; country: string }> =
                    Array.isArray(metadata.tripPlan) ? metadata.tripPlan : [];
                
                const gaps = tripPlan.filter((seg, i) => 
                    i > 0 && seg.startDay > tripPlan[i-1].endDay + 1
                );
                if (gaps.length > 0) console.warn('[tripPlan] Gaps detected:', gaps);

                if (tripPlan.length > 0) {
                    console.log(`Trip plan: ${tripPlan.map(s => `days ${s.startDay}-${s.endDay} → ${s.city}`).join(', ')}`);
                } else {
                    console.log('No tripPlan in metadata — chunks will self-navigate');
                }

                // 2. Chunks (Sequential)
                const chunks: { start: number; end: number }[] = [];
                for (let i = 1; i <= durationDays; i += CHUNK_SIZE) {
                    chunks.push({
                        start: i,
                        end: Math.min(i + CHUNK_SIZE - 1, durationDays)
                    });
                }

                // Initial context
                const departureCitySegment = tripPlan.find(s => s.startDay === 1)
                let previousContext = {
                    lastCity: effectiveDepartureCity,
                    lastCountry: departureCitySegment?.country || "",
                    visitedPlaces: [] as string[]
                };

                const allDays: any[] = [];

                // Generate chunks sequentially
                for (let i = 0; i < chunks.length; i++) {
                    console.log(`Generating chunk ${i + 1}/${chunks.length}...`);
                    const chunkDays = await generateDayChunk(
                        chunks[i].start,
                        chunks[i].end,
                        resolvedDestination,
                        previousContext,
                        tripPlan
                    );
                    allDays.push(...chunkDays);

                    // Update context for next chunk — prefer tripPlan city/country over AI guess
                    const nextChunkStart = chunks[i + 1]?.start;
                    const nextPlanSegment = nextChunkStart
                        ? tripPlan.find(s => s.startDay <= nextChunkStart && s.endDay >= nextChunkStart)
                        : undefined;
                    const currentChunkLastSegment = tripPlan.find(s => s.startDay <= chunks[i].end && s.endDay >= chunks[i].end)
                    const lastDay = chunkDays[chunkDays.length - 1];
                    previousContext = {
                        lastCity: nextPlanSegment?.city || lastDay?.endCity || lastDay?.logistics?.to || resolvedDestination,
                        lastCountry: currentChunkLastSegment?.country || previousContext.lastCountry || "",
                        visitedPlaces: [
                            ...previousContext.visitedPlaces,
                            ...chunkDays.flatMap((day: { activities?: Array<{ placeName?: string }> }) =>
                                (day.activities || []).map((a: any) => a.placeName).filter(Boolean)
                            )
                        ]
                    };
                }

                allDays.sort((a, b) => a.day - b.day);

                // Post-generation repair: ensure inter-country transport was not skipped by AI
                for (let i = 1; i < allDays.length; i++) {
                    const today = allDays[i]
                    const yesterday = allDays[i - 1]
                    const todaySeg = tripPlan.find(s => s.startDay <= today.day && s.endDay >= today.day)
                    const yesterdaySeg = tripPlan.find(s => s.startDay <= yesterday.day && s.endDay >= yesterday.day)
                    if (!todaySeg || !yesterdaySeg || todaySeg.country === yesterdaySeg.country) continue
                    // Country changed — check first activity
                    const firstActivity = today.activities?.[0]
                    if (firstActivity?.type === 'transport') continue
                    // AI forgot the transport — inject it
                    console.log(`[Repair] Day ${today.day}: missing transport ${yesterdaySeg.city} (${yesterdaySeg.country}) → ${todaySeg.city} (${todaySeg.country})`)
                    // Shift existing "Утро" activity to "День" to make room
                    if (today.activities?.[0]?.time === 'Утро') today.activities[0].time = 'День'
                    today.activities = [
                        {
                            time: "Утро",
                            type: "transport",
                            title: `Перелёт ${yesterdaySeg.city} → ${todaySeg.city}`,
                            placeName: `Аэропорт ${yesterdaySeg.city}`,
                            desc: `Вылет из ${yesterdaySeg.city} (${yesterdaySeg.country}) в ${todaySeg.city} (${todaySeg.country}). Трансфер до отеля.`,
                            cost: "от 15 000 ₽"
                        },
                        ...(today.activities || [])
                    ]
                }

                // Post-generation dedup: remove duplicate transport at chunk boundaries
                // (e.g., chunk 1 ends with "fly to TBS" on day 4, chunk 2 starts with "fly to TBS" on day 5)
                for (let i = 1; i < allDays.length; i++) {
                    const prevDay = allDays[i - 1]
                    const currDay = allDays[i]
                    if (!Array.isArray(prevDay?.activities) || !Array.isArray(currDay?.activities)) continue
                    if (prevDay.activities.length === 0 || currDay.activities.length === 0) continue

                    const prevLastAct = prevDay.activities[prevDay.activities.length - 1]
                    const currFirstAct = currDay.activities[0]

                    if (prevLastAct?.type === 'transport' && currFirstAct?.type === 'transport') {
                        const prevTitle = (prevLastAct.title || '').toLowerCase()
                        const currTitle = (currFirstAct.title || '').toLowerCase()

                        // Extract destination city from transport title
                        const getTransportDest = (t: string): string => {
                            const m = t.match(/[→>]\s*(.+)/i)
                            return m ? m[1].replace(/\(.*?\)/g, '').trim().toLowerCase() : ''
                        }
                        const prevDest = getTransportDest(prevTitle)
                        const currDest = getTransportDest(currTitle)

                        if (prevDest && currDest && (prevDest === currDest || prevDest.includes(currDest) || currDest.includes(prevDest))) {
                            console.log(`[Dedup] Removing duplicate transport: day ${prevDay.day} "${prevLastAct.title}" / day ${currDay.day} "${currFirstAct.title}"`)
                            prevDay.activities.pop()
                        }
                    }
                }

                routeData = {
                    ...metadata,
                    itinerary: allDays,
                    coverImage: "",
                    preferences: {
                        pace: preferences?.pace || 'moderate',
                        travel_style: toArray(travelStyle),
                        interestsDetailed: toArray(preferences?.interestsDetailed),
                        dietaryRestrictions: toArray(preferences?.dietaryRestrictions),
                        companions: companions,
                        paymentMethods: toArray(paymentMethods),
                        visitedCountries: toArray(preferences?.visitedCountries)
                    }
                };

                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                console.log(`Sequential generation completed in ${elapsed}s (${chunks.length + 1} requests)`);
            }

            // Post-generation: extract logistics from AI-generated itinerary
            if (startDate && endDate) {
                try {
                    const { extractLogisticsFromItinerary } = await import("@/lib/travelpayouts")
                    const logistics = await extractLogisticsFromItinerary(
                        routeData, departureCity, startDate, endDate, travelersCount
                    )
                    routeData.flights = logistics.flights
                    routeData.hotels = logistics.hotels
                    routeData.interCity = logistics.interCity
                } catch (logisticsError) {
                    console.error("Failed to extract logistics:", logisticsError)
                }
            }

            return routeData;
        }

        // Stream the generation to prevent Cloudflare 524 timeout on long trips.
        // Keepalive comments are sent every 15s; the final result arrives as a 'result' event.
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
            async start(controller) {
                const sendEvent = (data: object) => {
                    try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)) } catch {}
                }
                const keepaliveTimer = setInterval(() => {
                    try { controller.enqueue(encoder.encode(': keepalive\n\n')) } catch {}
                }, 15000)

                try {
                    // Reset token usage counter at start of generation
                    resetGeminiSessionUsage();
                    resetDeepSeekSessionUsage();

                    // PRIMARY: Gemini with parallel generation
                    try {
                        console.log("Using Gemini as primary provider...");
                        let generatedRouteData = await generateParallel();

                        // 1. Sanitize closed airports (async — generates real train links)
                        console.log("[Sanitize] Checking for closed airports...")
                        await sanitizeClosedAirportLogistics(generatedRouteData, departureCity, startDate)
                        
                        // 2. Enrich viral spots (async)
                        console.log("[Search Optimization] Running viral spots enrichment...")
                        const enrichedData = await enrichViralSpotsWithWebSearch(generatedRouteData)

                        generatedRouteData = enrichedData;

                        // Post-processing: Normalization & Dates
                        generatedRouteData = normalizeActivityTypes(generatedRouteData);
                        generatedRouteData = removeSameCityFlights(generatedRouteData);
                        generatedRouteData = enrichTransportLinks(generatedRouteData, departureCity, destinations[0] || "", startDate, endDate);
                        generatedRouteData.start_date = startDate;
                        generatedRouteData.end_date = endDate;

                        // Enrich with cover image
                        try {
                            if (generatedRouteData.countries && generatedRouteData.countries.length > 0) {
                                const cover = await getDestinationImage(generatedRouteData.countries[0].name + " travel");
                                if (cover) generatedRouteData.coverImage = cover;
                            }
                        } catch (imgError) {
                            // Cover image is optional
                        }

                        // Attach token usage statistics to response
                        const usage = aiEngine === 'deepseek' ? getDeepSeekSessionUsage() : getGeminiSessionUsage();
                        generatedRouteData.tokenUsage = usage;

                        console.log(`Success with ${aiEngine}`)
                        console.log(`${aiEngine} session totals: ${usage.totalTokens} tokens, $${usage.costUsd.toFixed(4)}`)
                        
                        // Increment generation count (1 generation per route request, even if multiple AI chunks)
                        await incrementGenerationCount(userId)

                        // Record the AI usage event
                        await recordAiUsageEvent({
                            userId,
                            source: "route-generation",
                            provider: aiEngine,
                            usage: usage
                        })

                        sendEvent({ type: 'result', data: generatedRouteData })
                    } catch (geminiError: any) {
                        console.error("Gemini failed:", geminiError.message)

                        // FALLBACK: DeepSeek (single request)
                        console.log("Falling back to DeepSeek...");
                        const messages = [
                            { role: "system" as const, content: systemPrompt },
                            { role: "user" as const, content: prompt }
                        ]
                        const raw = await deepseekInference(messages, { maxTokens: 8000, temperature: 0.6, tripDays: durationDays });
                        let fallbackRouteData = await sanitizeClosedAirportLogistics(parseJsonResponse(raw, "DeepSeek-Fallback"), departureCity, startDate);

                        // Post-processing: Normalization & Dates
                        fallbackRouteData = normalizeActivityTypes(fallbackRouteData);
                        fallbackRouteData = removeSameCityFlights(fallbackRouteData);
                        fallbackRouteData = enrichTransportLinks(fallbackRouteData, departureCity, destinations[0] || "", startDate, endDate);
                        fallbackRouteData.start_date = startDate;
                        fallbackRouteData.end_date = endDate;

                        // Enrich cover image
                        try {
                            if (fallbackRouteData.countries && fallbackRouteData.countries.length > 0) {
                                const cover = await getDestinationImage(fallbackRouteData.countries[0].name + " travel");
                                if (cover) fallbackRouteData.coverImage = cover;
                            }
                        } catch { }

                        // Estimated token usage for fallback (DeepSeek pricing)
                        const estimatedOutputTokens = Math.round(raw.length / 4);
                        const estimatedInputTokens = Math.round((systemPrompt.length + prompt.length) / 4);
                        const estimatedCostUsd = (estimatedInputTokens * 0.00000014) + (estimatedOutputTokens * 0.00000028);

                        fallbackRouteData.tokenUsage = {
                            promptTokens: estimatedInputTokens,
                            completionTokens: estimatedOutputTokens,
                            totalTokens: estimatedInputTokens + estimatedOutputTokens,
                            promptCacheHitTokens: 0,
                            model: 'deepseek-fallback',
                            costUsd: estimatedCostUsd,
                            costRub: estimatedCostUsd * 90
                        };

                        console.log("Success with DeepSeek fallback")
                        console.log(`DeepSeek fallback: ${fallbackRouteData.tokenUsage.totalTokens} tokens, $${estimatedCostUsd.toFixed(4)}`)
                        
                        // Increment generation count (1 generation per route request)
                        await incrementGenerationCount(userId)

                        // Record the AI usage event for fallback
                        await recordAiUsageEvent({
                            userId,
                            source: "route-generation-fallback",
                            provider: "deepseek",
                            usage: fallbackRouteData.tokenUsage
                        })

                        sendEvent({ type: 'result', data: fallbackRouteData })
                    }
                } catch (finalError: any) {
                    console.error("All providers failed:", finalError.message)
                    sendEvent({ type: 'error', message: "All AI providers failed to generate valid JSON", details: (finalError as any).message })
                } finally {
                    clearInterval(keepaliveTimer)
                    controller.close()
                }
            }
        })

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                'X-Accel-Buffering': 'no',
            }
        })
    } catch (error: any) {
        console.error("Fatal API Error:", error)
        return NextResponse.json({
            error: error.message || "Unknown error",
        }, { status: 500 })
    }
}
