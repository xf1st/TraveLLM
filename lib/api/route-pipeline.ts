/**
 * Route Pipeline - Consolidated logic for travel route generation
 * Used by both Gemini and DeepSeek routes to ensure consistency.
 * 
 * Recommended by Audit March 2025.
 */

import { sanitizeMislabeledForeignCosts } from "@/lib/cost-sanity"
import type { BookingMarket } from "@/lib/booking-market"
import { getFlightSearchLink, getHotellookLink, getTrainSearchLink, parseCityIata, getIataCode } from "@/lib/travelpayouts"
import { googleSearch } from "@/lib/google-search"
import { determineOptimalTransport } from "@/lib/api/logistics-orchestrator"

/* ───────────────────────────────────────────────
   INTERFACES
─────────────────────────────────────────────── */

export interface Activity {
    time: string;
    placeName: string;
    desc: string;
    type: "transport" | "hotel" | "food" | "activity" | "flight" | "check-in";
    cost?: string;
    ticketsRequired?: boolean;
    mapLink?: string;
    link?: string;
}

export interface Logistics {
    mode: string;
    from: string;
    to: string;
    duration: string;
    distance: string;
    price: string;
    bookingLink?: string;
    note?: string;
}

export interface ItineraryDay {
    day: number;
    title: string;
    activities: Activity[];
    logistics?: Logistics;
    dayTotal: string;
    endCity?: string;
}

export interface RouteData {
    title: string;
    totalBudget: string;
    countries: { name: string; city: string }[];
    itinerary: ItineraryDay[];
    preferences?: any;
    itineraryMeta?: any;
}

/* ───────────────────────────────────────────────
   PIPELINE FUNCTIONS
─────────────────────────────────────────────── */

/**
 * Enriches transport activities with real booking links
 */
export function enrichTransportLinks(
    routeData: any,
    origin: string,
    mainDestination: string,
    startDate?: string,
    market: BookingMarket = "ru"
) {
    if (!Array.isArray(routeData?.itinerary)) return routeData

    const originParsed = parseCityIata(origin)
    if (!originParsed.iata) originParsed.iata = getIataCode(origin) || ""

    let currentIata = originParsed.iata
    let currentCity = originParsed.city || origin
    const days = routeData.itinerary

    for (let i = 0; i < days.length; i++) {
        const day = days[i]
        if (!Array.isArray(day.activities)) continue

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
                    const titleIataMatch = originalTitle.match(/\b([A-Z]{3})\b[^A-Z]*\b([A-Z]{3})\b/)
                    const fromIataFromTitle = titleIataMatch?.[1] || ""
                    const toIataFromTitle = titleIataMatch?.[2] || ""

                    let toIata = dayToIata || toIataFromTitle
                    let toCity = dayToCity || mainDestination

                    if (!toIata) {
                        toIata = getIataCode(toCity) || getIataCode(mainDestination) || ""
                    }

                    const origIata = currentIata || fromIataFromTitle

                    // Skip link enrichment if we can't resolve both IATA codes —
                    // a partial URL (e.g. aviasales.ru/search/1506 1) is worse than no link.
                    if (!origIata || !toIata) {
                        console.warn(`[enrichTransportLinks] Cannot resolve IATA for "${originalTitle}" (from=${origIata || "?"} to=${toIata || "?"}), skipping link override`)
                    } else {
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
                            subId: `flight_day_${i+1}`,
                            market,
                        })
                    }

                    if (toIata) currentIata = toIata
                    if (toCity) currentCity = toCity
                }
            }
        }
    }

    return routeData
}

/**
 * Rebuilds Ostrovok `hotel.link` to the working homepage deep link.
 * Legacy `/hotel/search/` URLs 404 on ostrovok.ru; model output may still use them.
 */
export async function enrichHotelOstrovokLinks(
    routeData: any,
    options: {
        startDate?: string
        endDate?: string
        adults?: number
        mainDestination: string
        market?: BookingMarket
    }
): Promise<any> {
    const { startDate, endDate, adults = 2, mainDestination, market = "ru" } = options
    if (market !== "ru" || !startDate || !Array.isArray(routeData?.itinerary)) return routeData

    let checkIn: Date | undefined
    let checkOut: Date | undefined
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(startDate))) {
        checkIn = new Date(`${startDate}T12:00:00`)
    }
    if (endDate && /^\d{4}-\d{2}-\d{2}$/.test(String(endDate))) {
        checkOut = new Date(`${endDate}T12:00:00`)
    }
    if (checkIn && !checkOut) {
        checkOut = new Date(checkIn)
        checkOut.setDate(checkOut.getDate() + 1)
    }
    if (!checkIn) return routeData

    let cityCursor = mainDestination
    for (const day of routeData.itinerary) {
        const cityHint =
            (typeof day?.endCity === "string" && day.endCity.trim()) ||
            (typeof day?.logistics?.to === "string" && day.logistics.to.trim()) ||
            cityCursor

        if (Array.isArray(day?.activities)) {
            for (const act of day.activities) {
                if (act?.type !== "hotel") continue
                if (typeof act?.link !== "string" || !/ostrovok\.ru/i.test(act.link)) continue

                act.link = getHotellookLink({
                    destination: cityHint,
                    hotelName: typeof act.placeName === "string" ? act.placeName : undefined,
                    checkIn,
                    checkOut,
                    adults,
                    market: "ru",
                })
            }
        }

        if (typeof day?.endCity === "string" && day.endCity.trim()) cityCursor = day.endCity.trim()
        else if (typeof day?.logistics?.to === "string" && day.logistics.to.trim()) {
            cityCursor = day.logistics.to.trim()
        }
    }

    return routeData
}

