/**
 * Travel Styles - Определения стилей путешествий
 * Используется для обогащения промпта и расчёта бюджетов
 */

export interface TravelStyleDefinition {
    id: string
    name: string
    nameEn: string
    description: string

    // Бюджет на день (₽) по регионам
    minBudgetPerDay: {
        russia: number
        cis: number
        turkey: number
        asia_budget: number
        asia_premium: number
        europe_east: number
        europe_west: number
        usa: number
    }

    // Характеристики
    accommodation: string[]
    activities: string[]
    dining: string[]
    transport: string[]

    // Инструкции для AI
    promptHints: string
    avoidList: string[]
}

export const TRAVEL_STYLES: Record<string, TravelStyleDefinition> = {
    budget: {
        id: "budget",
        name: "Бюджетный",
        nameEn: "Budget",
        description: "Максимум впечатлений за минимум денег",

        minBudgetPerDay: {
            russia: 3000,
            cis: 2500,
            turkey: 4000,
            asia_budget: 2500,
            asia_premium: 8000,
            europe_east: 5000,
            europe_west: 8000,
            usa: 10000
        },

        accommodation: ["хостелы", "койко-места", "Airbnb комнаты", "капсульные отели"],
        activities: ["бесплатные достопримечательности", "пешеходные экскурсии", "парки", "смотровые площадки"],
        dining: ["стрит-фуд", "местные рынки", "супермаркеты", "дешёвые кафе"],
        transport: ["общественный транспорт", "пешком", "автостоп", "блаблакар"],

        promptHints: "Акцент на бесплатные активности, уличную еду, общественный транспорт. Указывай бюджетные альтернативы дорогим достопримечательностям. Избегай туристических ловушек.",
        avoidList: ["такси", "рестораны", "отели 4-5*", "платные экскурсии"]
    },

    comfort: {
        id: "comfort",
        name: "Комфортный",
        nameEn: "Comfort",
        description: "Баланс цены и качества",

        minBudgetPerDay: {
            russia: 8000,
            cis: 6000,
            turkey: 10000,
            asia_budget: 6000,
            asia_premium: 15000,
            europe_east: 12000,
            europe_west: 18000,
            usa: 20000
        },

        accommodation: ["отели 3-4*", "апартаменты", "бутик-отели", "гестхаусы"],
        activities: ["платные музеи", "экскурсии с гидом", "дегустации", "мастер-классы"],
        dining: ["кафе", "рестораны средней ценовой категории", "местная кухня"],
        transport: ["такси иногда", "общественный транспорт", "трансферы"],

        promptHints: "Сочетай бюджетные и премиальные опции. Один ресторан в день допустим. Такси для удобства, но не постоянно. Комфортное жильё с хорошими отзывами.",
        avoidList: ["люксовые отели", "мишлен-рестораны", "VIP-туры"]
    },

    adventure: {
        id: "adventure",
        name: "Приключения",
        nameEn: "Adventure",
        description: "Активный отдых и нестандартные маршруты",

        minBudgetPerDay: {
            russia: 6000,
            cis: 5000,
            turkey: 8000,
            asia_budget: 5000,
            asia_premium: 12000,
            europe_east: 10000,
            europe_west: 15000,
            usa: 18000
        },

        accommodation: ["кемпинги", "эко-отели", "хостелы", "глэмпинги", "горные хижины"],
        activities: ["хайкинг", "каякинг", "скалолазание", "дайвинг", "параглайдинг", "рафтинг"],
        dining: ["местная еда", "пикники", "еда на костре"],
        transport: ["аренда авто", "велосипед", "пешком", "местные автобусы"],

        promptHints: "Акцент на физическую активность и природу. Нестандартные локации, а не туристические места. Указывай уровень сложности активностей. Включай снаряжение если нужно.",
        avoidList: ["пляжный отдых", "шопинг", "люксовые спа"]
    },

    romantic: {
        id: "romantic",
        name: "Романтика",
        nameEn: "Romantic",
        description: "Путешествие для пары",

        minBudgetPerDay: {
            russia: 12000,
            cis: 10000,
            turkey: 15000,
            asia_budget: 10000,
            asia_premium: 25000,
            europe_east: 18000,
            europe_west: 30000,
            usa: 35000
        },

        accommodation: ["бутик-отели", "отели с видом", "спа-отели", "виллы"],
        activities: ["закаты", "романтические ужины", "spa", "круизы", "дегустации вин"],
        dining: ["рестораны с атмосферой", "ужин при свечах", "завтрак в постель"],
        transport: ["такси", "трансферы", "аренда яхты"],

        promptHints: "Акцент на атмосферные места для пары. Закаты, видовые рестораны, уединённые пляжи. Spa и wellness обязательны. Избегать шумных туристических мест.",
        avoidList: ["хостелы", "барные улицы", "групповые экскурсии", "фастфуд"]
    },

    cultural: {
        id: "cultural",
        name: "Культурный",
        nameEn: "Cultural",
        description: "Музеи, история, искусство",

        minBudgetPerDay: {
            russia: 6000,
            cis: 5000,
            turkey: 8000,
            asia_budget: 5000,
            asia_premium: 15000,
            europe_east: 10000,
            europe_west: 15000,
            usa: 18000
        },

        accommodation: ["отели в центре", "апартаменты у музеев", "исторические отели"],
        activities: ["музеи", "галереи", "театры", "архитектурные прогулки", "исторические туры"],
        dining: ["традиционная кухня", "исторические рестораны", "местные деликатесы"],
        transport: ["пешком по центру", "общественный транспорт"],

        promptHints: "Глубокое погружение в историю и культуру. Указывай исторический контекст мест. Местные гиды предпочтительны. Бронирование билетов заранее обязательно.",
        avoidList: ["пляжи", "шопинг-моллы", "туристические ловушки"]
    },

    luxury: {
        id: "luxury",
        name: "Люкс",
        nameEn: "Luxury",
        description: "Премиальный отдых без компромиссов",

        minBudgetPerDay: {
            russia: 30000,
            cis: 25000,
            turkey: 40000,
            asia_budget: 30000,
            asia_premium: 60000,
            europe_east: 40000,
            europe_west: 80000,
            usa: 100000
        },

        accommodation: ["отели 5*", "виллы", "дворцы-отели", "бутик-люкс"],
        activities: ["VIP-экскурсии", "приватные туры", "яхтинг", "вертолётные прогулки"],
        dining: ["мишлен-рестораны", "приватный шеф-повар", "дегустационные меню"],
        transport: ["приватный трансфер", "лимузин", "бизнес-класс"],

        promptHints: "Только премиальные опции. Приоритет бронирования, skip-the-line везде. Приватный сервис. Указывай конкретные люксовые отели и рестораны по названию.",
        avoidList: ["общественный транспорт", "хостелы", "фастфуд", "групповые туры"]
    },

    family: {
        id: "family",
        name: "Семейный",
        nameEn: "Family",
        description: "Путешествие с детьми",

        minBudgetPerDay: {
            russia: 10000,
            cis: 8000,
            turkey: 12000,
            asia_budget: 8000,
            asia_premium: 20000,
            europe_east: 15000,
            europe_west: 25000,
            usa: 30000
        },

        accommodation: ["семейные номера", "апартаменты с кухней", "резорты с kids club"],
        activities: ["зоопарки", "аквапарки", "детские музеи", "парки развлечений"],
        dining: ["рестораны с детским меню", "кафе", "завтраки в отеле"],
        transport: ["такси", "аренда авто с детским креслом", "комфортные трансферы"],

        promptHints: "Расписание должно включать перерывы для детей. Избегать ранних подъёмов и поздних мероприятий. Детские активности обязательны. Указывать возрастные ограничения.",
        avoidList: ["ночная жизнь", "экстремальные активности", "взрослые заведения"]
    },

    wellness: {
        id: "wellness",
        name: "Велнес",
        nameEn: "Wellness",
        description: "Отдых для души и тела",

        minBudgetPerDay: {
            russia: 15000,
            cis: 12000,
            turkey: 18000,
            asia_budget: 12000,
            asia_premium: 30000,
            europe_east: 20000,
            europe_west: 35000,
            usa: 40000
        },

        accommodation: ["спа-отели", "ретриты", "эко-отели", "wellness-курорты"],
        activities: ["spa", "йога", "медитация", "термальные источники", "массаж"],
        dining: ["здоровое питание", "вегетарианское", "детокс-меню"],
        transport: ["комфортные трансферы", "минимум переездов"],

        promptHints: "Расписание не должно быть насыщенным. Время для отдыха и процедур. Указывать типы spa и wellness-практик. Минимум переездов.",
        avoidList: ["насыщенные экскурсии", "ночная жизнь", "фастфуд", "стресс"]
    }
}

