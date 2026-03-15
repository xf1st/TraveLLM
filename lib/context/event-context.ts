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
    "барселона": [
        { name: "La Mercè", date: "2026-09-24", location: "Барселона", type: "festival", description: "Главный городской праздник" },
        { name: "Primavera Sound", date: "2026-06", location: "Барселона", type: "concert", description: "Крупнейший музыкальный фестиваль" },
        { name: "Carnaval de Barcelona", date: "2026-02", location: "Барселона", type: "festival" },
    ],
    "испания": [
        { name: "Las Fallas", date: "2026-03-19", location: "Валенсия", type: "festival", description: "Огненный фестиваль" },
        { name: "La Tomatina", date: "2026-08", location: "Буньоль", type: "festival" },
        { name: "Running of the Bulls (Сан-Фермин)", date: "2026-07-07", location: "Памплона", type: "festival" },
    ],
    "лиссабон": [
        { name: "Festas de Lisboa", date: "2026-06-13", location: "Лиссабон", type: "festival", description: "Фестиваль Святого Антония" },
        { name: "NOS Alive Festival", date: "2026-07", location: "Лиссабон", type: "concert" },
    ],
    "амстердам": [
        { name: "King's Day (Koningsdag)", date: "2026-04-27", location: "Амстердам", type: "holiday", description: "День рождения короля, оранжевые вечеринки" },
        { name: "Amsterdam Light Festival", date: "2026-11", location: "Амстердам", type: "festival", description: "Световые инсталляции на каналах" },
    ],
    // СНГ
    "грузия": [
        { name: "Ртвели (сбор винограда)", date: "2026-09", location: "Грузия", type: "festival" },
        { name: "Тбилисоба", date: "2026-10", location: "Тбилиси", type: "festival" },
    ],
    "тбилиси": [
        { name: "Tbilisi Jazz Festival", date: "2026-03", location: "Тбилиси", type: "concert" },
        { name: "Art Tbilisi", date: "2026-09", location: "Тбилиси", type: "exhibition" },
    ],
    "армения": [
        { name: "Вардавар", date: "2026-07", location: "Армения", type: "holiday", description: "Водный праздник" },
    ],
    "сербия": [
        { name: "Exit Festival", date: "2026-07", location: "Нови-Сад", type: "concert", description: "Один из крупнейших рок-фестивалей Европы" },
        { name: "Belgrade Beer Fest", date: "2026-08", location: "Белград", type: "festival" },
    ],
    "белград": [
        { name: "Белградский марафон", date: "2026-04", location: "Белград", type: "sport" },
        { name: "Beer Fest", date: "2026-08", location: "Белград", type: "festival", description: "Крупнейший пивной фестиваль Сербии" },
    ],
    // ОАЭ
    "дубай": [
        { name: "Dubai Shopping Festival", date: "2026-01", location: "Дубай", type: "festival" },
        { name: "Dubai Food Festival", date: "2026-02", location: "Дубай", type: "festival" },
        { name: "Dubai Fitness Challenge", date: "2026-10", location: "Дубай", type: "other" },
    ],
    "оаэ": [
        { name: "Рамадан", date: "2026-02-17", location: "ОАЭ", type: "holiday", description: "Ограничения на еду днём в общественных местах" },
        { name: "Eid al-Fitr", date: "2026-03-20", location: "ОАЭ", type: "holiday" },
    ],
    // Индонезия / Бали
    "бали": [
        { name: "Nyepi (День тишины)", date: "2026-03-19", location: "Бали", type: "holiday", description: "Весь остров замирает на 24 часа — нельзя выходить на улицу!" },
        { name: "Galungan", date: "2026-07-01", location: "Бали", type: "holiday", description: "Балийский новый год, украшенные пуры" },
        { name: "Ogoh-ogoh", date: "2026-03-18", location: "Бали", type: "festival", description: "Парад демонических фигур накануне Ньепи" },
    ],
    "индонезия": [
        { name: "Nyepi (День тишины)", date: "2026-03-19", location: "Бали", type: "holiday", description: "Весь Бали замирает на 24 часа" },
    ],
    // Вьетнам
    "вьетнам": [
        { name: "Тет (Вьетнамский Новый год)", date: "2026-02-17", location: "Вьетнам", type: "holiday", description: "Главный праздник страны, многие заведения закрыты" },
        { name: "Lantern Festival", date: "2026-03-03", location: "Хойан", type: "festival", description: "Фестиваль фонарей" },
    ],
    "ханой": [
        { name: "Тет", date: "2026-02-17", location: "Ханой", type: "holiday", description: "Многие магазины закрыты" },
    ],
    // Россия
    "москва": [
        { name: "Московский марафон", date: "2026-09", location: "Москва", type: "sport" },
        { name: "Cirque du Soleil / гастрольные шоу", date: "2026-03", location: "Москва", type: "concert" },
        { name: "Масленица в Коломенском", date: "2026-03-01", location: "Москва", type: "festival", description: "Масленичные гуляния" },
        { name: "Ночь в музее", date: "2026-05-18", location: "Москва", type: "festival" },
    ],
    "санкт-петербург": [
        { name: "Белые ночи", date: "2026-06", location: "Санкт-Петербург", type: "festival", description: "Сезон белых ночей — солнце почти не заходит" },
        { name: "Фестиваль «Звёзды белых ночей»", date: "2026-06", location: "Санкт-Петербург", type: "concert" },
        { name: "Алые паруса", date: "2026-06-20", location: "Санкт-Петербург", type: "festival", description: "Выпускной праздник с феерией на Неве" },
    ],
    "питер": [
        { name: "Белые ночи", date: "2026-06", location: "Санкт-Петербург", type: "festival", description: "Сезон белых ночей" },
        { name: "Алые паруса", date: "2026-06-20", location: "Санкт-Петербург", type: "festival" },
    ],
    "казань": [
        { name: "Sabantuy", date: "2026-06", location: "Казань", type: "festival", description: "Татарский народный праздник" },
        { name: "Казанский марафон", date: "2026-05", location: "Казань", type: "sport" },
    ],
    "сочи": [
        { name: "Фестиваль «Кинотавр»", date: "2026-06", location: "Сочи", type: "festival", description: "Главный кинофестиваль России" },
        { name: "«Формула Роуз» (мотогонки)", date: "2026-04", location: "Сочи", type: "sport" },
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
    "бали": {
        "04": "Идеальный сезон: сухо, солнечно, ветер для серфинга",
        "05": "Лучший сезон: меньше туристов, идеальная погода",
        "06": "Высокий сезон: много туристов",
        "07": "Высокий сезон: пик европейских отпускников",
        "08": "Высокий сезон",
        "09": "Конец высокого сезона",
        "10": "Начало сезона дождей",
        "11": "Сезон дождей: дешевле, но короткие ливни",
        "12": "Сезон дождей",
        "01": "Сезон дождей",
        "02": "Конец сезона дождей",
        "03": "Переходный сезон: Ньепи (нельзя выходить!)",
    },
    "санкт-петербург": {
        "06": "Белые ночи: знаковое время для посещения",
        "07": "Белые ночи заканчиваются, тепло",
        "12": "Новогодние украшения, холодно (-5 до -10°C)",
        "01": "Зима, мало туристов, музеи без очередей",
    },
    "вьетнам": {
        "02": "ТЕТ: всё закрыто первые 3-5 дней, потом праздничная атмосфера",
        "11": "Идеально для севера (Ханой, Сапа)",
        "12": "Высокий сезон юга (Хошимин, Фукуок)",
        "01": "Высокий сезон юга, прохладно на севере",
    },
    "барселона": {
        "06": "Жарко, пляжный сезон открыт",
        "07": "Пик туристов: очереди, жара до 35°C",
        "08": "Местные в отпуске, часть ресторанов закрыта",
        "09": "Отличный месяц: море теплое, меньше туристов, La Mercè",
        "10": "Комфортная температура, мало туристов",
    },
    "сочи": {
        "12": "Лыжный сезон в Красной Поляне",
        "01": "Пик горнолыжного сезона",
        "02": "Горные лыжи, снег",
        "06": "Пляжный сезон открывается",
        "07": "Высокий пляжный сезон",
        "08": "Пик сезона: очень много людей",
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
