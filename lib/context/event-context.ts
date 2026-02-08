/**
 * Event Context - Получение событий и мероприятий для промпта
 * Используем web search для поиска актуальных событий
 */

export interface EventInfo {
    name: string
    date?: string
    location: string
    type: "festival" | "concert" | "exhibition" | "sport" | "holiday" | "other"
    description?: string
    source?: string
}

export interface EventContextData {
    destinations: string[]
    dateRange: { start: string; end: string } | null
    events: EventInfo[]
    holidays: string[]
    recommendations: string[]
    rawDataAvailable: boolean
}

// Известные праздники и события (fallback когда web search недоступен)
const KNOWN_EVENTS: Record<string, EventInfo[]> = {
    // Турция
    "турция": [
        { name: "Рамадан", date: "2026-02-17", location: "Турция", type: "holiday", description: "Священный месяц поста" },
        { name: "Фестиваль тюльпанов", date: "2026-04", location: "Стамбул", type: "festival" },
    ],
    "стамбул": [
        { name: "Istanbul Jazz Festival", date: "2026-07", location: "Стамбул", type: "concert" },
        { name: "Istanbul Film Festival", date: "2026-04", location: "Стамбул", type: "festival" },
    ],
    // Таиланд
    "таиланд": [
        { name: "Сонгкран (Тайский Новый год)", date: "2026-04-13", location: "Таиланд", type: "holiday", description: "Водный фестиваль" },
        { name: "Loy Krathong", date: "2026-11-05", location: "Таиланд", type: "festival", description: "Фестиваль фонариков" },
    ],
    "бангкок": [
        { name: "Chinese New Year", date: "2026-02-17", location: "Бангкок, Чайнатаун", type: "holiday" },
    ],
    // Япония
    "япония": [
        { name: "Сакура (цветение вишни)", date: "2026-03-25", location: "Япония", type: "festival", description: "Сезон ханами" },
        { name: "Golden Week", date: "2026-04-29", location: "Япония", type: "holiday", description: "Неделя праздников, очень много туристов" },
    ],
    "токио": [
        { name: "Сумо Басё", date: "2026-01", location: "Токио", type: "sport" },
        { name: "Токийский марафон", date: "2026-03-01", location: "Токио", type: "sport" },
    ],
    // Европа
    "прага": [
        { name: "Prague Spring Festival", date: "2026-05-12", location: "Прага", type: "concert" },
        { name: "Signal Festival", date: "2026-10", location: "Прага", type: "festival", description: "Световые инсталляции" },
    ],
    "париж": [
        { name: "Fête de la Musique", date: "2026-06-21", location: "Париж", type: "concert" },
        { name: "Paris Fashion Week", date: "2026-09", location: "Париж", type: "festival" },
    ],
    "рим": [
        { name: "Pasqua (Пасха)", date: "2026-04-05", location: "Рим", type: "holiday" },
        { name: "Estate Romana", date: "2026-06", location: "Рим", type: "festival", description: "Летние мероприятия" },
    ],
    // СНГ
    "грузия": [
        { name: "Ртвели (сбор винограда)", date: "2026-09", location: "Грузия", type: "festival" },
        { name: "Тбилисоба", date: "2026-10", location: "Тбилиси", type: "festival" },
    ],
    "тбилиси": [
        { name: "Tbilisi Jazz Festival", date: "2026-03", location: "Тбилиси", type: "concert" },
    ],
    "армения": [
        { name: "Вардавар", date: "2026-07", location: "Армения", type: "holiday", description: "Водный праздник" },
    ],
    // ОАЭ
    "дубай": [
        { name: "Dubai Shopping Festival", date: "2026-01", location: "Дубай", type: "festival" },
        { name: "Dubai Food Festival", date: "2026-02", location: "Дубай", type: "festival" },
    ],
    "оаэ": [
        { name: "Рамадан", date: "2026-02-17", location: "ОАЭ", type: "holiday", description: "Ограничения на еду днём в общественных местах" },
        { name: "Eid al-Fitr", date: "2026-03-20", location: "ОАЭ", type: "holiday" },
    ],
}

