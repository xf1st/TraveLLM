/**
 * Flight Context - Получение реальных данных о рейсах для промпта
 * Обогащает промпт актуальной информацией о ценах и маршрутах
 */

import {
    getCheapestTickets,
    getPriceCalendar,
    getPopularDestinations,
    getIataCode,
    resolveIataCode,
    formatPrice,
    hasApiToken
} from "../travelpayouts"

export interface FlightContextData {
    departureCity: string
    destinations: string[]
    flights: FlightInfo[]
    priceRange: { min: number; max: number; currency: string } | null
    recommendations: string[]
    rawDataAvailable: boolean
}

export interface FlightInfo {
    from: string
    to: string
    minPrice: number | null
    currency: string
    airline?: string
    transfers: number
    departureDate?: string
    directAvailable: boolean
}

/**
 * Получить контекст рейсов для промпта
 */
export async function fetchFlightContext(
    departureCity: string,
    destinations: string[],
    startDate?: string,
    endDate?: string
): Promise<FlightContextData> {
    const flights: FlightInfo[] = []
    const recommendations: string[] = []
    let minOverall = Infinity
    let maxOverall = 0

    if (!hasApiToken()) {
        return {
            departureCity,
            destinations,
            flights: [],
            priceRange: null,
            recommendations: ["Данные о рейсах недоступны"],
            rawDataAvailable: false
        }
    }

    const originIata = await resolveIataCode(departureCity)
    if (!originIata) {
        return {
            departureCity,
            destinations,
            flights: [],
            priceRange: null,
            recommendations: [`Не удалось определить аэропорт для ${departureCity}`],
            rawDataAvailable: false
        }
    }

    // Получаем данные для каждого направления
    for (const dest of destinations) {
        const destIata = await resolveIataCode(dest)
        if (!destIata) {
            flights.push({
                from: departureCity,
                to: dest,
                minPrice: null,
                currency: "rub",
                transfers: 0,
                directAvailable: false
            })
            continue
        }

        try {
            const departMonth = startDate ? startDate.substring(0, 7) : undefined
            const tickets = await getCheapestTickets(originIata, destIata, departMonth)

            if (tickets?.success && tickets.data[destIata]) {
                const destData = tickets.data[destIata]
                const entries = Object.entries(destData) as [string, any][]

                if (entries.length > 0) {
                    // Находим минимальную цену и прямые рейсы
                    let minPrice = Infinity
                    let bestTicket: any = null
                    let hasDirect = false

                    for (const [_, ticket] of entries) {
                        if (ticket.price < minPrice) {
                            minPrice = ticket.price
                            bestTicket = ticket
                        }
                        if (ticket.transfers === 0) {
                            hasDirect = true
                        }
                    }

                    if (minPrice < Infinity) {
                        minOverall = Math.min(minOverall, minPrice)
                        maxOverall = Math.max(maxOverall, minPrice)

                        flights.push({
                            from: departureCity,
                            to: dest,
                            minPrice,
                            currency: tickets.currency || "rub",
                            airline: bestTicket?.airline,
                            transfers: bestTicket?.transfers || 0,
                            departureDate: bestTicket?.departure_at,
                            directAvailable: hasDirect
                        })

                        if (!hasDirect) {
                            recommendations.push(`${departureCity} → ${dest}: прямых рейсов нет, только с пересадкой`)
                        }
                    }
                }
            } else {
                // Пробуем календарь цен
                if (startDate) {
                    const calendar = await getPriceCalendar(originIata, destIata, startDate)
                    if (calendar && calendar.length > 0) {
                        const best = calendar.reduce((min, t) => t.price < min.price ? t : min, calendar[0])
                        flights.push({
                            from: departureCity,
                            to: dest,
                            minPrice: best.price,
                            currency: "rub",
                            airline: best.airline,
                            transfers: best.transfers,
                            departureDate: best.departure_at,
                            directAvailable: best.transfers === 0
                        })
                        minOverall = Math.min(minOverall, best.price)
                        maxOverall = Math.max(maxOverall, best.price)
                    }
                }
            }
        } catch (error) {
            console.error(`Error fetching flights to ${dest}:`, error)
            flights.push({
                from: departureCity,
                to: dest,
                minPrice: null,
                currency: "rub",
                transfers: 0,
                directAvailable: false
            })
        }
    }

    // Обратный рейс — только для round trip (последний город совпадает с первым или это явный возврат)
    // Для open-jaw (Москва→Стамбул→Бали) возвратный рейс не добавляем
    const isRoundTrip = destinations.length === 1 ||
        (destinations.length > 1 && destinations[destinations.length - 1].toLowerCase() === departureCity.toLowerCase())
    if (isRoundTrip && destinations.length > 0 && endDate) {
        const lastDest = destinations[destinations.length - 1]
        const lastDestIata = await resolveIataCode(lastDest)

        if (lastDestIata && originIata) {
            try {
                const returnMonth = endDate.substring(0, 7)
                const returnTickets = await getCheapestTickets(lastDestIata, originIata, returnMonth)

                if (returnTickets?.success && returnTickets.data[originIata]) {
                    const returnData = returnTickets.data[originIata]
                    const entries = Object.entries(returnData) as [string, any][]

                    if (entries.length > 0) {
                        const best = entries.reduce((min, [_, t]) => t.price < min[1].price ? [_, t] : min, entries[0])
                        flights.push({
                            from: lastDest,
                            to: departureCity,
                            minPrice: best[1].price,
                            currency: returnTickets.currency || "rub",
                            airline: best[1].airline,
                            transfers: best[1].transfers,
                            departureDate: best[1].departure_at,
                            directAvailable: best[1].transfers === 0
                        })
                        minOverall = Math.min(minOverall, best[1].price)
                        maxOverall = Math.max(maxOverall, best[1].price)
                    }
                }
            } catch (error) {
                console.error(`Error fetching return flights:`, error)
            }
        }
    }

    return {
        departureCity,
        destinations,
        flights,
        priceRange: minOverall < Infinity ? {
            min: minOverall,
            max: maxOverall,
            currency: "rub"
        } : null,
        recommendations,
        rawDataAvailable: flights.some(f => f.minPrice !== null)
    }
}

/**
 * Форматировать контекст рейсов для промпта AI
 */
export function formatFlightContextForPrompt(context: FlightContextData): string {
    if (!context.rawDataAvailable) {
        return "Данные о рейсах: недоступны"
    }

    const lines: string[] = ["АКТУАЛЬНЫЕ ДАННЫЕ О РЕЙСАХ:"]

    for (const flight of context.flights) {
        if (flight.minPrice) {
            const priceStr = formatPrice(flight.minPrice, flight.currency)
            const transferStr = flight.transfers === 0 ? "прямой" : `${flight.transfers} пересадка`
            lines.push(`- ${flight.from} → ${flight.to}: от ${priceStr} (${transferStr}${flight.airline ? `, ${flight.airline}` : ""})`)
        }
    }

    if (context.priceRange) {
        lines.push(`\nЦеновой диапазон: ${formatPrice(context.priceRange.min)} - ${formatPrice(context.priceRange.max)}`)
    }

    if (context.recommendations.length > 0) {
        lines.push("\nРекомендации:")
        for (const rec of context.recommendations) {
            lines.push(`- ${rec}`)
        }
    }

    return lines.join("\n")
}
