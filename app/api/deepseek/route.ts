// DeepSeek (Primary) -> OpenRouter (Fallback)
import { openrouterInference } from "@/lib/openrouter"
import { deepseekInference, getSessionUsage, resetSessionUsage } from "@/lib/deepseek"
import { NextResponse } from "next/server"
import { getDestinationImage } from "@/lib/images"
import { GROUNDING_DATA_2026 } from "@/lib/grounding"
import { createClient } from '@supabase/supabase-js'
// Real-time validation imports
import { validateRouteRequest, type ValidationResult } from "@/lib/real-time-validation"
import { collectDynamicContext, formatDynamicContextForPrompt } from "@/lib/context/dynamic-context"
import { formatTravelStyleForPrompt } from "@/lib/travel-styles"
import { getApplicableRules } from "@/lib/strict-rules"

function sanitizeClosedAirportLogistics(routeData: any) {
    const itinerary = Array.isArray(routeData?.itinerary) ? routeData.itinerary : []

    const closed = (GROUNDING_DATA_2026 as any).closedAirports || []
    const closedTokens = closed
        .flatMap((a: any) => [a?.city, a?.iata, `${a?.city} (${a?.iata})`])
        .filter(Boolean)
        .map((s: string) => String(s).toLowerCase())

    const isClosedMentioned = (text: unknown) => {
        if (!text) return false
        const t = String(text).toLowerCase()
        return closedTokens.some((token: string) => token && t.includes(token))
    }

    const sanitizeMode = (mode: unknown) => {
        const m = String(mode || '').toLowerCase()
        return m.includes('самол') || m.includes('flight') || m.includes('plane')
    }

    for (const day of itinerary) {
        const lg = day?.logistics
        if (!lg) continue

        const targetsClosed = isClosedMentioned(lg.to) || isClosedMentioned(lg.from) || isClosedMentioned(lg.bookingLink) || isClosedMentioned(day?.title)

        if (targetsClosed && sanitizeMode(lg.mode)) {
            const toLabel = lg.to || day?.title || "пункт назначения"
            day.logistics = {
                mode: "Поезд/авто (аэропорт закрыт)",
                from: lg.from || "Отправление",
                to: lg.to || "Пункт назначения",
                distance: lg.distance || "—",
                duration: lg.duration || "—",
                price: lg.price || "—",
                bookingLink: "https://www.rzd.ru/"
            }
            if (typeof day.title === 'string') {
                day.title = day.title
                    .replace(/прямой\s+рейс/ig, "наземный переезд")
                    .replace(/аэрофлот|победа/ig, "")
                    .replace(/\(.*?\)/g, (m: string) => m.toLowerCase().includes('urs') ? '' : m)
                    .trim()
            }
            if (Array.isArray(day.activities)) {
                for (const a of day.activities) {
                    if (a?.placeName && isClosedMentioned(a.placeName)) {
                        a.placeName = String(a.placeName).replace(/\(.*?\)/g, '').trim()
                    }
                    if (a?.desc && isClosedMentioned(a.desc)) {
                        a.desc = String(a.desc)
                            .replace(/прямой\s+рейс.*?(\.|$)/ig, "Аэропорт закрыт — используйте наземный транспорт.")
                    }
                }
            }

            day.logistics.note = `Маршрут автоматически исправлен: аэропорт в '${toLabel}' указан как закрытый в базе актуальности (${(GROUNDING_DATA_2026 as any).lastUpdated}).`
        }
    }

    routeData.itinerary = itinerary
    return routeData
}

