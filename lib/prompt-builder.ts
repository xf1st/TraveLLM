/**
 * Prompt Builder - Построение обогащённого промпта для AI
 * Объединяет все данные в один структурированный промпт
 */

import { collectDynamicContext, formatDynamicContextForPrompt, type DynamicContext } from "./context/dynamic-context"
import { formatTravelStyleForPrompt, getTravelStyle, type TravelStyleDefinition } from "./travel-styles"
import { getApplicableRules, STRICT_RULES, ACTIVITY_STRUCTURE_RULES, ITINERARY_STRUCTURE } from "./strict-rules"
import { type ValidationResult } from "./real-time-validation"
import { GROUNDING_DATA_2026 } from "./grounding"

export interface PromptBuilderParams {
    // Locale
    locale?: 'ru' | 'en'

    // Базовые параметры
    departureCity: string
    destinations: string[]
    startDate: string
    endDate: string
    budget: number
    adjustedBudget?: number
    budgetDesc?: string

    // Стиль и предпочтения
    travelStyle?: string | string[]
    interests?: string[]
    companions?: string
    travelers?: number
    
    // Персонализация
    preferences?: {
        citizenship?: string
        gender?: string
        age?: number
        pace?: string
        languages?: string[]
        dietaryRestrictions?: string[]
        dietaryCustom?: string
        interestsDetailed?: string[]
        interestsCustom?: string
        visitedCountries?: string[]
    }

    // Контекст
    dynamicContext?: DynamicContext
    dynamicContextStr?: string
    validationResult?: ValidationResult
    warningsStr?: string

    // Дополнительные флаги
    isFirstDayLateArrival?: boolean
    isLastDayEarlyDeparture?: boolean
    flightArrivalTime?: string
    flightDepartureTime?: string

    // Специальные поля
    safeHighlight?: string
    destinationType?: string
    strictDestinations?: boolean
    countryCount?: string | number
    filterByDocuments?: boolean

    // Динамический статус аэропортов (от AeroDataBox)
    airportValidationContext?: string
}

export interface EnrichedPrompt {
    systemPrompt: string
    userPrompt: string
    metadata: {
        contextIncluded: boolean
        styleIncluded: boolean
        rulesIncluded: boolean
        budgetAdjusted: boolean
    }
}

/**
 * Построить обогащённый промпт для генерации маршрута
 */
