/**
 * Travelpayouts Partner Links Generator
 *
 * Документация: https://support.travelpayouts.com/hc/en-us/articles/5711895629714
 *
 * Для работы нужен MARKER (Partner ID) из личного кабинета Travelpayouts.
 * Получить: https://www.travelpayouts.com/programs/100/tools/api
 */

// Партнёрский маркер (заменить на реальный из .env)
const TRAVELPAYOUTS_MARKER = process.env.NEXT_PUBLIC_TRAVELPAYOUTS_MARKER || ""

// IATA коды популярных городов (расширяемый список)
export const IATA_CODES: Record<string, string> = {
  // Россия
  "москва": "MOW",
  "moscow": "MOW",
  "санкт-петербург": "LED",
  "питер": "LED",
  "saint petersburg": "LED",
  "сочи": "AER",
  "sochi": "AER",
  "казань": "KZN",
  "kazan": "KZN",
  "екатеринбург": "SVX",
  "новосибирск": "OVB",
  "калининград": "KGD",
  "владивосток": "VVO",
  "красноярск": "KJA",
  "нижний новгород": "GOJ",
  "самара": "KUF",
  "уфа": "UFA",
  "ростов-на-дону": "ROV",
  "минеральные воды": "MRV",

  // Европа
  "париж": "PAR",
  "paris": "PAR",
  "лондон": "LON",
  "london": "LON",
  "рим": "ROM",
  "rome": "ROM",
  "берлин": "BER",
  "berlin": "BER",
  "мадрид": "MAD",
  "madrid": "MAD",
  "барселона": "BCN",
  "barcelona": "BCN",
  "амстердам": "AMS",
  "amsterdam": "AMS",
  "прага": "PRG",
  "prague": "PRG",
  "вена": "VIE",
  "vienna": "VIE",
  "стамбул": "IST",
  "istanbul": "IST",
  "афины": "ATH",
  "athens": "ATH",
  "лиссабон": "LIS",
  "lisbon": "LIS",
  "милан": "MIL",
  "milan": "MIL",
  "мюнхен": "MUC",
  "munich": "MUC",
  "цюрих": "ZRH",
  "zurich": "ZRH",
  "варшава": "WAW",
  "warsaw": "WAW",
  "будапешт": "BUD",
  "budapest": "BUD",
  "белград": "BEG",
  "belgrade": "BEG",

  // Азия
  "дубай": "DXB",
  "dubai": "DXB",
  "бангкок": "BKK",
  "bangkok": "BKK",
  "токио": "TYO",
  "tokyo": "TYO",
  "сеул": "SEL",
  "seoul": "SEL",
  "пекин": "BJS",
  "beijing": "BJS",
  "шанхай": "SHA",
  "shanghai": "SHA",
  "сингапур": "SIN",
  "singapore": "SIN",
  "гонконг": "HKG",
  "hong kong": "HKG",
  "бали": "DPS",
  "bali": "DPS",
  "пхукет": "HKT",
  "phuket": "HKT",
  "дели": "DEL",
  "delhi": "DEL",
  "мумбаи": "BOM",
  "mumbai": "BOM",
  "ханой": "HAN",
  "hanoi": "HAN",
  "хошимин": "SGN",
  "ho chi minh": "SGN",
  "куала-лумпур": "KUL",
  "kuala lumpur": "KUL",
  "тель-авив": "TLV",
  "tel aviv": "TLV",
  "тбилиси": "TBS",
  "tbilisi": "TBS",
  "ереван": "EVN",
  "yerevan": "EVN",
  "баку": "GYD",
  "baku": "GYD",
  "ташкент": "TAS",
  "tashkent": "TAS",
  "алматы": "ALA",
  "almaty": "ALA",

  // Америка
  "нью-йорк": "NYC",
  "new york": "NYC",
  "лос-анджелес": "LAX",
  "los angeles": "LAX",
  "майами": "MIA",
  "miami": "MIA",
  "лас-вегас": "LAS",
  "las vegas": "LAS",
  "торонто": "YTO",
  "toronto": "YTO",
  "мехико": "MEX",
  "mexico city": "MEX",
  "сан-паулу": "SAO",
  "sao paulo": "SAO",
  "буэнос-айрес": "BUE",
  "buenos aires": "BUE",

  // Африка и Океания
  "каир": "CAI",
  "cairo": "CAI",
  "кейптаун": "CPT",
  "cape town": "CPT",
  "сидней": "SYD",
  "sydney": "SYD",
  "мельбурн": "MEL",
  "melbourne": "MEL",
}

/**
 * Получить IATA код города
 */
export function getIataCode(city: string): string | null {
  const normalized = city.toLowerCase().trim()
  return IATA_CODES[normalized] || null
}