/**
 * Validates flights against operational reality (closed airports)
 * and suggests alternatives or наземный transport.
 */
export async function sanitizeClosedAirportLogistics(
    routeData: any,
    departureCity?: string,
    startDate?: string,
    market: BookingMarket = "ru"
) {
    const itinerary = Array.isArray(routeData?.itinerary) ? routeData.itinerary : []
    console.log(`[Pipeline] Sanitize logistics for ${itinerary.length} days...`)

    let currentCity = departureCity || "Москва"

    for (let i = 0; i < itinerary.length; i++) {
        const day = itinerary[i]
        const lg = day?.logistics
        
        if (lg && lg.mode && (lg.mode.toLowerCase().includes('самол') || lg.mode.toLowerCase().includes('рейс') || lg.mode.toLowerCase().includes('flight'))) {
            const fromCity = lg.from || currentCity
            const toCity = lg.to || day.title || "Пункт назначения"

            try {
                const decision = await determineOptimalTransport(fromCity, toCity, startDate);

                if (decision.mode === 'train' || decision.mode === 'bus') {
                    console.log(`[Pipeline] Replacing flight with ${decision.mode}: ${fromCity} -> ${toCity}`);
                    
                    let transportLink =
                        market === "world" ? "https://www.trip.com/trains/" : "https://travel.yandex.ru/trains/"
                    try {
                        transportLink = await getTrainSearchLink({
                            origin: fromCity,
                            destination: toCity,
                            departDate: startDate,
                            subId: `pipeline_${i}`,
                            market,
                        })
                    } catch (e) {}

                    day.logistics.mode = decision.mode === 'train' ? 'Поезд' : 'Автобус'
                    day.logistics.bookingLink = transportLink
                    day.logistics.duration = decision.durationHours ? `${decision.durationHours} ч` : lg.duration
                    day.logistics.distance = decision.distanceKm ? `${decision.distanceKm} км` : lg.distance
                    day.logistics.note = decision.warning || decision.reason

                    if (Array.isArray(day.activities)) {
                        day.activities.forEach((act: any) => {
                            if (act.type === 'transport') {
                                act.title = act.title.replace(/Перелёт|Рейс|Вылет/ig, day.logistics.mode)
                                act.desc = `Наземный переезд из ${fromCity} в ${toCity}. ${decision.reason}`
                            }
                        })
                    }
                } else if (decision.mode === 'blocked') {
                    console.warn(`[Pipeline] Route blocked: ${decision.reason}`)
                    day.logistics.note = `⚠️ ВНИМАНИЕ: ${decision.reason}`
                }
            } catch (error) {
                console.error("[Pipeline] Logistics decision error:", error);
            }
        }
        
        if (day.endCity) currentCity = day.endCity
        else if (lg?.to) currentCity = lg.to
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
 */
export function removeSameCityFlights(routeData: any): any {
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
                console.log(`[Pipeline] Removed same-city flight: ${act.title}`)
                return false
            }
            return true
        })
    }
    return routeData
}

/**
 * Normalizes activity types and fixes common AI output errors
 */
export function normalizeActivityTypes(routeData: any) {
  if (!Array.isArray(routeData?.itinerary)) return routeData

  for (const day of routeData.itinerary) {
    if (!Array.isArray(day.activities)) continue

    const newActivities = []
    for (const act of day.activities) {
      const text = `${act.title || ""} ${act.desc || ""} ${act.time || ""}`.toLowerCase()
      
      if (act.type === "check-in" || act.type === "checkin") {
        act.type = "hotel"
      }

      if (!act.type || act.type === "activity") {
        if (/перелёт|перелет|рейс|аэропорт|вылет|прибытие|трансфер|поезд|автобус|такси|переезд|трасса|дорога|м-4|билет/.test(text)) {
          act.type = "transport"
        } else if (/заселение|отель|hotel|check.?in|гостиница|хостел|заезд|номер/.test(text)) {
          act.type = "hotel"
        } else if (/ресторан|кафе|завтрак|обед|ужин|бар|еда|кухня|дегустация|стейк|суши|пицца|кофе/.test(text)) {
          act.type = "food"
        }
      }

      if (act.type === "transport" && (!act.cost || act.cost === "0 ₽" || act.cost === "0₽")) {
        act.cost = "Цену уточнять"
      }

      newActivities.push(act)
    }
    day.activities = newActivities
  }

  return sanitizeMislabeledForeignCosts(routeData)
}

