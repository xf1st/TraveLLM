/**
 * Trends Context - Трендовые места и активности из соцсетей
 * Популярные локации для каждого направления
 */

export interface TrendingPlace {
    name: string
    type: "place" | "restaurant" | "activity" | "viewpoint" | "hidden_gem"
    location: string
    whyTrending: string
    bestFor: string[]
    instaTip?: string
}

export interface TrendsContextData {
    destination: string
    trendingPlaces: TrendingPlace[]
    photoSpots: string[]
    foodTrends: string[]
    avoidList: string[]
}

// Трендовые места по направлениям (на основе соцсетей, обновлять периодически)
const TRENDING_DATA: Record<string, {
    places: TrendingPlace[]
    photoSpots: string[]
    foodTrends: string[]
    avoidList: string[]
}> = {
    // Стамбул
    "стамбул": {
        places: [
            { name: "Balat", type: "place", location: "Стамбул", whyTrending: "Разноцветные дома идеальны для фото", bestFor: ["фотографии", "прогулки"], instaTip: "Утром меньше туристов" },
            { name: "Pierre Loti кафе", type: "viewpoint", location: "Эйюп, Стамбул", whyTrending: "Панорама Золотого Рога", bestFor: ["закат", "виды"], instaTip: "Подняться на канатке" },
            { name: "Camlica Hill", type: "viewpoint", location: "Азиатская часть", whyTrending: "Вид на весь город", bestFor: ["закат", "ночной город"], instaTip: "Телебашня с обзорной площадкой" },
            { name: "Karaköy", type: "place", location: "Стамбул", whyTrending: "Хипстерский район с галереями", bestFor: ["кафе", "стрит-арт"] },
        ],
        photoSpots: ["Голубая мечеть на рассвете", "Улицы Балата", "Вид с башни Галата", "Босфор с парома"],
        foodTrends: ["Турецкий завтрак (kahvaltı)", "Балык экмек у Галатского моста", "Кюнефе в Karaköy Güllüoğlu", "Кофе в 3. üçüncü dalga"],
        avoidList: ["Площадь Таксим вечером в выходные (толпы)", "Рестораны прямо у туристических мест (переоценены)"],
    },
    // Таиланд / Бангкок
    "бангкок": {
        places: [
            { name: "Wat Arun на рассвете", type: "place", location: "Бангкок", whyTrending: "Менее туристов, магический свет", bestFor: ["фотографии", "духовность"], instaTip: "Приходить к 6 утра" },
            { name: "Jodd Fairs", type: "activity", location: "Бангкок", whyTrending: "Инста-маркет со стрит-фудом", bestFor: ["еда", "фото", "вечер"], instaTip: "Приходить к закату" },
            { name: "Mahanakhon SkyWalk", type: "viewpoint", location: "Бангкок", whyTrending: "Стеклянный пол на 78 этаже", bestFor: ["виды", "закат"], instaTip: "Билеты онлайн дешевле" },
            { name: "Talat Rot Fai", type: "activity", location: "Бангкок", whyTrending: "Винтажный ночной рынок", bestFor: ["шоппинг", "еда", "атмосфера"] },
        ],
        photoSpots: ["Wat Pho утром", "Крыши rooftop баров", "Чайнатаун ночью", "Khlong Lat Mayom (плавучий рынок)"],
        foodTrends: ["Jay Fai (уличные мишлен)", "Pad Thai в Thip Samai", "Манго sticky rice", "Кокосовое мороженое"],
        avoidList: ["Khao San Road (туристическая ловушка)", "Туристические туки-тук туры (развод)"],
    },
    // Япония / Токио
    "токио": {
        places: [
            { name: "teamLab Planets", type: "activity", location: "Токио", whyTrending: "Иммерсивное искусство", bestFor: ["искусство", "фото"], instaTip: "Бронировать за 2 недели" },
            { name: "Shibuya Sky", type: "viewpoint", location: "Токио", whyTrending: "360° панорама города", bestFor: ["закат", "ночной город"], instaTip: "Sunset time slot" },
            { name: "Yanaka", type: "hidden_gem", location: "Токио", whyTrending: "Старый Токио, коты, храмы", bestFor: ["прогулки", "атмосфера"], instaTip: "Кладбище на закате" },
            { name: "Shimokitazawa", type: "place", location: "Токио", whyTrending: "Винтаж, инди-культура", bestFor: ["шоппинг", "кафе", "музыка"] },
        ],
        photoSpots: ["Перекрёсток Сибуя сверху", "Токийская башня ночью", "Храм Сэнсо-дзи утром", "Мемориал в Йоёги"],
        foodTrends: ["Омакасе", "Раменные квесты", "7-Eleven онигири (серьёзно)", "Ichiran рамен"],
        avoidList: ["Цукидзи в обед (очереди)", "Robot Restaurant (закрылся/переоценён)"],
    },
    // Грузия / Тбилиси
    "тбилиси": {
        places: [
            { name: "Fabrika", type: "place", location: "Тбилиси", whyTrending: "Хабстер-хаб, стрит-арт, бары", bestFor: ["вечер", "нетворкинг"], instaTip: "Внутренний двор вечером" },
            { name: "Мост Мира на рассвете", type: "viewpoint", location: "Тбилиси", whyTrending: "Без толп, магический свет", bestFor: ["фото", "рассвет"] },
            { name: "Серные бани", type: "activity", location: "Абанотубани", whyTrending: "Аутентичный опыт", bestFor: ["релакс"], instaTip: "Chreli Abano — локальная цена" },
            { name: "Betlemi St.", type: "hidden_gem", location: "Старый Тбилиси", whyTrending: "Балконы и виды", bestFor: ["фото", "прогулки"] },
        ],
        photoSpots: ["Балконы старого города", "Нарикала на закате", "Сухой мост с антиквариатом", "Мтацминда"],
        foodTrends: ["Хинкали в Захар Захарыч", "Назуки в пекарне", "Оранжевое вино", "Пхали-пружины"],
        avoidList: ["Руставели в час пик", "Воды на Лаго (переоценены)"],
    },
    // Дубай
    "дубай": {
        places: [
            { name: "Alserkal Avenue", type: "place", location: "Al Quoz", whyTrending: "Арт-район, галереи, кафе", bestFor: ["искусство", "фото"], instaTip: "Четверг — открытие выставок" },
            { name: "Dubai Frame", type: "viewpoint", location: "Дубай", whyTrending: "Вид на старый и новый Дубай", bestFor: ["виды", "фото"], instaTip: "Прийти к закату" },
            { name: "La Mer", type: "place", location: "Дубай", whyTrending: "Пляж + инста-локации", bestFor: ["фото", "пляж", "закат"] },
            { name: "Al Fahidi", type: "hidden_gem", location: "Старый Дубай", whyTrending: "Контраст со стеклянным городом", bestFor: ["культура", "музеи"] },
        ],
        photoSpots: ["Бурдж-Халифа из парка", "Madinat Jumeirah", "Miracle Garden", "Рамка снизу"],
        foodTrends: ["Dubai Mall food court (качественно)", "Шаверма в Ravi", "Friday brunch", "Al Mallah шуарма"],
        avoidList: ["Global Village (утомительно)", "Mall of Emirates в выходные (толпы)"],
    },
}