export async function buildEnrichedPrompt(params: PromptBuilderParams): Promise<EnrichedPrompt> {
    const {
        locale = 'ru',
        departureCity,
        destinations,
        startDate,
        endDate,
        budget,
        adjustedBudget,
        budgetDesc,
        travelStyle,
        interests,
        companions,
        travelers,
        preferences,
        dynamicContext,
        dynamicContextStr,
        validationResult,
        warningsStr,
        isFirstDayLateArrival,
        isLastDayEarlyDeparture,
        flightArrivalTime,
        flightDepartureTime,
        safeHighlight,
        destinationType,
        strictDestinations,
        countryCount,
        filterByDocuments,
        airportValidationContext
    } = params

    const isEn = locale === 'en'
    const currencySymbol = isEn ? '$' : '₽'
    const currencyLocale = isEn ? 'en-US' : 'ru-RU'
    const outputLang = isEn ? 'English' : 'Russian (РУССКОМ)'

    // Рассчитываем длительность
    const durationDays = startDate && endDate 
        ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
        : 7

    const effectiveBudget = adjustedBudget || budget
    const travelStyleArray = Array.isArray(travelStyle) ? travelStyle : (travelStyle ? [travelStyle] : [])
    const mainTravelStyle = travelStyleArray[0] || ""

    // ========================
    // СИСТЕМНЫЙ ПРОМПТ
    // ========================
    const systemPrompt = isEn
        ? `You are a TraveLLM expert travel planner. Respond with ONLY valid JSON. Be specific and detailed.\n\n${ITINERARY_STRUCTURE}`
        : `Ты — эксперт-планировщик путешествий TraveLLM для русских туристов. Отвечаешь ТОЛЬКО JSON. Будь конкретен.\n\n${ITINERARY_STRUCTURE}`

    // ========================
    // ПОЛЬЗОВАТЕЛЬСКИЙ ПРОМПТ
    // ========================
    const userParts: string[] = []

    // 1. ИСХОДНЫЕ ДАННЫЕ
    const budgetFormatted = budgetDesc || `${effectiveBudget.toLocaleString(currencyLocale)} ${currencySymbol}`
    userParts.push(isEn ? `
Create a detailed professional travel itinerary in ENGLISH.

TRIP DATA:
- Departure city: ${departureCity}
- Destination: ${destinations.join(", ")}
${destinationType === 'russia' && destinations.length === 0 ? `⚠️ CRITICAL: Route ONLY within Russia (RF). All cities and places MUST be on the territory of the Russian Federation.` : ''}
- Number of countries/cities: ${destinations.length > 0 ? destinations.length : (countryCount === "more" ? 4 : parseInt(countryCount as string) || 1)}
- Dates: ${startDate || 'Flexible'} — ${endDate || 'Flexible'} (${durationDays} days)
${warningsStr ? `⚠️ CURRENT WARNINGS FOR THESE DATES: ${warningsStr}` : ''}
${dynamicContextStr ? `\nCURRENT CONTEXT (GROUNDING):\n${dynamicContextStr}` : ''}
- Budget: ${budgetFormatted}
⚠️ STRICT BUDGET LIMIT: ${budgetFormatted} MAXIMUM FOR THE ENTIRE TRIP.
`.trim() : `
Создай детальный профессиональный маршрут путешествия на РУССКОМ языке.

ИСХОДНЫЕ ДАННЫЕ:
- Город отправления: ${departureCity}
- Направление: ${destinations.join(", ")}
${destinationType === 'russia' && destinations.length === 0 ? `⚠️ КРИТИЧНО: Маршрут ТОЛЬКО по России (РФ). Все города и места ОБЯЗАНЫ находиться на территории Российской Федерации. НЕЛЬЗЯ предлагать: Грузию, Батуми, Тбилиси, Беларусь, Казахстан, Армению, Азербайджан, Украину, любые страны СНГ и зарубежья.` : ''}
- Количество стран/городов: ${destinations.length > 0 ? destinations.length : (countryCount === "more" ? 4 : parseInt(countryCount as string) || 1)}
- Даты: ${startDate || 'Гибкие'} — ${endDate || 'Гибкие'} (${durationDays} дней)
${warningsStr ? `⚠️ АКТУАЛЬНЫЕ ПРЕДУПРЕЖДЕНИЯ ДЛЯ ЭТИХ ДАТ: ${warningsStr}` : ''}
${dynamicContextStr ? `\nАКТУАЛЬНЫЙ КОНТЕКСТ (GROUNDING):\n${dynamicContextStr}` : ''}
- Бюджет: ${budgetFormatted}
⚠️ ЖЁСТКИЙ ЛИМИТ БЮДЖЕТА: ${budgetFormatted} МАКСИМУМ НА ВСЮ ПОЕЗДКУ.
`.trim())

    // 2. ОБЯЗАТЕЛЬНЫЕ МЕСТА
    if (destinations.length > 0) {
        userParts.push(`
КРИТИЧНО — ОБЯЗАТЕЛЬНЫЕ ПУНКТЫ НАЗНАЧЕНИЯ:
Маршрут ДОЛЖЕН включать ВСЕ указанные ниже места. НЕ ПРОПУСКАЙ НИ ОДНО!
${destinations.map((d, i) => `${i + 1}. ${d}`).join('\n')}
Распредели время равномерно между всеми пунктами!
${strictDestinations ? `⚠️ НЕ МЕНЯЙ ГОРОДА НИ ПРИ КАКИХ УСЛОВИЯХ (даже если бюджет ограничен).` : ""}
`.trim())
    }

    // 3. РОССИЯ-СПЕЦИФИЧНЫЕ ПРАВИЛА
    const isRussia = destinationType === 'russia' || destinations.some(d => d.toLowerCase().includes('россия'))
    if (isRussia) {
        userParts.push(`
🇷🇺 ОСОБЕННОСТИ МАРШРУТОВ ПО РОССИИ:
Сделай путешествие по России ЯРКИМ, АКТИВНЫМ и АТМОСФЕРНЫМ.
- МЕНЬШЕ МУЗЕЕВ, БОЛЬШЕ ЖИЗНИ.
- Природные регионы (Карелия, Камчатка, Кавказ, Алтай): Максимум активности (треккинг, джип-туры, выходы в море).
- Крупные города: Креативные кластеры, местная гастрономия, стрит-фуд, необычные бары.
`.trim())
    }

    // 4. ПЕРСОНАЛИЗАЦИЯ
    const citizenshipLine = preferences?.citizenship ? `- Гражданство: ${preferences.citizenship}` : ''
    const languagesLine = preferences?.languages?.length ? `- Языки: ${preferences.languages.join(', ')}` : ''
    const visitedLine = preferences?.visitedCountries?.length ? `- Уже посещённые страны: ${preferences.visitedCountries.join(', ')} (не повторяй эти направления если не просят)` : ''
    const docsLine = filterByDocuments && preferences?.citizenship
        ? `⚠️ ВИЗОВЫЕ ОГРАНИЧЕНИЯ: Учти реальные визовые требования для гражданина "${preferences.citizenship}". Приоритет — безвизовые или e-visa направления.`
        : ''

    userParts.push(`
ПЕРСОНАЛИЗАЦИЯ:
- Стиль: ${formatTravelStyleForPrompt(mainTravelStyle)}
- Компания: ${companions || 'Не указано'} (${travelers || 2} чел.)
- Темп: ${preferences?.pace || 'moderate'}
- Диета: ${preferences?.dietaryRestrictions?.join(', ') || 'Без ограничений'}
- Интересы: ${preferences?.interestsDetailed?.join(', ') || 'Общие'}
${citizenshipLine}
${languagesLine}
${visitedLine}
${docsLine}
`.trim())

    // 5. РЕАЛЬНОСТЬ 2026
    userParts.push(`
РЕАЛЬНОСТЬ ЯНВАРЯ 2026 (КРИТИЧНО):
- Ограничения: ${GROUNDING_DATA_2026.globalRestrictions.join('; ')}
- Авиасообщение: Прямые рейсы доступны во многие страны (Турция, ОАЭ, Сербия, Китай, Таиланд, Грузия, Армения и др.). В Европу и США — через пересадочные хабы (Стамбул, Ереван, Баку, Доха).
- Тренды: ${Object.values(GROUNDING_DATA_2026.trendingLocations).flat().join(', ')}
${airportValidationContext ? `- АЭРОПОРТЫ: ${airportValidationContext}` : ''}
`.trim())

    // 6. СПЕЦИАЛЬНОЕ ПОЖЕЛАНИЕ
    if (safeHighlight) {
        userParts.push(`
✨ ОСОБОЕ ЛИЧНОЕ ПОЖЕЛАНИЕ ПОЛЬЗОВАТЕЛЯ:
"${safeHighlight}"
ПРАВИЛА: ВЫБЕРИ страну/атмосферу согласно этому пожеланию. Помечай такие активности "(✨ специально для тебя)" в desc. НЕ комментируй пожелание напрямую.
`.trim())
    }

    // 7. ТЕХНИЧЕСКИЕ ПРАВИЛА (IATA, ССЫЛКИ, VIRAL SPOTS)
    userParts.push(`
ТЕХНИЧЕСКИЕ ПРАВИЛА:
1. ЛОГИСТИКА: Прямые рейсы — приоритет! Расстояние < 600км — поезд.
2. ФОРМАТ ТРАНСПОРТА: В title указывай IATA коды, например: "Перелёт Москва (MOW) → Стамбул (IST)".
3. VIRAL SPOTS: Добавь 3-5 популярных в TikTok/Instagram локаций в отдельный массив viralSpots.
4. IMAGE QUERY: Для каждой активности (hotel, food, activity) добавь imageQuery на АНГЛИЙСКОМ для Pexels (например: "Art Deco hotel rooftop pool skyline Istanbul golden hour"). НЕ используй собственные имена.

5. ССЫЛКИ — КРИТИЧЕСКИ ВАЖНО, заполняй для КАЖДОЙ активности:

   mapLink (ВСЕГДА, кроме перелётов):
     "https://www.google.com/maps/search/?api=1&query={PlaceName}+{City}"

   transport (авиа) → link:
     "https://www.aviasales.ru/search/{ORG}{DDMM}{DEST}1"
     Пример: "https://www.aviasales.ru/search/MOW1506BKK1"
     (mapLink НЕ нужен для перелётов)

   transport (поезд) → link:
     "https://ticket.rzd.ru/"

   transport (трансфер/такси) → link:
     "https://kiwitaxi.ru/"

   hotel → bookingUrl (НЕ карта!):
     "https://www.booking.com/hotel/{cc}/{hotel-slug}.ru.html"
     Если нет прямой ссылки: "https://www.booking.com/search.html?ss={HotelName}%2C+{City}"
     Запасной: "https://ostrovok.ru/hotel/russia/{city}/{hotel-slug}/"

   food → link:
     TripAdvisor или официальный сайт ресторана
     Пример: "https://www.tripadvisor.ru/Restaurant_Review-g..."

   activity (музей/экскурсия) → link + ticketUrl:
     Официальный сайт ИЛИ GetYourGuide: "https://www.getyourguide.ru/s/?q={PlaceName}+{City}"
     Если продаёт онлайн-билеты — ticketUrl = та же ссылка

   ПРИКЛЮЧЕНЧЕСКИЕ АКТИВНОСТИ (дайвинг, серфинг, парашют, параглайдинг, яхта, рафтинг,
   вертолётная экскурсия, джип-тур, квадроциклы, зиплайн, скалолазание, каяк, теплоход) → link:
     GetYourGuide: "https://www.getyourguide.ru/s/?q={activity+keyword}+{city}"
     Klook: "https://www.klook.com/ru/search/?q={activity}+{city}"
     Viator: "https://www.viator.com/ru-RU/search?q={activity}+{city}"
     (Россия, прыжок с парашютом): "https://skydiving.ru/"
     (Россия, рафтинг): "https://www.rafting.ru/"
     (Москва/СПб, теплоход): "https://rechnoyflot.ru/"
     Правило: ВСЕГДА выбирай ту платформу, где реально можно забронировать данную активность в данном городе.
`.trim())

    // 8. ФОРМАТ ОТВЕТА
    userParts.push(isEn ? `
RESPONSE FORMAT:
Return strictly a JSON object with these fields (ALL TEXT IN ENGLISH, costs in USD $):
- title, description, totalBudget
- budgetAnalysis: { avgAccommodation, avgFood, avgTransport, avgActivities, avgMisc }
- visaAdvice, paymentAdvice, restrictions
- safetyInfo: { rating (number 1-10), tips }
- countries: [{ name, visaRequired, visaType }]
- tags: string[]
- viralSpots: [{ name, desc, mapLink }]
- itinerary: [{ day, title, dayTotal, tips, activities: [{ time, type, title, placeName, desc, cost, imageQuery, mapLink, link, bookingUrl, ticketUrl }] }]
  Link fields: mapLink (place map), link (booking/site), bookingUrl (hotel/food only), ticketUrl (paid activities only)
`.trim() : `
ФОРМАТ ОТВЕТА:
Верни строго JSON объект со следующими полями:
- title, description, totalBudget
- budgetAnalysis: { avgAccommodation, avgFood, avgTransport, avgActivities, avgMisc }
- visaAdvice, paymentAdvice, restrictions
- safetyInfo: { rating (число 1-10), tips }
- countries: [{ name, visaRequired, visaType }]
- tags: string[]
- viralSpots: [{ name, desc, mapLink }]
- itinerary: [{ day, title, dayTotal, tips, activities: [{ time, type, title, placeName, desc, cost, imageQuery, mapLink, link, bookingUrl, ticketUrl }] }]
  Поля ссылок: mapLink (карта места), link (бронирование/сайт), bookingUrl (только hotel/food), ticketUrl (только платные activities)
`.trim())

    const userPrompt = userParts.join("\n\n")

    return {
        systemPrompt,
        userPrompt,
        metadata: {
            contextIncluded: !!dynamicContext || !!dynamicContextStr,
            styleIncluded: !!mainTravelStyle,
            rulesIncluded: true,
            budgetAdjusted: !!adjustedBudget && adjustedBudget > budget
        }
    }
}

