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
        filterByDocuments
    } = params

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
    const systemPrompt = `Ты — эксперт-планировщик путешествий TraveLLM для русских туристов. Отвечаешь ТОЛЬКО JSON. Будь конкретен.

${ITINERARY_STRUCTURE}`

    // ========================
    // ПОЛЬЗОВАТЕЛЬСКИЙ ПРОМПТ
    // ========================
    const userParts: string[] = []

    // 1. ИСХОДНЫЕ ДАННЫЕ
    userParts.push(`
Создай детальный профессиональный маршрут путешествия на РУССКОМ языке.

ИСХОДНЫЕ ДАННЫЕ:
- Город отправления: ${departureCity}
- Направление: ${destinations.join(", ")}
${destinationType === 'russia' && destinations.length === 0 ? `⚠️ КРИТИЧНО: Маршрут ТОЛЬКО по России (РФ). Все города и места ОБЯЗАНЫ находиться на территории Российской Федерации. НЕЛЬЗЯ предлагать: Грузию, Батуми, Тбилиси, Беларусь, Казахстан, Армению, Азербайджан, Украину, любые страны СНГ и зарубежья.` : ''}
- Количество стран/городов: ${destinations.length > 0 ? destinations.length : (countryCount === "more" ? 4 : parseInt(countryCount as string) || 1)}
- Даты: ${startDate || 'Гибкие'} — ${endDate || 'Гибкие'} (${durationDays} дней)
${warningsStr ? `⚠️ АКТУАЛЬНЫЕ ПРЕДУПРЕЖДЕНИЯ ДЛЯ ЭТИХ ДАТ: ${warningsStr}` : ''}
${dynamicContextStr ? `\nАКТУАЛЬНЫЙ КОНТЕКСТ (GROUNDING):\n${dynamicContextStr}` : ''}
- Бюджет: ${budgetDesc || `${effectiveBudget.toLocaleString("ru-RU")} ₽`}
⚠️ ЖЁСТКИЙ ЛИМИТ БЮДЖЕТА: ${effectiveBudget.toLocaleString('ru-RU')} ₽ МАКСИМУМ НА ВСЮ ПОЕЗДКУ. 
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
    userParts.push(`
ПЕРСОНАЛИЗАЦИЯ:
- Стиль: ${formatTravelStyleForPrompt(mainTravelStyle)}
- Компания: ${companions || 'Не указано'} (${travelers || 2} чел.)
- Темп: ${preferences?.pace || 'moderate'}
- Диета: ${preferences?.dietaryRestrictions?.join(', ') || 'Без ограничений'}
- Интересы: ${preferences?.interestsDetailed?.join(', ') || 'Общие'}
`.trim())

    // 5. РЕАЛЬНОСТЬ 2026
    userParts.push(`
РЕАЛЬНОСТЬ ЯНВАРЯ 2026 (КРИТИЧНО):
- Ограничения: ${GROUNDING_DATA_2026.globalRestrictions.join('; ')}
- Авиасообщение: Прямые рейсы доступны во многие страны (Турция, ОАЭ, Сербия, Китай, Таиланд, Грузия, Армения и др.). В Европу и США — через пересадочные хабы (Стамбул, Ереван, Баку, Доха).
- Тренды: ${Object.values(GROUNDING_DATA_2026.trendingLocations).flat().join(', ')}
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
2. ФОРМАТ ТРАНСПОРТА: В title указывай IATA коды, например: "Перелёт Москва (SVO) → Стамбул (IST)".
3. ССЫЛКИ: 
   - Авиа: https://www.aviasales.ru/search/{ORIG}{DDMM}{DEST}1 (MOW1502DXB1)
   - Отели: Ostrovok.ru или Booking.com
4. VIRAL SPOTS: Добавь 3-5 популярных в TikTok/Instagram локаций в отдельный массив viralSpots.
5. IMAGE QUERY: Для каждой активности (hotel, food, activity) добавь imageQuery на АНГЛИЙСКОМ для Pexels (например: "Art Deco hotel rooftop pool skyline Istanbul golden hour"). НЕ используй собственные имена.
`.trim())

    // 8. ПЛАН МАРШРУТА (TripPlan) - если это мета-промпт
    userParts.push(`
ФОРМАТ ОТВЕТА:
Верни JSON объект со структурой маршрута (схема была предоставлена ранее).
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
