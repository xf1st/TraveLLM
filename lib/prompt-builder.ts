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
import type { BookingMarket } from "./booking-market"
import { getTpProgramIdsForPrompt, getTpTrId } from "./tp-media"

/** ТоМесто — бронь столиков в РФ. Все ссылки на tomesto.ru с ref_id=2163507. */
const TOMESTO_RU_REF_URL = "https://tomesto.ru/?ref_id=2163507"

function buildTpMediaDeepLinksBlock(isEn: boolean, market: BookingMarket): string {
    if (market !== "ru") return ""
    const affBase = (process.env.NEXT_PUBLIC_TP_AFFILIATE_REDIRECT_URL || "https://emrld.ltd/re").trim().replace(/\/+$/, "")
    const marker = process.env.NEXT_PUBLIC_TRAVELPAYOUTS_MARKER || ""
    const p = getTpProgramIdsForPrompt()
    const trId = getTpTrId()
    const pid = (key: keyof typeof p, envName: string) =>
        p[key] ? `p=${p[key]}` : `p=(set ${envName} in .env)`

    if (isEn) {
        return `
7. AFFILIATE DEEP LINKS — emrld.ltd/re (RU stack — required for partners below; NO bare homepages):
SCOPE: Apply this section **only** to activities and hotel nights **in Russia (RF)**. For places outside Russia use global partners (§0, §5–§6) — do NOT invent tripster.ru or sputnik8.com paths for foreign cities.
Build a **single valid URL string**: start from \`${affBase}?marker=${marker || "YOUR_MARKER"}&p=\` + **numeric program id** from the list below + \`&u=\` + **percent-encoded** target (use real encoding, never the words ENCODEURIComponent or PROGRAM_ID in the output).
Example shape: \`...&p=1234&u=https%3A%2F%2Ftravel.yandex.ru%2Fhotels%2F...\` — never output literal \`PROGRAM_ID\`, \`ENCODEURIComponent(...)\`, or \`ID_ПРОГРАММЫ\`.
Use real https targets: search results, city/category pages, hotel search — never only domain root for Sputnik8/Tripster.

Program IDs for this project:
- Yandex Travel hotels: ${pid("yandexTravel", "NEXT_PUBLIC_TP_P_YANDEX_TRAVEL")}
- Ostrovok: ${pid("ostrovok", "NEXT_PUBLIC_TP_P_OSTROVOK")}
- Tripster: ${pid("tripster", "NEXT_PUBLIC_TP_P_TRIPSTER")}
- Sputnik8: ${pid("sputnik8", "NEXT_PUBLIC_TP_P_SPUTNIK8")} (default 1173 if unset)
- Kiwitaxi: ${pid("kiwitaxi", "NEXT_PUBLIC_TP_P_KIWITAXI")}
- Sutochno: ${pid("sutochno", "NEXT_PUBLIC_TP_P_SUTOCHNO")}

Activity → partner → target URL pattern (then wrap in emrld affiliate redirect with matching p):
| Excursions / guided tours | Tripster | https://tripster.ru/destinations/{city_slug}/ (latin slug: moscow, kazan, irkutsk…) |
| Tickets: museums, water parks, boats, fun | Sputnik8 | https://sputnik8.com/ru/{city_slug}/category/{category_slug}/ (e.g. muzei, ekskursii, vodnyie-progulki — pick what fits) |
| Airport ↔ hotel transfer | Kiwitaxi | Real search URL on kiwitaxi.ru with from/to places (not generic / only) |
| Apartment / daily rent (not hotel room) | Sutochno | City subdomain or search: https://spb.sutochno.ru/ https://sochi.sutochno.ru/ https://www.sutochno.ru/ (Moscow), https://kazan.sutochno.ru/, etc. |
| Hotels | Yandex + Ostrovok | bookingUrl: emrld wrap + Yandex Travel hotel URL with dates (§5). link: emrld wrap + https://ostrovok.ru/hotel/search/?q={CityOrHotelName} |

If a program ID is missing in .env, output the partner deep URL without the affiliate wrapper (still deep, not homepage).
`.trim()
    }
    return `
7. ГЛУБОКИЕ ССЫЛКИ — редирект emrld.ltd/re (стек travellm.ru — обязательно; не главные страницы партнёров):
ОБЛАСТЬ: этот пункт — **только** для активностей и ночёвок **в России (РФ)**. Для зарубежных городов — глобальные партнёры (п.0, п.5–п.6); не придумывай tripster.ru / sputnik8.com для Бангкока, Парижа и т.п.
Собери **одну готовую строку URL**: \`${affBase}?marker=...\` + \`&p=\` + **числовой id программы** из списка ниже + \`&u=\` + **уже закодированный** целевой https (посимвольный percent-encoding). **Запрещено** подставлять в JSON буквальный текст \`ID_ПРОГРАММЫ\`, \`ENCODEURIComponent(...)\`, \`PROGRAM_ID\` — только реальные цифры в \`p\` и реальный закодированный URL в \`u\`.
Пример: \`...&p=1234&u=https%3A%2F%2Ftravel.yandex.ru%2Fhotels%2F...\`
Параметр \`u\` — это только закодированный готовый URL на tripster.ru, sputnik8.com, ostrovok.ru, travel.yandex.ru, kiwitaxi.ru, sutochno.ru и т.д.

ID программ (p) для этого проекта:
- Яндекс.Путешествия (отели): ${pid("yandexTravel", "NEXT_PUBLIC_TP_P_YANDEX_TRAVEL")}
- Островок: ${pid("ostrovok", "NEXT_PUBLIC_TP_P_OSTROVOK")}
- Tripster: ${pid("tripster", "NEXT_PUBLIC_TP_P_TRIPSTER")}
- Sputnik8: ${pid("sputnik8", "NEXT_PUBLIC_TP_P_SPUTNIK8")} (по умолчанию 1173, если не задано)
- Kiwitaxi: ${pid("kiwitaxi", "NEXT_PUBLIC_TP_P_KIWITAXI")}
- Суточно.ру: ${pid("sutochno", "NEXT_PUBLIC_TP_P_SUTOCHNO")}

Маппинг типа активности → партнёр → целевой URL (затем обернуть в emrld с нужным p):
| Экскурсии, гиды, туры с местным гидом | Tripster | https://tripster.ru/destinations/{city_slug}/ (латиница: moscow, kazan, vladivostok…) |
| Билеты: музеи, аквапарки, катера, развлечения | Sputnik8 | https://sputnik8.com/ru/{city_slug}/category/{category_slug}/ — подбери category по смыслу (muzei, ekskursii, vodnyie-progulki, razvlecheniya…) |
| Трансфер аэропорт ↔ отель/адрес | Kiwitaxi | Реальный URL поиска/заказа на kiwitaxi.ru с пунктами from/to |
| Жильё посуточно (квартира, дом, не номер отеля) | Суточно | Поддомен города: spb.sutochno.ru, sochi.sutochno.ru, kazan.sutochno.ru, www.sutochno.ru (Москва), ekaterinburg.sutochno.ru и т.п. — не просто корень без города |
| Отели | Яндекс + Островок | bookingUrl: обёртка emrld + URL Яндекс.Путешествий с датами заезда/выезда (как в п.5). link: обёртка emrld + https://ostrovok.ru/hotel/search/?q=Город+или+НазваниеОтеля — вторая ссылка как альтернатива Островку |

Запрещено отдавать одну только https://sputnik8.com/ru/ без города и категории. Если p не задан в .env — дай глубокий URL партнёра без обёртки.
`.trim()
}

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
    /** Обязательная активность из discovery reel (локализованный блок текста) */
    reelAnchorPrompt?: string
    /** Домен: RU-агрегаторы vs глобальные (Booking, Trip.com, aviasales.com) */
    bookingMarket?: BookingMarket
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

