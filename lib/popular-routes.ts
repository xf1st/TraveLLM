// Static popular routes data for /trip/pop-* pages
export const popularRoutes: Record<string, any> = {
    "pop-1": {
        id: "pop-1",
        title: "Неделя в Ялте: Крымская классика",
        description: "Ласточкино гнездо, Ливадийский дворец, Массандра. Идеальный пляжный отдых с историей.",
        destination: "Крым, Россия",
        total_cost: "55 000 ₽",
        tags: ["море", "пляж", "культура"],
        cover_image: "https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?auto=format&fit=crop&q=80&w=800",
        itinerary: [
            {
                day: 1, title: "Прибытие в Симферополь", activities: [
                    { time: "14:00", title: "Трансфер в Ялту", desc: "Симферополь → Ялта (1.5ч)", type: "transport", placeName: "Ж/Д вокзал Симферополь" },
                    { time: "17:00", title: "Заселение в отель", desc: "Отдых после дороги", type: "hotel", placeName: "Набережная Ялты" }
                ]
            },
            {
                day: 2, title: "Ласточкино гнездо", activities: [
                    { time: "10:00", title: "Экскурсия в Ласточкино гнездо", desc: "Знаменитый замок на скале", type: "attraction", placeName: "Ласточкино гнездо" },
                    { time: "14:00", title: "Обед с видом на море", desc: "Ресторан на набережной", type: "food", placeName: "Набережная Ялты", cost: "1500 ₽" }
                ]
            },
            {
                day: 3, title: "Ливадийский дворец", activities: [
                    { time: "10:00", title: "Ливадийский дворец", desc: "Резиденция российских императоров", type: "attraction", placeName: "Ливадийский дворец" },
                    { time: "15:00", title: "Пляж", desc: "Отдых на Массандровском пляже", type: "beach", placeName: "Массандровский пляж" }
                ]
            },
            {
                day: 4, title: "Винодельня Массандра", activities: [
                    { time: "11:00", title: "Дегустация в Массандре", desc: "Знаменитые крымские вина", type: "experience", placeName: "Винзавод Массандра", cost: "1200 ₽" },
                    { time: "16:00", title: "Никитский ботанический сад", desc: "Прогулка по саду", type: "attraction", placeName: "Никитский ботанический сад" }
                ]
            },
            {
                day: 5, title: "Воронцовский дворец", activities: [
                    { time: "10:00", title: "Экскурсия в Алупку", desc: "Воронцовский дворец и парк", type: "attraction", placeName: "Воронцовский дворец" },
                    { time: "15:00", title: "Канатная дорога Ай-Петри", desc: "Подъём на вершину", type: "experience", placeName: "Ай-Петри", cost: "600 ₽" }
                ]
            },
            {
                day: 6, title: "Свободный день", activities: [
                    { time: "10:00", title: "Пляжный отдых", desc: "Релакс на пляже", type: "beach", placeName: "Пляжи Ялты" },
                    { time: "19:00", title: "Прогулка по набережной", desc: "Закат и ужин", type: "food", placeName: "Набережная Ялты" }
                ]
            },
            {
                day: 7, title: "Отъезд", activities: [
                    { time: "10:00", title: "Выезд из отеля", desc: "Трансфер на вокзал", type: "transport", placeName: "Ж/Д вокзал Симферополь" }
                ]
            }
        ],
        budget_analysis: { accommodation: "25 000 ₽", food: "12 000 ₽", transport: "8 000 ₽", activities: "10 000 ₽" },
        safety_info: "Безопасный регион для туризма. Рекомендуется иметь наличные.",
    },
    "pop-2": {
        id: "pop-2",
        title: "Сочи: Горы + Море",
        description: "Красная Поляна, Олимпийский парк, Агурские водопады. Зимой — лыжи, летом — море.",
        destination: "Сочи, Россия",
        total_cost: "85 000 ₽",
        tags: ["природа", "активный", "горы"],
        cover_image: "https://images.unsplash.com/photo-1612194600203-34e2c244b7d0?auto=format&fit=crop&q=80&w=800",
        itinerary: [
            { day: 1, title: "Прибытие", activities: [{ time: "14:00", title: "Прибытие в Адлер", desc: "Заселение", type: "hotel", placeName: "Сочи" }] },
            { day: 2, title: "Олимпийский парк", activities: [{ time: "10:00", title: "Олимпийский парк", desc: "Стадионы Олимпиады 2014", type: "attraction", placeName: "Олимпийский парк Сочи" }] },
            { day: 3, title: "Красная Поляна", activities: [{ time: "09:00", title: "Подъём на Розу Хутор", desc: "Канатная дорога", type: "experience", placeName: "Роза Хутор" }] },
            { day: 4, title: "Агурские водопады", activities: [{ time: "10:00", title: "Трек к водопадам", desc: "Пеший маршрут 6км", type: "hiking", placeName: "Агурские водопады" }] },
            { day: 5, title: "Пляжный день", activities: [{ time: "10:00", title: "Пляж", desc: "Отдых на море", type: "beach", placeName: "Пляжи Адлера" }] },
            { day: 6, title: "Сочи Парк", activities: [{ time: "10:00", title: "Сочи Парк", desc: "Аттракционы", type: "entertainment", placeName: "Сочи Парк" }] },
            { day: 7, title: "Отъезд", activities: [{ time: "12:00", title: "Вылет", desc: "Аэропорт Адлер", type: "transport", placeName: "Аэропорт Сочи" }] }
        ],
        budget_analysis: { accommodation: "35 000 ₽", food: "15 000 ₽", transport: "10 000 ₽", activities: "25 000 ₽" },
    },
    "pop-3": {
        id: "pop-3",
        title: "Турция: Анталья всё включено",
        description: "All-inclusive отели 5*, пляжи, экскурсия в Памуккале и Каппадокию.",
        destination: "Анталья, Турция",
        total_cost: "120 000 ₽",
        tags: ["пляж", "релакс", "аквапарк"],
        cover_image: "https://images.unsplash.com/photo-1530841377377-3ff06c0ca713?auto=format&fit=crop&q=80&w=800",
        itinerary: [
            { day: 1, title: "Прибытие", activities: [{ time: "15:00", title: "Прибытие в Анталью", desc: "Трансфер в отель", type: "hotel", placeName: "Анталья" }] },
            { day: 2, title: "Отдых в отеле", activities: [{ time: "10:00", title: "Пляж и бассейн", desc: "All-inclusive", type: "beach", placeName: "Пляж отеля" }] },
            { day: 3, title: "Старый город", activities: [{ time: "10:00", title: "Калеичи", desc: "Исторический центр", type: "attraction", placeName: "Калеичи Анталья" }] },
            { day: 4, title: "Памуккале", activities: [{ time: "07:00", title: "Экскурсия в Памуккале", desc: "Белые террасы", type: "attraction", placeName: "Памуккале" }] },
            { day: 5, title: "Отдых", activities: [{ time: "10:00", title: "День у моря", desc: "Аквапарк в отеле", type: "entertainment", placeName: "Отель" }] },
            { day: 6, title: "Шопинг", activities: [{ time: "14:00", title: "ТЦ Марк Анталья", desc: "Шопинг", type: "shopping", placeName: "Mark Antalya AVM" }] },
            { day: 7, title: "Релакс", activities: [{ time: "10:00", title: "Спа", desc: "Хаммам", type: "spa", placeName: "Отель" }] },
            { day: 8, title: "Каппадокия", activities: [{ time: "05:00", title: "Полёт на шаре", desc: "Экскурсия в Каппадокию", type: "experience", placeName: "Каппадокия" }] },
            { day: 9, title: "Пляж", activities: [{ time: "10:00", title: "Последний день у моря", desc: "Отдых", type: "beach", placeName: "Пляж" }] },
            { day: 10, title: "Отъезд", activities: [{ time: "10:00", title: "Вылет", desc: "Аэропорт Антальи", type: "transport", placeName: "Аэропорт Анталья" }] }
        ],
        budget_analysis: { accommodation: "70 000 ₽", food: "включено", transport: "15 000 ₽", activities: "35 000 ₽" },
    },
    "pop-4": {
        id: "pop-4",
        title: "Египет: Хургада без суеты",
        description: "Прямой рейс, Красное море, снорклинг с рыбками-клоунами.",
        destination: "Хургада, Египет",
        total_cost: "95 000 ₽",
        tags: ["море", "релакс", "дайвинг"],
        cover_image: "https://images.unsplash.com/photo-1539768942893-daf53e448371?auto=format&fit=crop&q=80&w=800",
        itinerary: [
            { day: 1, title: "Прибытие", activities: [{ time: "18:00", title: "Прибытие", desc: "Отель", type: "hotel", placeName: "Хургада" }] },
            { day: 2, title: "Снорклинг", activities: [{ time: "09:00", title: "Морская прогулка", desc: "Снорклинг на рифах", type: "experience", placeName: "Красное море" }] },
            { day: 3, title: "Пляж", activities: [{ time: "10:00", title: "Отдых", desc: "Пляж отеля", type: "beach", placeName: "Пляж" }] },
            { day: 4, title: "Луксор", activities: [{ time: "05:00", title: "Экскурсия в Луксор", desc: "Долина царей", type: "attraction", placeName: "Луксор" }] },
            { day: 5, title: "Дайвинг", activities: [{ time: "08:00", title: "Пробное погружение", desc: "Дайвинг с инструктором", type: "experience", placeName: "Красное море" }] },
            { day: 6, title: "Релакс", activities: [{ time: "10:00", title: "День в отеле", desc: "Бассейн и анимация", type: "beach", placeName: "Отель" }] },
            { day: 7, title: "Пустыня", activities: [{ time: "14:00", title: "Сафари на квадроциклах", desc: "Пустыня", type: "experience", placeName: "Пустыня" }] },
            { day: 8, title: "Шопинг", activities: [{ time: "16:00", title: "Базар", desc: "Сувениры", type: "shopping", placeName: "Хургада" }] },
            { day: 9, title: "Отъезд", activities: [{ time: "12:00", title: "Вылет", desc: "Аэропорт", type: "transport", placeName: "Аэропорт Хургада" }] }
        ],
    },
    "pop-5": {
        id: "pop-5",
        title: "Тбилиси и Кахетия",
        description: "Хинкали, хачапури, вино в Кахетии. Серные бани и ночной Тбилиси.",
        destination: "Грузия",
        total_cost: "75 000 ₽",
        tags: ["гастрономия", "культура", "вино"],
        cover_image: "https://upload.wikimedia.org/wikipedia/commons/a/a2/Tbilisi_View.jpg",
        itinerary: [
            { day: 1, title: "Тбилиси", activities: [{ time: "14:00", title: "Прибытие", desc: "Старый город", type: "attraction", placeName: "Тбилиси" }] },
            { day: 2, title: "Мцхета", activities: [{ time: "10:00", title: "Древняя столица", desc: "Светицховели", type: "attraction", placeName: "Мцхета" }] },
            { day: 3, title: "Кахетия", activities: [{ time: "09:00", title: "Винный тур", desc: "Дегустация в Кахетии", type: "experience", placeName: "Кахетия" }] },
            { day: 4, title: "Серные бани", activities: [{ time: "11:00", title: "Абанотубани", desc: "Серные бани", type: "spa", placeName: "Серные бани Тбилиси" }] },
            { day: 5, title: "Казбеги", activities: [{ time: "08:00", title: "Военно-Грузинская дорога", desc: "Горы", type: "attraction", placeName: "Казбеги" }] },
            { day: 6, title: "Гастро-тур", activities: [{ time: "12:00", title: "Мастер-класс хинкали", desc: "Готовим грузинскую кухню", type: "experience", placeName: "Тбилиси" }] },
            { day: 7, title: "Отъезд", activities: [{ time: "10:00", title: "Вылет", desc: "Аэропорт", type: "transport", placeName: "Аэропорт Тбилиси" }] }
        ],
    },
    "pop-6": {
        id: "pop-6",
        title: "Алтай: Дикий и прекрасный",
        description: "Чуйский тракт, Телецкое озеро, Марсианские пейзажи.",
        destination: "Алтай, Россия",
        total_cost: "110 000 ₽",
        tags: ["природа", "активный", "горы"],
        cover_image: "https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?auto=format&fit=crop&q=80&w=800",
        itinerary: [
            { day: 1, title: "Горно-Алтайск", activities: [{ time: "12:00", title: "Прибытие", desc: "Начало маршрута", type: "transport", placeName: "Горно-Алтайск" }] },
            { day: 2, title: "Чемал", activities: [{ time: "09:00", title: "Остров Патмос", desc: "Храм на острове", type: "attraction", placeName: "Чемал" }] },
            { day: 3, title: "Телецкое озеро", activities: [{ time: "08:00", title: "Прогулка на катере", desc: "Водопады", type: "experience", placeName: "Телецкое озеро" }] },
            { day: 4, title: "Чуйский тракт", activities: [{ time: "08:00", title: "Дорога красоты", desc: "Одна из красивейших дорог мира", type: "scenic", placeName: "Чуйский тракт" }] },
            { day: 5, title: "Марс", activities: [{ time: "09:00", title: "Марсианские горы", desc: "Цветные скалы Кызыл-Чин", type: "attraction", placeName: "Марс Алтай" }] }
        ],
    },
    "pop-7": {
        id: "pop-7",
        title: "Узбекистан: Шёлковый путь",
        description: "Самарканд, Бухара, Хива. Плов каждый день.",
        destination: "Узбекистан",
        total_cost: "70 000 ₽",
        tags: ["история", "культура", "еда"],
        cover_image: "https://images.unsplash.com/photo-1565967511849-76a60a516170?auto=format&fit=crop&q=80&w=800",
        itinerary: [
            { day: 1, title: "Ташкент", activities: [{ time: "14:00", title: "Прибытие", desc: "Столица", type: "hotel", placeName: "Ташкент" }] },
            { day: 2, title: "Самарканд", activities: [{ time: "08:00", title: "Поезд в Самарканд", desc: "Регистан", type: "attraction", placeName: "Регистан" }] },
            { day: 3, title: "Самарканд", activities: [{ time: "09:00", title: "Шахи-Зинда", desc: "Некрополь", type: "attraction", placeName: "Шахи-Зинда" }] },
            { day: 4, title: "Бухара", activities: [{ time: "09:00", title: "Переезд в Бухару", desc: "Древний город", type: "attraction", placeName: "Бухара" }] }
        ],
    },
    "pop-8": {
        id: "pop-8",
        title: "ОАЭ: Дубай за 5 дней",
        description: "Бурдж Халифа, Palm Jumeirah, Dubai Mall.",
        destination: "Дубай, ОАЭ",
        total_cost: "150 000 ₽",
        tags: ["шопинг", "развлечения", "пляж"],
        cover_image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=800",
        itinerary: [
            { day: 1, title: "Прибытие", activities: [{ time: "20:00", title: "Прибытие", desc: "Ночной Дубай", type: "hotel", placeName: "Дубай" }] },
            { day: 2, title: "Бурдж Халифа", activities: [{ time: "17:00", title: "Смотровая площадка", desc: "Закат с 124 этажа", type: "attraction", placeName: "Burj Khalifa" }] },
            { day: 3, title: "Пальма", activities: [{ time: "10:00", title: "Palm Jumeirah", desc: "Atlantis", type: "attraction", placeName: "Palm Jumeirah" }] },
            { day: 4, title: "Шопинг", activities: [{ time: "12:00", title: "Dubai Mall", desc: "Крупнейший ТЦ", type: "shopping", placeName: "Dubai Mall" }] },
            { day: 5, title: "Отъезд", activities: [{ time: "14:00", title: "Вылет", desc: "Аэропорт", type: "transport", placeName: "Аэропорт Дубай" }] }
        ],
    },
    "pop-9": {
        id: "pop-9",
        title: "Сербия: Белград + Нови-Сад",
        description: "Безвиз, прямой рейс, вкусная еда.",
        destination: "Сербия",
        total_cost: "60 000 ₽",
        tags: ["культура", "еда", "история"],
        cover_image: "https://images.unsplash.com/photo-1580915411954-282cb1b0d780?auto=format&fit=crop&q=80&w=800",
        itinerary: [
            { day: 1, title: "Белград", activities: [{ time: "14:00", title: "Прибытие", desc: "Крепость Калемегдан", type: "attraction", placeName: "Белград" }] },
            { day: 2, title: "Скадарлия", activities: [{ time: "19:00", title: "Богемный квартал", desc: "Живая музыка и еда", type: "food", placeName: "Скадарлия" }] },
            { day: 3, title: "Нови-Сад", activities: [{ time: "10:00", title: "Петроварадинская крепость", desc: "Второй город", type: "attraction", placeName: "Нови-Сад" }] }
        ],
    },
    "pop-10": {
        id: "pop-10",
        title: "Байкал: Зимняя сказка",
        description: "Прозрачный лёд, хивусы, остров Ольхон.",
        destination: "Байкал, Россия",
        total_cost: "95 000 ₽",
        tags: ["природа", "активный", "уникальный"],
        cover_image: "https://images.unsplash.com/photo-1551845041-63e8e76836ea?auto=format&fit=crop&q=80&w=800",
        itinerary: [
            { day: 1, title: "Иркутск", activities: [{ time: "12:00", title: "Прибытие", desc: "130-й квартал", type: "attraction", placeName: "Иркутск" }] },
            { day: 2, title: "Листвянка", activities: [{ time: "09:00", title: "Посёлок на Байкале", desc: "Музей и рынок", type: "attraction", placeName: "Листвянка" }] },
            { day: 3, title: "Ольхон", activities: [{ time: "08:00", title: "Переезд на остров", desc: "Хужир", type: "attraction", placeName: "Остров Ольхон" }] },
            { day: 4, title: "Лёд Байкала", activities: [{ time: "09:00", title: "Прогулка по льду", desc: "Хивус и коньки", type: "experience", placeName: "Озеро Байкал" }] }
        ],
    }
}

export function getPopularRoute(id: string) {
    return popularRoutes[id] || null
}