/**
 * Промпт для генерации метаданных (title, countries, tripPlan)
 */
export function buildMetadataPrompt(params: PromptBuilderParams): string {
    const {
        departureCity,
        destinations,
        startDate,
        endDate,
        budget,
        budgetDesc,
        travelStyle,
        countryCount,
        safeHighlight,
        warningsStr,
        preferences
    } = params

    const durationDays = startDate && endDate 
        ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
        : 7

    const travelStyleArray = Array.isArray(travelStyle) ? travelStyle : (travelStyle ? [travelStyle] : [])

    return `
Generate ONLY the metadata for a travel itinerary. NO itinerary days needed.

DESTINATION: ${destinations.join(', ')}
DEPARTURE: ${departureCity}
DURATION: ${durationDays} days
${warningsStr ? `WARNINGS: ${warningsStr}` : ''}
BUDGET: ${budgetDesc || `${budget.toLocaleString()} RUB`}
STYLE: ${travelStyleArray.join(', ')}
⚠️ MANDATORY COUNTRIES COUNT: ${countryCount === "more" ? "4+" : (countryCount || "1")}
PACE: ${preferences?.pace || 'moderate'}
VISITED: ${preferences?.visitedCountries?.join(', ') || 'None'}
${safeHighlight ? `SPECIAL USER WISH: "${safeHighlight}"` : ''}

CURRENT REALITY (JAN 2026):
- Restrictions: ${GROUNDING_DATA_2026.globalRestrictions.join(' ')}
- Flights: ${GROUNDING_DATA_2026.flightConnectivity.join(' ')}

Output VALID JSON only:
{
  "title": "Название маршрута",
  "description": "Краткое описание на 2-3 предложения",
  "totalBudget": "Рассчитывается автоматически",
  "budgetAnalysis": {
    "avgAccommodation": "5000 ₽/ночь",
    "avgFood": "3000 ₽/день",
    "avgTransport": "15000 ₽",
    "avgActivities": "5000 ₽/день",
    "avgMisc": "3000 ₽"
  },
  "visaAdvice": "Страна1: требования. Страна2: требования.",
  "paymentAdvice": "Какие карты работают, где менять деньги",
  "safetyInfo": { "rating": 8, "tips": "Советы по безопасности" },
  "restrictions": "Текущие ограничения или null",
  "countries": [{"name": "Страна", "visaRequired": true, "visaType": "Шенген/национальная/безвиз"}],
  "tags": ["вино", "горы", "море"],
  "viralSpots": [
    { "name": "Название места", "desc": "Почему это хайпово", "mapLink": "https://..." }
  ],
  "tripPlan": [
    { "startDay": 1, "endDay": 4, "city": "Город", "country": "Страна" }
  ]
}
`.trim()
}

