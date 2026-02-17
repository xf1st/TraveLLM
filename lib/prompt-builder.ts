/**
 * Prompt Builder - Построение обогащённого промпта для AI
 * Объединяет все данные в один структурированный промпт
 */

import { collectDynamicContext, formatDynamicContextForPrompt, type DynamicContext } from "./context/dynamic-context"
import { formatTravelStyleForPrompt, getTravelStyle, type TravelStyleDefinition } from "./travel-styles"
import { getApplicableRules, STRICT_RULES, ACTIVITY_STRUCTURE_RULES } from "./strict-rules"
import { type ValidationResult } from "./real-time-validation"

export interface PromptBuilderParams {
    // Базовые параметры
    departureCity: string
    destinations: string[]
    startDate: string
    endDate: string
    budget: number
    adjustedBudget?: number

    // Стиль и предпочтения
    travelStyle?: string
    interests?: string[]
    companions?: string

    // Контекст
    dynamicContext?: DynamicContext
    validationResult?: ValidationResult

    // Дополнительные флаги
    isFirstDayLateArrival?: boolean
    isLastDayEarlyDeparture?: boolean
    flightArrivalTime?: string
    flightDepartureTime?: string
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
        travelStyle,
        interests,
        companions,
        dynamicContext,
        validationResult,
        isFirstDayLateArrival,
        isLastDayEarlyDeparture,
        flightArrivalTime,
        flightDepartureTime
    } = params

    // Рассчитываем длительность
    const durationDays = Math.ceil(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    ) + 1

    const effectiveBudget = adjustedBudget || budget
    const budgetPerDay = Math.round(effectiveBudget / durationDays)

    // ========================
    // СИСТЕМНЫЙ ПРОМПТ
    // ========================
    const systemParts: string[] = [
        "Ты — эксперт по путешествиям. Создаёшь детальные, реалистичные маршруты.",
        "",
        STRICT_RULES,
        "",
        ACTIVITY_STRUCTURE_RULES
    ]

    // Добавляем ситуативные правила
    const situationRules = getApplicableRules({
        isFirstDayLateArrival,
        isLastDayEarlyDeparture,
        travelStyle,
        isRainySeason: false, // TODO: определять по дате и региону
        isRamadan: false // TODO: определять по дате
    })

    if (situationRules !== STRICT_RULES) {
        systemParts.push(situationRules)
    }

    // Добавляем стиль путешествия
    if (travelStyle) {
        const stylePrompt = formatTravelStyleForPrompt(travelStyle)
        if (stylePrompt) {
            systemParts.push(stylePrompt)
        }
    }

    const systemPrompt = systemParts.join("\n\n")

    // ========================
    // ПОЛЬЗОВАТЕЛЬСКИЙ ПРОМПТ
    // ========================
    const userParts: string[] = []

    // Базовые параметры
    userParts.push(`
СОЗДАЙ МАРШРУТ:
- Откуда: ${departureCity}
- Куда: ${destinations.join(", ")}
- Даты: ${formatDate(startDate)} — ${formatDate(endDate)} (${durationDays} дней)
- Бюджет: ${effectiveBudget.toLocaleString("ru-RU")} ₽ (~${budgetPerDay.toLocaleString("ru-RU")} ₽/день)
${companions ? `- Компания: ${companions}` : ""}
`.trim())

    // Предупреждение о скорректированном бюджете
    if (adjustedBudget && adjustedBudget > budget) {
        userParts.push(`
⚠️ ВАЖНО: Исходный бюджет ${budget.toLocaleString("ru-RU")} ₽ был скорректирован до ${adjustedBudget.toLocaleString("ru-RU")} ₽
Причина: минимальная стоимость для данного маршрута
`.trim())
    }

    // Время прилёта/вылета
    if (flightArrivalTime) {
        userParts.push(`\n⏰ Прилёт в ${destinations[0]}: ${flightArrivalTime}`)
        if (isFirstDayLateArrival) {
            userParts.push("(поздний прилёт — первый день только отдых)")
        }
    }
    if (flightDepartureTime) {
        userParts.push(`⏰ Вылет домой: ${flightDepartureTime}`)
        if (isLastDayEarlyDeparture) {
            userParts.push("(ранний вылет — последний день только трансфер)")
        }
    }

    // Интересы
    if (interests && interests.length > 0) {
        userParts.push(`\nИНТЕРЕСЫ: ${interests.join(", ")}`)
    }

    // Динамический контекст
    if (dynamicContext) {
        const contextStr = formatDynamicContextForPrompt(dynamicContext)
        if (contextStr) {
            userParts.push(`\n${contextStr}`)
        }
    }

    // Валидационные предупреждения
    if (validationResult?.warnings && validationResult.warnings.length > 0) {
        userParts.push("\n⚠️ УЧИТЫВАЙ:")
        for (const warning of validationResult.warnings) {
            userParts.push(`- ${warning.message}`)
        }
    }

    // Формат вывода
    userParts.push(`
ФОРМАТ ОТВЕТА:
Верни JSON объект со структурой маршрута. Каждый день содержит массив активностей (3-5 штук).
Каждая активность обязана иметь поля: time, type, title, placeName, desc, cost.
Следуй шаблонам дней из системного промпта (ДЕНЬ ПРИБЫТИЯ, ОБЫЧНЫЙ ДЕНЬ, ДЕНЬ ПЕРЕЕЗДА, ПОСЛЕДНИЙ ДЕНЬ).
Для "activity" — подбирай уникальные, нетуристические места!
`.trim())

    const userPrompt = userParts.join("\n")

    return {
        systemPrompt,
        userPrompt,
        metadata: {
            contextIncluded: !!dynamicContext,
            styleIncluded: !!travelStyle,
            rulesIncluded: true,
            budgetAdjusted: !!adjustedBudget && adjustedBudget > budget
        }
    }
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
