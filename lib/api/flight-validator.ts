/**
 * Flight Validator - Проверка существования рейсов и минимальных цен
 * Использует Travelpayouts API
 */

import {
    getCheapestTickets,
    getPriceCalendar,
    getIataCode,
    hasApiToken,
    formatPrice
} from "../travelpayouts"

export interface FlightValidationResult {
    flightsExist: boolean
    minPrice: number | null
    currency: string
    directFlight: boolean
    transfers: number
    recommendedRoute?: {
        origin: string
        destination: string
        departureDate?: string
        returnDate?: string
        airline?: string
    }
    error?: string
}

export interface FlightValidationParams {
    originCity: string
    destinationCity: string
    originIata?: string
    destinationIata?: string
    departDate?: string // YYYY-MM-DD
    returnDate?: string
}

/**
 * Проверить существование рейсов между городами
 * Возвращает минимальную цену если рейсы есть
 */
export async function validateFlightRoute(
    params: FlightValidationParams
): Promise<FlightValidationResult> {
    const { originCity, destinationCity, originIata, destinationIata, departDate, returnDate } = params

    // Проверяем токен
    if (!hasApiToken()) {
        console.warn("Travelpayouts API token not configured, skipping flight validation")
        return {
            flightsExist: true, // Оптимистично, если нет токена
            minPrice: null,
            currency: "rub",
            directFlight: false,
            transfers: 0,
            error: "API token not configured"
        }
    }

    // Получаем IATA коды
    const origin = originIata || getIataCode(originCity)
    const destination = destinationIata || getIataCode(destinationCity)

    if (!origin) {
        return {
            flightsExist: false,
            minPrice: null,
            currency: "rub",
            directFlight: false,
            transfers: 0,
            error: `Не удалось определить IATA код для города: ${originCity}`
        }
    }

    if (!destination) {
        return {
            flightsExist: false,
            minPrice: null,
            currency: "rub",
            directFlight: false,
            transfers: 0,
            error: `Не удалось определить IATA код для города: ${destinationCity}`
        }
    }

    try {
        // Получаем данные о рейсах
        const departMonth = departDate ? departDate.substring(0, 7) : undefined
        const returnMonth = returnDate ? returnDate.substring(0, 7) : undefined

        const cheapTickets = await getCheapestTickets(origin, destination, departMonth, returnMonth)

        if (!cheapTickets || !cheapTickets.success) {
            // Пробуем календарь цен как fallback
            if (departDate) {
                const calendar = await getPriceCalendar(origin, destination, departDate)
                if (calendar && calendar.length > 0) {
                    const minTicket = calendar.reduce((min, t) => t.price < min.price ? t : min, calendar[0])
                    return {
                        flightsExist: true,
                        minPrice: minTicket.price,
                        currency: "rub",
                        directFlight: minTicket.transfers === 0,
                        transfers: minTicket.transfers,
                        recommendedRoute: {
                            origin: minTicket.origin,
                            destination: minTicket.destination,
                            departureDate: minTicket.departure_at,
                            returnDate: minTicket.return_at,
                            airline: minTicket.airline
                        }
                    }
                }
            }

            return {
                flightsExist: false,
                minPrice: null,
                currency: "rub",
                directFlight: false,
                transfers: 0,
                error: `Рейсы между ${originCity} и ${destinationCity} не найдены`
            }
        }

        // Парсим ответ API
        const destinationData = cheapTickets.data[destination]
        if (!destinationData || Object.keys(destinationData).length === 0) {
            return {
                flightsExist: false,
                minPrice: null,
                currency: cheapTickets.currency || "rub",
                directFlight: false,
                transfers: 0,
                error: `Рейсы в ${destinationCity} не найдены`
            }
        }

        // Находим минимальную цену
        let minPrice = Infinity
        let minTicket: any = null

        for (const [_, ticket] of Object.entries(destinationData) as [string, { price: number; transfers: number; airline: string; departure_at: string; return_at: string }][]) {
            if (ticket.price < minPrice) {
                minPrice = ticket.price
                minTicket = ticket
            }
        }

        return {
            flightsExist: true,
            minPrice: minPrice === Infinity ? null : minPrice,
            currency: cheapTickets.currency || "rub",
            directFlight: minTicket?.transfers === 0,
            transfers: minTicket?.transfers || 0,
            recommendedRoute: minTicket ? {
                origin,
                destination,
                departureDate: minTicket.departure_at,
                returnDate: minTicket.return_at,
                airline: minTicket.airline
            } : undefined
        }

    } catch (error: any) {
        console.error("Flight validation error:", error)
        return {
            flightsExist: true, // Оптимистично при ошибке
            minPrice: null,
            currency: "rub",
            directFlight: false,
            transfers: 0,
            error: error.message
        }
    }
}

/**
 * Проверить несколько маршрутов (для мульти-городов)
 */
export async function validateMultiCityRoute(
    cities: string[],
    departDate?: string,
    returnDate?: string
): Promise<{
    allFlightsExist: boolean
    totalMinPrice: number
    legs: FlightValidationResult[]
    blockedLegs: string[]
}> {
    if (cities.length < 2) {
        return {
            allFlightsExist: true,
            totalMinPrice: 0,
            legs: [],
            blockedLegs: []
        }
    }

    const legs: FlightValidationResult[] = []
    const blockedLegs: string[] = []
    let totalMinPrice = 0

    for (let i = 0; i < cities.length - 1; i++) {
        const result = await validateFlightRoute({
            originCity: cities[i],
            destinationCity: cities[i + 1],
            departDate: i === 0 ? departDate : undefined,
            returnDate: i === cities.length - 2 ? returnDate : undefined
        })

        legs.push(result)

        if (!result.flightsExist) {
            blockedLegs.push(`${cities[i]} → ${cities[i + 1]}`)
        } else if (result.minPrice) {
            totalMinPrice += result.minPrice
        }
    }

    return {
        allFlightsExist: blockedLegs.length === 0,
        totalMinPrice,
        legs,
        blockedLegs
    }
}

/**
 * Получить минимальный бюджет на перелёты для маршрута
 */
export async function getMinFlightBudget(
    originCity: string,
    destinations: string[],
    departDate?: string,
    returnDate?: string
): Promise<{
    minBudget: number
    details: string[]
}> {
    const allCities = [originCity, ...destinations, originCity] // round trip
    const result = await validateMultiCityRoute(allCities, departDate, returnDate)

    const details: string[] = []
    for (let i = 0; i < result.legs.length; i++) {
        const leg = result.legs[i]
        if (leg.minPrice) {
            details.push(`${allCities[i]} → ${allCities[i + 1]}: ${formatPrice(leg.minPrice)}`)
        }
    }

    return {
        minBudget: result.totalMinPrice,
        details
    }
}