/**
 * Промпт для генерации отдельного блока дней (chunk)
 */
export function buildDayChunkPrompt(params: {
    startDay: number;
    endDay: number;
    durationDays: number;
    departureCity: string;
    destination: string;
    budgetDesc: string;
    travelStyle: string[];
    preferences: any;
    safeHighlight?: string;
    warningsStr?: string;
    planForChunk?: string;
    previousContext?: any;
    isCountryChange?: boolean;
}): string {
    const {
        startDay,
        endDay,
        durationDays,
        departureCity,
        destination,
        budgetDesc,
        travelStyle,
        preferences,
        safeHighlight,
        warningsStr,
        planForChunk,
        previousContext,
        isCountryChange
    } = params

    const isFirstChunk = startDay === 1
    const isLastChunk = endDay === durationDays
    const startLocation = previousContext?.lastCity || departureCity

    return `
Сгенерируй ДНИ ${startDay}-${endDay} из ${durationDays}-дневного маршрута.

КОНТЕКСТ:
- Направление: ${destination}
- Город отправления: ${departureCity}
- Стиль: ${travelStyle.join(', ')}
- Темп: ${preferences?.pace || 'moderate'}
- Бюджет: ${budgetDesc}
${warningsStr ? `⚠️ АКТУАЛЬНЫЕ ПРЕДУПРЕЖДЕНИЯ: ${warningsStr}` : ''}
${safeHighlight ? `- ОСОБОЕ ПОЖЕЛАНИЕ: "${safeHighlight}"` : ''}

${planForChunk ? `⚠️ ПЛАН (СЛЕДУЙ ЕМУ): ${planForChunk}` : ""}

КРИТИЧНО:
${isFirstChunk ? `- Начинай в ${departureCity}.` : `- Начинай в ${startLocation}.`}
${isLastChunk ? `- В конце дня ${endDay} вернись в ${departureCity}.` : ""}
${isCountryChange ? `🚨 СМЕНА СТРАНЫ: Начинай день ${startDay} с transport (перелёт/поезд).` : ''}

Ответ — JSON массив дней.
`.trim()
}

