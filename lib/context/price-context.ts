/**
 * Price Context - Актуальные цены на проживание и активности
 * Базовые оценки по регионам для расчёта бюджета
 */

export interface PriceEstimate {
    category: "accommodation" | "food" | "transport" | "activities"
    itemName: string
    priceRange: { min: number; max: number }
    currency: string
    note?: string
}

export interface PriceContextData {
    destination: string
    region: string
    dailyEstimate: {
        budget: number
        midRange: number
        luxury: number
    }
    currency: string
    prices: PriceEstimate[]
    tips: string[]
}

// Актуальные цены по регионам (в рублях, на человека в день)
const REGIONAL_PRICES: Record<string, {
    daily: { budget: number; midRange: number; luxury: number }
    accommodation: { hostel: number; hotel3: number; hotel5: number }
    food: { street: number; cafe: number; restaurant: number }
    transport: { public: number; taxi: number }
}> = {
    // Россия
    "russia": {
        daily: { budget: 5000, midRange: 10000, luxury: 25000 },
        accommodation: { hostel: 1500, hotel3: 4000, hotel5: 15000 },
        food: { street: 500, cafe: 1000, restaurant: 3000 },
        transport: { public: 300, taxi: 1500 },
    },
    "russia_moscow": {
        daily: { budget: 7000, midRange: 15000, luxury: 40000 },
        accommodation: { hostel: 2000, hotel3: 6000, hotel5: 25000 },
        food: { street: 600, cafe: 1500, restaurant: 5000 },
        transport: { public: 400, taxi: 2000 },
    },
    // Турция
    "turkey": {
        daily: { budget: 5000, midRange: 12000, luxury: 30000 },
        accommodation: { hostel: 1500, hotel3: 5000, hotel5: 20000 },
        food: { street: 400, cafe: 1000, restaurant: 3000 },
        transport: { public: 200, taxi: 1000 },
    },
    "turkey_istanbul": {
        daily: { budget: 6000, midRange: 15000, luxury: 40000 },
        accommodation: { hostel: 2000, hotel3: 6000, hotel5: 25000 },
        food: { street: 500, cafe: 1200, restaurant: 4000 },
        transport: { public: 150, taxi: 1200 },
    },
    // ОАЭ
    "uae": {
        daily: { budget: 10000, midRange: 25000, luxury: 80000 },
        accommodation: { hostel: 4000, hotel3: 10000, hotel5: 50000 },
        food: { street: 800, cafe: 2000, restaurant: 8000 },
        transport: { public: 500, taxi: 2500 },
    },
    // Таиланд
    "thailand": {
        daily: { budget: 3000, midRange: 8000, luxury: 25000 },
        accommodation: { hostel: 800, hotel3: 3000, hotel5: 15000 },
        food: { street: 200, cafe: 600, restaurant: 2000 },
        transport: { public: 100, taxi: 800 },
    },
    // Япония
    "japan": {
        daily: { budget: 12000, midRange: 25000, luxury: 60000 },
        accommodation: { hostel: 3000, hotel3: 10000, hotel5: 40000 },
        food: { street: 800, cafe: 2000, restaurant: 8000 },
        transport: { public: 1500, taxi: 5000 },
    },
    // Европа восточная
    "europe_east": {
        daily: { budget: 6000, midRange: 15000, luxury: 40000 },
        accommodation: { hostel: 2000, hotel3: 6000, hotel5: 25000 },
        food: { street: 500, cafe: 1200, restaurant: 4000 },
        transport: { public: 300, taxi: 1500 },
    },
    // Европа западная
    "europe_west": {
        daily: { budget: 10000, midRange: 25000, luxury: 70000 },
        accommodation: { hostel: 3500, hotel3: 12000, hotel5: 45000 },
        food: { street: 1000, cafe: 2500, restaurant: 8000 },
        transport: { public: 500, taxi: 3000 },
    },
    // СНГ
    "cis": {
        daily: { budget: 4000, midRange: 8000, luxury: 20000 },
        accommodation: { hostel: 1000, hotel3: 3000, hotel5: 12000 },
        food: { street: 400, cafe: 800, restaurant: 2500 },
        transport: { public: 150, taxi: 800 },
    },
}