/**
 * Форматирование даты для URL (YYYY-MM-DD)
 */
function formatDate(date: Date | string): string {
  if (typeof date === "string") {
    // Если уже в формате YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date
    date = new Date(date)
  }
  return date.toISOString().split("T")[0]
}

interface FlightSearchParams {
  origin?: string        // Город вылета
  originIata?: string    // IATA код вылета (приоритет)
  destination: string    // Город прилёта
  destinationIata?: string // IATA код прилёта (приоритет)
  departDate?: Date | string
  returnDate?: Date | string
  adults?: number
  children?: number
  tripClass?: "economy" | "business"
  subId?: string         // Дополнительный маркер для аналитики
}

/**
 * Генерация партнёрской ссылки на поиск авиабилетов (Aviasales)
 *
 * @example
 * getFlightSearchLink({
 *   origin: "Москва",
 *   destination: "Париж",
 *   departDate: "2025-03-15",
 *   returnDate: "2025-03-22"
 * })
 * // => https://www.aviasales.ru/search/MOW1503PAR2203economy?marker=...
 */
export function getFlightSearchLink(params: FlightSearchParams): string {
  const {
    origin,
    originIata,
    destination,
    destinationIata,
    departDate,
    returnDate,
    adults = 1,
    tripClass = "economy",
    subId
  } = params

  // Определяем IATA коды
  const destIata = destinationIata || getIataCode(destination) || ""
  const origIata = originIata || (origin ? getIataCode(origin) : null) || ""

  // Формируем базовый URL
  // Формат: https://www.aviasales.ru/search/ORIGDDMMDESDDMM1?marker=...
  // Или через параметры: https://search.aviasales.com/flights/

  const baseUrl = "https://www.aviasales.ru/search"

  const searchParams = new URLSearchParams()

  // Добавляем маркер если есть
  if (TRAVELPAYOUTS_MARKER) {
    searchParams.set("marker", TRAVELPAYOUTS_MARKER)
    if (subId) {
      searchParams.set("marker", `${TRAVELPAYOUTS_MARKER}.${subId}`)
    }
  }

  // Основные параметры поиска
  if (origIata) searchParams.set("origin_iata", origIata)
  if (destIata) searchParams.set("destination_iata", destIata)

  if (departDate) {
    searchParams.set("depart_date", formatDate(departDate))
  }
  if (returnDate) {
    searchParams.set("return_date", formatDate(returnDate))
  }

  searchParams.set("adults", adults.toString())
  searchParams.set("trip_class", tripClass === "business" ? "1" : "0")
  searchParams.set("with_request", "true")

  return `${baseUrl}?${searchParams.toString()}`
}

interface HotelSearchParams {
  destination: string    // Город или название отеля
  checkIn?: Date | string
  checkOut?: Date | string
  adults?: number
  children?: number
  rooms?: number
  subId?: string
}

/**
 * Генерация партнёрской ссылки на поиск отелей (Hotellook/Ostrovok)
 */
export function getHotelSearchLink(params: HotelSearchParams): string {
  const {
    destination,
    checkIn,
    checkOut,
    adults = 2,
    rooms = 1,
    subId
  } = params

  // Используем Ostrovok (работает для РФ лучше)
  const baseUrl = "https://ostrovok.ru/hotel/search"

  const searchParams = new URLSearchParams()

  // Добавляем маркер
  if (TRAVELPAYOUTS_MARKER) {
    const marker = subId ? `${TRAVELPAYOUTS_MARKER}.${subId}` : TRAVELPAYOUTS_MARKER
    searchParams.set("marker", marker)
  }

  searchParams.set("q", destination)
  searchParams.set("guests", adults.toString())
  searchParams.set("rooms", rooms.toString())

  if (checkIn) searchParams.set("checkIn", formatDate(checkIn))
  if (checkOut) searchParams.set("checkOut", formatDate(checkOut))

  return `${baseUrl}?${searchParams.toString()}`
}

/**
 * Альтернативная ссылка на Hotellook (международный)
 */
export function getHotellookLink(params: HotelSearchParams): string {
  const {
    destination,
    checkIn,
    checkOut,
    adults = 2,
    subId
  } = params

  const baseUrl = "https://search.hotellook.com"

  const searchParams = new URLSearchParams()

  if (TRAVELPAYOUTS_MARKER) {
    const marker = subId ? `${TRAVELPAYOUTS_MARKER}.${subId}` : TRAVELPAYOUTS_MARKER
    searchParams.set("marker", marker)
  }

  searchParams.set("destination", destination)
  searchParams.set("adults", adults.toString())

  if (checkIn) searchParams.set("checkIn", formatDate(checkIn))
  if (checkOut) searchParams.set("checkOut", formatDate(checkOut))

  return `${baseUrl}?${searchParams.toString()}`
}