/**
 * Партнёры TP привязаны к географии активности, а не к домену TraveLLM (.ru / .world).
 */
function buildRegionalPartnerRoutingBlock(
    isEn: boolean,
    destinations: string[],
    destinationType?: string
): string {
    const destLine =
        destinations.length > 0
            ? destinations.join(", ")
            : isEn
              ? "(infer from trip context)"
              : "(из контекста поездки)"
    const russiaFocused =
        destinationType === "russia" ||
        destinations.some((d) =>
            /росси|рф\b|russia\b|камчатк|крым|байкал|сочи|кавказ|алтай|карели|петербург|москв|казань|екатеринбург|владивосток|иркутск|калининград|дагестан/i.test(
                d
            )
        )

    if (isEn) {
        return `
0. REGION → PARTNER STACK (Travelpayouts — use the programs you have connected; **per activity geography**):
Pick \`link\` / \`bookingUrl\` / \`ticketUrl\` by **where that card happens** (city/country of the hotel or place), not by TraveLLM UI locale.

• **Russia (RF)** — hotel night or activity in a Russian city: PRIMARY your **RU-connected** stack — Yandex Travel + Ostrovok (hotels, deep URLs + emrld §7), Tripster (excursions/guides), Sputnik8 (tickets/categories), Kiwitaxi.ru (airport↔hotel), Sutochno (daily apartments), Aviasales.ru for flight legs when appropriate, Tomesto for restaurants in RF.

• **Outside Russia:** Do **not** use Tripster / Sputnik8 / Yandex Travel / Sutochno as the main booking path for that foreign city (coverage is RF-centric). Use the **global connected** stack from §5–§6 — Booking.com / Trip.com (hotels), Klook / Tiqets / WeGoTrip (activities), TripAdvisor or official sites (food), kiwitaxi.com / Intui / Welcome Pickups (transfers), Aviasales domain that matches the segment (§5–§6).

• **Mixed trips** (e.g. Kazan → Dubai): RU stack **only** for Russian segments; switch to global stack for each foreign day/activity.

Trip focus from the form: ${destLine}
${russiaFocused ? "Russia-focused itinerary — RU stack is the default unless a day is clearly abroad." : ""}
`.trim()
    }
    return `
0. РЕГИОН → СТЕК ПАРТНЁРОВ Travelpayouts (удобно по географии; только подключённые программы):
Поля \`link\` / \`bookingUrl\` / \`ticketUrl\` выбирай по **месту этой карточки** (город/страна отеля или места), а не по тому, открыт ли TraveLLM как .ru или .world.

• **Россия (РФ)** — ночёвка или активность в российском городе: основной канал **RU-программы TP** — Яндекс.Путешествия + Островок (отели, глубокие ссылки + emrld п.7), Tripster, Sputnik8, Kiwitaxi.ru, Суточно, Aviasales.ru для перелётов где уместно, ТоМесто для ресторанов в РФ.

• **За рубежом:** не ставь Tripster / Sputnik8 / Яндекс.Путешествия / Суточно **главной** ссылкой на активность в иностранном городе. Используй **глобальный стек из п.5–п.6** — Booking.com / Trip.com, Klook / Tiqets / WeGoTrip, TripAdvisor или официальный сайт, kiwitaxi.com / Intui / Welcome Pickups, домен Aviasales по сегменту.

• **Смешанные маршруты** (РФ + зарубежье): в России — стек РФ; за границей — глобальный; **переключай по каждой активности**.

Направления из формы: ${destLine}
${russiaFocused ? "Поездка в основном по России — по умолчанию стек РФ, кроме явно зарубежных дней." : ""}
`.trim()
}

