/**
 * Airport Validator - Проверка статуса аэропортов в реальном времени
 * Использует web search для актуальных NOTAM/новостей
 */

import { getIataCode } from "../travelpayouts"
import { checkAirportLiveStatus, getAirportInfo } from "./aerodatabox-client"

export interface AirportStatus {
    city: string
    iata: string | null
    isOpen: boolean
    restrictions: string[]
    lastChecked: string
    source: string
}

export interface AirportValidationResult {
    allOpen: boolean
    airports: AirportStatus[]
    closedAirports: string[]
    restrictedAirports: string[]
}

/**
 * Получить IATA код города (расширенная версия)
 */
function getAirportIata(city: string): string | null {
    const iata = getIataCode(city)
    if (iata) return iata

    const additionalCodes: Record<string, string> = {
        "краснодар": "KRR", "анапа": "AAQ", "геленджик": "GDZ",
        "элиста": "ESL", "липецк": "LPK", "курск": "URS",
        "воронеж": "VOZ", "белгород": "BEL", "брянск": "BZK",
        "ростов": "ROV", "симферополь": "SIP",
    }

    return additionalCodes[city.toLowerCase().trim()] || null
}

/**
 * Проверить статус одного аэропорта (динамически)
 */
export async function validateAirport(city: string): Promise<AirportStatus> {
    const iata = getAirportIata(city)
    const now = new Date().toISOString()

    if (!iata) {
        return {
            city, iata: null, isOpen: true,
            restrictions: [], lastChecked: now, source: "unknown"
        }
    }

    // Динамическая проверка через AeroDataBox
    const status = await checkAirportLiveStatus(iata)
    
    return {
        city,
        iata,
        isOpen: status.isOpen,
        restrictions: status.reason ? [status.reason] : [],
        lastChecked: now,
        source: "aerodatabox_live"
    }
}

/**
 * Проверить статус нескольких аэропортов
 */
export async function validateAirports(cities: string[]): Promise<AirportValidationResult> {
    const airports: AirportStatus[] = []
    const closedAirports: string[] = []
    const restrictedAirports: string[] = []

    for (const city of cities) {
        const status = await validateAirport(city)
        airports.push(status)

        if (!status.isOpen) {
            closedAirports.push(`${city}${status.iata ? ` (${status.iata})` : ""}: ${status.restrictions[0] || "закрыт"}`)
        }
    }

    return {
        allOpen: closedAirports.length === 0,
        airports,
        closedAirports,
        restrictedAirports
    }
}

/**
 * Предлагает альтернативы для закрытых зон
 */
export function suggestAlternativeAirport(city: string): {
    needsAlternative: boolean
    alternatives: string[]
    reason?: string
} {
    const iata = getAirportIata(city)
    
    // Южные города РФ (исторически закрытые зоны)
    const southernClosed = ["KRR", "AAQ", "GDZ", "ROV", "SIP"]
    if (iata && southernClosed.includes(iata)) {
        return {
            needsAlternative: true,
            alternatives: ["Минеральные Воды (MRV)", "Сочи (AER)", "Ставрополь (STW)"],
            reason: "Аэропорт в зоне ограничений полетов"
        }
    }

    return { needsAlternative: false, alternatives: [] }
}

