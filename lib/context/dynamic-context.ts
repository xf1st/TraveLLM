/**
 * Dynamic Context - Главный агрегатор контекста для промпта
 * Собирает все данные и форматирует для AI
 */

import { fetchFlightContext, formatFlightContextForPrompt, type FlightContextData } from "./flight-context"
import { fetchEventContext, formatEventContextForPrompt, type EventContextData } from "./event-context"
import { fetchPriceContext, formatPriceContextForPrompt, type PriceContextData } from "./price-context"
import { fetchTrendsContext, formatTrendsContextForPrompt, type TrendsContextData } from "./trends-context"
import { getIataCode } from "../travelpayouts"
import { getAirportInfo } from "../api/aerodatabox-client"
import { getWeatherDescription } from "../weather"

export interface DynamicContextRequest {
    departureCity: string
    destinations: string[]
    startDate?: string
    endDate?: string
    interests?: string[]
    travelStyle?: string
}

export interface DynamicContext {
    flights: FlightContextData
    events: EventContextData
    prices: PriceContextData[]
    trends: TrendsContextData[]
    weather?: string
    collectedAt: string
}

/**
 * Fetch weather summary for the main destination using Open-Meteo directly (server-side)
 */
async function fetchWeatherContext(destination: string, startDate?: string, endDate?: string): Promise<string> {
    try {
        const iata = getIataCode(destination)
        if (!iata) return ""

        const airportInfo = await getAirportInfo(iata)
        if (!airportInfo?.location) return ""

        const { lat, lon } = airportInfo.location

        const start = startDate ? new Date(startDate) : new Date()
        const end = endDate ? new Date(endDate) : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const startDay = new Date(start)
        startDay.setHours(0, 0, 0, 0)
        const endDay = new Date(end)
        endDay.setHours(0, 0, 0, 0)

        let apiStart = startDay
        let apiEnd = endDay
        let isHistorical = false

        // Far future: use last year's data as approximation
        if (startDay.getTime() - today.getTime() > 14 * 24 * 60 * 60 * 1000) {
            apiStart = new Date(startDay)
            apiStart.setFullYear(apiStart.getFullYear() - 1)
            apiEnd = new Date(endDay)
            apiEnd.setFullYear(apiEnd.getFullYear() - 1)
            isHistorical = true
        }

        const startStr = apiStart.toISOString().split('T')[0]
        const endStr = apiEnd.toISOString().split('T')[0]

        const baseUrl = isHistorical
            ? `https://archive-api.open-meteo.com/v1/archive`
            : `https://api.open-meteo.com/v1/forecast`

        const url = `${baseUrl}?latitude=${lat}&longitude=${lon}&start_date=${startStr}&end_date=${endStr}&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto`

        const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
        if (!res.ok) return ""

        const data = await res.json()
        if (!data.daily?.time?.length) return ""

        const maxTemps: number[] = (data.daily.temperature_2m_max as any[]).filter((t: any) => t != null)
        const minTemps: number[] = (data.daily.temperature_2m_min as any[]).filter((t: any) => t != null)
        const codes: number[] = (data.daily.weather_code as any[]).filter((c: any) => c != null)

        if (!maxTemps.length) return ""

        const avgMax = Math.round(maxTemps.reduce((a, b) => a + b, 0) / maxTemps.length)
        const avgMin = Math.round(minTemps.reduce((a, b) => a + b, 0) / minTemps.length)

        // Most frequent weather code
        const codeFreq: Record<number, number> = {}
        codes.forEach(c => { codeFreq[c] = (codeFreq[c] || 0) + 1 })
        const dominantCode = parseInt(Object.entries(codeFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || "0")
        const weatherDesc = getWeatherDescription(dominantCode)

        const note = isHistorical ? " (ориентир по прошлому году)" : ""
        console.log(`[WeatherContext] ${destination}: ${avgMin}–${avgMax}°C, ${weatherDesc}${note}`)
        return `${destination}: ${avgMin}–${avgMax}°C, ${weatherDesc}${note}`
    } catch (e) {
        console.error("[WeatherContext] Error:", e)
        return ""
    }
}

/**
 * Собрать весь динамический контекст
 */
export async function collectDynamicContext(
    request: DynamicContextRequest
): Promise<DynamicContext> {
    const { departureCity, destinations, startDate, endDate } = request

    console.log(`[DynamicContext] Collecting for: ${departureCity} → ${destinations.join(", ")}`)

    // Параллельно собираем все данные
    const [flights, events, weather] = await Promise.all([
        fetchFlightContext(departureCity, destinations, startDate, endDate),
        fetchEventContext(destinations, startDate, endDate),
        destinations.length > 0
            ? fetchWeatherContext(destinations[0], startDate, endDate)
            : Promise.resolve("")
    ])

    // Синхронные данные
    const prices = destinations.map(dest => fetchPriceContext(dest))
    const trends = destinations.map(dest => fetchTrendsContext(dest))

    console.log(`[DynamicContext] Collected: flights=${flights.rawDataAvailable}, events=${events.events.length}, trends=${trends.filter(t => t.trendingPlaces.length > 0).length}, weather=${!!weather}`)

    return {
        flights,
        events,
        prices,
        trends,
        weather: weather || undefined,
        collectedAt: new Date().toISOString()
    }
}

/**
 * Форматировать весь контекст для промпта AI
 */
export function formatDynamicContextForPrompt(context: DynamicContext): string {
    const sections: string[] = []

    // Погода
    if (context.weather) {
        sections.push(`ПОГОДА НА ПЕРИОД ПОЕЗДКИ: ${context.weather}`)
    }

    // Рейсы
    const flightsSection = formatFlightContextForPrompt(context.flights)
    if (flightsSection && flightsSection !== "Данные о рейсах: недоступны") {
        sections.push(flightsSection)
    }

    // Цены
    const pricesSection = formatPriceContextForPrompt(context.prices)
    if (pricesSection) {
        sections.push(pricesSection)
    }

    // События
    const eventsSection = formatEventContextForPrompt(context.events)
    if (eventsSection) {
        sections.push(eventsSection)
    }

    // Тренды
    const trendsSection = formatTrendsContextForPrompt(context.trends)
    if (trendsSection) {
        sections.push(trendsSection)
    }

    if (sections.length === 0) {
        return ""
    }

    return `
=== АКТУАЛЬНЫЙ КОНТЕКСТ (${new Date(context.collectedAt).toLocaleDateString("ru-RU")}) ===

${sections.join("\n\n")}

=== КОНЕЦ КОНТЕКСТА ===
`.trim()
}

/**
 * Быстрый контекст только с ценами и трендами (без API вызовов)
 */
export function getQuickContext(destinations: string[]): string {
    const prices = destinations.map(dest => fetchPriceContext(dest))
    const trends = destinations.map(dest => fetchTrendsContext(dest))

    const sections: string[] = []

    const pricesSection = formatPriceContextForPrompt(prices)
    if (pricesSection) sections.push(pricesSection)

    const trendsSection = formatTrendsContextForPrompt(trends)
    if (trendsSection) sections.push(trendsSection)

    return sections.join("\n\n")
}
