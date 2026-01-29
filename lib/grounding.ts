// Dynamic date for grounding context
const getCurrentDateString = () => {
    const now = new Date()
    return now.toISOString().split('T')[0]
}

// Shuffle array for variety in AI prompts
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
}

// Direct flight destinations from Moscow (for randomization)
const DIRECT_FLIGHT_DESTINATIONS = [
    "Турция (Стамбул, Анталья)",
    "ОАЭ (Дубай, Абу-Даби)",
    "Сербия (Белград)",
    "Китай (Пекин, Гуанчжоу, Шанхай)",
    "Таиланд (Бангкок, Пхукет)",
    "Вьетнам (Ханой, Хошимин)",
    "Грузия (Тбилиси, Батуми)",
    "Армения (Ереван)",
    "Азербайджан (Баку)",
    "Казахстан (Алматы, Астана)",
    "Узбекистан (Ташкент, Самарканд)",
    "Египет (Хургада, Шарм-эль-Шейх)",
    "Мальдивы (Мале)",
    "Шри-Ланка (Коломбо)",
    "Индия (Дели, Гоа)",
    "Индонезия (Бали)",
    "Катар (Доха)",
    "Оман (Маскат)",
    "Бахрейн (Манама)"
]

// Get shuffled list of destinations for variety
export function getShuffledDestinations(): string {
    return shuffleArray(DIRECT_FLIGHT_DESTINATIONS).join(', ')
}

export const GROUNDING_DATA_2026 = {
    lastUpdated: getCurrentDateString(),
    globalRestrictions: [
        "США: С 21 января 2026 года приостановлена выдача иммиграционных виз (Green Cards) для граждан РФ. Турвизы (B1/B2) выдаются, но с усиленной проверкой.",
        "Евросоюз: Упрощенный визовый режим полностью отменен. Срок рассмотрения в Шенген — от 15 до 45 дней. Некоторые страны (Польша, Прибалтика, Финляндия) закрыты для туристов из РФ.",
        "Китай: Действует безвизовый режим до 30 дней для граждан РФ до сентября 2026 года."
    ],
    closedAirports: [
        { city: "Краснодар", iata: "KRR" },
        { city: "Анапа", iata: "AAQ" },
        { city: "Геленджик", iata: "GDZ" },
        { city: "Элиста", iata: "ESL" },
        { city: "Липецк", iata: "LPK" },
        { city: "Курск", iata: "URS" }
    ],
    airportStatus: [
        "Московский авиаузел: Шереметьево (SVO) — основной хаб Аэрофлота, работает штатно. Внуково (VKO) и Домодедово (DME) — возможны задержки из-за ограничений в небе.",
        "Юг и Центр: Аэропорты Краснодара (KRR), Анапы (AAQ), Геленджика (GDZ), Элисты (ESL), Липецка (LPK), Курска (URS) и др. по-прежнему ЗАКРЫТЫ. Прямых рейсов туда нет.",
        "Кавказ: Грозный (GRV) и Владикавказ (OGZ) — временные усиления мер безопасности в январе 2026."
    ],
    flightConnectivity: [
        "Прямые рейсы доступны в: ОАЭ, Китай, Таиланд, Вьетнам, Сербия, Турция, Грузия, Армения, Азербайджан, Казахстан, Узбекистан, Египет, Мальдивы, Шри-Ланка, Индия, Индонезия, Катар, Оман.",
        "Airspace: Полеты в Европу и США только через пересадки (Стамбул, Баку, Ереван, Доха).",
        "Санкции: Российские авиакомпании не летают в страны Евросоюза и наоборот."
    ],
    // Trending locations by region for variety
    trendingLocations: {
        "Moscow": ["ГЭС-2", "Парк Зарядье (Парящий мост)", "Депо Лесная", "Бережковская набережная"],
        "StPetersburg": ["Севкабель Порт", "Новая Голландия", "Лахта Центр (смотровая)", "Никольские ряды"],
        "Istanbul": ["Galataport", "Balat (vintage area)", "Karakoy (street art)", "Arter Museum"],
        "Dubai": ["Museum of the Future", "Al Seef Heritage District", "Alserkal Avenue", "Dubai Frame"],
        "Bangkok": ["Iconsiam", "Talad Rot Fai", "Wat Arun at sunset", "Chinatown (Yaowarat)"],
        "Tbilisi": ["Fabrika", "Dry Bridge Market", "Chronicles of Georgia", "Mtatsminda at night"],
        "Baku": ["Flame Towers", "Old City (Icherisheher)", "Heydar Aliyev Center", "Highland Park"],
        "Beijing": ["798 Art District", "Nanluoguxiang", "Temple of Heaven sunrise", "The Great Wall (Mutianyu)"],
        "Samarkand": ["Registan Square", "Shah-i-Zinda", "Bibi-Khanym Mosque", "Siyob Bazaar"]
    },
    // Destination pools for variety (grouped by region)
    destinationPools: {
        asia: ["Таиланд", "Вьетнам", "Китай", "Индонезия (Бали)", "Шри-Ланка", "Мальдивы", "Индия"],
        middleEast: ["ОАЭ", "Катар", "Оман", "Бахрейн"],
        caucasus: ["Грузия", "Армения", "Азербайджан"],
        centralAsia: ["Узбекистан", "Казахстан", "Киргизия"],
        europe: ["Сербия", "Турция", "Черногория (через Белград)"],
        africa: ["Египет", "Марокко (через Стамбул)", "Танзания (через Дубай)"]
    }
};
