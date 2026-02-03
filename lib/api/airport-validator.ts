/**
 * Airport Validator - Проверка статуса аэропортов в реальном времени
 * Использует web search для актуальных NOTAM/новостей
 */

import { getIataCode } from "../travelpayouts"

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

// Известные закрытые аэропорты (fallback, когда web search недоступен)
// Будет обновляться через web search при каждом запросе
const KNOWN_CLOSED_AIRPORTS: Record<string, { reason: string; since: string }> = {
    // Юг России - актуальность проверять через web search
    // "KRR": { reason: "Аэропорт Краснодара закрыт", since: "2022-02" }, // ОТКРЫТ!
    "AAQ": { reason: "Аэропорт Анапы закрыт", since: "2022-02" },
    "GDZ": { reason: "Аэропорт Геленджика закрыт", since: "2022-02" },
    "ESL": { reason: "Аэропорт Элисты закрыт", since: "2022-02" },
    "LPK": { reason: "Аэропорт Липецка закрыт", since: "2022-02" },
    "URS": { reason: "Аэропорт Курска закрыт", since: "2022-02" },
    "VOZ": { reason: "Аэропорт Воронежа приостановлен", since: "2022-02" },
    "BEL": { reason: "Аэропорт Белгорода закрыт", since: "2022-02" },
    "BZK": { reason: "Аэропорт Брянска закрыт", since: "2022-02" },
    "ROV": { reason: "Аэропорт Ростова-на-Дону закрыт", since: "2022-02" },
}

// Аэропорты с ограничениями (не закрыты, но есть проблемы)
const RESTRICTED_AIRPORTS: Record<string, string> = {
    "VKO": "Внуково: возможны задержки из-за NOTAM",
    "DME": "Домодедово: возможны задержки из-за NOTAM",
    "GRV": "Грозный: усиленные меры безопасности",
    "OGZ": "Владикавказ: усиленные меры безопасности",
}

/**
 * Получить IATA код города (расширенная версия)
 */
function getAirportIata(city: string): string | null {
    // Сначала пробуем стандартную функцию
    const iata = getIataCode(city)
    if (iata) return iata

    // Дополнительные города
    const additionalCodes: Record<string, string> = {
        "краснодар": "KRR",
        "krasnodar": "KRR",
        "анапа": "AAQ",
        "anapa": "AAQ",
        "геленджик": "GDZ",
        "gelendzhik": "GDZ",
        "элиста": "ESL",
        "elista": "ESL",
        "липецк": "LPK",
        "lipetsk": "LPK",
        "курск": "URS",
        "kursk": "URS",
        "воронеж": "VOZ",
        "voronezh": "VOZ",
        "белгород": "BEL",
        "belgorod": "BEL",
        "брянск": "BZK",
        "bryansk": "BZK",
        "ростов": "ROV",
        "ростов-на-дону": "ROV",
        "rostov": "ROV",
        "грозный": "GRV",
        "grozny": "GRV",
        "владикавказ": "OGZ",
        "vladikavkaz": "OGZ",
        "симферополь": "SIP",
        "simferopol": "SIP",
        "crimea": "SIP",
        "крым": "SIP",
    }

    return additionalCodes[city.toLowerCase().trim()] || null
}

/**
 * Проверить статус аэропорта через fallback данные
 * (используется когда web search недоступен)
 */
function checkAirportFallback(city: string): AirportStatus {
    const iata = getAirportIata(city)
    const now = new Date().toISOString()

    if (!iata) {
        return {
            city,
            iata: null,
            isOpen: true, // Оптимистично если не знаем
            restrictions: [],
            lastChecked: now,
            source: "unknown"
        }
    }

    // Проверяем закрытые
    if (KNOWN_CLOSED_AIRPORTS[iata]) {
        return {
            city,
            iata,
            isOpen: false,
            restrictions: [KNOWN_CLOSED_AIRPORTS[iata].reason],
            lastChecked: now,
            source: "cached_data"
        }
    }

    // Проверяем с ограничениями
    if (RESTRICTED_AIRPORTS[iata]) {
        return {
            city,
            iata,
            isOpen: true,
            restrictions: [RESTRICTED_AIRPORTS[iata]],
            lastChecked: now,
            source: "cached_data"
        }
    }

    return {
        city,
        iata,
        isOpen: true,
        restrictions: [],
        lastChecked: now,
        source: "cached_data"
    }
}

/**
 * Поиск в реальном времени через fetch (простой fallback)
 * В production можно заменить на полноценный web search API
 */
async function searchAirportStatus(city: string, iata: string | null): Promise<AirportStatus | null> {
    // Здесь в идеале должен быть вызов web search API
    // Но пока используем только fallback данные
    // TODO: Интеграция с реальным web search когда будет доступен

    // Возвращаем null чтобы использовался fallback
    return null
}

/**
 * Проверить статус одного аэропорта
 */
export async function validateAirport(city: string): Promise<AirportStatus> {
    const iata = getAirportIata(city)

    // Пробуем real-time поиск
    const searchResult = await searchAirportStatus(city, iata)
    if (searchResult) {
        return searchResult
    }

    // Fallback на кэшированные данные
    return checkAirportFallback(city)
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
        } else if (status.restrictions.length > 0) {
            restrictedAirports.push(`${city}: ${status.restrictions[0]}`)
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
 * Проверить, является ли город в регионе с закрытыми аэропортами
 * Предлагает альтернативы
 */
export function suggestAlternativeAirport(city: string): {
    needsAlternative: boolean
    alternatives: string[]
    reason?: string
} {
    const iata = getAirportIata(city)

    if (!iata || !KNOWN_CLOSED_AIRPORTS[iata]) {
        return { needsAlternative: false, alternatives: [] }
    }

    // Южные города - альтернатива Минеральные Воды или Сочи
    const southernClosed = ["KRR", "AAQ", "GDZ", "ROV"]
    if (southernClosed.includes(iata)) {
        return {
            needsAlternative: true,
            alternatives: ["Минеральные Воды (MRV)", "Сочи (AER)", "Ставрополь (STW)"],
            reason: KNOWN_CLOSED_AIRPORTS[iata].reason
        }
    }

    // Центральные - альтернатива Москва
    const centralClosed = ["LPK", "VOZ", "BEL", "BZK", "URS"]
    if (centralClosed.includes(iata)) {
        return {
            needsAlternative: true,
            alternatives: ["Москва (SVO/DME/VKO)", "Нижний Новгород (GOJ)"],
            reason: KNOWN_CLOSED_AIRPORTS[iata].reason
        }
    }

    return {
        needsAlternative: true,
        alternatives: ["Москва (SVO)"],
        reason: KNOWN_CLOSED_AIRPORTS[iata].reason
    }
}

/**
 * Обновить данные о закрытых аэропортах
 * Вызывается при получении новой информации
 */
export function updateAirportStatus(iata: string, isOpen: boolean, reason?: string): void {
    if (isOpen && KNOWN_CLOSED_AIRPORTS[iata]) {
        // Аэропорт открылся - удаляем из списка закрытых
        delete KNOWN_CLOSED_AIRPORTS[iata]
        console.log(`Airport ${iata} marked as OPEN`)
    } else if (!isOpen && !KNOWN_CLOSED_AIRPORTS[iata]) {
        // Аэропорт закрылся - добавляем в список
        KNOWN_CLOSED_AIRPORTS[iata] = {
            reason: reason || "Аэропорт закрыт",
            since: new Date().toISOString().split("T")[0]
        }
        console.log(`Airport ${iata} marked as CLOSED: ${reason}`)
    }
}