function buildBookingLinksTechnicalBlock(isEn: boolean, market: BookingMarket): string {
    const ruStack = market === "ru"
    if (isEn) {
        if (ruStack) {
            return `
5. LINKS — CRITICAL, fill for EVERY activity:

   mapLink (ALWAYS except flights):
     "https://www.google.com/maps/search/?api=1&query={PlaceName}+{City}"

   transport (flight) → link:
     "https://www.aviasales.ru/search/{ORG}{DDMM}{DEST}1"
     Example: "https://www.aviasales.ru/search/MOW1506BKK1"

   transport (train) → link:
     Russia/CIS: "https://ticket.rzd.ru/" or "https://travel.yandex.ru/trains/"

   transport (transfer/taxi) → link:
     Kiwitaxi deep search URL (from/to airport or hotel), not generic homepage — wrap in emrld §7 when p known.

   hotel → bookingUrl (NOT map) + link:
     bookingUrl: Yandex Travel hotels deep URL with dates (see §7 tp.media wrap with program p for Yandex).
     link: Ostrovok hotel search deep URL https://ostrovok.ru/hotel/search/?q={CityOrHotel} (§7 tp.media with Ostrovok p). Russia: always offer BOTH; abroad: Booking/Trip.com per §5 world rules.

   food → link (and bookingUrl when table booking matters):
     Russian cities: Tomesto first — ${TOMESTO_RU_REF_URL} (any deeper tomesto.ru URL MUST keep ref_id=2163507). Fine dining / luxury: Tomesto + official venue site.
     Also TripAdvisor or official restaurant site where Tomesto is not a fit.

   activity → link + ticketUrl:
     Russian cities: Tripster (excursions/guides), Sputnik8 (museums/boats/water parks — category deep URLs), Sutochno (daily apartments); then Klook/Tiqets/WeGoTrip; official site. All partner links via emrld §7 when program p is known.

   Adventure activities → same; Russia: skydiving.ru, rafting.ru, rechnoyflot.ru where they are the real channel.
`.trim()
        }
        return `
5. LINKS — CRITICAL, fill for EVERY activity:

   mapLink (ALWAYS except flights):
     "https://www.google.com/maps/search/?api=1&query={PlaceName}+{City}"

   transport (flight) → link:
     "https://www.aviasales.com/search/{ORG}{DDMM}{DEST}1"

   transport (train) → link:
     "https://www.trip.com/trains/" or "https://www.omio.com/" for booking; use RZD only for segments inside Russia.

   transport (transfer/taxi) → link:
     "https://kiwitaxi.com/"

   hotel → bookingUrl (NOT map):
     Russian cities: Yandex Travel (Travelpayouts): "https://travel.yandex.ru/hotels/{city-slug}/?..." — required; do NOT use Booking.com as primary for Russia.
     Other countries: "https://www.booking.com/search.html?ss={HotelName}%2C+{City}"; Trip.com as alternative.

   food → link:
     TripAdvisor or official site.

   activity → link + ticketUrl:
     Klook, Tiqets, WeGoTrip, or official site (connected Travelpayouts programs — not GetYourGuide/Viator).

   Adventure activities → Klook/Tiqets/WeGoTrip + local official sites where people actually book.
`.trim()
    }
    if (ruStack) {
        return `
5. ССЫЛКИ — КРИТИЧЕСКИ ВАЖНО, заполняй для КАЖДОЙ активности:

   mapLink (ВСЕГДА, кроме перелётов):
     "https://www.google.com/maps/search/?api=1&query={PlaceName}+{City}"

   transport (авиа) → link:
     "https://www.aviasales.ru/search/{ORG}{DDMM}{DEST}1"
     Пример: "https://www.aviasales.ru/search/MOW1506BKK1"
     (mapLink НЕ нужен для перелётов)

   transport (поезд) → link:
     "https://ticket.rzd.ru/" для РФ; также "https://travel.yandex.ru/trains/" (Яндекс.Путешествия + Островок)

   transport (трансфер/такси) → link:
     Kiwitaxi — глубокий URL маршрута (аэропорт↔отель/адрес), не только главная; emrld п.7 при известном p.

   hotel → bookingUrl (НЕ карта!) + link:
     bookingUrl: Яндекс.Путешествия — глубокий URL отелей с датами (обёртка tp.media — п.7).
     link: Островок — глубокий поиск https://ostrovok.ru/hotel/search/?q=Город+или+отель (emrld п.7). По РФ всегда обе ссылки; за рубежом — см. п.5 для мира.

   food → link (и bookingUrl, если важна бронь столика):
     Города РФ: в первую очередь ТоМесто — ${TOMESTO_RU_REF_URL} (любая ссылка на tomesto.ru — с ref_id=2163507). Люкс и премиум-рестораны: обязательно ТоМесто + официальный сайт заведения.
     Дополнительно TripAdvisor или официальный сайт, если заведения нет на ТоМесто.

   activity (музей/экскурсия) → link + ticketUrl:
     Города РФ: Tripster (экскурсии), Sputnik8 (музеи/катера/аквапарки — URL категории), при посуточном жилье — Суточно; плюс Klook/Tiqets/WeGoTrip и официальный сайт. Ссылки партнёров — через tp.media (п.7).

   ПРИКЛЮЧЕНЧЕСКИЕ АКТИВНОСТИ → link:
     Tripster/Sputnik8/Klook/Tiqets/WeGoTrip по смыслу; РФ — приоритет Tripster/Sputnik8; официальные сайты, skydiving.ru, rafting.ru, rechnoyflot.ru где уместно.
`.trim()
    }
    return `
5. ССЫЛКИ — КРИТИЧЕСКИ ВАЖНО, заполняй для КАЖДОЙ активности:

   mapLink (ВСЕГДА, кроме перелётов):
     "https://www.google.com/maps/search/?api=1&query={PlaceName}+{City}"

   transport (авиа) → link:
     "https://www.aviasales.com/search/{ORG}{DDMM}{DEST}1"

   transport (поезд) → link:
     "https://www.trip.com/trains/" или "https://www.omio.com/" для международных маршрутов; внутри РФ при необходимости ticket.rzd.ru

   transport (трансфер/такси) → link:
     "https://kiwitaxi.com/"

   hotel → bookingUrl (НЕ карта!):
     Города России: обязательно Яндекс.Путешествия — "https://travel.yandex.ru/hotels/{city-slug}/?..."; не делай Booking.com основным для РФ.
     Другие страны: Booking.com; Trip.com как альтернатива.

   food → link:
     TripAdvisor или официальный сайт

   activity → link + ticketUrl:
     Klook / Tiqets / WeGoTrip или официальный сайт (только подключённые партнёры — не GetYourGuide/Viator).

   ПРИКЛЮЧЕНЧЕСКИЕ АКТИВНОСТИ — Klook/Tiqets/WeGoTrip + локальные официальные сайты, где реально бронируют.
`.trim()
}