/**
 * Быстрый промпт без API вызовов (для fallback)
 */
export function buildQuickPrompt(params: Omit<PromptBuilderParams, "dynamicContext">): EnrichedPrompt {
    return {
        systemPrompt: STRICT_RULES,
        userPrompt: `
Создай маршрут:
- ${params.departureCity} → ${params.destinations.join(", ")}
- ${params.startDate} — ${params.endDate}
- Бюджет: ${params.budget.toLocaleString("ru-RU")} ₽
${params.travelStyle ? `- Стиль: ${params.travelStyle}` : ""}
${params.interests?.length ? `- Интересы: ${params.interests.join(", ")}` : ""}
    `.trim(),
        metadata: {
            contextIncluded: false,
            styleIncluded: !!params.travelStyle,
            rulesIncluded: true,
            budgetAdjusted: false
        }
    }
}

/**
 * Полный flow: валидация + контекст + промпт
 */
export async function preparePromptWithContext(params: {
    departureCity: string
    destinations: string[]
    startDate: string
    endDate: string
    budget: number
    travelStyle?: string
    interests?: string[]
    companions?: string
    citizenship?: string
}): Promise<{
    prompt: EnrichedPrompt
    context: DynamicContext
    validation: null // Валидация вызывается отдельно
}> {
    // Собираем контекст
    const context = await collectDynamicContext({
        departureCity: params.departureCity,
        destinations: params.destinations,
        startDate: params.startDate,
        endDate: params.endDate,
        interests: params.interests,
        travelStyle: params.travelStyle
    })

    // Строим промпт
    const prompt = await buildEnrichedPrompt({
        ...params,
        dynamicContext: context
    })

    return {
        prompt,
        context,
        validation: null
    }
}

// ========================
// ХЕЛПЕРЫ
// ========================

function formatDate(dateStr: string): string {
    const date = new Date(dateStr)
    return date.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric"
    })
}

/**
 * Определить поздний ли прилёт
 */
export function isLateArrival(arrivalTime?: string): boolean {
    if (!arrivalTime) return false
    const [hours] = arrivalTime.split(":").map(Number)
    return hours >= 18
}

/**
 * Определить ранний ли вылет
 */
export function isEarlyDeparture(departureTime?: string): boolean {
    if (!departureTime) return false
    const [hours] = departureTime.split(":").map(Number)
    return hours < 12
}