// Маппинг городов к регионам
const CITY_TO_REGION: Record<string, string> = {
    "москва": "russia_moscow",
    "санкт-петербург": "russia_moscow",
    "сочи": "russia",
    "казань": "russia",
    "стамбул": "turkey_istanbul",
    "анталья": "turkey",
    "каппадокия": "turkey",
    "дубай": "uae",
    "абу-даби": "uae",
    "бангкок": "thailand",
    "пхукет": "thailand",
    "паттайя": "thailand",
    "чиангмай": "thailand",
    "токио": "japan",
    "киото": "japan",
    "осака": "japan",
    "прага": "europe_east",
    "будапешт": "europe_east",
    "варшава": "europe_east",
    "белград": "europe_east",
    "париж": "europe_west",
    "рим": "europe_west",
    "барселона": "europe_west",
    "амстердам": "europe_west",
    "берлин": "europe_west",
    "вена": "europe_west",
    "тбилиси": "cis",
    "ереван": "cis",
    "баку": "cis",
    "ташкент": "cis",
    "алматы": "cis",
}

function getRegionForCity(city: string): string {
    const normalized = city.toLowerCase().trim()
    return CITY_TO_REGION[normalized] || "europe_east" // default
}

/**
 * Получить контекст цен для направления
 */
export function fetchPriceContext(destination: string): PriceContextData {
    const region = getRegionForCity(destination)
    const prices = REGIONAL_PRICES[region] || REGIONAL_PRICES["europe_east"]

    const priceEstimates: PriceEstimate[] = [
        { category: "accommodation", itemName: "Хостел", priceRange: { min: prices.accommodation.hostel * 0.8, max: prices.accommodation.hostel * 1.2 }, currency: "rub" },
        { category: "accommodation", itemName: "Отель 3*", priceRange: { min: prices.accommodation.hotel3 * 0.8, max: prices.accommodation.hotel3 * 1.3 }, currency: "rub" },
        { category: "accommodation", itemName: "Отель 5*", priceRange: { min: prices.accommodation.hotel5 * 0.8, max: prices.accommodation.hotel5 * 1.5 }, currency: "rub" },
        { category: "food", itemName: "Стрит-фуд", priceRange: { min: prices.food.street * 0.7, max: prices.food.street * 1.3 }, currency: "rub", note: "за приём пищи" },
        { category: "food", itemName: "Кафе", priceRange: { min: prices.food.cafe * 0.8, max: prices.food.cafe * 1.3 }, currency: "rub", note: "за приём пищи" },
        { category: "food", itemName: "Ресторан", priceRange: { min: prices.food.restaurant * 0.7, max: prices.food.restaurant * 1.5 }, currency: "rub", note: "за приём пищи" },
        { category: "transport", itemName: "Общ. транспорт", priceRange: { min: prices.transport.public * 0.5, max: prices.transport.public * 1.5 }, currency: "rub", note: "в день" },
        { category: "transport", itemName: "Такси", priceRange: { min: prices.transport.taxi * 0.5, max: prices.transport.taxi * 2 }, currency: "rub", note: "средняя поездка" },
    ]

    const tips: string[] = []
    if (region.includes("japan")) {
        tips.push("JR Pass сэкономит на поездах если планируете переезды между городами")
    }
    if (region.includes("thailand")) {
        tips.push("Уличная еда не только дешевле, но часто вкуснее ресторанов")
        tips.push("Торгуйтесь на рынках — скидка 20-40% реальна")
    }
    if (region.includes("turkey")) {
        tips.push("Istanbul Kart — покупка обязательна для общественного транспорта")
        tips.push("Торг уместен на базарах, но не в магазинах")
    }
    if (region.includes("europe")) {
        tips.push("Бронируйте музеи заранее онлайн — дешевле и без очередей")
    }

    return {
        destination,
        region,
        dailyEstimate: prices.daily,
        currency: "rub",
        prices: priceEstimates,
        tips
    }
}

/**
 * Форматировать контекст цен для промпта
 */
export function formatPriceContextForPrompt(contexts: PriceContextData[]): string {
    const lines: string[] = ["ОРИЕНТИРОВОЧНЫЕ ЦЕНЫ (₽/день на человека):"]

    for (const ctx of contexts) {
        lines.push(`\n${ctx.destination}:`)
        lines.push(`- Бюджетно: ~${ctx.dailyEstimate.budget.toLocaleString("ru-RU")} ₽/день`)
        lines.push(`- Средний уровень: ~${ctx.dailyEstimate.midRange.toLocaleString("ru-RU")} ₽/день`)
        lines.push(`- Люкс: ~${ctx.dailyEstimate.luxury.toLocaleString("ru-RU")} ₽/день`)

        if (ctx.tips.length > 0) {
            lines.push("Советы по экономии:")
            for (const tip of ctx.tips) {
                lines.push(`  • ${tip}`)
            }
        }
    }

    return lines.join("\n")
}
