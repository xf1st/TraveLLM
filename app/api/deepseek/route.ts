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

        // Apply profile preferences if fields are missing
        if (!departureCity && preferences?.departureCity) {
            // Re-assign logic (workaround since it's const destructured above, actually better to just rely on scoped usage or change let)
            // Wait, I can't reassign const. I should change the destructuring to let or handle it differently.
            // Actually, I can just use a new variable `effectiveDepartureCity` or modify the logic below.
        }

        const effectiveDepartureCity = departureCity || preferences?.departureCity || "Москва"

        // Calculate AI Temperature based on creativity setting
        // Calculate AI Temperature based on creativity setting
        const creativity = body.aiCreativity || preferences?.aiCreativity || "balanced"
        const aiTemperature = creativity === "creative" ? 1.0 : creativity === "conservative" ? 0.3 : 0.6

        let creativityInstruction = "";
        if (creativity === "creative") {
            creativityInstruction = `
УРОВЕНЬ КРЕАТИВНОСТИ: МАКСИМАЛЬНЫЙ (CREATIVE)
- Ищи скрытые жемчужины, локальные места, необычные активности.
- Предлагай альтернативные точки обзора для популярных мест.
- Будь смелее в выборе мест, избегай банальных "топ-10" списков, если это возможно.
`;
        } else if (creativity === "conservative") {
            creativityInstruction = `
УРОВЕНЬ КРЕАТИВНОСТИ: КОНСЕРВАТИВНЫЙ (CONSERVATIVE)
- Строго придерживайся проверенных, надежных и популярных маршрутов.
- Главный приоритет — комфорт, безопасность и предсказуемость.
- Избегай сомнительных или малоизвестных мест.
`;
        } else {
            creativityInstruction = `
УРОВЕНЬ КРЕАТИВНОСТИ: СБАЛАНСИРОВАННЫЙ
- Сочетай главные достопримечательности с интересными локальными местами.
`;
        }

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
            : (parseInt(preferences?.defaultTripDuration) || 7)

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
                    departureCity: effectiveDepartureCity,
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
                    departureCity: effectiveDepartureCity,
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

${creativityInstruction}

0. ВЫБОР НАПРАВЛЕНИЯ (КРИТИЧНО):
   - Если пользователь выбрал "За границу" (Abroad) без конкретной страны:
     - НЕ ПРЕДЛАГАЙ ТУРЦИЮ, ЕГИПЕТ или ОАЭ каждый раз! Это банально.
     - Предлагай РАЗНООБРАЗНЫЕ направления: Таиланд, Вьетнам, Сербия, Китай, Марокко, ЮАР, Латинская Америка, Мальдивы, Шри-Ланка, Узбекистан.
     - Используй "Internal Random Seed" чтобы каждый раз предлагать что-то новое.
     - Выбирай направление, идеально подходящее под "${travelStyle.join(', ')}". (Например, "Релакс" -> Мальдивы, "Приключения" -> Вьетнам).

0.1. ТЕГИ (СТРОГО):
   - Генерируй теги ТОЛЬКО если они соответствуют ВЫБРАННЫМ интересам (${travelStyle.join(', ')}).
   - НЕ ДОБАВЛЯЙ "Ночная жизнь" или "Шопинг", если пользователь их не выбрал (если только это не ключевая особенность места, которую нельзя избежать).
   - Теги должны быть на РУССКОМ.

1. ЛОГИСТИКА: Полная door-to-door логистика от ${departureCity}.

2. СТОИМОСТЬ: Для КАЖДОЙ активности указывай реальную цену в рублях. НИКОГДА не пиши "0" или "Бесплатно" — даже прогулка = 500-1000₽ (вода, перекус). Ужин = 1500-5000₽.

3. КОНКРЕТНЫЕ НАЗВАНИЯ (КРИТИЧНО):
   - ПЛОХО: "Местный ресторан", "Центральный парк", "Городской музей"
   - ХОРОШО: "Ресторан 'Dr. Живаго'", "Парк Зарядье", "Третьяковская галерея"

