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
    // Бали
    "бали": {
        places: [
            { name: "Tegallalang Rice Terraces", type: "place", location: "Убуд, Бали", whyTrending: "Инста-локация #1 Бали, рисовые террасы", bestFor: ["фото", "природа"], instaTip: "Приходить к 7 утра до туристов" },
            { name: "Uluwatu Temple", type: "place", location: "Южный Бали", whyTrending: "Храм на скале над океаном + закат", bestFor: ["закат", "культура", "фото"], instaTip: "Кечак шоу в 18:00, бронировать место" },
            { name: "Canggu beach clubs", type: "activity", location: "Чангу, Бали", whyTrending: "Surf + bali vibes + инфлюенсеры", bestFor: ["серфинг", "тусовка", "закат"] },
            { name: "Munduk", type: "hidden_gem", location: "Северный Бали", whyTrending: "Водопады и кофейные плантации без толп", bestFor: ["природа", "треккинг"] },
        ],
        photoSpots: ["Ворота Пура Лемпуяна", "Поля в Убуде на рассвете", "Пляж Балаган на закате", "Вулкан Батур"],
        foodTrends: ["Warung Made (аутентично)", "Смути-боулы в Чангу", "Liap Liap смокинг фиш", "Сате ликит"],
        avoidList: ["Семиньяк ночью в сезон (пробки)", "Кута (туристическая ловушка)"],
    },
    // Барселона
    "барселона": {
        places: [
            { name: "El Born", type: "place", location: "Барселона", whyTrending: "Лучший квартал для гастрономии и баров", bestFor: ["еда", "вечер", "прогулки"], instaTip: "Улица Carrer del Parlament вечером" },
            { name: "Бункеры Карм.эль", type: "viewpoint", location: "Барселона", whyTrending: "Лучший вид на город — бесплатно", bestFor: ["закат", "фото"], instaTip: "Прийти за час до заката, взять пикник" },
            { name: "Mercat de Santa Caterina", type: "hidden_gem", location: "Барселона", whyTrending: "Альтернатива Бокерии без толп", bestFor: ["еда", "фото"] },
            { name: "Tibidabo", type: "viewpoint", location: "Барселона", whyTrending: "Парк развлечений + панорама города", bestFor: ["закат", "виды", "атмосфера"] },
        ],
        photoSpots: ["Бункеры на рассвете", "Павильон Мис ван дер Роэ", "Парк Гуэль без туристов (до 8 утра)", "Вид с Тибидабо"],
        foodTrends: ["Пинчос в El Born", "Кальсотс (зима)", "Па-амб-томакет в Bar Calders", "Хамон Ibérico de Bellota"],
        avoidList: ["Las Ramblas (карманники)", "Рестораны прямо у Саграда Фамилия (переоценены)"],
    },
    // Лиссабон
    "лиссабон": {
        places: [
            { name: "LX Factory", type: "place", location: "Лиссабон", whyTrending: "Креативный кластер в старой фабрике", bestFor: ["маркет", "еда", "фото"], instaTip: "Воскресный рынок" },
            { name: "Miradouro da Graça", type: "viewpoint", location: "Лиссабон", whyTrending: "Лучший закат — без туристов (альтернатива Поркалу)", bestFor: ["закат", "фото"] },
            { name: "Alfama в рабочий день утром", type: "hidden_gem", location: "Лиссабон", whyTrending: "Аутентичный квартал фаду без толп", bestFor: ["атмосфера", "фото"], instaTip: "Прийти до 10 утра" },
            { name: "Time Out Market", type: "restaurant", location: "Лиссабон", whyTrending: "Лучший гастрорынок Европы", bestFor: ["еда", "атмосфера"] },
        ],
        photoSpots: ["Трамвай 28 (снаружи!)", "Синтра: Пена на рассвете", "Вид с Сао-Жоржи", "Мост Васко да Гама на велике"],
        foodTrends: ["Пастэль де ната в Pastéis de Belém", "Бакаляу (треска)", "Бика (эспрессо)", "Bifana (сендвич с свининой)"],
        avoidList: ["Bairro Alto ночью в пятницу (шум)", "Экскурсии на трамвае 28 (лучше пешком)"],
    },
    // Белград
    "белград": {
        places: [
            { name: "Скадарлия", type: "place", location: "Белград", whyTrending: "Богемный квартал, рестораны с живой музыкой", bestFor: ["ужин", "атмосфера", "фото"] },
            { name: "Ada Ciganlija", type: "place", location: "Белград", whyTrending: "Речной остров-парк, пляж", bestFor: ["пляж", "природа", "спорт"] },
            { name: "Zemun", type: "hidden_gem", location: "Белград", whyTrending: "Хорватский квартал, набережная дуная", bestFor: ["прогулки", "ужин"], instaTip: "Рыбные рестораны на набережной" },
            { name: "Kalemegdan Fortress", type: "viewpoint", location: "Белград", whyTrending: "Крепость + закат над Дунаем", bestFor: ["виды", "прогулки", "история"] },
        ],
        photoSpots: ["Закат с Калемегдана", "Скадарлия вечером", "Кирпичный паттерн улиц", "Вид с башни Авала"],
        foodTrends: ["Плескавица в Харчишнице", "Ракия", "Ćevapi с аиваром", "Пита с мясом"],
        avoidList: ["Ночные клубы Сплавы (только для местных)", "Рестораны-ловушки у Собора"],
    },
    // Москва
    "москва": {
        places: [
            { name: "ГЭС-2", type: "place", location: "Москва", whyTrending: "Арт-пространство в бывшей электростанции", bestFor: ["искусство", "фото", "прогулки"], instaTip: "Крыша с видом на Кремль" },
            { name: "Парк Зарядье", type: "viewpoint", location: "Москва", whyTrending: "Парящий мост над Москвой-рекой + вид на Кремль", bestFor: ["фото", "прогулки"] },
            { name: "Депо Лесная", type: "restaurant", location: "Москва", whyTrending: "Крупнейший фудмаркет России", bestFor: ["еда", "атмосфера"] },
            { name: "Artplay / Флакон", type: "place", location: "Москва", whyTrending: "Дизайн-кластеры с маркетами и кафе", bestFor: ["маркет", "выставки"] },
        ],
        photoSpots: ["Парящий мост Зарядье", "Крыша ГЭС-2", "Арбат (рано утром)", "ВДНХ ночью"],
        foodTrends: ["Супермаркет «Азбука Вкуса» (гастро-маркет)", "Khoroshavins Bar (коктейли)", "Chicha (перуанская)"],
        avoidList: ["Арбат вечером в выходные (толпы)", "Ресторан «Пушкин» (туристическая ловушка)"],
    },
    // Санкт-Петербург
    "санкт-петербург": {
        places: [
            { name: "Севкабель Порт", type: "place", location: "Санкт-Петербург", whyTrending: "Порт + закат + стрит-фуд + выставки", bestFor: ["закат", "еда", "фото"], instaTip: "Пятница вечером — концерты" },
            { name: "Новая Голландия", type: "place", location: "Санкт-Петербург", whyTrending: "Остров-парк с маркетами и едой", bestFor: ["прогулки", "отдых", "маркет"] },
            { name: "Лахта Центр", type: "viewpoint", location: "Санкт-Петербург", whyTrending: "Самое высокое здание России + панорама", bestFor: ["виды", "фото"] },
            { name: "Улица Рубинштейна", type: "place", location: "Санкт-Петербург", whyTrending: "Лучшая улица ресторанов города", bestFor: ["ужин", "бары"] },
        ],
        photoSpots: ["Белые ночи на Дворцовой набережной", "Крыши в Белые ночи", "Канал Грибоедова", "Исаакий на рассвете"],
        foodTrends: ["Рыбный рынок на набережной", "Ресторан «Хачапурия»", "Корчма «Старина Мюллер»"],
        avoidList: ["Невский проспект в обед в сезон (пробки)", "Туристические рестораны у Исаакия"],
    },
    // Казань
    "казань": {
        places: [
            { name: "Кремль Казани", type: "place", location: "Казань", whyTrending: "ЮНЕСКО, уникальный синтез русского и татарского", bestFor: ["история", "фото", "прогулки"] },
            { name: "Центр «Эрмитаж-Казань»", type: "place", location: "Казань", whyTrending: "Выставки мирового уровня", bestFor: ["искусство", "культура"] },
            { name: "Старо-Татарская слобода", type: "hidden_gem", location: "Казань", whyTrending: "Аутентичная татарская архитектура и кухня", bestFor: ["культура", "еда", "фото"] },
            { name: "Набережная Казанки", type: "viewpoint", location: "Казань", whyTrending: "Панорама Кремля и реки", bestFor: ["закат", "прогулки"] },
        ],
        photoSpots: ["Минарет Кул-Шариф на рассвете", "Вид на Казань-реку с набережной", "Старо-Татарская слобода"],
        foodTrends: ["Чак-чак", "Эчпочмак", "Казан кебаб", "Катык (татарский йогурт)"],
        avoidList: ["Бауманская в выходной (многолюдно)"],
    },
    // Сочи
    "сочи": {
        places: [
            { name: "Красная Поляна", type: "place", location: "Сочи", whyTrending: "Горный курорт мирового уровня", bestFor: ["лыжи", "природа", "виды"], instaTip: "Смотровая горы Роза Пик (2320 м)" },
            { name: "Парк «Ривьера»", type: "place", location: "Сочи", whyTrending: "Набережная и пальмы — типичный Сочи", bestFor: ["прогулки", "семья"] },
            { name: "Сочи Парк", type: "activity", location: "Красная Поляна", whyTrending: "Российская тема-парк у горнолыжки", bestFor: ["семья", "аттракционы"] },
            { name: "Тисо-самшитовая роща", type: "place", location: "Хоста, Сочи", whyTrending: "Реликтовый лес, уникальный в России", bestFor: ["природа", "треккинг", "эко"] },
        ],
        photoSpots: ["Роза Пик (смотровая 2320 м)", "Сочинская набережная на закате", "Самшитовая роща"],
        foodTrends: ["Абхазская кухня (аджика, сациви)", "Свежая черноморская рыба", "Хачапури по-аджарски"],
        avoidList: ["Пляж в центре Сочи в августе (переполнен)", "Лазаревское (ниже качество)"],
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