export async function POST(req: Request) {
    try {
        // Check maintenance mode
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseKey) {
            console.error("Supabase credentials not configured")
            return NextResponse.json(
                { error: "Сервис временно недоступен. Попробуйте позже." },
                { status: 503 }
            )
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        const { data: settings } = await supabase
            .from('app_settings')
            .select('maintenance_mode, maintenance_message, maintenance_allow_admin_bypass')
            .single()

        if (settings?.maintenance_mode) {
            // Check if user is admin (can bypass)
            const { data: { user } } = await supabase.auth.getUser()
            let canBypass = false

            if (user && settings.maintenance_allow_admin_bypass) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single()

                canBypass = profile?.role === 'admin' || profile?.role === 'super_admin'
            }

            if (!canBypass) {
                return NextResponse.json(
                    { error: 'Техническое обслуживание', message: settings.maintenance_message || 'Сервис временно недоступен' },
                    { status: 503 }
                )
            }
        }

        // Check user access mode (block AI generation if blocked)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('access_mode, block_reason, blocked_until')
                .eq('id', user.id)
                .single()

            if (profile) {
                // Check if temporary block expired
                if (profile.blocked_until) {
                    const blockedUntil = new Date(profile.blocked_until)
                    if (blockedUntil < new Date()) {
                        // Block expired, reset to active
                        await supabase
                            .from('profiles')
                            .update({ access_mode: 'active', block_reason: null, blocked_until: null })
                            .eq('id', user.id)
                    } else if (profile.access_mode === 'ai_blocked' || profile.access_mode === 'full_blocked') {
                        return NextResponse.json(
                            { error: 'Генерация маршрутов временно недоступна для вашего аккаунта', reason: profile.block_reason },
                            { status: 403 }
                        )
                    }
                } else if (profile.access_mode === 'ai_blocked' || profile.access_mode === 'full_blocked') {
                    return NextResponse.json(
                        { error: 'Генерация маршрутов временно недоступна для вашего аккаунта', reason: profile.block_reason },
                        { status: 403 }
                    )
                }
            }
        }

        const body = await req.json()
        const {
            departureCity,
            destinationType,
            countryCount,
            budget,
            startDate,
            endDate,
            travelStyle,
            companions,
            preferences,
            paymentMethods,
            requireRussianGuide,
            customDestination,
            customBudget
        } = body

        // Helper to safely convert value to array (handles strings, arrays, null/undefined)
        const toArray = (val: any): string[] => {
            if (!val) return []
            if (Array.isArray(val)) return val.filter(Boolean)
            if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean)
            return []
        }

        // Helper to extract City (Country) from "City, Region, Country" format
        // e.g. "Москва, Московская область, Россия" -> "Москва (Россия)"
        const parseDestination = (dest: string): string => {
            const parts = dest.split(',').map(s => s.trim()).filter(Boolean)
            if (parts.length === 0) return dest
            if (parts.length === 1) return parts[0]
            // Return "City (Country)" - first and last parts
            const city = parts[0]
            const country = parts[parts.length - 1]
            return `${city} (${country})`
        }

        const durationDays = startDate && endDate
            ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
            : 7

        // Define strict budget caps (updated to match new UI ranges)
        let budgetCap = 0;
        let budgetDesc = "";

        if (budget === "custom" && customBudget) {
            budgetCap = parseInt(customBudget.replace(/\D/g, '')) || 100000;
            budgetDesc = `Custom User Budget (${budgetCap} RUB)`;
        } else {
            switch (budget) {
                case "economy":
                    budgetCap = 7500 * durationDays;
                    budgetDesc = `Economy (~7.5k RUB/day - Хостелы, публичный транспорт, бесплатные активности)`;
                    break;
                case "comfort":
                    budgetCap = 20000 * durationDays;
                    budgetDesc = `Comfort (~20k RUB/day - Отели 3-4*, такси, хорошие рестораны)`;
                    break;
                case "premium":
                case "luxury":
                    budgetCap = 50000 * durationDays;
                    budgetDesc = `Premium (~50k RUB/day - 5* отели, бизнес-класс, VIP)`;
                    break;
                default:
                    budgetCap = 15000 * durationDays;
                    budgetDesc = "Moderate (~15k RUB/day)";
            }
        }


        // Parse multiple destinations from semicolon-separated string
        const destinations = customDestination
            ? customDestination.split(';').map(s => s.trim()).filter(Boolean)
            : [] // Will be determined by AI if not specified

        const targetDescription = customDestination
            ? destinations.length > 1
                ? `Конкретные пункты назначения (${destinations.length}): ${destinations.map(parseDestination).join(', ')}`
                : `Specific User Request: ${parseDestination(destinations[0])}`
            : destinationType === 'mixed' ? 'Mixed (Russia + Abroad)' : destinationType === 'russia' ? 'Inside Russia' : 'Abroad'

        // =====================================
        // REAL-TIME VALIDATION & CONTEXT
        // =====================================

        let validationResult: ValidationResult | null = null
        let dynamicContextStr = ""
        let adjustedBudget = budgetCap

        // Only validate if we have explicit destinations
        if (destinations.length > 0 && startDate && endDate) {
            try {
                validationResult = await validateRouteRequest({
                    departureCity,
                    destinations,
                    startDate,
                    endDate,
                    budget: budgetCap,
                    citizenship: preferences?.citizenship || "RU"
                })

                // Check for blockers
                if (validationResult.blockers.length > 0) {
                    const blockerMessages = validationResult.blockers.map(b => b.message).join("; ")
                    return NextResponse.json({
                        error: "Невозможно построить маршрут",
                        blockers: validationResult.blockers,
                        message: blockerMessages
                    }, { status: 400 })
                }

                // Apply budget adjustment if needed
                if (validationResult.adjustedBudget && validationResult.adjustedBudget > budgetCap) {
                    adjustedBudget = validationResult.adjustedBudget
                    console.log(`[Validation] Budget adjusted: ${budgetCap} → ${adjustedBudget}`)
                }

                // Collect dynamic context
                const dynamicContext = await collectDynamicContext({
                    departureCity,
                    destinations,
                    startDate,
                    endDate,
                    interests: toArray(preferences?.interestsDetailed),
                    travelStyle: toArray(travelStyle)[0]
                })
                dynamicContextStr = formatDynamicContextForPrompt(dynamicContext)

            } catch (validationError) {
                console.error("[Validation] Error:", validationError)
                // Continue without validation on error
            }
        }

        // Apply travel style to prompt
        const styleStr = travelStyle ? formatTravelStyleForPrompt(toArray(travelStyle)[0] || "") : ""
        const rulesStr = getApplicableRules({
            travelStyle: toArray(travelStyle)[0]
        })

        const prompt = `
Создай детальный профессиональный маршрут путешествия на РУССКОМ языке.

ИСХОДНЫЕ ДАННЫЕ:
- Город отправления: ${departureCity}
- Направление: ${targetDescription}
- Количество стран/городов: ${destinations.length > 0 ? destinations.length : (countryCount === "more" ? 4 : parseInt(countryCount as string) || 1)}
- Даты: ${startDate || 'Гибкие'} — ${endDate || 'Гибкие'}
- Длительность: СТРОГО ${durationDays} дней (сгенерируй ровно ${durationDays} дней)
- Сезонность: Проверь сезон и праздники. Зимой НЕТ пляжного отдыха (кроме тропиков). Учитывай Новый год, если попадает.
- Бюджет: ${budgetDesc}. СТРОГИЙ ЛИМИТ: ${budgetCap} ₽. НЕ ПРЕВЫШАЙ.

${destinations.length > 1 ? `КРИТИЧНО — ОБЯЗАТЕЛЬНЫЕ ПУНКТЫ НАЗНАЧЕНИЯ:
Маршрут ДОЛЖЕН включать ВСЕ указанные ниже места. НЕ ПРОПУСКАЙ НИ ОДНО!
${destinations.map((d, i) => `${i + 1}. ${parseDestination(d)}`).join('\n')}
Распредели время равномерно между всеми пунктами!` : ''}

ИВЕНТЫ И ПРАЗДНИКИ (КРИТИЧНО):
${travelStyle.includes('events') ? `Пользователь ВЫБРАЛ "ивенты" - ОБЯЗАТЕЛЬНО включи в маршрут:
  - Фестивали, концерты, выставки в даты ${startDate} - ${endDate}
  - Государственные праздники страны назначения
  - Карнавалы, местные традиции
  - Спортивные события (если есть)
  Для КАЖДОГО крупного события указывай название, дату и где купить билеты.` : 'Ивенты не в приоритете, но если даты попадают на крупный праздник (Новый Год, Рождество, Карнавал, 8 марта, 23 февраля) - упомяни это.'}

ПРОВЕРКА ПРАЗДНИКОВ:
- Если даты ${startDate} - ${endDate} включают 31 декабря - 7 января: добавь новогодние мероприятия
- Если даты включают 14 февраля: романтические события
- Если даты включают февраль-март в Европе: карнавалы (Венеция, Ницца)
- Если лето: фестивали (Sziget, Tomorrowland, Exit)

- Стиль: ${travelStyle.join(', ')}
- Компания: ${companions}

ПЕРСОНАЛИЗАЦИЯ:
- Гражданство: ${preferences?.citizenship || 'Не указано'}
- Языки: ${toArray(preferences?.languages).join(', ') || 'Не указано'}
- Темп: ${preferences?.pace || 'moderate'} (slow = поздние подъёмы, много свободного времени; fast = насыщенный день)
- Диета: ${toArray(preferences?.dietaryRestrictions).join(', ') || 'Без ограничений'}, доп: ${preferences?.dietaryCustom || 'Нет'}
- Интересы: ${toArray(preferences?.interestsDetailed).join(', ') || 'Общие'}, доп: ${preferences?.interestsCustom || 'Нет'}
- Способы оплаты: ${toArray(paymentMethods).join(', ') || 'Не указано'}
- Русскоговорящий гид: ${requireRussianGuide ? 'ДА' : 'НЕТ'}
- Посещённые страны: ${toArray(preferences?.visitedCountries).join(', ') || 'Нет'} (предлагай НОВЫЕ места, избегай повторов)

РЕАЛЬНОСТЬ ЯНВАРЯ 2026 (КРИТИЧНО):
- Ограничения: ${GROUNDING_DATA_2026.globalRestrictions.join('; ')}
- Аэропорты: ${GROUNDING_DATA_2026.airportStatus.join('; ')}
- Авиасообщение: ${GROUNDING_DATA_2026.flightConnectivity.join('; ')}
- ЗАКРЫТЫЕ АЭРОПОРТЫ (АБСОЛЮТНЫЙ ЗАПРЕТ): ${(GROUNDING_DATA_2026 as any).closedAirports?.map((a: any) => `${a.city} (${a.iata})`).join(', ') || 'Нет'}
- Тренды: ${JSON.stringify(GROUNDING_DATA_2026.trendingLocations)}

ПРАВИЛА ГЕНЕРАЦИИ:

1. ЛОГИСТИКА: Полная door-to-door логистика от ${departureCity}.

2. СТОИМОСТЬ: Для КАЖДОЙ активности указывай реальную цену в рублях. НИКОГДА не пиши "0" или "Бесплатно" — даже прогулка = 500-1000₽ (вода, перекус). Ужин = 1500-5000₽.

3. КОНКРЕТНЫЕ НАЗВАНИЯ (КРИТИЧНО):
   - ПЛОХО: "Местный ресторан", "Центральный парк", "Городской музей"
   - ХОРОШО: "Ресторан 'Dr. Живаго'", "Парк Зарядье", "Третьяковская галерея"

4. КОНТИНУИТЕТ И РЕАЛЬНЫЕ РЕЙСЫ (КРИТИЧНО):
   - День N заканчивается в городе A → День N+1 НАЧИНАЕТСЯ в городе A
   - Перемещение между городами = отдельная запись в logistics
   
   ПРЯМЫЕ РЕЙСЫ ИЗ МОСКВЫ (ПРИОРИТЕТ!):
   - Турция: Стамбул, Анталья — прямой рейс ~3ч
   - ОАЭ: Дубай, Абу-Даби — прямой рейс ~5ч  
   - ЕГИПЕТ: Хургада, Шарм-эль-Шейх, Каир — ПРЯМОЙ РЕЙС ~4-5ч
   - Таиланд: Бангкок, Пхукет — прямой рейс ~9ч
   - Китай: Пекин, Шанхай — прямой рейс ~8ч
   - Сербия: Белград — прямой рейс ~3ч
   - Грузия: Тбилиси, Батуми — прямой рейс ~2-3ч
   - Армения, Казахстан, Узбекистан — прямые рейсы
   - Мальдивы, Шри-Ланка — прямые рейсы
   
   ⚠️ ЕСЛИ ЕСТЬ ПРЯМОЙ РЕЙС — ИСПОЛЬЗУЙ ЕГО! НЕ ЧЕРЕЗ СТАМБУЛ!
   
   ТОЛЬКО С ПЕРЕСАДКОЙ (Европа, США):
   - В ЕВРОПУ (кроме Сербии/Турции) и США прямых рейсов НЕТ
   - Пересадочные хабы: Стамбул, Белград, Баку, Ереван, Доха
   
   - Расстояние < 600км = поезд вместо самолёта
   - ЦЕНЫ НА ПЕРЕЛЁТЫ 2026: Москва-Стамбул ~25000₽, Москва-Дубай ~35000₽, Москва-Хургада ~30000₽, Москва-Пекин ~45000₽

5. РЕАЛИЗМ ВРЕМЕНИ (КРИТИЧНО — НЕТ МГНОВЕННОЙ ТЕЛЕПОРТАЦИИ):
   - Если в logistics указан перелёт/поезд → ПЕРВАЯ активность дня ДОЛЖНА быть "Прибытие и заселение"
   - Перелёт 2-4 часа + трансфер = активности начинаются с "День" или "Вечер", НЕ с "Утро"
   - Перелёт 5+ часов = день посвящён перелёту, активности только вечером (ужин, прогулка)
   - ПЛОХО: logistics "Перелёт Белград→Стамбул 4ч" + Утро: "Прогулка по Балат"
   - ХОРОШО: logistics "Перелёт Белград→Стамбул 4ч" + Утро: "Перелёт и прибытие в Стамбул" + День: "Заселение в отель, район Бейоглу" + Вечер: "Прогулка по Балат"
   - Последний день = возвращение в ${departureCity} (весь день на обратный путь)
   - Цены 2026: Москва 4* = ~12000₽/ночь, Стамбул 3* = ~8000₽/ночь

6. VIRAL SPOTS: Добавь 3-5 популярных в TikTok/Instagram локаций в отдельный массив viralSpots.

7. СООТВЕТСТВИЕ НАЗВАНИЯ И МАРШРУТА (КРИТИЧНО):
   - Название маршрута ДОЛЖНО отражать РЕАЛЬНЫЕ страны/города в itinerary
   - ПЛОХО: title="Пекин и Гуанчжоу" но countries=["Болгария", "Греция"]
   - ХОРОШО: title="Балканское приключение" если едем в Болгарию и Грецию
   - Проверь: все страны в countries[] ДОЛЖНЫ быть в itinerary

8. ВИЗОВАЯ ИНФОРМАЦИЯ ДЛЯ КАЖДОЙ СТРАНЫ (КРИТИЧНО):
   - Поле visaAdvice должно содержать инфу для КАЖДОЙ страны в маршруте
   - Формат: "Страна1: требования. Страна2: требования."
   - Для Шенгена указать: "Болгария: НЕ входит в Шенген, нужна отдельная виза или мультивиза"
   - Для безвизовых: "Турция: безвизовый въезд до 60 дней"

9. РАБОЧИЕ ССЫЛКИ НА БРОНИРОВАНИЕ (КРИТИЧНО):
   - Авиабилеты: https://www.aviasales.ru/
   - Поезда РЖД: https://ticket.rzd.ru/
   - Отели: https://ostrovok.ru/ или https://www.booking.com/
   - НЕ ВЫДУМЫВАЙ URL - используй только реальные сайты бронирования

10. КИЛОМЕТРАЖ И ВРЕМЯ В ЛОГИСТИКЕ (ОБЯЗАТЕЛЬНО):
   - В каждом logistics ОБЯЗАТЕЛЬНО указывай distance (расстояние) и duration (время в пути)
   - Пример: "distance": "2800 км", "duration": "4 ч 15 мин (перелёт)"
   - Для поездов: "distance": "700 км", "duration": "4 ч (Сапсан)"
   - Для такси/автобуса: "distance": "35 км", "duration": "45 мин"

JSON СХЕМА (строго следуй):
{
  "title": "Название маршрута (ДОЛЖНО соответствовать странам в countries[])",
  "description": "Описание на 2-3 предложения",
  "totalBudget": "150 000 ₽",
  "budgetAnalysis": {
    "avgAccommodation": "5 000 ₽/ночь",
    "avgFood": "3 000 ₽/день",
    "avgTransport": "10 000 ₽",
    "avgActivities": "20 000 ₽",
    "avgMisc": "5 000 ₽"
  },
  "visaAdvice": "Страна1: требования для граждан РФ. Страна2: требования. И т.д.",
  "paymentAdvice": "Какие карты работают, где менять деньги (для каждой страны)",
  "safetyInfo": { "rating": 8, "tips": "Советы по безопасности" },
  "restrictions": "Текущие ограничения или null",
  "countries": [{"name": "Название страны", "visaRequired": true, "visaType": "Шенген/национальная/безвиз"}],
  "tags": ["культура", "еда", "природа"],
  "coverImage": "",
  "viralSpots": [
    { "name": "Название", "desc": "Почему популярно", "mapLink": "https://..." }
  ],
  "itinerary": [
    {
      "day": 1,
      "title": "Прибытие в город",
      "dayTotal": "15 000 ₽",
      "activities": [
        {
          "time": "Утро",
          "placeName": "КОНКРЕТНОЕ название места",
          "desc": "Подробное описание",
          "cost": "500 ₽",
          "ticketsRequired": false,
          "mapLink": "https://www.google.com/maps/search/?api=1&query=Название+Места",
          "link": "",
          "contact": {
            "phone": "+7 999 123-45-67",
            "website": "https://example.com",
            "bookingUrl": "https://example.com/book"
          }
        },
        { "time": "День", "placeName": "...", "desc": "...", "cost": "...", "ticketsRequired": true, "mapLink": "...", "link": "https://...", "contact": {} },
        { "time": "Вечер", "placeName": "...", "desc": "...", "cost": "...", "ticketsRequired": false, "mapLink": "...", "link": "", "contact": {} }
      ],
      "logistics": {
        "mode": "Самолёт",
        "flightNumber": "SU1234",
        "departureTime": "08:30",
        "arrivalTime": "11:00",
        "from": "Москва (SVO)",
        "to": "Белград (BEG)",
        "distance": "1800 км",
        "duration": "3ч 30мин",
        "price": "25000 ₽",
        "bookingLink": "https://aviasales.ru/...",
        "tips": "Рекомендуем прямой рейс Air Serbia"
      }
    }
  ]
}

КРИТИЧНО (ОБЯЗАТЕЛЬНЫЕ ТРЕБОВАНИЯ):
- Ровно 3 активности в день: "Утро", "День", "Вечер"
- placeName ОБЯЗАТЕЛЕН для КАЖДОЙ активности! Это нужно для галереи фото.
  ПЛОХО: placeName: "" или без placeName
  ХОРОШО: placeName: "Ресторан Noma", "Парк Гуэль", "Египетский музей"
- mapLink ОБЯЗАТЕЛЕН — формат: https://www.google.com/maps/search/?api=1&query=Название+Места
- logistics.distance и logistics.duration ОБЯЗАТЕЛЬНЫ для каждого дня
- Все строки в двойных кавычках, включая теги
- Ответ ТОЛЬКО JSON, без markdown

ЯЗЫК: Строго РУССКИЙ.`;

        const systemPrompt = "You are an expert travel planner for TraveLM, specialized in Russian travelers. You provide JSON only. Be concise."

        // Helper to parse JSON from AI response
        function parseJsonResponse(raw: string, source: string): any {
            if (!raw) throw new Error(`Empty response from ${source}`)

            let clean = raw.match(/\{[\s\S]*\}/)?.[0] || raw

            // Basic repair for unquoted hashtags which DeepSeek sometimes outputs
            clean = clean.replace(/:\s*#([a-zA-Zа-яА-Я0-9_]+)/g, ': "#$1"'); // keys or values starting with #
            clean = clean.replace(/,\s*#([a-zA-Zа-яА-Я0-9_]+)/g, ', "#$1"'); // array items starting with #
            clean = clean.replace(/\[\s*#([a-zA-Zа-яА-Я0-9_]+)/g, '["#$1"'); // first array item

            if (!clean.trim().endsWith('}')) {
                console.warn(`${source} JSON appears truncated, attempting basic repair...`);
                let openBraces = (clean.match(/\{/g) || []).length;
                let closeBraces = (clean.match(/\}/g) || []).length;
                while (openBraces > closeBraces) { clean += '}'; closeBraces++; }
            }

            // Also fix truncated arrays
            if (!clean.trim().endsWith('}')) {
                clean = clean.replace(/,\s*$/, '') + ']}'
            }

            try {
                return JSON.parse(clean);
            } catch (e) {
                // Last ditch: try to just regex out the whole tags array if it's the culprit
                console.warn("JSON repair failed, trying to strip tags...", e);
                clean = clean.replace(/"tags":\s*\[[^\]]*\]/g, '"tags": []');
                return JSON.parse(clean);
            }
        }

        // Generate metadata (title, budget analysis, visa, safety) - small request
        async function generateMetadata(): Promise<any> {
            const metaPrompt = `
Generate ONLY the metadata for a travel itinerary. NO itinerary days needed.

DESTINATION: ${targetDescription}
DEPARTURE: ${departureCity}
DURATION: ${durationDays} days
BUDGET: ${budgetDesc} (max ${budgetCap} RUB)
STYLE: ${travelStyle.join(', ')}
PACE: ${preferences?.pace || 'moderate'}
VISITED: ${toArray(preferences?.visitedCountries).join(', ') || 'None'}
PAYMENT METHODS: ${toArray(paymentMethods).join(', ') || 'Not specified'}
PERSONALIZATION: ${toArray(preferences?.interestsDetailed).join(', ') || 'General'}
DIETARY: ${toArray(preferences?.dietaryRestrictions).join(', ') || 'None'}

CURRENT REALITY (JAN 2026):
- Restrictions: ${GROUNDING_DATA_2026.globalRestrictions.join(' ')}
- Flights: ${GROUNDING_DATA_2026.flightConnectivity.join(' ')}
- Prices are HIGH. Flights are expensive.
- Include "viralSpots" (Top 5 TikTok/Instagram spots for 2025/2026).

CRITICAL RULES:
1. Title MUST match the destination countries (if going to Bulgaria, don't call it "Beijing trip")
2. visaAdvice MUST include requirements for EACH country separately
3. countries[] must have visaRequired and visaType for each

Output VALID JSON only (all strings must be in double quotes):
{
  "title": "Название маршрута (ДОЛЖНО соответствовать направлению: ${targetDescription})",
  "description": "Краткое описание на 2-3 предложения",
  "totalBudget": "${budgetCap} ₽",
  "budgetAnalysis": {
    "avgAccommodation": "5000 ₽/ночь",
    "avgFood": "3000 ₽/день",
    "avgTransport": "15000 ₽",
    "avgActivities": "5000 ₽/день",
    "avgMisc": "3000 ₽"
  },
  "visaAdvice": "Страна1: требования для РФ граждан. Страна2: требования. (ДЛЯ КАЖДОЙ СТРАНЫ!)",
  "paymentAdvice": "Какие карты работают в каждой стране, где менять деньги",
  "safetyInfo": { "rating": 8, "tips": "Советы по безопасности" },
  "restrictions": "Текущие ограничения если есть или null",
  "countries": [{"name": "Страна", "visaRequired": true, "visaType": "Шенген/национальная/безвиз"}],
  "tags": ["вино", "горы", "море"],
  "viralSpots": [
    { "name": "Название места", "desc": "Почему это хайпово (TikTok/Insta)", "mapLink": "https://..." }
  ]
}

CRITICAL:
- Output ONLY valid JSON, no markdown, no comments
- ALL values must be in double quotes (including tags like "#tag")
- NEVER use unquoted hashtags in the JSON
- Fill ALL fields with REAL data for this destination!
- Title MUST reflect the actual destination, NOT random cities!`;

            console.log("Parallel: Generating metadata...");
            const messages = [
                { role: "system" as const, content: systemPrompt },
                { role: "user" as const, content: metaPrompt }
            ]

            const raw = await deepseekInference(messages, { maxTokens: 2000, temperature: 0.6, tripDays: 3 });
            return parseJsonResponse(raw, "DeepSeek-Meta");
        }

        // Generate a chunk of days (e.g., days 1-4) with context from previous chunks
        async function generateDayChunk(
            startDay: number,
            endDay: number,
            destination: string,
            previousContext?: { lastCity: string; visitedPlaces: string[] }
        ): Promise<any[]> {
            const isFirstChunk = startDay === 1
            const isLastChunk = endDay === durationDays
            const startLocation = previousContext?.lastCity || departureCity
            const visitedPlaces = previousContext?.visitedPlaces || []

            const chunkPrompt = `
Сгенерируй ДНИ ${startDay}-${endDay} из ${durationDays}-дневного маршрута.

КОНТЕКСТ МАРШРУТА:
- Направление: ${destination}
- Город отправления: ${departureCity}
- Стиль: ${toArray(travelStyle).join(', ') || 'Не указан'}
- Темп: ${preferences?.pace || 'moderate'}
- Диета: ${toArray(preferences?.dietaryRestrictions).join(', ') || 'Без ограничений'}
- Бюджет: ${budgetDesc}
- Даты: ${startDate || 'Гибкие'} — ${endDate || 'Гибкие'}

КРИТИЧНО — КОНТИНУИТЕТ МАРШРУТА:
${isFirstChunk
                    ? `- Это ПЕРВЫЙ сегмент. День 1 начинается в ${departureCity} (вылет/выезд).`
                    : `- День ${startDay} ОБЯЗАТЕЛЬНО начинается в городе: ${startLocation}
- УЖЕ посещённые места (НЕ ПОВТОРЯТЬ): ${visitedPlaces.join(', ') || 'Нет'}`
                }
${isLastChunk
                    ? `- Это ПОСЛЕДНИЙ сегмент. День ${endDay} должен завершиться возвращением в ${departureCity}.`
                    : `- В конце дня ${endDay} укажи город, где путешественник останется на ночь.`
                }

ПРАВИЛА ЛОГИСТИКИ:
1. НЕТ ТЕЛЕПОРТАЦИИ: проверяй, где закончился предыдущий день
2. Перелёты Россия↔Европа/США = только с пересадкой (Стамбул/Дубай)
3. Время в пути должно быть реалистичным
4. Расстояние < 600км = поезд вместо самолёта
5. РЕАЛИЗМ ВРЕМЕНИ (КРИТИЧНО):
   - Если logistics содержит перелёт → первая активность = "Прибытие и заселение"
   - Перелёт 2-4ч: активности начинаются с "День", НЕ с "Утро"
   - Перелёт 5+ч: день посвящён перелёту, активности только вечером
   - ПЛОХО: logistics "Перелёт 4ч" + Утро: "Прогулка"
   - ХОРОШО: logistics "Перелёт 4ч" + Утро: "Перелёт" + День: "Заселение" + Вечер: "Прогулка"

РЕАЛЬНОСТЬ 2026:
- Закрытые аэропорты: ${(GROUNDING_DATA_2026 as any).closedAirports?.map((a: any) => `${a.city} (${a.iata})`).join(', ') || 'Нет'}
- Ограничения: ${GROUNDING_DATA_2026.globalRestrictions[0]}

Формат ответа — JSON массив:
[
  {
    "day": ${startDay},
    "title": "Название дня",
    "dayTotal": "X ₽",
    "endCity": "Город на конец дня",
    "activities": [
      {
        "time": "Утро",
        "placeName": "КОНКРЕТНОЕ название",
        "desc": "Описание",
        "cost": "X ₽",
        "ticketsRequired": false,
        "mapLink": "https://www.google.com/maps/search/?api=1&query=...",
        "link": ""
      },
      { "time": "День", ... },
      { "time": "Вечер", ... }
    ],
    "logistics": {
      "mode": "Самолёт/Поезд/Такси",
      "from": "Откуда",
      "to": "Куда",
      "distance": "X км",
      "duration": "X ч",
      "price": "X ₽",
      "bookingLink": "URL"
    }
  }
]

КРИТИЧНО:
- Ровно ${endDay - startDay + 1} дней (с ${startDay} по ${endDay})
- 3 активности в день: Утро, День, Вечер
- placeName = реальные названия мест
- endCity = город, где заканчивается день (для следующего сегмента)
- Ответ ТОЛЬКО JSON массив, без markdown
- Язык: РУССКИЙ`;

            console.log(`Parallel: Generating days ${startDay}-${endDay} (start: ${startLocation})...`);
            const messages = [
                { role: "system" as const, content: systemPrompt },
                { role: "user" as const, content: chunkPrompt }
            ]

            const tokensNeeded = (endDay - startDay + 1) * 1800;
            const raw = await deepseekInference(messages, {
                maxTokens: Math.min(tokensNeeded, 8000),
                temperature: 0.6,
                tripDays: endDay - startDay + 1
            });

            let clean = raw.match(/\[[\s\S]*\]/)?.[0] || raw;
            return JSON.parse(clean);
        }

        // Main generation logic
        async function generateParallel(): Promise<any> {
            const CHUNK_SIZE = 4; // Days per chunk
            const USE_SEQUENTIAL_CHUNKS = durationDays > 7;

            if (!USE_SEQUENTIAL_CHUNKS) {
                // Short trip - use original single request
                console.log(`Short trip (${durationDays} days) - using single request`);
                const messages = [
                    { role: "system" as const, content: systemPrompt },
                    { role: "user" as const, content: prompt }
                ]
                const raw = await deepseekInference(messages, { maxTokens: 8000, temperature: 0.6, tripDays: durationDays });
                return parseJsonResponse(raw, "DeepSeek");
            }

            // Long trip - sequential chunk generation with context passing
            console.log(`Long trip (${durationDays} days) - using SEQUENTIAL chunks with context`);
            const startTime = Date.now();

            // Create chunk ranges
            const chunks: { start: number; end: number }[] = [];
            for (let i = 1; i <= durationDays; i += CHUNK_SIZE) {
                chunks.push({
                    start: i,
                    end: Math.min(i + CHUNK_SIZE - 1, durationDays)
                });
            }
            console.log(`Splitting into ${chunks.length} day chunks + metadata`);

            // Determine destination for day chunks - use parsed destinations
            const destName = destinations.length > 0
                ? destinations.map(parseDestination).join(' → ')
                : (destinationType === 'russia' ? 'Россия' :
                    destinationType === 'abroad' ? 'Европа/Азия' : 'Международный');

            // Generate metadata in parallel with first chunk
            const [metadata, firstChunk] = await Promise.all([
                generateMetadata(),
                generateDayChunk(chunks[0].start, chunks[0].end, destName, undefined)
            ]);

            // Generate remaining chunks SEQUENTIALLY with context from previous chunk
            const allDays = [...firstChunk];
            let previousContext = {
                lastCity: firstChunk[firstChunk.length - 1]?.endCity ||
                    firstChunk[firstChunk.length - 1]?.logistics?.to ||
                    destName,
                visitedPlaces: firstChunk.flatMap((day: any) =>
                    (day.activities || []).map((a: any) => a.placeName).filter(Boolean)
                )
            };

            for (let i = 1; i < chunks.length; i++) {
                console.log(`Generating chunk ${i + 1}/${chunks.length} (context: ${previousContext.lastCity})`);
                const chunkDays = await generateDayChunk(
                    chunks[i].start,
                    chunks[i].end,
                    destName,
                    previousContext
                );
                allDays.push(...chunkDays);

                // Update context for next chunk
                const lastDay = chunkDays[chunkDays.length - 1];
                previousContext = {
                    lastCity: lastDay?.endCity || lastDay?.logistics?.to || previousContext.lastCity,
                    visitedPlaces: [
                        ...previousContext.visitedPlaces,
                        ...chunkDays.flatMap((day: any) =>
                            (day.activities || []).map((a: any) => a.placeName).filter(Boolean)
                        )
                    ]
                };
            }

            // Sort and merge
            allDays.sort((a, b) => a.day - b.day);

            const result = {
                ...metadata,
                itinerary: allDays,
                coverImage: "",
                preferences: {
                    pace: preferences?.pace || 'moderate',
                    travel_style: toArray(travelStyle),
                    interestsDetailed: toArray(preferences?.interestsDetailed),
                    dietaryRestrictions: toArray(preferences?.dietaryRestrictions),
                    companions: companions,
                    paymentMethods: toArray(paymentMethods),
                    visitedCountries: toArray(preferences?.visitedCountries)
                }
            };

            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`Sequential generation completed in ${elapsed}s (${chunks.length + 1} requests)`);

            return result;
        }

        try {
            // Reset token usage counter at start of generation
            resetSessionUsage();

            // PRIMARY: DeepSeek with parallel generation
            try {
                console.log("Using DeepSeek as primary provider...");
                const routeData = sanitizeClosedAirportLogistics(await generateParallel());

                // Enrich with cover image
                try {
                    if (routeData.countries && routeData.countries.length > 0) {
                        const cover = await getDestinationImage(routeData.countries[0].name + " travel");
                        if (cover) routeData.coverImage = cover;
                    }
                } catch (imgError) {
                    // Cover image is optional
                }

                // Attach token usage statistics to response
                const usage = getSessionUsage();
                routeData.tokenUsage = usage;

                console.log("Success with DeepSeek")
                console.log(`Total tokens: ${usage.totalTokens}, Cost: $${usage.costUsd.toFixed(4)} (~${usage.costRub.toFixed(2)} ₽)`)
                return NextResponse.json(routeData)
            } catch (deepseekError: any) {
                console.error("DeepSeek failed:", deepseekError.message)

                // FALLBACK: OpenRouter (single request)
                console.log("Falling back to OpenRouter...");
                const messages = [
                    { role: "system" as const, content: systemPrompt },
                    { role: "user" as const, content: prompt }
                ]
                const raw = await openrouterInference(messages, { maxTokens: 30000, temperature: 0.6 });
                const routeData = sanitizeClosedAirportLogistics(parseJsonResponse(raw, "OpenRouter"));

                // Enrich cover image
                try {
                    if (routeData.countries && routeData.countries.length > 0) {
                        const cover = await getDestinationImage(routeData.countries[0].name + " travel");
                        if (cover) routeData.coverImage = cover;
                    }
                } catch { }

                console.log("Success with OpenRouter fallback")
                return NextResponse.json(routeData)
            }
        } catch (finalError: any) {
            console.error("All providers failed:", finalError.message)
            return NextResponse.json({
                error: "All AI providers failed to generate valid JSON",
                details: finalError.message
            }, { status: 500 })
        }

    } catch (error: any) {
        console.error("Fatal API Error:", error)
        return NextResponse.json({
            error: error.message || "Unknown error",
        }, { status: 500 })
    }
}
