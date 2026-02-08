/**
 * Visa Validator - Проверка визовых требований с обходными путями
 * Использует Travel Buddy AI Visa API (RapidAPI)
 */

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || ""
const VISA_API_HOST = "travel-buddy-ai-visa-requirements.p.rapidapi.com"

export interface VisaRequirement {
    visaRequired: boolean
    visaType: "visa_free" | "visa_on_arrival" | "evisa" | "visa_required" | "closed"
    maxStay?: number // дней
    processingTime?: string
    evisaLink?: string
    notes?: string
}

export interface VisaWorkaround {
    type: "transit" | "alternative_consulate" | "evisa"
    route: string[]
    visaType: string
    obtainableIn: string[]
    estimatedTime: string
    note: string
}

export interface VisaValidationResult {
    directAccess: boolean
    requirement: VisaRequirement
    workarounds: VisaWorkaround[]
    recommendation: string | null
    isBlocker: boolean
}

// Известные закрытые направления для граждан РФ (обновлять по необходимости)
const CLOSED_FOR_RUSSIA: Record<string, { since: string; reason: string }> = {
    "FI": { since: "2022-09", reason: "Финляндия закрыла въезд для туристов из РФ" },
    "PL": { since: "2022-09", reason: "Польша закрыла въезд для туристов из РФ" },
    "EE": { since: "2022-09", reason: "Эстония закрыла въезд для туристов из РФ" },
    "LV": { since: "2022-09", reason: "Латвия закрыла въезд для туристов из РФ" },
    "LT": { since: "2022-09", reason: "Литва закрыла въезд для туристов из РФ" },
    // США не закрыты, но визы сложно получить
}

// Страны где можно получить Шенген для россиян
const SCHENGEN_OBTAINABLE = [
    { country: "Греция", code: "GR", difficulty: "medium", time: "10-15 дней" },
    { country: "Испания", code: "ES", difficulty: "medium", time: "15-20 дней" },
    { country: "Италия", code: "IT", difficulty: "medium", time: "10-15 дней" },
    { country: "Франция", code: "FR", difficulty: "hard", time: "15-30 дней" },
    { country: "Германия", code: "DE", difficulty: "hard", time: "20-30 дней" },
    { country: "Венгрия", code: "HU", difficulty: "easy", time: "7-10 дней" },
    { country: "Словения", code: "SI", difficulty: "easy", time: "7-14 дней" },
]

// Транзитные хабы для обхода
const TRANSIT_HUBS = [
    { city: "Стамбул", country: "Турция", code: "TR", visaFree: true },
    { city: "Дубай", country: "ОАЭ", code: "AE", visaFree: true },
    { city: "Белград", country: "Сербия", code: "RS", visaFree: true },
    { city: "Ереван", country: "Армения", code: "AM", visaFree: true },
    { city: "Тбилиси", country: "Грузия", code: "GE", visaFree: true },
]

// ISO коды стран
const COUNTRY_CODES: Record<string, string> = {
    "финляндия": "FI", "finland": "FI",
    "польша": "PL", "poland": "PL",
    "эстония": "EE", "estonia": "EE",
    "латвия": "LV", "latvia": "LV",
    "литва": "LT", "lithuania": "LT",
    "германия": "DE", "germany": "DE",
    "франция": "FR", "france": "FR",
    "италия": "IT", "italy": "IT",
    "испания": "ES", "spain": "ES",
    "греция": "GR", "greece": "GR",
    "турция": "TR", "turkey": "TR", "türkiye": "TR",
    "оаэ": "AE", "uae": "AE", "дубай": "AE",
    "сербия": "RS", "serbia": "RS",
    "грузия": "GE", "georgia": "GE",
    "армения": "AM", "armenia": "AM",
    "азербайджан": "AZ", "azerbaijan": "AZ",
    "китай": "CN", "china": "CN",
    "таиланд": "TH", "thailand": "TH",
    "вьетнам": "VN", "vietnam": "VN",
    "индонезия": "ID", "indonesia": "ID", "бали": "ID",
    "япония": "JP", "japan": "JP",
    "южная корея": "KR", "south korea": "KR",
    "сша": "US", "usa": "US", "америка": "US",
    "великобритания": "GB", "uk": "GB", "англия": "GB",
    "чехия": "CZ", "czech": "CZ", "прага": "CZ",
    "австрия": "AT", "austria": "AT", "вена": "AT",
    "швейцария": "CH", "switzerland": "CH",
    "нидерланды": "NL", "netherlands": "NL", "голландия": "NL",
    "бельгия": "BE", "belgium": "BE",
    "португалия": "PT", "portugal": "PT",
    "хорватия": "HR", "croatia": "HR",
    "словения": "SI", "slovenia": "SI",
    "венгрия": "HU", "hungary": "HU",
    "болгария": "BG", "bulgaria": "BG",
    "румыния": "RO", "romania": "RO",
    "кипр": "CY", "cyprus": "CY",
    "мальта": "MT", "malta": "MT",
    "египет": "EG", "egypt": "EG",
    "марокко": "MA", "morocco": "MA",
    "тунис": "TN", "tunisia": "TN",
    "израиль": "IL", "israel": "IL",
    "индия": "IN", "india": "IN",
    "шри-ланка": "LK", "sri lanka": "LK",
    "мальдивы": "MV", "maldives": "MV",
    "казахстан": "KZ", "kazakhstan": "KZ",
    "узбекистан": "UZ", "uzbekistan": "UZ",
    "киргизия": "KG", "kyrgyzstan": "KG",
    "таджикистан": "TJ", "tajikistan": "TJ",
    "монголия": "MN", "mongolia": "MN",
    "куба": "CU", "cuba": "CU",
    "мексика": "MX", "mexico": "MX",
    "аргентина": "AR", "argentina": "AR",
    "бразилия": "BR", "brazil": "BR",
}

