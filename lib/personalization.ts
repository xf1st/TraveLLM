/**
 * Система персонализации направлений
 *
 * Подбирает направления на основе:
 * - Интересов пользователя
 * - Посещённых стран (исключаем)
 * - Стиля путешествия
 * - Бюджета
 * - Сезона
 * - Темпа поездки
 */

// Направления с тегами для matching
export const DESTINATIONS_DATABASE: Destination[] = [
  // Азия - пляж
  { name: "Таиланд", cities: ["Бангкок", "Пхукет", "Краби", "Чиангмай"], tags: ["пляж", "культура", "еда", "бюджетный", "храмы"], budget: "low", seasons: ["зима", "весна"], flightType: "direct", flightPrice: 45000 },
  { name: "Вьетнам", cities: ["Ханой", "Хошимин", "Дананг", "Нячанг"], tags: ["пляж", "еда", "история", "бюджетный", "природа"], budget: "low", seasons: ["зима", "весна"], flightType: "direct", flightPrice: 50000 },
  { name: "Индонезия", cities: ["Бали", "Джакарта", "Ломбок"], tags: ["пляж", "сёрфинг", "храмы", "природа", "йога"], budget: "medium", seasons: ["лето", "осень"], flightType: "direct", flightPrice: 55000 },
  { name: "Шри-Ланка", cities: ["Коломбо", "Канди", "Галле", "Элла"], tags: ["пляж", "храмы", "чай", "природа", "сафари"], budget: "low", seasons: ["зима", "весна"], flightType: "direct", flightPrice: 50000 },
  { name: "Мальдивы", cities: ["Мале", "Атоллы"], tags: ["пляж", "люкс", "дайвинг", "романтика", "релакс"], budget: "high", seasons: ["зима", "весна"], flightType: "direct", flightPrice: 60000 },

  // Азия - культура
  { name: "Япония", cities: ["Токио", "Киото", "Осака", "Нара"], tags: ["культура", "еда", "технологии", "храмы", "сакура"], budget: "high", seasons: ["весна", "осень"], flightType: "connection", flightPrice: 80000 },
  { name: "Южная Корея", cities: ["Сеул", "Пусан", "Чеджу"], tags: ["культура", "еда", "технологии", "K-pop", "горы"], budget: "medium", seasons: ["весна", "осень"], flightType: "connection", flightPrice: 70000 },
  { name: "Китай", cities: ["Пекин", "Шанхай", "Сиань", "Гуанчжоу"], tags: ["культура", "история", "еда", "великая стена"], budget: "medium", seasons: ["весна", "осень"], flightType: "direct", flightPrice: 45000 },
  { name: "Индия", cities: ["Дели", "Агра", "Джайпур", "Гоа", "Варанаси"], tags: ["культура", "храмы", "история", "еда", "духовность"], budget: "low", seasons: ["зима"], flightType: "direct", flightPrice: 40000 },

  // Ближний Восток
  { name: "ОАЭ", cities: ["Дубай", "Абу-Даби", "Шарджа"], tags: ["люкс", "шопинг", "архитектура", "пляж", "развлечения"], budget: "high", seasons: ["зима", "весна", "осень"], flightType: "direct", flightPrice: 35000 },
  { name: "Катар", cities: ["Доха"], tags: ["люкс", "архитектура", "музеи", "футбол"], budget: "high", seasons: ["зима", "весна"], flightType: "direct", flightPrice: 40000 },
  { name: "Оман", cities: ["Маскат", "Низва", "Салала"], tags: ["природа", "горы", "пустыня", "аутентичность"], budget: "medium", seasons: ["зима", "весна"], flightType: "direct", flightPrice: 45000 },
  { name: "Иордания", cities: ["Амман", "Петра", "Акаба", "Вади Рам"], tags: ["история", "пустыня", "петра", "красное море"], budget: "medium", seasons: ["весна", "осень"], flightType: "connection", flightPrice: 50000 },

  // Кавказ
  { name: "Грузия", cities: ["Тбилиси", "Батуми", "Казбеги", "Сигнахи"], tags: ["еда", "вино", "горы", "культура", "бюджетный"], budget: "low", seasons: ["весна", "лето", "осень"], flightType: "direct", flightPrice: 20000 },
  { name: "Армения", cities: ["Ереван", "Дилижан", "Гарни", "Татев"], tags: ["история", "вино", "горы", "монастыри", "бюджетный"], budget: "low", seasons: ["весна", "лето", "осень"], flightType: "direct", flightPrice: 18000 },
  { name: "Азербайджан", cities: ["Баку", "Шеки", "Габала"], tags: ["архитектура", "история", "огни", "современность"], budget: "low", seasons: ["весна", "осень"], flightType: "direct", flightPrice: 20000 },

  // Центральная Азия
  { name: "Узбекистан", cities: ["Ташкент", "Самарканд", "Бухара", "Хива"], tags: ["история", "великий шёлковый путь", "архитектура", "культура"], budget: "low", seasons: ["весна", "осень"], flightType: "direct", flightPrice: 25000 },
  { name: "Казахстан", cities: ["Алматы", "Астана", "Чарынский каньон"], tags: ["природа", "горы", "степь", "современность"], budget: "low", seasons: ["лето", "осень"], flightType: "direct", flightPrice: 20000 },

  // Европа (через пересадку)
  { name: "Италия", cities: ["Рим", "Флоренция", "Венеция", "Милан", "Амальфи"], tags: ["культура", "еда", "искусство", "история", "мода"], budget: "high", seasons: ["весна", "осень"], flightType: "connection", flightPrice: 50000 },
  { name: "Испания", cities: ["Барселона", "Мадрид", "Севилья", "Валенсия"], tags: ["культура", "пляж", "еда", "фламенко", "архитектура"], budget: "medium", seasons: ["весна", "осень"], flightType: "connection", flightPrice: 45000 },
  { name: "Франция", cities: ["Париж", "Ницца", "Прованс", "Бордо"], tags: ["культура", "еда", "вино", "романтика", "искусство"], budget: "high", seasons: ["весна", "лето", "осень"], flightType: "connection", flightPrice: 50000 },
  { name: "Португалия", cities: ["Лиссабон", "Порту", "Синтра", "Алгарве"], tags: ["пляж", "еда", "вино", "сёрфинг", "история"], budget: "medium", seasons: ["весна", "лето", "осень"], flightType: "connection", flightPrice: 45000 },
  { name: "Греция", cities: ["Афины", "Санторини", "Крит", "Родос"], tags: ["пляж", "история", "острова", "еда", "мифология"], budget: "medium", seasons: ["лето"], flightType: "connection", flightPrice: 45000 },
  { name: "Черногория", cities: ["Котор", "Будва", "Дубровник"], tags: ["пляж", "горы", "бюджетный", "природа"], budget: "low", seasons: ["лето"], flightType: "connection", flightPrice: 40000 },

  // Турция и Балканы
  { name: "Турция", cities: ["Стамбул", "Каппадокия", "Анталья", "Измир"], tags: ["культура", "история", "пляж", "еда", "базары"], budget: "medium", seasons: ["весна", "лето", "осень"], flightType: "direct", flightPrice: 25000 },
  { name: "Сербия", cities: ["Белград", "Нови-Сад", "Ниш"], tags: ["ночная жизнь", "история", "еда", "бюджетный"], budget: "low", seasons: ["весна", "лето", "осень"], flightType: "direct", flightPrice: 20000 },

  // Африка
  { name: "Египет", cities: ["Каир", "Луксор", "Хургада", "Шарм-эль-Шейх"], tags: ["история", "пирамиды", "пляж", "дайвинг"], budget: "low", seasons: ["зима", "весна", "осень"], flightType: "direct", flightPrice: 30000 },
  { name: "Марокко", cities: ["Марракеш", "Фес", "Шефшауэн", "Сахара"], tags: ["культура", "пустыня", "базары", "архитектура"], budget: "medium", seasons: ["весна", "осень"], flightType: "connection", flightPrice: 45000 },
  { name: "Танзания", cities: ["Занзибар", "Серенгети", "Нгоронгоро"], tags: ["сафари", "пляж", "природа", "животные"], budget: "high", seasons: ["лето", "зима"], flightType: "connection", flightPrice: 70000 },
  { name: "ЮАР", cities: ["Кейптаун", "Йоханнесбург", "Сафари парки"], tags: ["сафари", "природа", "вино", "океан"], budget: "high", seasons: ["зима"], flightType: "connection", flightPrice: 80000 },

  // Латинская Америка
  { name: "Мексика", cities: ["Мехико", "Канкун", "Тулум", "Оахака"], tags: ["пляж", "культура", "еда", "майя", "история"], budget: "medium", seasons: ["зима", "весна"], flightType: "connection", flightPrice: 90000 },
  { name: "Аргентина", cities: ["Буэнос-Айрес", "Патагония", "Игуасу"], tags: ["танго", "стейки", "вино", "природа"], budget: "medium", seasons: ["осень", "зима"], flightType: "connection", flightPrice: 100000 },
  { name: "Бразилия", cities: ["Рио", "Сан-Паулу", "Игуасу", "Амазония"], tags: ["карнавал", "пляж", "природа", "футбол"], budget: "medium", seasons: ["лето", "зима"], flightType: "connection", flightPrice: 100000 },
  { name: "Перу", cities: ["Лима", "Куско", "Мачу-Пикчу"], tags: ["история", "инки", "горы", "еда"], budget: "medium", seasons: ["осень", "зима"], flightType: "connection", flightPrice: 110000 },
]