interface TrainSearchParams {
  origin: string
  destination: string
  departDate?: Date | string
  subId?: string
}

/**
 * Ссылка на поиск ЖД билетов (Tutu.ru через Travelpayouts)
 */
export function getTrainSearchLink(params: TrainSearchParams): string {
  const { origin, destination, departDate, subId } = params

  const baseUrl = "https://www.tutu.ru/poezda/rasp_d.php"

  const searchParams = new URLSearchParams()

  if (TRAVELPAYOUTS_MARKER) {
    const marker = subId ? `${TRAVELPAYOUTS_MARKER}.${subId}` : TRAVELPAYOUTS_MARKER
    searchParams.set("marker", marker)
  }

  searchParams.set("st1", origin)
  searchParams.set("st2", destination)

  if (departDate) {
    searchParams.set("date", formatDate(departDate))
  }

  return `${baseUrl}?${searchParams.toString()}`
}

/**
 * Ссылка на страховку (Cherehapa через Travelpayouts)
 */
export function getInsuranceLink(destination: string, departDate?: Date | string, returnDate?: Date | string): string {
  const baseUrl = "https://www.cherehapa.ru"

  const searchParams = new URLSearchParams()

  if (TRAVELPAYOUTS_MARKER) {
    searchParams.set("marker", TRAVELPAYOUTS_MARKER)
  }

  searchParams.set("country", destination)

  if (departDate) searchParams.set("date_from", formatDate(departDate))
  if (returnDate) searchParams.set("date_to", formatDate(returnDate))

  return `${baseUrl}?${searchParams.toString()}`
}

/**
 * Генерация всех партнёрских ссылок для маршрута
 */
export function generateTripBookingLinks(tripData: {
  origin?: string
  destination: string
  startDate?: string
  endDate?: string
  travelers?: number
}) {
  const { origin, destination, startDate, endDate, travelers = 1 } = tripData

  return {
    flights: getFlightSearchLink({
      origin,
      destination,
      departDate: startDate,
      returnDate: endDate,
      adults: travelers,
      subId: "trip_page"
    }),
    hotels: getHotelSearchLink({
      destination,
      checkIn: startDate,
      checkOut: endDate,
      adults: travelers,
      subId: "trip_page"
    }),
    hotellook: getHotellookLink({
      destination,
      checkIn: startDate,
      checkOut: endDate,
      adults: travelers,
      subId: "trip_page"
    }),
    insurance: getInsuranceLink(destination, startDate, endDate),
    trains: origin ? getTrainSearchLink({
      origin,
      destination,
      departDate: startDate,
      subId: "trip_page"
    }) : null
  }
}

/**
 * Проверка наличия маркера
 */
export function hasPartnerMarker(): boolean {
  return !!TRAVELPAYOUTS_MARKER
}

/**
 * Информация для отладки
 */
export function getMarkerInfo(): { hasMarker: boolean; marker: string } {
  return {
    hasMarker: !!TRAVELPAYOUTS_MARKER,
    marker: TRAVELPAYOUTS_MARKER ? `${TRAVELPAYOUTS_MARKER.substring(0, 4)}...` : ""
  }
}

// ============================================
// TRAVELPAYOUTS DATA API (Prices & Flights)
// ============================================

const TRAVELPAYOUTS_API_TOKEN = process.env.TRAVELPAYOUTS_API_TOKEN || ""
const API_BASE_URL = "https://api.travelpayouts.com"

/**
 * Проверка наличия API токена
 */
export function hasApiToken(): boolean {
  return !!TRAVELPAYOUTS_API_TOKEN
}

interface CheapTicket {
  price: number
  airline: string
  flight_number: number
  departure_at: string
  return_at: string
  expires_at: string
  transfers: number
}

interface CheapTicketsResponse {
  success: boolean
  data: Record<string, Record<string, CheapTicket>>
  currency: string
}

/**
 * Получить самые дешёвые билеты по маршруту
 *
 * @example
 * const tickets = await getCheapestTickets("MOW", "PAR", "2025-03")
 */
export async function getCheapestTickets(
  origin: string,
  destination: string,
  departMonth?: string, // YYYY-MM
  returnMonth?: string,
  currency: string = "rub"
): Promise<CheapTicketsResponse | null> {
  if (!TRAVELPAYOUTS_API_TOKEN) {
    console.warn("TRAVELPAYOUTS_API_TOKEN not set")
    return null
  }

  const params = new URLSearchParams({
    origin,
    destination,
    currency,
    token: TRAVELPAYOUTS_API_TOKEN
  })

  if (departMonth) params.set("depart_date", departMonth)
  if (returnMonth) params.set("return_date", returnMonth)

  try {
    const response = await fetch(
      `${API_BASE_URL}/v1/prices/cheap?${params.toString()}`
    )

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("getCheapestTickets error:", error)
    return null
  }
}

