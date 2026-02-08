/**
 * Dynamic Context - Главный агрегатор контекста для промпта
 * Собирает все данные и форматирует для AI
 */

import { fetchFlightContext, formatFlightContextForPrompt, type FlightContextData } from "./flight-context"
import { fetchEventContext, formatEventContextForPrompt, type EventContextData } from "./event-context"
import { fetchPriceContext, formatPriceContextForPrompt, type PriceContextData } from "./price-context"
import { fetchTrendsContext, formatTrendsContextForPrompt, type TrendsContextData } from "./trends-context"

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
    collectedAt: string
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
    const [flights, events] = await Promise.all([
        fetchFlightContext(departureCity, destinations, startDate, endDate),
        fetchEventContext(destinations, startDate, endDate)
    ])

    // Синхронные данные
    const prices = destinations.map(dest => fetchPriceContext(dest))
    const trends = destinations.map(dest => fetchTrendsContext(dest))

    console.log(`[DynamicContext] Collected: flights=${flights.rawDataAvailable}, events=${events.events.length}, trends=${trends.filter(t => t.trendingPlaces.length > 0).length}`)

    return {
        flights,
        events,
        prices,
        trends,
        collectedAt: new Date().toISOString()
    }
}

/**
 * Форматировать весь контекст для промпта AI
 */
export function formatDynamicContextForPrompt(context: DynamicContext): string {
    const sections: string[] = []

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