interface Destination {
  name: string
  cities: string[]
  tags: string[]
  budget: "low" | "medium" | "high"
  seasons: string[]
  flightType: "direct" | "connection"
  flightPrice: number
}

interface UserPreferences {
  interests?: string[]           // ["пляж", "культура", "еда"]
  visitedCountries?: string[]    // ["Турция", "Египет"]
  travelStyle?: string[]         // ["adventure", "relaxation", "cultural"]
  pace?: "slow" | "moderate" | "fast"
  budget?: "economy" | "comfort" | "premium"
  companions?: string            // "solo", "couple", "family", "friends"
  dietaryRestrictions?: string[]
  season?: string                // "зима", "весна", "лето", "осень"
}

// Маппинг стилей на теги
const STYLE_TO_TAGS: Record<string, string[]> = {
  "adventure": ["горы", "сёрфинг", "сафари", "треккинг", "природа"],
  "relaxation": ["пляж", "релакс", "спа", "йога", "острова"],
  "cultural": ["культура", "история", "музеи", "храмы", "искусство"],
  "foodie": ["еда", "вино", "гастрономия", "рынки", "кулинария"],
  "nightlife": ["ночная жизнь", "клубы", "бары", "развлечения"],
  "romantic": ["романтика", "пляж", "люкс", "острова"],
  "family": ["развлечения", "пляж", "аквапарки", "природа"],
  "budget": ["бюджетный", "недорого"],
  "luxury": ["люкс", "премиум", "5 звёзд"],
  "shopping": ["шопинг", "мода", "базары"],
  "nature": ["природа", "горы", "пустыня", "океан", "сафари"],
  "spiritual": ["храмы", "духовность", "йога", "медитация"],
}