interface CalendarPrice {
  origin: string
  destination: string
  price: number
  transfers: number
  airline: string
  flight_number: number
  departure_at: string
  return_at: string
  expires_at: string
}

/**
 * Получить календарь цен (самые дешёвые дни для перелёта)
 */
export async function getPriceCalendar(
  origin: string,
  destination: string,
  departDate: string, // YYYY-MM-DD
  currency: string = "rub"
): Promise<CalendarPrice[] | null> {
  if (!TRAVELPAYOUTS_API_TOKEN) {
    console.warn("TRAVELPAYOUTS_API_TOKEN not set")
    return null
  }

  try {
    const response = await fetch(
      `https://min-prices.aviasales.ru/calendar_preload?origin=${origin}&destination=${destination}&depart_date=${departDate}&one_way=false&token=${TRAVELPAYOUTS_API_TOKEN}`
    )

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    return data.best_prices || []
  } catch (error) {
    console.error("getPriceCalendar error:", error)
    return null
  }
}

interface WeekMatrixPrice {
  show_to_affiliates: boolean
  trip_class: number
  origin: string
  destination: string
  depart_date: string
  return_date: string
  number_of_changes: number
  value: number
  found_at: string
  distance: number
  actual: boolean
}

/**
 * Получить матрицу цен на неделю (±3 дня от выбранной даты)
 */
export async function getWeekMatrix(
  origin: string,
  destination: string,
  departDate: string,
  returnDate: string,
  currency: string = "rub"
): Promise<WeekMatrixPrice[] | null> {
  if (!TRAVELPAYOUTS_API_TOKEN) {
    console.warn("TRAVELPAYOUTS_API_TOKEN not set")
    return null
  }

  const params = new URLSearchParams({
    origin,
    destination,
    depart_date: departDate,
    return_date: returnDate,
    currency,
    show_to_affiliates: "true",
    token: TRAVELPAYOUTS_API_TOKEN
  })

  try {
    const response = await fetch(
      `${API_BASE_URL}/v2/prices/week-matrix?${params.toString()}`
    )

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error("getWeekMatrix error:", error)
    return null
  }
}

interface SpecialOffer {
  title: string
  origin: string
  destination: string
  departure_at: string
  return_at: string
  airline: string
  price: number
  link: string
}

/**
 * Получить спецпредложения (аномально низкие цены)
 */
export async function getSpecialOffers(
  origin?: string, // Если не указан - определяется по IP
  currency: string = "rub"
): Promise<SpecialOffer[] | null> {
  if (!TRAVELPAYOUTS_API_TOKEN) {
    console.warn("TRAVELPAYOUTS_API_TOKEN not set")
    return null
  }

  const params = new URLSearchParams({
    currency,
    token: TRAVELPAYOUTS_API_TOKEN
  })

  if (origin) params.set("origin", origin)

  try {
    const response = await fetch(
      `${API_BASE_URL}/aviasales/v3/get_special_offers?${params.toString()}`
    )

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("getSpecialOffers error:", error)
    return null
  }
}

interface PopularDestination {
  origin: string
  destination: string
  departure_date: string
  return_date: string
  price: number
  number_of_changes: number
  airline: string
  flight_number: number
  destination_name?: string
}

/**
 * Получить популярные направления из города
 */
export async function getPopularDestinations(
  origin: string,
  currency: string = "rub"
): Promise<PopularDestination[] | null> {
  if (!TRAVELPAYOUTS_API_TOKEN) {
    console.warn("TRAVELPAYOUTS_API_TOKEN not set")
    return null
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/v1/city-directions?origin=${origin}&currency=${currency}&token=${TRAVELPAYOUTS_API_TOKEN}`
    )

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()

    // Преобразуем объект в массив
    if (data.data) {
      return Object.entries(data.data).map(([dest, info]: [string, any]) => ({
        origin,
        destination: dest,
        ...info
      }))
    }
    return []
  } catch (error) {
    console.error("getPopularDestinations error:", error)
    return null
  }
}

/**
 * Форматирование цены с валютой
 */
export function formatPrice(price: number, currency: string = "rub"): string {
  const symbols: Record<string, string> = {
    rub: "₽",
    usd: "$",
    eur: "€"
  }

  const formatted = new Intl.NumberFormat("ru-RU").format(price)
  return `${formatted} ${symbols[currency] || currency.toUpperCase()}`
}

/**
 * Получить минимальную цену из данных календаря
 */
export function findMinPrice(prices: CalendarPrice[]): CalendarPrice | null {
  if (!prices.length) return null
  return prices.reduce((min, p) => p.price < min.price ? p : min, prices[0])
}
