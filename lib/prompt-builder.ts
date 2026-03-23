/**
 * Prompt Builder - Построение обогащённого промпта для AI
 * Объединяет все данные в один структурированный промпт
 */

import { collectDynamicContext, formatDynamicContextForPrompt, type DynamicContext } from "./context/dynamic-context"
import { formatTravelStyleForPrompt, getTravelStyle, type TravelStyleDefinition } from "./travel-styles"
import { getApplicableRules, STRICT_RULES, ACTIVITY_STRUCTURE_RULES, ITINERARY_STRUCTURE } from "./strict-rules"
import { type ValidationResult } from "./real-time-validation"
import { GROUNDING_DATA_2026 } from "./grounding"
import { normalizeTravelMode, type TravelMode } from "./travel-mode"

export type { TravelMode }

export interface PromptBuilderParams {
    // Locale
    locale?: 'ru' | 'en'

    // Базовые параметры
    departureCity: string
    destinations: string[]
    startDate: string
    endDate: string
    budget: number
    adjustedBudget?: number
    budgetDesc?: string

    // Стиль и предпочтения
    travelStyle?: string | string[]
    interests?: string[]
    companions?: string
    travelers?: number
    
    // Персонализация
    preferences?: {
        citizenship?: string
        gender?: string
        age?: number
        pace?: string
        languages?: string[]
        dietaryRestrictions?: string[]
        dietaryCustom?: string
        interestsDetailed?: string[]
        interestsCustom?: string
        visitedCountries?: string[]
    }

    // Контекст
    dynamicContext?: DynamicContext
    dynamicContextStr?: string
    validationResult?: ValidationResult
    warningsStr?: string

    // Дополнительные флаги
    isFirstDayLateArrival?: boolean
    isLastDayEarlyDeparture?: boolean
    flightArrivalTime?: string
    flightDepartureTime?: string

    // Специальные поля
    safeHighlight?: string
    /** Эмоциональный контекст / настроение всей поездки (отдельно от trip highlight) */
    tripVibe?: string
    destinationType?: string
    strictDestinations?: boolean
    countryCount?: string | number
    filterByDocuments?: boolean