/**
 * Получить определение стиля по ID
 */
export function getTravelStyle(styleId: string): TravelStyleDefinition | null {
    return TRAVEL_STYLES[styleId] || null
}

/**
 * Получить минимальный дневной бюджет для стиля и региона
 */
export function getMinDailyBudget(styleId: string, region: string): number {
    const style = TRAVEL_STYLES[styleId]
    if (!style) return 10000

    return (style.minBudgetPerDay as any)[region] || style.minBudgetPerDay.europe_east
}

/**
 * Форматировать стиль для промпта
 */
export function formatTravelStyleForPrompt(styleId: string): string {
    const style = TRAVEL_STYLES[styleId]
    if (!style) return ""

    return `
СТИЛЬ ПУТЕШЕСТВИЯ: ${style.name}
${style.promptHints}

Предпочтения:
- Проживание: ${style.accommodation.join(", ")}
- Активности: ${style.activities.join(", ")}
- Питание: ${style.dining.join(", ")}
- Транспорт: ${style.transport.join(", ")}

ИЗБЕГАТЬ: ${style.avoidList.join(", ")}
`.trim()
}

/**
 * Получить все стили для выбора
 */
export function getAllTravelStyles(): Array<{ id: string; name: string; description: string }> {
    return Object.values(TRAVEL_STYLES).map(style => ({
        id: style.id,
        name: style.name,
        description: style.description
    }))
}