// Бюджетные уровни
const BUDGET_LEVELS: Record<string, "low" | "medium" | "high"> = {
  "economy": "low",
  "comfort": "medium",
  "premium": "high",
}

/**
 * Получить текущий сезон
 */
function getCurrentSeason(): string {
  const month = new Date().getMonth()
  if (month >= 2 && month <= 4) return "весна"
  if (month >= 5 && month <= 7) return "лето"
  if (month >= 8 && month <= 10) return "осень"
  return "зима"
}

/**
 * Рассчитать score совпадения направления с предпочтениями пользователя
 */
function calculateMatchScore(destination: Destination, prefs: UserPreferences): number {
  let score = 0

  // 1. Исключаем посещённые страны (полный дисквалификатор)
  if (prefs.visitedCountries?.some(v => v.toLowerCase() === destination.name.toLowerCase())) {
    return -1000 // Полностью исключаем
  }

  // 2. Совпадение интересов (+10 за каждое совпадение)
  if (prefs.interests) {
    const interestTags = prefs.interests.map(i => i.toLowerCase())
    const matchingTags = destination.tags.filter(t => interestTags.includes(t.toLowerCase()))
    score += matchingTags.length * 10
  }

  // 3. Совпадение стиля путешествия (+8 за каждое совпадение)
  if (prefs.travelStyle) {
    for (const style of prefs.travelStyle) {
      const styleTags = STYLE_TO_TAGS[style.toLowerCase()] || []
      const matchingTags = destination.tags.filter(t => styleTags.includes(t.toLowerCase()))
      score += matchingTags.length * 8
    }
  }

  // 4. Совпадение бюджета (+15 за точное совпадение, -5 за несовпадение)
  if (prefs.budget) {
    const userBudgetLevel = BUDGET_LEVELS[prefs.budget] || "medium"
    if (destination.budget === userBudgetLevel) {
      score += 15
    } else if (
      (userBudgetLevel === "low" && destination.budget === "high") ||
      (userBudgetLevel === "high" && destination.budget === "low")
    ) {
      score -= 5
    }
  }

  // 5. Совпадение сезона (+12 за совпадение)
  const currentSeason = prefs.season || getCurrentSeason()
  if (destination.seasons.includes(currentSeason)) {
    score += 12
  } else {
    score -= 3 // Небольшой штраф за несезон
  }

  // 6. Прямой рейс vs пересадка (+5 за прямой рейс, если бюджет economy)
  if (prefs.budget === "economy" && destination.flightType === "direct") {
    score += 5
  }

  // 7. Для семей — предпочитаем направления с тегом "семья" или "пляж"
  if (prefs.companions === "family") {
    if (destination.tags.includes("развлечения") || destination.tags.includes("пляж")) {
      score += 8
    }
  }

  // 8. Для пар — романтика
  if (prefs.companions === "couple") {
    if (destination.tags.includes("романтика") || destination.tags.includes("люкс")) {
      score += 8
    }
  }

  // 9. Рандомный бонус для разнообразия (±3)
  score += Math.random() * 6 - 3

  return score
}