// Безвизовые страны для РФ
const VISA_FREE_FOR_RUSSIA = new Set([
    "TR", "AE", "RS", "GE", "AM", "AZ", "KZ", "UZ", "KG", "TJ", "MN",
    "TH", "VN", "ID", "MY", "MV", "LK", "MX", "AR", "BR", "CU",
    "IL", "MA", "TN", "EG", "CN" // Китай безвиз до 30 дней
])

function getCountryCode(country: string): string | null {
    return COUNTRY_CODES[country.toLowerCase().trim()] || null
}

/**
 * Проверка визовых требований через API
 */
async function fetchVisaFromAPI(
    citizenship: string,
    destination: string
): Promise<VisaRequirement | null> {
    if (!RAPIDAPI_KEY) {
        console.warn("RAPIDAPI_KEY not set, using fallback visa data")
        return null
    }

    try {
        const response = await fetch(
            `https://${VISA_API_HOST}/visa-requirements?citizenship=${citizenship}&destination=${destination}`,
            {
                headers: {
                    "X-RapidAPI-Key": RAPIDAPI_KEY,
                    "X-RapidAPI-Host": VISA_API_HOST
                }
            }
        )

        if (!response.ok) {
            console.error(`Visa API error: ${response.status}`)
            return null
        }

        const data = await response.json()

        return {
            visaRequired: data.visa_required !== false,
            visaType: data.visa_type || "visa_required",
            maxStay: data.allowed_stay,
            processingTime: data.processing_time,
            evisaLink: data.evisa_link,
            notes: data.notes
        }
    } catch (error) {
        console.error("Visa API fetch error:", error)
        return null
    }
}

/**
 * Fallback логика для виз (когда API недоступен)
 */
function getVisaFallback(countryCode: string): VisaRequirement {
    // Проверяем закрытые страны
    if (CLOSED_FOR_RUSSIA[countryCode]) {
        return {
            visaRequired: true,
            visaType: "closed",
            notes: CLOSED_FOR_RUSSIA[countryCode].reason
        }
    }

    // Проверяем безвизовые
    if (VISA_FREE_FOR_RUSSIA.has(countryCode)) {
        return {
            visaRequired: false,
            visaType: "visa_free",
            maxStay: 30, // Обычно 30 дней
            notes: "Безвизовый въезд для граждан РФ"
        }
    }

    // Шенгенская зона
    const schengenCountries = new Set([
        "AT", "BE", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU",
        "IS", "IT", "LV", "LT", "LU", "MT", "NL", "NO", "PL", "PT",
        "SK", "SI", "ES", "SE", "CH"
    ])

    if (schengenCountries.has(countryCode)) {
        return {
            visaRequired: true,
            visaType: "visa_required",
            notes: "Требуется Шенгенская виза"
        }
    }

    // По умолчанию
    return {
        visaRequired: true,
        visaType: "visa_required"
    }
}

/**
 * Найти обходные пути для закрытых направлений
 */