/**
 * Collects real-time search context for grounding
 */
export async function collectRealTimeSearchContext(departureCity: string, destinations: string[], startDate?: string) {
    if (!destinations || destinations.length === 0) return ""

    const mainDest = destinations[0]
    const dateStr = startDate ? `в ${startDate}` : "в ближайшее время"
    
    const queries = [
        `актуальный статус рейсов и аэропорта ${mainDest} ${new Date().getFullYear()}`,
        `погода и одежда для туристов в ${mainDest} ${dateStr}`,
        `фестивали и крупные события в ${mainDest} ${dateStr}`,
        `новые рестораны и модные места в ${mainDest} ${new Date().getFullYear()}`
    ]

    console.log(`[Pipeline] Collecting real-time data for: ${mainDest}...`)
    
    try {
        const searchPromises = queries.map(q => googleSearch(q, { num: 3 }))
        const allResults = await Promise.all(searchPromises)
        const flatResults = allResults.flat()

        if (flatResults.length === 0) return ""

        let context = "\n--- GOOGLE REAL-TIME DATA (GROUNDING) ---\n"
        context += `Данные получены в реальном времени (${new Date().toLocaleDateString('ru-RU')}):\n`
        
        flatResults.forEach((res, i) => {
            context += `- [${res.title}]: ${res.snippet}\n`
        })
        
        context += "------------------------------------------\n"
        return context
    } catch (e) {
        console.error("[Pipeline] Google Search integration failed:", e)
        return ""
    }
}

/**
 * Enriches viral spots with real web search data
 */
export async function enrichViralSpotsWithWebSearch(routeData: any) {
  if (!Array.isArray(routeData?.viralSpots) || routeData.viralSpots.length === 0) return routeData

  console.log(`[Pipeline] Searching for ${routeData.viralSpots.length} viral spots...`)
  
  try {
    const searchPromises = routeData.viralSpots.map(async (spot: { name?: string }) => {
      if (!spot.name) return spot
      const results = await googleSearch(`${spot.name} ${routeData.title || ''} viral spot tiktok instagram`, { num: 1 })
      if (results.length > 0) {
        const r = results[0] as any
        return {
          ...spot,
          realLink: r.link,
          // Don't overwrite snippet with empty string from synthetic fallback
          ...(r.snippet && !r.isSynthetic ? { snippet: r.snippet } : {}),
        }
      }
      return spot
    })

    routeData.viralSpots = await Promise.all(searchPromises)
  } catch (e) {
    console.error("[Pipeline] Failed to enrich viral spots:", e)
  }

  return routeData
}

/** URL fields that can appear on an activity object. */
const ACTIVITY_URL_FIELDS = ["link", "mapLink", "bookingUrl", "ticketUrl", "bookingLink"] as const

/**
 * After jsonrepair the model may have produced malformed or placeholder URLs
 * (e.g. "ENCODEURIComponent(...)", "ID_ПРОГРАММЫ", relative paths, empty strings).
 * This function walks the itinerary and nulls out any URL field that is not a
 * valid absolute http/https URL, so broken values never reach the client or DB.
 */
export function sanitizeActivityUrls(routeData: any): any {
  if (!Array.isArray(routeData?.itinerary)) return routeData

  for (const day of routeData.itinerary) {
    if (!Array.isArray(day.activities)) continue
    for (const act of day.activities) {
      for (const field of ACTIVITY_URL_FIELDS) {
        const val = act[field]
        if (val === undefined || val === null) continue
        if (typeof val !== "string" || !/^https?:\/\/.{4,}/.test(val.trim())) {
          console.warn(`[sanitizeActivityUrls] Dropping invalid ${field}: ${String(val).slice(0, 80)}`)
          act[field] = undefined
        }
      }
    }
    // Also sanitise logistics.bookingLink
    if (day.logistics?.bookingLink !== undefined) {
      const bl = day.logistics.bookingLink
      if (typeof bl !== "string" || !/^https?:\/\/.{4,}/.test(bl.trim())) {
        day.logistics.bookingLink = undefined
      }
    }
  }

  return routeData
}