    // Динамический статус аэропортов (от AeroDataBox)
    airportValidationContext?: string
    /** Основной тип передвижения между хабами (форма /plan) */
    travelMode?: TravelMode
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

/** Interest chip ids from /plan (not the same as TRAVEL_STYLES budget/comfort ids) */
const PLAN_INTEREST_LABELS_EN: Record<string, string> = {
    culture: "culture / museums / heritage",
    nature: "nature & outdoors",
    food: "food & dining",
    relax: "relaxation & slow pace",
    adventure: "active & adventure",
    shopping: "shopping",
    photo: "photography & scenic spots",
    luxury: "comfort & premium experiences",
    events: "events & shows",
    nightlife: "nightlife, bars, clubs, going out — prioritize real evening venues",
}

const PLAN_INTEREST_LABELS_RU: Record<string, string> = {
    culture: "культура, музеи, наследие",
    nature: "природа",
    food: "еда и гастрономия",
    relax: "релакс, спокойный темп",
    adventure: "активный отдых",
    shopping: "шопинг",
    photo: "фото и виды",
    luxury: "комфорт и премиум",
    events: "события и шоу",
    nightlife: "ночная жизнь, бары, клубы, тусовка — приоритет реальным вечерним местам",
}

function formatPlanInterestTags(ids: string[], isEn: boolean): string {
    if (!ids?.length) return isEn ? "(not specified)" : "(не указано)"
    const map = isEn ? PLAN_INTEREST_LABELS_EN : PLAN_INTEREST_LABELS_RU
    return ids.map((id) => map[id] || id).join(isEn ? " · " : " · ")
}

function formatTravelModeBlock(mode: TravelMode, isEn: boolean): string {
    if (mode === "flight") {
        return isEn
            ? `PRIMARY TRANSPORT MODE: Flights.
- Prefer air travel for major hub-to-hub legs; use trains/buses for short hops when flights are impractical.
- In logistics titles for flights, use IATA where applicable (e.g. MOW → IST).`.trim()
            : `ОСНОВНОЙ ТИП ПЕРЕДВИЖЕНИЯ: авиа.
- Между крупными хабами — перелёты; при коротких дистанциях или без авиасообщения — логично поезд/автобус.
- В заголовках логистики для перелётов используй IATA-коды.`.trim()
    }
    if (mode === "train") {
        return isEn
            ? `PRIMARY TRANSPORT MODE: Rail (long-distance trains).
- Prefer trains between cities; use flights only when rail is impractical or impossible (e.g. sea crossing).
- Where relevant, use realistic rail booking links (e.g. ticket.rzd.ru for Russia).`.trim()
            : `ОСНОВНОЙ ТИП ПЕРЕДВИЖЕНИЯ: ж/д.
- Между городами — поезда; авиа — только если ж/д нереалистичен или невозможен.
- В логистике указывай реальные ж/д направления; для РФ — ссылки ticket.rzd.ru где уместно.`.trim()
    }
    return isEn
        ? `PRIMARY TRANSPORT MODE: Own car (road trip) — user drives their vehicle.
- FORBIDDEN as main intercity logistics: private transfers, chauffeured "business class" sedans, pre-booked driver between cities, tips/fees for a hired driver on long legs, Kiwitaxi/intercity taxi as the primary way to move between hubs.
- REQUIRED wording: "in your own car", "driving", "road segment", fuel, tolls, parking, realistic drive time. City hops by air/train are NOT the default in this mode.
- Short urban rides (taxi/ride-hail) inside a city for parking or nightlife are OK occasionally — they must NOT replace intercity driving.
- Flights/trains between cities only if the user clearly switches mode (they did NOT — car mode is active).

ROAD TRIP TO THE DESTINATION (structure the calendar, not a single line):
- A long drive can take many hours or more than one calendar day — do NOT collapse it into one vague "drove there". Spread it across day 1 (or several days) with a believable timeline.
- If total drive time is ~8 hours or less after morning departure: you may use 0–1 short stop only (coffee, fuel) — no need to invent sightseeing unless it fits naturally.
- If longer: add at least 1–2 concrete stops along the route: chain food near the highway (e.g. McDonald's / roadside café), scenic viewpoint, lake or river pull-off, short park visit, rest ~30–60 min — things real drivers actually do.
- If the route realistically needs more than one day: split into multiple days with an overnight stop on the way, breakfast → drive segments → stops → hotel; each long driving day should include breaks.
- Use activity types sensibly: type=transport for driving legs (with duration/distance in desc); type=food for meals at stops; type=activity for a short waypoint visit; keep mapLink for real places near the route.`.trim()
        : `ОСНОВНОЙ ТИП ПЕРЕДВИЖЕНИЯ: СВОЯ МАШИНА (автопутешествие) — пользователь едет на своём авто.
- ЗАПРЕЩЕНО как основной межгород: заказные трансферы, «приватный трансфер», машина с водителем/бизнес-класс между городами, чаевые водителю за межгород, Kiwitaxi/межгородское такси вместо поездки на своей машине.
- НУЖНО: формулировки «на своём авто», «за рулём», «трасса», «время в пути», топливо, платные участки, парковка. Перелёт/поезд между хабами — не по умолчанию (режим — машина).
- Короткое такси внутри города (до ресторана/отеля) допустимо точечно; НЕ подменяй им межгород.
- Не предлагай отдельную строку бюджета «оплата водителю» между городами — пользователь сам водит.

ДОРОГА ДО ПУНКТА НАЗНАЧЕНИЯ (заполни день/дни по календарю, а не одной строкой «доехали»):
- Длинный переезд может занять много часов или больше суток — распредели по дню 1 (или нескольким дням): выезд, несколько слотов в пути, прибытие/ночёвка.
- Если время в пути примерно до ~8 часов после завтрака — достаточно 0–1 короткой остановки (кофе, заправка); не обязательно тащить «достопримечательности», если логичнее просто доехать.
- Если дольше — минимум 1–2 осмысленные остановки по трассе: еда у дороги (сеть вроде McDonald's, придорожное кафе), смотровая, озеро/парк/короткий заезд к воде, отдых ~30–60 минут — то, что реально делают за рулём.
- Если маршрут по времени тянется больше суток — разбей на несколько дней: ночёвка по пути, на каждом длинном дне — завтрак, сегменты за рулём, остановки, вечер.
- Типы: transport — сегменты «ехали N ч / км»; food — перекус у трассы; activity — короткий визит у озера/точки у дороги; у реальных мест — mapLink.`.trim()
}

/**
 * Практические советы (визы, карты, безопасность, общение) — по профилю, не по locale UI.
 */
function formatTravelerTipsPolicy(
    isEn: boolean,
    preferences?: PromptBuilderParams["preferences"]
): string {
    const cit = preferences?.citizenship?.trim()
    const langs = preferences?.languages?.length
        ? preferences.languages.join(isEn ? ", " : ", ")
        : ""
    if (!cit && !langs) {
        return isEn
            ? `TRAVELER TIPS POLICY: Profile has no citizenship/languages — give broadly useful advice; do NOT infer traveler nationality or "default language abroad" from the UI locale (RU vs EN).`
            : `ПОЛИТИКА СОВЕТОВ: в профиле нет гражданства/языков — нейтральные советы; НЕ выводи национальность и «язык за границей» из языка интерфейса (RU/EN).`
    }
    return isEn
        ? `TRAVELER TIPS POLICY (PROFILE — NOT UI LANGUAGE):
- visaAdvice, paymentAdvice, safetyInfo.tips, restrictions, and practical notes in day "tips" must reflect REAL needs of a **${cit || "—"}** passport holder (documents, embassies, entry rules, bank cards, cash).
- Where relevant, mention communication: profile languages **${langs || "—"}** — do NOT assume English/Russian proficiency from the itinerary output language.
- The UI may be RU or EN only for display — do NOT tailor visa/payment/safety substance to that choice.`
        : `ПОЛИТИКА СОВЕТОВ (ПРОФИЛЬ — НЕ ЯЗЫК ИНТЕРФЕЙСА):
- visaAdvice, paymentAdvice, safetyInfo.tips, restrictions и практичные day.tips — от **гражданства**: ${cit || "—"} (документы, посольства, въезд, карты, наличные).
- Общение за границей — от **языков профиля**: ${langs || "—"}; не предполагай владение EN/RU только из языка ответа.
- Язык интерфейса (RU/EN) задаёт только форму текста, не содержание виз/оплаты/безопасности.`
}

function logisticsRuleLine1(mode: TravelMode, isEn: boolean): string {
    if (isEn) {
        if (mode === "flight") {
            return "1. LOGISTICS: Prefer direct flights for long legs; use trains for segments under ~600 km when sensible."
        }
        if (mode === "train") {
            return "1. LOGISTICS: Prefer long-distance rail between cities; use flights only when rail is impractical or impossible."
        }
        return "1. LOGISTICS: Own car — intercity segments as the driver; NO chauffeured intercity transfers or business taxi as the main mode; parking/tolls/fuel; flights only if driving is impossible."
    }
    if (mode === "flight") {
        return "1. ЛОГИСТИКА: Прямые рейсы — приоритет! Расстояние < 600 км — поезд."
    }
    if (mode === "train") {
        return "1. ЛОГИСТИКА: Приоритет — ж/д между городами; авиа только если поезд нереалистичен или невозможен."
    }
    return "1. ЛОГИСТИКА: Своя машина — межгород только как водитель; без заказных трансферов и «бизнес-такси» между городами; парковка/топливо/трасса."
}

/**
 * Построить обогащённый промпт для генерации маршрута
 */
export async function buildEnrichedPrompt(params: PromptBuilderParams): Promise<EnrichedPrompt> {
    const {
        locale = 'ru',
        departureCity,
        destinations,
        startDate,
        endDate,
        budget,
        adjustedBudget,
        budgetDesc,
        travelStyle,
        interests,
        companions,
        travelers,
        preferences,
        dynamicContext,
        dynamicContextStr,
        validationResult,
        warningsStr,
        isFirstDayLateArrival,
        isLastDayEarlyDeparture,
        flightArrivalTime,
        flightDepartureTime,
        safeHighlight,
        tripVibe,
        destinationType,
        strictDestinations,
        countryCount,
        filterByDocuments,
        airportValidationContext,
        travelMode: travelModeRaw,
    } = params

    const travelMode = normalizeTravelMode(travelModeRaw)

    const isEn = locale === 'en'
    const currencySymbol = isEn ? '$' : '₽'
    const currencyLocale = isEn ? 'en-US' : 'ru-RU'
    const outputLang = isEn ? 'English' : 'Russian (РУССКОМ)'

    // Рассчитываем длительность
    const durationDays = startDate && endDate 
        ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
        : 7

    const effectiveBudget = adjustedBudget || budget
    const travelStyleArray = Array.isArray(travelStyle) ? travelStyle : (travelStyle ? [travelStyle] : [])
    const hasCultureInterest = travelStyleArray.includes("culture")
    const mainTravelStyle = travelStyleArray[0] || ""
    const legacyStyleHints = travelStyleArray.map((id) => formatTravelStyleForPrompt(id)).filter(Boolean).join("\n\n")

    // ========================
    // СИСТЕМНЫЙ ПРОМПТ
    // ========================
    const systemPromptBase = isEn
        ? `You are a TraveLLM expert travel planner. Respond with ONLY valid JSON. Be specific and detailed.\n\n${ITINERARY_STRUCTURE}`
        : `Ты — эксперт-планировщик путешествий TraveLLM для русских туристов. Отвечаешь ТОЛЬКО JSON. Будь конкретен.\n\n${ITINERARY_STRUCTURE}`
    const systemPrompt = tripVibe?.trim()
        ? `${systemPromptBase}\n\n${isEn
            ? "When the user message includes TRIP MOOD & ATMOSPHERE (HIGHEST PRIORITY), it overrides generic \"must-see\" landmark habits and template day patterns — especially if they conflict (e.g. nightlife vs temple circuits)."
            : "Если в запросе есть блок «ВАЙБ И АТМОСФЕРА (ВЫСШИЙ ПРИОРИТЕТ)» — следуй ему сильнее, чем шаблонным примерам и привычке набивать день храмами/музеями, если это противоречит описанному настроению."}`
        : systemPromptBase

    // ========================
    // ПОЛЬЗОВАТЕЛЬСКИЙ ПРОМПТ
    // ========================
    const userParts: string[] = []

    // 1. ИСХОДНЫЕ ДАННЫЕ
    const budgetFormatted = budgetDesc || `${effectiveBudget.toLocaleString(currencyLocale)} ${currencySymbol}`
    userParts.push(isEn ? `
Create a detailed professional travel itinerary in ENGLISH.

TRIP DATA:
- Departure city: ${departureCity}
- Destination: ${destinations.join(", ")}
${destinationType === 'russia' && destinations.length === 0 ? `⚠️ CRITICAL: Route ONLY within Russia (RF). All cities and places MUST be on the territory of the Russian Federation.` : ''}
- Number of countries/cities: ${destinations.length > 0 ? destinations.length : (countryCount === "more" ? 4 : parseInt(countryCount as string) || 1)}
- Dates: ${startDate || 'Flexible'} — ${endDate || 'Flexible'} (${durationDays} days)
${warningsStr ? `⚠️ CURRENT WARNINGS FOR THESE DATES: ${warningsStr}` : ''}
${dynamicContextStr ? `\nCURRENT CONTEXT (GROUNDING):\n${dynamicContextStr}` : ''}
- Budget: ${budgetFormatted}
⚠️ STRICT BUDGET LIMIT: ${budgetFormatted} MAXIMUM FOR THE ENTIRE TRIP.
`.trim() : `
Создай детальный профессиональный маршрут путешествия на РУССКОМ языке.

ИСХОДНЫЕ ДАННЫЕ:
- Город отправления: ${departureCity}
- Направление: ${destinations.join(", ")}
${destinationType === 'russia' && destinations.length === 0 ? `⚠️ КРИТИЧНО: Маршрут ТОЛЬКО по России (РФ). Все города и места ОБЯЗАНЫ находиться на территории Российской Федерации. НЕЛЬЗЯ предлагать: Грузию, Батуми, Тбилиси, Беларусь, Казахстан, Армению, Азербайджан, Украину, любые страны СНГ и зарубежья.` : ''}
- Количество стран/городов: ${destinations.length > 0 ? destinations.length : (countryCount === "more" ? 4 : parseInt(countryCount as string) || 1)}
- Даты: ${startDate || 'Гибкие'} — ${endDate || 'Гибкие'} (${durationDays} дней)
${warningsStr ? `⚠️ АКТУАЛЬНЫЕ ПРЕДУПРЕЖДЕНИЯ ДЛЯ ЭТИХ ДАТ: ${warningsStr}` : ''}
${dynamicContextStr ? `\nАКТУАЛЬНЫЙ КОНТЕКСТ (GROUNDING):\n${dynamicContextStr}` : ''}
- Бюджет: ${budgetFormatted}
⚠️ ЖЁСТКИЙ ЛИМИТ БЮДЖЕТА: ${budgetFormatted} МАКСИМУМ НА ВСЮ ПОЕЗДКУ.
`.trim())

    userParts.push(formatTravelModeBlock(travelMode, isEn))

    // 2. ОБЯЗАТЕЛЬНЫЕ МЕСТА
    const strictGeo = strictDestinations !== false
    if (destinations.length > 0) {
        const geoExtra = strictGeo
            ? (destinations.length === 1
                ? `
⚠️ ГЕОГРАФИЯ (СТРОГО): в форме указан ОДИН пункт — весь маршрут только в этом городе/агломерации. ЗАПРЕЩЕНО добавлять другие города (Сочи, Адлер, Геленджик и т.д.) как отдельные дни, «трансферы» или экскурсии без явного запроса пользователя в тексте.`
                : `
⚠️ ГЕОГРАФИЯ (СТРОГО): только города из списка ниже. НЕ добавляй посторонние города «для разнообразия», дневные выезды в соседний курорт и т.п., если пользователь этого не просил.`)
            : ""
        userParts.push(`
КРИТИЧНО — ОБЯЗАТЕЛЬНЫЕ ПУНКТЫ НАЗНАЧЕНИЯ:
Маршрут ДОЛЖЕН включать ВСЕ указанные ниже места. НЕ ПРОПУСКАЙ НИ ОДНО!
${destinations.map((d, i) => `${i + 1}. ${d}`).join('\n')}
Распредели время равномерно между всеми пунктами!
${strictGeo ? `⚠️ НЕ МЕНЯЙ И НЕ ПОДМЕНЯЙ ГОРОДА НИ ПРИ КАКИХ УСЛОВИЯХ (даже если бюджет ограничен).` : `⚠️ Пользователь разрешил гибкость маршрута (economy) — можно слегка скорректировать города в рамках бюджета, но не ломай общий смысл поездки.`}
${geoExtra}
`.trim())
    }

    // 3. РОССИЯ-СПЕЦИФИЧНЫЕ ПРАВИЛА
    const isRussia = destinationType === 'russia' || destinations.some(d => d.toLowerCase().includes('россия'))
    if (isRussia) {
        userParts.push(`
🇷🇺 ОСОБЕННОСТИ МАРШРУТОВ ПО РОССИИ:
Сделай путешествие по России ЯРКИМ, АКТИВНЫМ и АТМОСФЕРНЫМ.
- МЕНЬШЕ МУЗЕЕВ, БОЛЬШЕ ЖИЗНИ.
- Природные регионы (Карелия, Камчатка, Кавказ, Алтай): Максимум активности (треккинг, джип-туры, выходы в море).
- Крупные города: Креативные кластеры, местная гастрономия, стрит-фуд, необычные бары.
`.trim())
    }

    // 4. ПЕРСОНАЛИЗАЦИЯ
    const citizenshipLine = preferences?.citizenship
        ? (isEn ? `- Citizenship: ${preferences.citizenship}` : `- Гражданство: ${preferences.citizenship}`)
        : ''
    const languagesLine = preferences?.languages?.length
        ? (isEn ? `- Spoken languages: ${preferences.languages.join(', ')}` : `- Языки: ${preferences.languages.join(', ')}`)
        : ''
    const visitedLine = preferences?.visitedCountries?.length
        ? (isEn ? `- Already visited: ${preferences.visitedCountries.join(', ')} (don't repeat unless requested)` : `- Уже посещённые страны: ${preferences.visitedCountries.join(', ')} (не повторяй эти направления если не просят)`)
        : ''
    const docsLine = filterByDocuments && preferences?.citizenship
        ? (isEn
            ? `⚠️ VISA RESTRICTIONS: Consider real visa requirements for a "${preferences.citizenship}" citizen. Prioritize visa-free or e-visa destinations.`
            : `⚠️ ВИЗОВЫЕ ОГРАНИЧЕНИЯ: Учти реальные визовые требования для гражданина "${preferences.citizenship}". Приоритет — безвизовые или e-visa направления.`)
        : ''

    userParts.push(isEn ? `
PERSONALIZATION:
- Trip themes (selected on plan form): ${formatPlanInterestTags(travelStyleArray, true)}
${legacyStyleHints ? `- Extended style profile (when applicable):\n${legacyStyleHints}` : ""}
- Companions: ${companions || 'Not specified'} (${travelers || 2} people)
- Pace: ${preferences?.pace || 'moderate'}
- Diet: ${preferences?.dietaryRestrictions?.join(', ') || 'No restrictions'}
- Profile interests / notes: ${preferences?.interestsDetailed?.join(', ') || '—'}
${citizenshipLine}
${languagesLine}
${visitedLine}
${docsLine}
`.trim() : `
ПЕРСОНАЛИЗАЦИЯ:
- Темы поездки (чипы на форме планирования): ${formatPlanInterestTags(travelStyleArray, false)}
${legacyStyleHints ? `- Расширенный профиль стиля (если применимо):\n${legacyStyleHints}` : ""}
- Компания: ${companions || 'Не указано'} (${travelers || 2} чел.)
- Темп: ${preferences?.pace || 'moderate'}
- Диета: ${preferences?.dietaryRestrictions?.join(', ') || 'Без ограничений'}
- Интересы в профиле / заметки: ${preferences?.interestsDetailed?.join(', ') || '—'}
${citizenshipLine}
${languagesLine}
${visitedLine}
${docsLine}
`.trim())

    userParts.push(formatTravelerTipsPolicy(isEn, preferences))

    if (!hasCultureInterest) {
        userParts.push(isEn ? `
NO DEFAULT PERFORMING ARTS:
- Do NOT add theatre, philharmonic, opera, ballet, or classical concert halls as a default "cultural evening" unless the user selected the **culture** theme on the plan form OR the trip mood / highlight explicitly asks for shows or classical music.
- "Luxury" means premium hotels, dining, spas, and service — NOT automatic theatre visits.
`.trim() : `
БЕЗ ТЕАТРА ПО УМОЛЧАНИЮ:
- НЕ добавляй театр, филармонию, оперу, балет, классические концертные залы как «вечернюю культурную активность», если пользователь НЕ выбрал тему «культура» на форме и в вайбе/изюминке нет явного запроса на шоу/классику.
- «Люкс» — премиум-отель, гастрономия, сервис, атмосфера; это НЕ повод самовольно вставлять театр.
`.trim())
    }

    // 4b. ВАЙБ / НАСТРОЕНИЕ ПОЕЗДКИ (выше приоритета «типичных must-see»)
    if (tripVibe?.trim()) {
        const escaped = tripVibe.replace(/"/g, "'")
        userParts.push(isEn ? `
TRIP MOOD & ATMOSPHERE (HIGHEST PRIORITY):
The traveler wrote: "${escaped}"

MANDATORY RULES:
1) This block overrides generic "must-see" habits and default sightseeing mixes (especially temple/museum-heavy days) when they conflict with the mood described.
2) If they asked for nightlife, bars, clubs, parties, rooftops, or "going out" — allocate MOST evenings to concrete nightlife (named venues, nightlife districts, live music, lounges, craft bars). Do NOT replace that with long chains of morning temple visits.
3) Temples, cathedrals, major museums are optional seasoning: at most a few short visits across the whole trip unless the vibe explicitly asks for culture/spiritual/history focus.
4) Reflect the vibe in day titles, activity choices, and pacing. Multiple cities with different moods → split by days. Do not paste this block verbatim into the JSON output.
`.trim() : `
ВАЙБ И АТМОСФЕРА ПОЕЗДКИ (ВЫСШИЙ ПРИОРИТЕТ):
Текст пользователя: "${escaped}"

ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА:
1) Этот блок важнее шаблонных «обязательных» достопримечательностей и привычки набивать день храмами/музеями, если это противоречит описанному настроению.
2) Если в тексте ночная жизнь, бары, клубы, вечеринки, крыши, тусовка — большинство вечеров должны быть конкретной ночной жизнью (названные бары, кварталы ночной жизни, live music, лаунжи). НЕ ЗАМЕНЯЙ это бесконечными утренними храмами.
3) Храмы, соборы, крупные музеи — опционально и умеренно: не больше нескольких коротких визитов за всю поездку, если вайб не про культуру/религию/историю.
4) Отрази вайб в заголовках дней, типах активностей и темпе. Разные города — разные дни. Не копируй этот блок дословно в JSON.
`.trim())
    }

    // 5. РЕАЛЬНОСТЬ 2026
    userParts.push(`
РЕАЛЬНОСТЬ ЯНВАРЯ 2026 (КРИТИЧНО):
- Ограничения: ${GROUNDING_DATA_2026.globalRestrictions.join('; ')}
- Авиасообщение: Прямые рейсы доступны во многие страны (Турция, ОАЭ, Сербия, Китай, Таиланд, Грузия, Армения и др.). В Европу и США — через пересадочные хабы (Стамбул, Ереван, Баку, Доха).
- Тренды: ${Object.values(GROUNDING_DATA_2026.trendingLocations).flat().join(', ')}
${airportValidationContext ? `- АЭРОПОРТЫ: ${airportValidationContext}` : ''}
`.trim())

    // 6. СПЕЦИАЛЬНОЕ ПОЖЕЛАНИЕ
    if (safeHighlight) {
        userParts.push(`
✨ ОСОБОЕ ЛИЧНОЕ ПОЖЕЛАНИЕ ПОЛЬЗОВАТЕЛЯ:
"${safeHighlight}"
ПРАВИЛА: ВЫБЕРИ страну/атмосферу согласно этому пожеланию. Помечай такие активности "(✨ специально для тебя)" в desc. НЕ комментируй пожелание напрямую.
`.trim())
    }

    // 7. ТЕХНИЧЕСКИЕ ПРАВИЛА (IATA, ССЫЛКИ, VIRAL SPOTS)
    const carLinkNote = travelMode === "car"
        ? (isEn
            ? `1b. OWN CAR MODE: For intercity transport activities, do NOT use Kiwitaxi/intercity taxi booking links as the primary link; prefer Google Maps route or omit paid booking — the user drives.`
            : `1b. РЕЖИМ «СВОЯ МАШИНА»: для межгородского transport НЕ ставь kiwitaxi/intui как основную ссылку; достаточно mapLink маршрута или пояснения «свой автомобиль» без заказа трансфера.`)
        : ""

    userParts.push(`
ТЕХНИЧЕСКИЕ ПРАВИЛА:
${logisticsRuleLine1(travelMode, isEn)}
${carLinkNote ? `${carLinkNote}\n` : ""}2. ФОРМАТ ТРАНСПОРТА: В title указывай IATA коды, например: "Перелёт Москва (MOW) → Стамбул (IST)".
3. VIRAL SPOTS: Добавь 3-5 популярных в TikTok/Instagram локаций в отдельный массив viralSpots.
4. IMAGE QUERY: Для каждой активности (hotel, food, activity) добавь imageQuery на АНГЛИЙСКОМ для Pexels (например: "Art Deco hotel rooftop pool skyline Istanbul golden hour"). НЕ используй собственные имена.

5. ССЫЛКИ — КРИТИЧЕСКИ ВАЖНО, заполняй для КАЖДОЙ активности:

   mapLink (ВСЕГДА, кроме перелётов):
     "https://www.google.com/maps/search/?api=1&query={PlaceName}+{City}"

   transport (авиа) → link:
     "https://www.aviasales.ru/search/{ORG}{DDMM}{DEST}1"
     Пример: "https://www.aviasales.ru/search/MOW1506BKK1"
     (mapLink НЕ нужен для перелётов)

   transport (поезд) → link:
     "https://ticket.rzd.ru/"

   transport (трансфер/такси) → link:
     "https://kiwitaxi.ru/"

   hotel → bookingUrl (НЕ карта!):
     "https://www.booking.com/hotel/{cc}/{hotel-slug}.ru.html"
     Если нет прямой ссылки: "https://www.booking.com/search.html?ss={HotelName}%2C+{City}"
     Запасной: "https://ostrovok.ru/hotel/russia/{city}/{hotel-slug}/"

   food → link:
     TripAdvisor или официальный сайт ресторана
     Пример: "https://www.tripadvisor.ru/Restaurant_Review-g..."

   activity (музей/экскурсия) → link + ticketUrl:
     Официальный сайт ИЛИ GetYourGuide: "https://www.getyourguide.ru/s/?q={PlaceName}+{City}"
     Если продаёт онлайн-билеты — ticketUrl = та же ссылка

   ПРИКЛЮЧЕНЧЕСКИЕ АКТИВНОСТИ (дайвинг, серфинг, парашют, параглайдинг, яхта, рафтинг,
   вертолётная экскурсия, джип-тур, квадроциклы, зиплайн, скалолазание, каяк, теплоход) → link:
     GetYourGuide: "https://www.getyourguide.ru/s/?q={activity+keyword}+{city}"
     Klook: "https://www.klook.com/ru/search/?q={activity}+{city}"
     Viator: "https://www.viator.com/ru-RU/search?q={activity}+{city}"
     (Россия, прыжок с парашютом): "https://skydiving.ru/"
     (Россия, рафтинг): "https://www.rafting.ru/"
     (Москва/СПб, теплоход): "https://rechnoyflot.ru/"
     Правило: ВСЕГДА выбирай ту платформу, где реально можно забронировать данную активность в данном городе.
`.trim())

    // 8. ФОРМАТ ОТВЕТА
    userParts.push(isEn ? `
RESPONSE FORMAT:
Return strictly a JSON object with these fields (ALL TEXT IN ENGLISH, costs in USD $):
- title, description, totalBudget
- budgetAnalysis: { avgAccommodation, avgFood, avgTransport, avgActivities, avgMisc }
- visaAdvice, paymentAdvice, restrictions — substance per TRAVELER TIPS POLICY (citizenship/profile languages), not UI locale
- safetyInfo: { rating (number 1-10), tips } — same policy
- countries: [{ name, visaRequired, visaType }]
- tags: string[]
- viralSpots: [{ name, desc, mapLink }]
- itinerary: [{ day, title, dayTotal, tips, activities: [...] }] — day "tips": practical notes follow TRAVELER TIPS POLICY when mentioning documents, money, safety, language on the ground
  activities: [{ time, type, title, placeName, desc, cost, imageQuery, mapLink, link, bookingUrl, ticketUrl }]
  Link fields: mapLink (place map), link (booking/site), bookingUrl (hotel/food only), ticketUrl (paid activities only)
  activity "cost": realistic USD for the destination — do NOT paste large local-currency integers (e.g. IDR/VND) as if they were dollars.
`.trim() : `
ФОРМАТ ОТВЕТА:
Верни строго JSON объект со следующими полями:
- title, description, totalBudget
- budgetAnalysis: { avgAccommodation, avgFood, avgTransport, avgActivities, avgMisc }
- visaAdvice, paymentAdvice, restrictions — содержание по ПОЛИТИКЕ СОВЕТОВ (гражданство/языки профиля), не под язык интерфейса
- safetyInfo: { rating (число 1-10), tips } — то же
- countries: [{ name, visaRequired, visaType }]
- tags: string[]
- viralSpots: [{ name, desc, mapLink }]
- itinerary: [{ day, title, dayTotal, tips, activities: [...] }] — поле tips у дня: практические советы по ПОЛИТИКЕ СОВЕТОВ, если речь о документах, деньгах, безопасности, языке на месте
  activities: [{ time, type, title, placeName, desc, cost, imageQuery, mapLink, link, bookingUrl, ticketUrl }]
  Поля ссылок: mapLink (карта места), link (бронирование/сайт), bookingUrl (только hotel/food), ticketUrl (только платные activities)
  ЦЕНЫ cost: только реалистичные суммы в ₽; для зарубежных направлений пересчитай с местной валюты — не подставляй крупные числа IDR/VND как «рубли».
`.trim())

    const userPrompt = userParts.join("\n\n")

    return {
        systemPrompt,
        userPrompt,
        metadata: {
            contextIncluded: !!dynamicContext || !!dynamicContextStr,
            styleIncluded: !!mainTravelStyle,
            rulesIncluded: true,
            budgetAdjusted: !!adjustedBudget && adjustedBudget > budget
        }
    }
}

/**
 * Промпт для генерации метаданных (title, countries, tripPlan)
 */
export function buildMetadataPrompt(params: PromptBuilderParams): string {
    const {
        departureCity,
        destinations,
        startDate,
        endDate,
        budget,
        budgetDesc,
        travelStyle,
        countryCount,
        safeHighlight,
        warningsStr,
        preferences,
        tripVibe,
        locale = 'ru',
        travelMode: travelModeRaw,
        strictDestinations,
    } = params

    const travelMode = normalizeTravelMode(travelModeRaw)
    const isEn = locale === 'en'
    const strictGeo = strictDestinations !== false
    const transportHint =
        travelMode === "train"
            ? isEn
                ? "TRANSPORT: rail-first (trains between cities; flights only if rail impractical)."
                : "ТРАНСПОРТ: приоритет ж/д между городами; авиа только если поезд нереалистичен."
            : travelMode === "car"
              ? isEn
                  ? "TRANSPORT: OWN CAR — user drives; NO chauffeured intercity transfers/taxi as main mode; fuel/parking/tolls; long drives = structured day(s) with stops along the route (meals, short waypoints), multi-day if needed."
                  : "ТРАНСПОРТ: СВОЯ МАШИНА — за рулём; без трансферов/бизнес-такси как основы; длинный путь = день(и) с остановками у трассы, при необходимости несколько суток в пути."
              : isEn
                ? "TRANSPORT: flights for long legs; trains for short hops when sensible."
                : "ТРАНСПОРТ: перелёты на длинных дистанциях; поезд на коротких при необходимости."
    const geoHint =
        strictGeo && destinations.length === 1
            ? (isEn
                ? `GEO (STRICT): tripPlan must stay in "${destinations[0]}" only — do NOT add other hub cities (e.g. Sochi) unless the user asked.`
                : `ГЕО (СТРОГО): весь tripPlan только в "${destinations[0]}" — НЕ добавляй другие города-хабы (Сочи, Адлер и т.д.), если пользователь не просил.`)
            : ""
    const durationDays = startDate && endDate 
        ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
        : 7

    const travelStyleArray = Array.isArray(travelStyle) ? travelStyle : (travelStyle ? [travelStyle] : [])
    const vibeMeta = tripVibe?.trim()
        ? (isEn
            ? `TRIP MOOD (must shape title, tags, viral spots — not generic temple tours): "${tripVibe.replace(/"/g, "'").slice(0, 500)}"`
            : `ВАЙБ ПОЕЗДКИ (должен отразиться в названии, тегах, viral spots — не обобщённый «тур по храмам»): "${tripVibe.replace(/"/g, "'").slice(0, 500)}"`)
        : ''

    return `
Generate ONLY the metadata for a travel itinerary. NO itinerary days needed.

DESTINATION: ${destinations.join(', ')}
DEPARTURE: ${departureCity}
${transportHint}
${geoHint}
DURATION: ${durationDays} days
${warningsStr ? `WARNINGS: ${warningsStr}` : ''}
BUDGET: ${budgetDesc || `${budget.toLocaleString()} RUB`}
STYLE: ${travelStyleArray.join(', ')}
PLAN THEMES: ${formatPlanInterestTags(travelStyleArray, isEn)}
⚠️ MANDATORY COUNTRIES COUNT: ${countryCount === "more" ? "4+" : (countryCount || "1")}
PACE: ${preferences?.pace || 'moderate'}
VISITED: ${preferences?.visitedCountries?.join(', ') || 'None'}
${safeHighlight ? `SPECIAL USER WISH: "${safeHighlight}"` : ''}
${vibeMeta ? `\n${vibeMeta}` : ''}

${formatTravelerTipsPolicy(isEn, preferences)}
${isEn ? "(visaAdvice / paymentAdvice / safetyInfo in this JSON must follow the policy above.)" : "(поля visaAdvice / paymentAdvice / safetyInfo в этом JSON — по политике выше.)"}

CURRENT REALITY (JAN 2026):
- Restrictions: ${GROUNDING_DATA_2026.globalRestrictions.join(' ')}
- Flights: ${GROUNDING_DATA_2026.flightConnectivity.join(' ')}

Output VALID JSON only:
{
  "title": "Название маршрута",
  "description": "Краткое описание на 2-3 предложения",
  "totalBudget": "Рассчитывается автоматически",
  "budgetAnalysis": {
    "avgAccommodation": "5000 ₽/ночь",
    "avgFood": "3000 ₽/день",
    "avgTransport": "15000 ₽",
    "avgActivities": "5000 ₽/день",
    "avgMisc": "3000 ₽"
  },
  "visaAdvice": "Страна1: требования. Страна2: требования.",
  "paymentAdvice": "Какие карты работают, где менять деньги",
  "safetyInfo": { "rating": 8, "tips": "Советы по безопасности" },
  "restrictions": "Текущие ограничения или null",
  "countries": [{"name": "Страна", "visaRequired": true, "visaType": "Шенген/национальная/безвиз"}],
  "tags": ["вино", "горы", "море"],
  "viralSpots": [
    { "name": "Название места", "desc": "Почему это хайпово", "mapLink": "https://..." }
  ],
  "tripPlan": [
    { "startDay": 1, "endDay": 4, "city": "Город", "country": "Страна" }
  ]
}
`.trim()
}

/**
 * Промпт для генерации отдельного блока дней (chunk)
 */
export function buildDayChunkPrompt(params: {
    startDay: number;
    endDay: number;
    durationDays: number;
    departureCity: string;
    destination: string;
    budgetDesc: string;
    travelStyle: string[];
    preferences: any;
    safeHighlight?: string;
    tripVibe?: string;
    locale?: 'ru' | 'en';
    warningsStr?: string;
    planForChunk?: string;
    previousContext?: any;
    isCountryChange?: boolean;
    travelMode?: TravelMode;
}): string {
    const {
        startDay,
        endDay,
        durationDays,
        departureCity,
        destination,
        budgetDesc,
        travelStyle,
        preferences,
        safeHighlight,
        tripVibe,
        locale = 'ru',
        warningsStr,
        planForChunk,
        previousContext,
        isCountryChange,
        travelMode: travelModeRaw,
    } = params

    const travelMode = normalizeTravelMode(travelModeRaw)
    const isEn = locale === 'en'
    const modeLine =
        travelMode === "train"
            ? isEn
                ? "Transport: rail-first between cities."
                : "Транспорт: приоритет ж/д между городами."
            : travelMode === "car"
              ? isEn
                  ? "Transport: own car — driving segments only; no chauffeured intercity transfers."
                  : "Транспорт: своя машина — межгород на своём авто; без заказных трансферов и бизнес-такси между городами."
              : isEn
                ? "Transport: flights for long legs; trains for short hops when sensible."
                : "Транспорт: перелёты на длинных дистанциях; поезд на коротких при необходимости."
    const isFirstChunk = startDay === 1
    const isLastChunk = endDay === durationDays
    const startLocation = previousContext?.lastCity || departureCity
    const vibeChunk = tripVibe?.trim()
        ? (isEn
            ? `⚠️ TRIP MOOD (HIGHEST PRIORITY for these days): "${tripVibe.replace(/"/g, "'")}" — reflect in evenings and days; do NOT fill with temples/museums if the mood says nightlife/bars.`
            : `⚠️ ВАЙБ ПОЕЗДКИ (высший приоритет для этих дней): "${tripVibe.replace(/"/g, "'")}" — отрази во вечерних и дневных слотах; не заполняй только храмами/музеями, если в вайбе ночная жизнь/бары.`)
        : ''
    const roadTripChunkHint =
        travelMode === "car"
            ? isEn
                ? "Road-trip days: several time slots — driving legs + food/activity stops along the route (not one empty transport line)."
                : "Дни на своём авто: несколько слотов — сегменты за рулём + остановки по пути (еда, короткие точки), не одна пустая строка «переезд»."
            : ""

    return `
Сгенерируй ДНИ ${startDay}-${endDay} из ${durationDays}-дневного маршрута.

КОНТЕКСТ:
- Направление: ${destination}
- Город отправления: ${departureCity}
- ${modeLine}
${roadTripChunkHint ? `- ${roadTripChunkHint}\n` : ""}
- Темы с формы: ${formatPlanInterestTags(travelStyle, isEn)}
- Стиль (legacy ids): ${travelStyle.join(', ')}
- Темп: ${preferences?.pace || 'moderate'}
- Бюджет: ${budgetDesc}
${warningsStr ? `⚠️ АКТУАЛЬНЫЕ ПРЕДУПРЕЖДЕНИЯ: ${warningsStr}` : ''}
${safeHighlight ? `- ОСОБОЕ ПОЖЕЛАНИЕ: "${safeHighlight}"` : ''}
${vibeChunk ? `\n${vibeChunk}\n` : ''}

${planForChunk ? `⚠️ ПЛАН (СЛЕДУЙ ЕМУ): ${planForChunk}` : ""}

КРИТИЧНО:
${isFirstChunk ? `- Начинай в ${departureCity}.` : `- Начинай в ${startLocation}.`}
${isLastChunk ? `- В конце дня ${endDay} вернись в ${departureCity}.` : ""}
${isCountryChange ? `🚨 СМЕНА СТРАНЫ: Начинай день ${startDay} с transport (перелёт/поезд).` : ''}

${formatTravelerTipsPolicy(isEn, preferences)}
${isEn ? "Each day \"tips\" field: follow the policy above for practical advice (not UI language)." : "Поле tips у каждого дня: практические советы — по политике выше (не под язык интерфейса)."}

Ответ — JSON массив дней.
`.trim()
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