function findWorkarounds(
    countryCode: string,
    requirement: VisaRequirement
): VisaWorkaround[] {
    const workarounds: VisaWorkaround[] = []

    // Если страна закрыта для прямого въезда, но входит в Шенген
    const schengenCountries = new Set([
        "AT", "BE", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU",
        "IS", "IT", "LV", "LT", "LU", "MT", "NL", "NO", "PL", "PT",
        "SK", "SI", "ES", "SE", "CH"
    ])

    if (requirement.visaType === "closed" ||
        (schengenCountries.has(countryCode) && CLOSED_FOR_RUSSIA[countryCode])) {

        // Вариант 1: Получить Шенген в дружественной стране
        for (const consulate of SCHENGEN_OBTAINABLE) {
            workarounds.push({
                type: "alternative_consulate",
                route: [`Подать на Шенген в консульстве ${consulate.country}`],
                visaType: "Шенгенская виза",
                obtainableIn: [consulate.country],
                estimatedTime: consulate.time,
                note: `Сложность: ${consulate.difficulty === "easy" ? "низкая" : consulate.difficulty === "medium" ? "средняя" : "высокая"}`
            })
        }

        // Вариант 2: Транзит через безвизовые хабы
        for (const hub of TRANSIT_HUBS) {
            workarounds.push({
                type: "transit",
                route: ["Москва", hub.city, `Страна назначения`],
                visaType: "Шенген + транзит",
                obtainableIn: [hub.country],
                estimatedTime: "Зависит от получения Шенгена",
                note: `Лететь через ${hub.city} (${hub.country} - безвиз)`
            })
        }
    }

    // Если просто нужен Шенген (не закрыто)
    if (schengenCountries.has(countryCode) && requirement.visaType === "visa_required") {
        for (const consulate of SCHENGEN_OBTAINABLE.slice(0, 3)) {
            workarounds.push({
                type: "alternative_consulate",
                route: [`Получить Шенген в ${consulate.country}`],
                visaType: "Шенгенская виза",
                obtainableIn: [consulate.country],
                estimatedTime: consulate.time,
                note: `Рекомендация: подавать в ${consulate.country}`
            })
        }
    }

    return workarounds
}

/**
 * Главная функция валидации виз
 */
export async function validateVisa(
    destinationCountry: string,
    citizenship: string = "RU"
): Promise<VisaValidationResult> {
    const countryCode = getCountryCode(destinationCountry)

    if (!countryCode) {
        return {
            directAccess: true, // Оптимистично если не знаем страну
            requirement: {
                visaRequired: false,
                visaType: "visa_free",
                notes: `Неизвестная страна: ${destinationCountry}`
            },
            workarounds: [],
            recommendation: null,
            isBlocker: false
        }
    }

    // Пробуем API
    let requirement = await fetchVisaFromAPI(citizenship, countryCode)

    // Fallback если API недоступен
    if (!requirement) {
        requirement = getVisaFallback(countryCode)
    }

    // Определяем прямой доступ
    const directAccess = !requirement.visaRequired ||
        (requirement.visaType !== "closed" && requirement.visaType !== "visa_required")

    // Ищем обходные пути
    const workarounds = findWorkarounds(countryCode, requirement)

    // Определяем является ли это блокером
    const isBlocker = requirement.visaType === "closed" && workarounds.length === 0

    // Формируем рекомендацию
    let recommendation: string | null = null
    if (!directAccess && workarounds.length > 0) {
        if (requirement.visaType === "closed") {
            recommendation = `Прямой въезд в ${destinationCountry} закрыт для граждан РФ. ` +
                `Рекомендация: получить Шенгенскую визу в ${SCHENGEN_OBTAINABLE[0].country} и лететь через ${TRANSIT_HUBS[0].city}.`
        } else {
            recommendation = `Для въезда в ${destinationCountry} требуется виза. ` +
                `Рекомендация: подать документы в консульство ${SCHENGEN_OBTAINABLE[0].country}.`
        }
    }

    return {
        directAccess,
        requirement,
        workarounds,
        recommendation,
        isBlocker
    }
}

/**
 * Проверить визы для нескольких стран
 */
export async function validateMultipleVisas(
    countries: string[],
    citizenship: string = "RU"
): Promise<{
    allAccessible: boolean
    results: Record<string, VisaValidationResult>
    blockers: string[]
    warnings: string[]
}> {
    const results: Record<string, VisaValidationResult> = {}
    const blockers: string[] = []
    const warnings: string[] = []

    for (const country of countries) {
        const result = await validateVisa(country, citizenship)
        results[country] = result

        if (result.isBlocker) {
            blockers.push(`${country}: ${result.requirement.notes || "Въезд невозможен"}`)
        } else if (!result.directAccess && result.workarounds.length > 0) {
            warnings.push(`${country}: ${result.recommendation}`)
        }
    }

    return {
        allAccessible: blockers.length === 0,
        results,
        blockers,
        warnings
    }
}
