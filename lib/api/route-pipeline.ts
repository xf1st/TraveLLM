/**
 * Route Pipeline - Consolidated logic for travel route generation
 * Used by both Gemini and DeepSeek routes to ensure consistency.
 * 
 * Recommended by Audit March 2025.
 */

import { sanitizeMislabeledForeignCosts } from "@/lib/cost-sanity"
import type { BookingMarket } from "@/lib/booking-market"
import { getFlightSearchLink, getTrainSearchLink, parseCityIata, getIataCode } from "@/lib/travelpayouts"
import type { RealFlight } from "@/lib/travelpayouts"
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
 * Enriches flight activities with real prices from TravelPayouts.
 * Runs after enrichTransportLinks. Non-blocking — individual errors are swallowed.
 * Updates act.cost only when a real price is found (overrides AI estimate).
 */
export async function enrichFlightCosts(
    routeData: any,
    origin: string,
    startDate?: string,
    timeoutMs = 3000
): Promise<any> {
    if (!Array.isArray(routeData?.itinerary)) return routeData

    // Bail out early if TravelPayouts token is not configured
    const { hasApiToken, searchFlightsForDates, parseCityIata, getIataCode } = await import('@/lib/travelpayouts')
    if (!hasApiToken()) return routeData

    const originParsed = parseCityIata(origin)
    let currentIata = originParsed.iata || getIataCode(origin) || ""
    const days = routeData.itinerary

    for (let i = 0; i < days.length; i++) {
        const day = days[i]
        if (!Array.isArray(day.activities)) continue

        const logistics = day.logistics
        let dayToIata = ""
        if (logistics?.to) {
            const toP = parseCityIata(logistics.to)
            dayToIata = toP.iata || getIataCode(logistics.to) || ""
        }

        for (const act of day.activities) {
            if (act.type !== 'transport' && act.type !== 'flight') continue
            if (!/перелёт|перелет|рейс|вылет|самолет|flight/i.test((act.title || "").toLowerCase())) continue

            const fromIata = currentIata
            const toIata = dayToIata

            if (!fromIata || !toIata || fromIata === toIata) continue

            try {
                // Compute actual departure date for this day
                let departDate = startDate || ""
                if (startDate) {
                    const d = new Date(startDate)
                    d.setDate(d.getDate() + i)
                    departDate = d.toISOString().slice(0, 10) // YYYY-MM-DD
                }

                if (!departDate) continue

                const timeoutPromise = new Promise<RealFlight[]>((resolve) => setTimeout(() => resolve([]), timeoutMs))
                const flights = await Promise.race([
                    searchFlightsForDates(fromIata, toIata, departDate, undefined, 1, 1),
                    timeoutPromise,
                ])

                if (flights.length > 0 && flights[0].price > 0) {
                    act.cost = `от ${flights[0].price.toLocaleString("ru-RU")} ₽`
                    act.priceSource = "travelpayouts"
                }
            } catch {
                // Non-blocking: individual failure doesn't break the pipeline
            }
        }

        if (dayToIata) currentIata = dayToIata
    }

    return routeData
}

/**
 * Enriches hotel/accommodation activities with real prices from Hotellook.
 * Detects city stays from itinerary structure, calls searchHotelsForCity.
 * Non-blocking — individual errors are swallowed.
 */