4. КОНТИНУИТЕТ И РЕАЛЬНЫЕ РЕЙСЫ (КРИТИЧНО):
   - День N заканчивается в городе A → День N+1 НАЧИНАЕТСЯ в городе A
   - Перемещение между городами = отдельная запись в logistics
   
   ПРЯМЫЕ РЕЙСЫ ИЗ МОСКВЫ (ПРИОРИТЕТ!):
   - Турция: Стамбул, Анталья, Бодрум, Мерсин — прямой рейс ~3-4ч
   - ОАЭ: Дубай, Абу-Даби, Шарджа — прямой рейс ~5-6ч  
   - ЕГИПЕТ: Хургада, Шарм-эль-Шейх, Каир — ПРЯМОЙ РЕЙС ~4-5ч
   - Таиланд: Бангкок, Пхукет, Паттайя — прямой рейс ~9-10ч
   - Китай: Пекин, Шанхай, Урумчи, Сиань — прямой рейс ~7-8ч
   - Сербия: Белград — прямой рейс ~3ч
   - Грузия: Тбилиси, Батуми, Кутаиси — прямой рейс ~2-3ч
   - Армения: Ереван, Гюмри — прямой рейс ~3ч
   - Казахстан: Алматы, Астана — прямой рейс ~3-4ч
   - Узбекистан: Ташкент, Самарканд — прямой рейс ~4ч
   - Мальдивы: Мале — прямой рейс ~9ч
   - Шри-Ланка: Коломбо, Хамбантота — прямой рейс ~9ч (сезонные)
   - Вьетнам: Хошимин, Нячанг, Фукуок — прямой рейс ~9-10ч
   - Индия: Гоа, Дели — прямой рейс ~6-7ч (сезонные)
   - Индонезия: Бали (Денпасар) — прямой рейс ~11ч
   - Израиль: Тель-Авив — прямой рейс ~4ч
   - Иордания: Амман — прямой рейс ~4ч (3 раза в неделю)
   - Куба: Варадеро, Кайо-Коко, Гавана — прямой рейс ~13-14ч
   - Венесуэла: Порламар — прямой рейс
   - Сейшелы: Маэ — прямой рейс (сезонные)
   - Катар: Доха — прямой рейс ~5ч
   - Оман: Маскат — прямой рейс ~5ч (4 раза в неделю)
   - Марокко: Касабланка — прямой рейс
   - Эфиопия: Аддис-Абеба — прямой рейс
   - Азербайджан: Баку — прямой рейс ~3ч
   - Кыргызстан: Бишкек — прямой рейс ~4ч
   - Таджикистан: Душанбе — прямой рейс ~4ч
   - Филиппины: Манила — прямой рейс (с октября 2025)
   - Мьянма — прямой рейс (с октября 2025)
   
   ⚠️ ЕСЛИ ЕСТЬ ПРЯМОЙ РЕЙС — ИСПОЛЬЗУЙ ЕГО! НЕ ЧЕРЕЗ ПЕРЕСАДКУ!
   
   ТОЛЬКО С ПЕРЕСАДКОЙ (Европа, США):
   - В ЕВРОПУ (кроме Сербии/Турции) и США прямых рейсов НЕТ
   - Пересадочные хабы: Стамбул, Белград, Баку, Ереван, Доха, Дубай
   
   - Расстояние < 600км = поезд вместо самолёта
   
   - ЦЕНЫ НА ПЕРЕЛЁТЫ 2025-2026 (в одну сторону, ориентировочно):
     • Москва-Стамбул: от 4 000₽ (лоукост) до 15 000₽ (средняя)
     • Москва-Дубай: от 5 000₽ (лоукост) до 25 000₽ (средняя)
     • Москва-Хургада: от 10 000₽ до 25 000₽
     • Москва-Пекин: от 15 000₽ до 35 000₽
     • Москва-Пхукет: от 25 000₽ до 50 000₽
     • Москва-Мальдивы: от 30 000₽ до 60 000₽

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
      "endCity": "Белград",
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

            // Remove markdown code blocks if present
            clean = clean.replace(/```json\s*/g, '').replace(/```\s*/g, '');

            // Basic repair for unquoted hashtags which DeepSeek sometimes outputs
            clean = clean.replace(/:\s*#([a-zA-Zа-яА-Я0-9_]+)/g, ': "#$1"'); // keys or values starting with #
            clean = clean.replace(/,\s*#([a-zA-Zа-яА-Я0-9_]+)/g, ', "#$1"'); // array items starting with #
            clean = clean.replace(/\[\s*#([a-zA-Zа-яА-Я0-9_]+)/g, '["#$1"'); // first array item

            // Fix missing colons after property names (common DeepSeek error)
            // Pattern: "propertyName" "value" -> "propertyName": "value"
            clean = clean.replace(/"([^"]+)"\s+"([^"]+)"/g, '"$1": "$2"');
            // Pattern: "propertyName" { -> "propertyName": {
            clean = clean.replace(/"([^"]+)"\s+\{/g, '"$1": {');
            // Pattern: "propertyName" [ -> "propertyName": [
            clean = clean.replace(/"([^"]+)"\s+\[/g, '"$1": [');
            // Pattern: "propertyName" number -> "propertyName": number
            clean = clean.replace(/"([^"]+)"\s+(\d+)/g, '"$1": $2');

            // Fix trailing commas before closing brackets
            clean = clean.replace(/,\s*}/g, '}');
            clean = clean.replace(/,\s*]/g, ']');

            if (!clean.trim().endsWith('}')) {
                console.warn(`${source} JSON appears truncated, attempting basic repair...`);
                let openBraces = (clean.match(/\{/g) || []).length;
                let closeBraces = (clean.match(/\}/g) || []).length;
                let openBrackets = (clean.match(/\[/g) || []).length;
                let closeBrackets = (clean.match(/\]/g) || []).length;
                while (openBrackets > closeBrackets) { clean += ']'; closeBrackets++; }
                while (openBraces > closeBraces) { clean += '}'; closeBraces++; }
            }

            try {
                return JSON.parse(clean);
            } catch (e) {
                // Last ditch: try to just regex out the whole tags array if it's the culprit
                console.warn("JSON repair failed, trying to strip problematic fields...", e);
                clean = clean.replace(/"tags":\s*\[[^\]]*\]/g, '"tags": []');
                clean = clean.replace(/"viralSpots":\s*\[[^\]]*\]/g, '"viralSpots": []');
                try {
                    return JSON.parse(clean);
                } catch (e2) {
                    console.error("Final JSON parse failed:", e2);
                    throw e2;
                }
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

            const raw = await deepseekInference(messages, { maxTokens: 2000, temperature: aiTemperature, tripDays: 3 });
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
            const startLocation = previousContext?.lastCity || effectiveDepartureCity
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
                temperature: aiTemperature,
                tripDays: endDay - startDay + 1
            });

            let clean = raw.match(/\[[\s\S]*\]/)?.[0] || raw;
            return JSON.parse(clean);
        }

        // Main generation logic
        async function generateParallel(): Promise<any> {
            const CHUNK_SIZE = 4; // Days per chunk
            const USE_SEQUENTIAL_CHUNKS = durationDays > 7;

            const travelersCount = parseInt(String(companions).match(/\d+/)?.[0] || "2")

            let routeData: any = {};

            if (!USE_SEQUENTIAL_CHUNKS) {
                // Short trip - use original single request
                console.log(`Short trip (${durationDays} days) - using single request`);
                const messages = [
                    { role: "system" as const, content: systemPrompt },
                    { role: "user" as const, content: prompt }
                ]
                const raw = await deepseekInference(messages, { maxTokens: 8000, temperature: aiTemperature, tripDays: durationDays });
                routeData = parseJsonResponse(raw, "DeepSeek");
            } else {
                // Long trip - split into chunks + metadata
                console.log(`Long trip (${durationDays} days) - using sequential chunks`);
                const startTime = Date.now();

                // 1. Metadata (Parallel)
                const metadata = await generateMetadata();

                // 2. Chunks (Sequential)
                const chunks = [];
                for (let i = 1; i <= durationDays; i += CHUNK_SIZE) {
                    chunks.push({
                        start: i,
                        end: Math.min(i + CHUNK_SIZE - 1, durationDays)
                    });
                }

                // Initial context
                let previousContext = {
                    lastCity: effectiveDepartureCity,
                    visitedPlaces: [] as string[]
                };

                const allDays: any[] = [];

                // Generate chunks sequentially
                for (let i = 0; i < chunks.length; i++) {
                    console.log(`Generating chunk ${i + 1}/${chunks.length}...`);
                    const chunkDays = await generateDayChunk(
                        chunks[i].start,
                        chunks[i].end,
                        targetDescription,
                        previousContext
                    );
                    allDays.push(...chunkDays);

                    // Update context for next chunk
                    const lastDay = chunkDays[chunkDays.length - 1];
                    previousContext = {
                        lastCity: lastDay?.endCity || lastDay?.logistics?.to || targetDescription,
                        visitedPlaces: [
                            ...previousContext.visitedPlaces,
                            ...chunkDays.flatMap((day: any) =>
                                (day.activities || []).map((a: any) => a.placeName).filter(Boolean)
                            )
                        ]
                    };
                }

                allDays.sort((a, b) => a.day - b.day);

                routeData = {
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
            }

            // Post-generation: extract logistics from AI-generated itinerary
            if (startDate && endDate) {
                try {
                    const { extractLogisticsFromItinerary } = await import("@/lib/travelpayouts")
                    const logistics = await extractLogisticsFromItinerary(
                        routeData, departureCity, startDate, endDate, travelersCount
                    )
                    routeData.flights = logistics.flights
                    routeData.hotels = logistics.hotels
                    routeData.interCity = logistics.interCity
                } catch (logisticsError) {
                    console.error("Failed to extract logistics:", logisticsError)
                }
            }

            return routeData;
        }

        try {
            // Reset token usage counter at start of generation
            resetSessionUsage();

            // PRIMARY: DeepSeek with parallel generation
            try {
                console.log("Using DeepSeek as primary provider...");
                const generatedRouteData = sanitizeClosedAirportLogistics(await generateParallel());

                // Enrich with cover image
                try {
                    if (generatedRouteData.countries && generatedRouteData.countries.length > 0) {
                        const cover = await getDestinationImage(generatedRouteData.countries[0].name + " travel");
                        if (cover) generatedRouteData.coverImage = cover;
                    }
                } catch (imgError) {
                    // Cover image is optional
                }

                // Attach token usage statistics to response
                const usage = getSessionUsage();
                generatedRouteData.tokenUsage = usage;

                console.log("Success with DeepSeek")
                console.log(`DeepSeek Session totals: ${usage.totalTokens} tokens, $${usage.costUsd.toFixed(4)}`)
                return NextResponse.json(generatedRouteData)
            } catch (deepseekError: any) {
                console.error("DeepSeek failed:", deepseekError.message)

                // FALLBACK: OpenRouter (single request)
                console.log("Falling back to OpenRouter...");
                const messages = [
                    { role: "system" as const, content: systemPrompt },
                    { role: "user" as const, content: prompt }
                ]
                const raw = await openrouterInference(messages, { maxTokens: 30000, temperature: 0.6 });
                const fallbackRouteData = sanitizeClosedAirportLogistics(parseJsonResponse(raw, "OpenRouter"));

                // Enrich cover image
                try {
                    if (fallbackRouteData.countries && fallbackRouteData.countries.length > 0) {
                        const cover = await getDestinationImage(fallbackRouteData.countries[0].name + " travel");
                        if (cover) fallbackRouteData.coverImage = cover;
                    }
                } catch { }

                // Add estimated token usage for OpenRouter (for admin stats tracking)
                // OpenRouter uses different models, estimate based on response length
                const estimatedOutputTokens = Math.round(raw.length / 4); // ~4 chars per token
                const estimatedInputTokens = Math.round((systemPrompt.length + prompt.length) / 4);
                const estimatedCostUsd = (estimatedInputTokens * 0.0000014) + (estimatedOutputTokens * 0.0000028); // DeepSeek-equivalent pricing

                fallbackRouteData.tokenUsage = {
                    promptTokens: estimatedInputTokens,
                    completionTokens: estimatedOutputTokens,
                    totalTokens: estimatedInputTokens + estimatedOutputTokens,
                    promptCacheHitTokens: 0,
                    model: 'openrouter-fallback',
                    costUsd: estimatedCostUsd,
                    costRub: estimatedCostUsd * 80
                };

                console.log("Success with OpenRouter fallback")
                console.log(`OpenRouter estimated: ${fallbackRouteData.tokenUsage.totalTokens} tokens, $${estimatedCostUsd.toFixed(4)}`)
                return NextResponse.json(fallbackRouteData)
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