/**
 * Получить персонализированные рекомендации направлений
 */
export function getPersonalizedDestinations(
  prefs: UserPreferences,
  count: number = 5
): Destination[] {
  // Рассчитываем score для каждого направления
  const scored = DESTINATIONS_DATABASE.map(dest => ({
    destination: dest,
    score: calculateMatchScore(dest, prefs)
  }))

  // Сортируем по score и берём топ
  const sorted = scored
    .filter(s => s.score > -100) // Исключаем посещённые
    .sort((a, b) => b.score - a.score)
    .slice(0, count)

  return sorted.map(s => s.destination)
}

/**
 * Получить текстовое описание рекомендаций для промпта AI
 */
export function getPersonalizedRecommendationsText(prefs: UserPreferences): string {
  const recommendations = getPersonalizedDestinations(prefs, 8)

  if (recommendations.length === 0) {
    return "Рассмотри любые популярные направления"
  }

  const lines: string[] = []

  // Группируем по регионам
  const regions: Record<string, Destination[]> = {}
  for (const dest of recommendations) {
    const region = getRegion(dest.name)
    if (!regions[region]) regions[region] = []
    regions[region].push(dest)
  }

  for (const [region, dests] of Object.entries(regions)) {
    const destNames = dests.map(d => `${d.name} (${d.cities.slice(0, 2).join(", ")})`).join(", ")
    lines.push(`- ${region}: ${destNames}`)
  }

  return `ПЕРСОНАЛИЗИРОВАННЫЕ РЕКОМЕНДАЦИИ для этого пользователя:\n${lines.join("\n")}`
}

function getRegion(country: string): string {
  const asia = ["Таиланд", "Вьетнам", "Индонезия", "Шри-Ланка", "Мальдивы", "Япония", "Южная Корея", "Китай", "Индия"]
  const middleEast = ["ОАЭ", "Катар", "Оман", "Иордания"]
  const caucasus = ["Грузия", "Армения", "Азербайджан"]
  const centralAsia = ["Узбекистан", "Казахстан"]
  const europe = ["Италия", "Испания", "Франция", "Португалия", "Греция", "Черногория", "Турция", "Сербия"]
  const africa = ["Египет", "Марокко", "Танзания", "ЮАР"]
  const latam = ["Мексика", "Аргентина", "Бразилия", "Перу"]

  if (asia.includes(country)) return "Азия"
  if (middleEast.includes(country)) return "Ближний Восток"
  if (caucasus.includes(country)) return "Кавказ"
  if (centralAsia.includes(country)) return "Центральная Азия"
  if (europe.includes(country)) return "Европа"
  if (africa.includes(country)) return "Африка"
  if (latam.includes(country)) return "Латинская Америка"
  return "Другие"
}

/**
 * Получить комбинации стран для multi-country trips
 */
export function getRecommendedCombinations(prefs: UserPreferences, countryCount: number = 2): string[][] {
  const recommendations = getPersonalizedDestinations(prefs, 10)

  const combinations: string[][] = []

  // Комбинации из одного региона (логичнее для путешествия)
  const byRegion: Record<string, string[]> = {}
  for (const dest of recommendations) {
    const region = getRegion(dest.name)
    if (!byRegion[region]) byRegion[region] = []
    byRegion[region].push(dest.name)
  }

  for (const countries of Object.values(byRegion)) {
    if (countries.length >= countryCount) {
      combinations.push(countries.slice(0, countryCount))
    }
  }

  // Добавляем классические комбинации если совпадают с рекомендациями
  const classicCombos = [
    ["Грузия", "Армения"],
    ["Узбекистан", "Казахстан"],
    ["Таиланд", "Вьетнам"],
    ["Италия", "Франция"],
    ["Испания", "Португалия"],
    ["ОАЭ", "Оман"],
    ["Япония", "Южная Корея"],
  ]

  for (const combo of classicCombos) {
    if (combo.every(c => recommendations.some(r => r.name === c))) {
      if (!combinations.some(existing => existing.every(e => combo.includes(e)))) {
        combinations.push(combo)
      }
    }
  }

  return combinations.slice(0, 5)
}