export async function enrichHotelCosts(
    routeData: any,
    startDate?: string,
    timeoutMs = 4000
): Promise<any> {
    if (!Array.isArray(routeData?.itinerary) || !startDate) return routeData

    const { hasApiToken, searchHotelsForCity } = await import('@/lib/travelpayouts')
    if (!hasApiToken()) return routeData

    const days = routeData.itinerary

    // Build city stay segments by scanning hotel activities per day
    // Each day can have at most one hotel activity — use its placeName/city as the stay city
    interface CityStay { city: string; dayStart: number; dayEnd: number }
    const stays: CityStay[] = []

    // Extract city from hotel activity: prefer placeName city part, fallback to day title arrow destination
    function extractCityFromDay(day: any): string {
        if (!Array.isArray(day.activities)) return ""
        for (const act of day.activities) {
            if (!/hotel|hostel|apartment|accommodation/i.test(act.type || "")) continue
            // placeName like "The Kingsbury Colombo" → last word often is city
            // Better: look for city name in placeName by stripping hotel name
            if (act.placeName) {
                // Try to get city from act.placeName last word(s)
                const parts = act.placeName.trim().split(/\s+/)
                if (parts.length >= 1) return parts[parts.length - 1]
            }
        }
        // Fallback: parse day title "День N: CityA → CityB" → take destination city
        if (day.title) {
            const arrowMatch = day.title.match(/[→\-–]\s*([^.,(]+)/)
            if (arrowMatch) return arrowMatch[1].trim().split(/[.,\s]/)[0]
            // No arrow: take text after colon
            const colonMatch = day.title.match(/:\s*([A-ZА-Я][^\d→\-–]+)/)
            if (colonMatch) return colonMatch[1].trim().split(/[.,→\-–]/)[0].trim()
        }
        return ""
    }

    // Group consecutive days in the same city
    let prevCity = ""
    let segStart = 0
    for (let i = 0; i < days.length; i++) {
        const city = extractCityFromDay(days[i])
        if (!city) continue
        if (city !== prevCity) {
            if (prevCity && i > segStart) {
                stays.push({ city: prevCity, dayStart: segStart, dayEnd: i })
            }
            prevCity = city
            segStart = i
        }
    }
    if (prevCity) stays.push({ city: prevCity, dayStart: segStart, dayEnd: days.length })

    for (const stay of stays) {
        if (!stay.city || stay.dayEnd <= stay.dayStart) continue
        const nights = stay.dayEnd - stay.dayStart
        if (nights < 1) continue

        const checkIn = (() => {
            const d = new Date(startDate)
            d.setDate(d.getDate() + stay.dayStart)
            return d.toISOString().slice(0, 10)
        })()
        const checkOut = (() => {
            const d = new Date(startDate)
            d.setDate(d.getDate() + stay.dayEnd)
            return d.toISOString().slice(0, 10)
        })()

        try {
            const timeoutPromise = new Promise<never[]>((resolve) => setTimeout(() => resolve([]), timeoutMs))
            const hotels = await Promise.race([
                searchHotelsForCity(stay.city, checkIn, checkOut, 1, 3),
                timeoutPromise,
            ])

            if (!hotels.length) continue

            // Pick the cheapest hotel
            const cheapest = hotels.reduce((min: any, h: any) =>
                (h.pricePerNight || h.totalPrice) < (min.pricePerNight || min.totalPrice) ? h : min
            )
            const pricePerNight: number = cheapest.pricePerNight || (cheapest.totalPrice ? Math.round(cheapest.totalPrice / nights) : 0)
            if (pricePerNight <= 0) continue

            // Apply price to all accommodation activities in this stay range
            for (let i = stay.dayStart; i < stay.dayEnd; i++) {
                const day = days[i]
                if (!Array.isArray(day.activities)) continue
                for (const act of day.activities) {
                    if (!/accommodation|hotel|hostel|apartment|жильё|жилье|отель|хостел|апартамент/i.test(
                        `${act.type || ""} ${act.title || ""}`
                    )) continue
                    // Only update if no real-price source already set
                    if (act.priceSource === "travelpayouts") continue
                    act.cost = `от ${pricePerNight.toLocaleString("ru-RU")} ₽/ночь`
                    act.priceSource = "hotellook"
                }
            }
        } catch {
            // Non-blocking
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
        
        const lgMode = lg?.mode?.toLowerCase() ?? ""
        const isFlightLogistics = lgMode.includes('самол') || lgMode.includes('рейс') || lgMode.includes('flight')
        const isGroundLogistics = lgMode.includes('автобус') || lgMode.includes('bus') || lgMode.includes('поезд') || lgMode.includes('train')

        if (lg && lg.mode && (isFlightLogistics || isGroundLogistics)) {
            const fromCity = lg.from || currentCity
            const toCity = lg.to || day.title || "Пункт назначения"

            try {
                const decision = await determineOptimalTransport(fromCity, toCity, startDate);

                if (isFlightLogistics && (decision.mode === 'train' || decision.mode === 'bus')) {
                    // Flight → replace with ground transport
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
                } else if (isGroundLogistics && decision.mode === 'flight') {
                    // Bus/train suggested but ground route not feasible — replace with flight
                    console.log(`[Pipeline] Ground transport impossible ${fromCity} -> ${toCity} (likely sea crossing), replacing with flight`);

                    let flightLink: string
                    try {
                        const { getFlightSearchLink, getIataCode } = await import('@/lib/travelpayouts')
                        const origIata = getIataCode(fromCity) || ""
                        const destIata = getIataCode(toCity) || ""
                        flightLink = origIata && destIata
                            ? getFlightSearchLink({ originIata: origIata, origin: fromCity, destination: toCity, destinationIata: destIata, subId: `fix_ground_${i}`, market })
                            : market === "world" ? "https://www.aviasales.com/" : "https://www.aviasales.ru/"
                    } catch {
                        flightLink = market === "world" ? "https://www.aviasales.com/" : "https://www.aviasales.ru/"
                    }

                    day.logistics.mode = 'Перелёт'
                    day.logistics.bookingLink = flightLink
                    day.logistics.note = `Наземный маршрут невозможен (морское препятствие). ${decision.reason}`

                    if (Array.isArray(day.activities)) {
                        day.activities.forEach((act: any) => {
                            if (act.type === 'transport') {
                                act.type = 'flight'
                                act.title = act.title
                                    .replace(/Автобус|Ночной автобус|Поезд/ig, 'Перелёт')
                                    .replace(/bus|train/ig, 'Flight')
                                act.desc = `Наземный маршрут из ${fromCity} в ${toCity} невозможен. Рекомендуется перелёт с пересадкой.`
                                act.link = flightLink
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

      // Don't override cost — AI must always provide a real price estimate

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