// Сезонные рекомендации
const SEASONAL_RECOMMENDATIONS: Record<string, Record<string, string>> = {
    "таиланд": {
        "11": "Идеальный сезон: сухо и комфортно",
        "12": "Высокий сезон: много туристов, бронируй заранее",
        "01": "Высокий сезон: идеальная погода",
        "02": "Высокий сезон: идеальная погода",
        "03": "Конец сезона: становится жарко",
        "04": "Сонгкран: водный фестиваль, весело но мокро",
        "05": "Начало сезона дождей",
        "06": "Сезон дождей: меньше туристов, дешевле",
        "07": "Сезон дождей",
        "08": "Сезон дождей",
        "09": "Сезон дождей: пик осадков",
        "10": "Конец сезона дождей",
    },
    "япония": {
        "03": "Сезон сакуры: красиво, но дорого",
        "04": "Golden Week: ОЧЕНЬ много людей, дорого",
        "05": "Комфортная погода",
        "06": "Сезон дождей (туюу)",
        "07": "Жарко и влажно",
        "08": "Жарко, фестивали фейерверков",
        "09": "Тайфуны возможны",
        "10": "Осенние листья: красиво",
        "11": "Осенние листья: пик сезона момидзи",
        "12": "Холодно, но атмосферно",
        "01": "Лыжный сезон, холодно",
        "02": "Снежные фестивали в Саппоро",
    },
}

/**
 * Получить события для направлений
 */
export async function fetchEventContext(
    destinations: string[],
    startDate?: string,
    endDate?: string
): Promise<EventContextData> {
    const events: EventInfo[] = []
    const holidays: string[] = []
    const recommendations: string[] = []

    // Нормализуем даты
    const start = startDate ? new Date(startDate) : new Date()
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
    const startMonth = String(start.getMonth() + 1).padStart(2, "0")

    for (const dest of destinations) {
        const destLower = dest.toLowerCase().trim()

        // Ищем события для направления
        const destEvents = KNOWN_EVENTS[destLower] || []
        for (const event of destEvents) {
            // Проверяем попадает ли событие в даты поездки
            if (event.date) {
                const eventDate = new Date(event.date)
                if (eventDate >= start && eventDate <= end) {
                    events.push(event)
                    if (event.type === "holiday") {
                        holidays.push(`${event.name} (${event.date}): ${event.description || ""}`)
                    }
                }
            }
        }

        // Добавляем сезонные рекомендации
        const seasonalRecs = SEASONAL_RECOMMENDATIONS[destLower]
        if (seasonalRecs && seasonalRecs[startMonth]) {
            recommendations.push(`${dest}: ${seasonalRecs[startMonth]}`)
        }
    }

    return {
        destinations,
        dateRange: startDate && endDate ? { start: startDate, end: endDate } : null,
        events,
        holidays,
        recommendations,
        rawDataAvailable: events.length > 0 || recommendations.length > 0
    }
}

/**
 * Форматировать контекст событий для промпта
 */
export function formatEventContextForPrompt(context: EventContextData): string {
    const lines: string[] = []

    if (context.events.length > 0) {
        lines.push("СОБЫТИЯ В ПЕРИОД ПОЕЗДКИ:")
        for (const event of context.events) {
            lines.push(`- ${event.name} (${event.date || "даты уточняются"}, ${event.location})${event.description ? `: ${event.description}` : ""}`)
        }
    }

    if (context.holidays.length > 0) {
        lines.push("\nПРАЗДНИКИ И ОСОБЕННОСТИ:")
        for (const holiday of context.holidays) {
            lines.push(`- ${holiday}`)
        }
    }

    if (context.recommendations.length > 0) {
        lines.push("\nСЕЗОННЫЕ РЕКОМЕНДАЦИИ:")
        for (const rec of context.recommendations) {
            lines.push(`- ${rec}`)
        }
    }

    return lines.length > 0 ? lines.join("\n") : ""
}