/**
 * Получить трендовые места для направления
 */
export function fetchTrendsContext(destination: string): TrendsContextData {
    const destLower = destination.toLowerCase().trim()
    const data = TRENDING_DATA[destLower]

    if (!data) {
        return {
            destination,
            trendingPlaces: [],
            photoSpots: [],
            foodTrends: [],
            avoidList: []
        }
    }

    return {
        destination,
        trendingPlaces: data.places,
        photoSpots: data.photoSpots,
        foodTrends: data.foodTrends,
        avoidList: data.avoidList
    }
}

/**
 * Форматировать тренды для промпта
 */
export function formatTrendsContextForPrompt(contexts: TrendsContextData[]): string {
    const lines: string[] = []

    for (const ctx of contexts) {
        if (ctx.trendingPlaces.length === 0) continue

        lines.push(`\nТРЕНДЫ ${ctx.destination.toUpperCase()}:`)

        if (ctx.trendingPlaces.length > 0) {
            lines.push("Популярные места:")
            for (const place of ctx.trendingPlaces.slice(0, 4)) {
                lines.push(`- ${place.name}: ${place.whyTrending}${place.instaTip ? ` (совет: ${place.instaTip})` : ""}`)
            }
        }

        if (ctx.photoSpots.length > 0) {
            lines.push(`Фото-споты: ${ctx.photoSpots.slice(0, 4).join(", ")}`)
        }

        if (ctx.foodTrends.length > 0) {
            lines.push(`Еда: ${ctx.foodTrends.slice(0, 4).join(", ")}`)
        }

        if (ctx.avoidList.length > 0) {
            lines.push(`Избегать: ${ctx.avoidList.join("; ")}`)
        }
    }

    return lines.join("\n")
}