/**
 * Домены из программ Travelpayouts (Drive подменяет ссылки на сайте).
 */
function buildTravelpayoutsPartnerLinksBlock(isEn: boolean, market: BookingMarket): string {
    const ruStack = market === "ru"
    if (isEn) {
        if (ruStack) {
            return `
6. TRAVELPAYOUTS PARTNER DOMAINS (RU stack — travellm.ru; real https://; NEVER invent path slugs):
- Flights: Aviasales https://www.aviasales.ru/search/{ORG}{DDMM}{DEST}1 in \`link\`.
- Hotels: Yandex Travel in \`bookingUrl\`; Ostrovok search in \`link\` (both deep + emrld §7). Booking.com only as extra for non-Russian cities abroad.
- Trains: ticket.rzd.ru, travel.yandex.ru/trains
- Airport / city transfers: https://kiwitaxi.ru/, https://intui.travel/, https://www.welcomepickups.com/, https://gettransfer.com/
- Car rental (when hiring a car — NOT "own car" mode): https://www.economybookings.com/, https://localrent.com/, https://www.qeeq.com/, https://getrentacar.com/
- Museums, attractions, timed entry: https://www.tiqets.com/, https://www.klook.com/ (search)
- Self-guided audio tours: https://wegotrip.com/
- Yacht / charter (only if sailing or yacht hire): https://searadar.com/
- Luggage storage: https://www.radicalstorage.com/
- Travel insurance (trips abroad): https://ekta.io/
- Flight disruption claims (where airline/EU-style rules apply, e.g. via EU hubs): https://compensair.com/, https://www.airhelp.com/
- Restaurants / table booking in Russia: ${TOMESTO_RU_REF_URL} in \`link\` or \`bookingUrl\`; fine dining — Tomesto first (keep ref_id=2163507 on all tomesto.ru links).
- Excursions / guides (Russia): Tripster; tickets & entertainment: Sputnik8; daily apartments: Sutochno; transfers: Kiwitaxi — all deep URLs + emrld §7.
- Activities / tours: also Klook, Tiqets, WeGoTrip per §5 — do NOT mention GetYourGuide, Viator, TicketNetwork, NordVPN, or eSIM shops (limited/unavailable for RU audience).
`.trim()
        }
        return `
6. TRAVELPAYOUTS PARTNER DOMAINS (global stack — travellm.world; real https://; NEVER invent path slugs):
- Flights: Aviasales.com same /search/{ORG}{DDMM}{DEST}1 pattern in \`link\`.
- Hotels: Booking.com primary in \`bookingUrl\` outside Russia; Russian cities — Yandex Travel (same URL pattern as RU stack).
- Trains: https://www.trip.com/trains/, https://www.omio.com/
- Airport / city transfers: https://kiwitaxi.com/, https://intui.travel/, https://www.welcomepickups.com/, https://gettransfer.com/
- Car rental (when hiring a car — NOT "own car" mode): https://www.economybookings.com/, https://localrent.com/, https://www.qeeq.com/, https://getrentacar.com/
- Museums, attractions, timed entry: https://www.tiqets.com/, https://www.klook.com/ (search)
- Self-guided audio tours: https://wegotrip.com/
- Yacht / charter (only if sailing or yacht hire): https://searadar.com/
- Luggage storage: https://www.radicalstorage.com/
- Travel eSIM — at most 1–2 mentions per whole trip: https://www.airalo.com/, https://yesim.app/, https://drimsim.com/
- Travel insurance (international): https://ekta.io/
- Flight disruption claims: https://compensair.com/, https://www.airhelp.com/
- VPN: https://nordvpn.com/ only when justified
- Shows / sports / events: https://www.ticketnetwork.com/
- Activities / tours: Klook, Tiqets, WeGoTrip per §5 — do NOT use GetYourGuide or Viator (not in connected partner set).
`.trim()
    }
    if (ruStack) {
        return `
6. ПАРТНЁРЫ Travelpayouts (стек travellm.ru — реальные https://; НЕ выдумывай slug):
- Перелёты → в \`link\` Aviasales: https://www.aviasales.ru/search/{ORG}{DDMM}{DEST}1 (как в п.5).
- Отели → \`bookingUrl\`: Яндекс.Путешествия; \`link\`: Островок поиск — оба глубокие URL + tp.media (п.7). Booking.com — дополнительно только для нероссийских городов за границей.
- Ж/д: ticket.rzd.ru, travel.yandex.ru/trains
- Трансфер аэропорт ↔ город: https://kiwitaxi.ru/, https://kiwitaxi.com/, https://intui.travel/, https://www.welcomepickups.com/, https://gettransfer.com/
- Аренда авто (не режим «своя машина»): https://www.economybookings.com/, https://localrent.com/, https://www.qeeq.com/, https://getrentacar.com/
- Музеи, билеты: https://www.tiqets.com/, https://www.klook.com/ru/ (поиск)
- Аудиогиды: https://wegotrip.com/
- Яхты / чартер: https://searadar.com/ только если активность про аренду яхты.
- Камера хранения: https://www.radicalstorage.com/
- Страховка (поездки за границу): https://ekta.io/
- Компенсация за сбой рейса (где действуют правила авиакомпании/EU и т.п.): https://compensair.com/, https://www.airhelp.com/
- Рестораны, бронь столиков в РФ: в \`link\` или \`bookingUrl\` — ${TOMESTO_RU_REF_URL}; люкс — в первую очередь ТоМесто, затем официальный сайт (ref_id=2163507 на всех ссылках tomesto.ru).
- Экскурсии Tripster, билеты Sputnik8, посуточно Суточно, трансфер Kiwitaxi — глубокие ссылки и п.7 tp.media.
- Также Klook, Tiqets, WeGoTrip из п.5. НЕ упоминай GetYourGuide, Viator, TicketNetwork, NordVPN и магазины eSIM.
`.trim()
    }
    return `
6. ПАРТНЁРЫ Travelpayouts (стек travellm.world — реальные https://; НЕ выдумывай slug):
- Перелёты → \`link\` на Aviasales.com: https://www.aviasales.com/search/{ORG}{DDMM}{DEST}1
- Отели → \`bookingUrl\`: Booking.com; Trip.com как альтернатива; города РФ — Яндекс.Путешествия (как в п.5).
- Ж/д: Trip.com/trains, Omio
- Трансфер: https://kiwitaxi.com/, https://intui.travel/, https://www.welcomepickups.com/, https://gettransfer.com/
- Аренда авто (не «своя машина»): https://www.economybookings.com/, https://localrent.com/, https://www.qeeq.com/, https://getrentacar.com/
- Музеи, билеты: https://www.tiqets.com/, https://www.klook.com/ru/ (поиск)
- Аудиогиды: https://wegotrip.com/
- Яхты / чартер: https://searadar.com/ только если про аренду яхты.
- Камера хранения: https://www.radicalstorage.com/
- eSIM: https://www.airalo.com/, https://yesim.app/, https://drimsim.com/
- Страховка: https://ekta.io/
- Компенсация за рейс: https://compensair.com/, https://www.airhelp.com/
- VPN: https://nordvpn.com/ при обосновании.
- Ивенты: https://www.ticketnetwork.com/
- Экскурсии и активности: п.5 — Klook, Tiqets, WeGoTrip; не используй GetYourGuide и Viator (нет в подключённых программах).
`.trim()
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
        reelAnchorPrompt,
        bookingMarket: bookingMarketParam,
    } = params

    const bookingMarket: BookingMarket = bookingMarketParam ?? "ru"
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
    let systemPrompt = tripVibe?.trim()
        ? `${systemPromptBase}\n\n${isEn
            ? "When the user message includes TRIP MOOD & ATMOSPHERE (HIGHEST PRIORITY), it overrides generic \"must-see\" landmark habits and template day patterns — especially if they conflict (e.g. nightlife vs temple circuits)."
            : "Если в запросе есть блок «ВАЙБ И АТМОСФЕРА (ВЫСШИЙ ПРИОРИТЕТ)» — следуй ему сильнее, чем шаблонным примерам и привычке набивать день храмами/музеями, если это противоречит описанному настроению."}`
        : systemPromptBase

    if (reelAnchorPrompt?.trim()) {
        systemPrompt += isEn
            ? "\n\nCRITICAL: A MANDATORY REEL ANCHOR appears in the user message. You MUST include that exact experience on the specified day — do not replace with a \"similar\" activity."
            : "\n\nКРИТИЧНО: В пользовательском сообщении — ОБЯЗАТЕЛЬНАЯ активность из рилса. Включи её в указанный день; не подменяй «похожим» вариантом."
    }

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

    if (reelAnchorPrompt?.trim()) {
        userParts.push(reelAnchorPrompt.trim())
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

    userParts.push(buildRegionalPartnerRoutingBlock(isEn, destinations, destinationType))

    userParts.push(`
ТЕХНИЧЕСКИЕ ПРАВИЛА:
${logisticsRuleLine1(travelMode, isEn)}
${carLinkNote ? `${carLinkNote}\n` : ""}2. ФОРМАТ ТРАНСПОРТА: В title указывай IATA коды, например: "Перелёт Москва (MOW) → Стамбул (IST)".
3. VIRAL SPOTS: Добавь 3-5 популярных в TikTok/Instagram локаций в отдельный массив viralSpots.
4. IMAGE QUERY: Для каждой активности (hotel, food, activity) добавь imageQuery на АНГЛИЙСКОМ для Pexels (например: "Art Deco hotel rooftop pool skyline Istanbul golden hour"). НЕ используй собственные имена.

${buildBookingLinksTechnicalBlock(isEn, bookingMarket)}
`.trim())

    userParts.push(buildTravelpayoutsPartnerLinksBlock(isEn, bookingMarket))
    const tpDeepBlock = buildTpMediaDeepLinksBlock(isEn, bookingMarket)
    if (tpDeepBlock) userParts.push(tpDeepBlock)

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
        reelAnchorPrompt,
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
${reelAnchorPrompt?.trim() ? `\n${reelAnchorPrompt.trim()}\n` : ""}

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
    reelAnchorPrompt?: string;
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
        reelAnchorPrompt,
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
${reelAnchorPrompt?.trim() ? `\n${reelAnchorPrompt.trim()}\n` : ""}

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
