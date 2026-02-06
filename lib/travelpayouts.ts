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

  // Европа (дополнительные)
  "хельсинки": "HEL",
  "helsinki": "HEL",
  "стокгольм": "STO",
  "stockholm": "STO",
  "осло": "OSL",
  "oslo": "OSL",
  "копенгаген": "CPH",
  "copenhagen": "CPH",
  "дублин": "DUB",
  "dublin": "DUB",
  "брюссель": "BRU",
  "brussels": "BRU",
  "загреб": "ZAG",
  "zagreb": "ZAG",
  "бухарест": "BUH",
  "bucharest": "BUH",
  "любляна": "LJU",
  "ljubljana": "LJU",
  "подгорица": "TGD",
  "podgorica": "TGD",
  "ларнака": "LCA",
  "larnaca": "LCA",
  "никосия": "LCA",
  "минск": "MSQ",
  "minsk": "MSQ",

  // Ближний Восток и Африка
  "доха": "DOH",
  "doha": "DOH",
  "амман": "AMM",
  "amman": "AMM",
  "маскат": "MCT",
  "muscat": "MCT",
  "марракеш": "RAK",
  "marrakech": "RAK",
  "каир": "CAI",
  "cairo": "CAI",
  "кейптаун": "CPT",
  "cape town": "CPT",

  // Азия (дополнительные)
  "коломбо": "CMB",
  "colombo": "CMB",
  "мале": "MLE",
  "male": "MLE",

  // Океания
  "сидней": "SYD",
  "sydney": "SYD",
  "мельбурн": "MEL",
  "melbourne": "MEL",
}

// Маппинг стран → главный город (для случаев когда AI возвращает названия стран)
const COUNTRY_TO_CITY: Record<string, string> = {
  "нидерланды": "амстердам",
  "голландия": "амстердам",
  "netherlands": "амстердам",
  "болгария": "софия",
  "bulgaria": "софия",
  "сербия": "белград",
  "serbia": "белград",
  "турция": "стамбул",
  "turkey": "стамбул",
  "франция": "париж",
  "france": "париж",
  "италия": "рим",
  "italy": "рим",
  "испания": "мадрид",
  "spain": "мадрид",
  "германия": "берлин",
  "germany": "берлин",
  "великобритания": "лондон",
  "англия": "лондон",
  "uk": "лондон",
  "чехия": "прага",
  "czech republic": "прага",
  "австрия": "вена",
  "austria": "вена",
  "венгрия": "будапешт",
  "hungary": "будапешт",
  "польша": "варшава",
  "poland": "варшава",
  "греция": "афины",
  "greece": "афины",
  "португалия": "лиссабон",
  "portugal": "лиссабон",
  "швейцария": "цюрих",
  "switzerland": "цюрих",
  "оаэ": "дубай",
  "эмираты": "дубай",
  "uae": "дубай",
  "таиланд": "бангкок",
  "thailand": "бангкок",
  "япония": "токио",
  "japan": "токио",
  "южная корея": "сеул",
  "корея": "сеул",
  "китай": "пекин",
  "china": "пекин",
  "индия": "дели",
  "india": "дели",
  "сингапур": "сингапур",
  "singapore": "сингапур",
  "индонезия": "бали",
  "indonesia": "бали",
  "вьетнам": "ханой",
  "vietnam": "ханой",
  "малайзия": "куала-лумпур",
  "malaysia": "куала-лумпур",
  "израиль": "тель-авив",
  "israel": "тель-авив",
  "грузия": "тбилиси",
  "georgia": "тбилиси",
  "армения": "ереван",
  "armenia": "ереван",
  "азербайджан": "баку",
  "azerbaijan": "баку",
  "узбекистан": "ташкент",
  "uzbekistan": "ташкент",
  "казахстан": "алматы",
  "kazakhstan": "алматы",
  "беларусь": "минск",
  "белоруссия": "минск",
  "belarus": "минск",
  "египет": "каир",
  "egypt": "каир",
  "юар": "кейптаун",
  "south africa": "кейптаун",
  "австралия": "сидней",
  "australia": "сидней",
  "сша": "нью-йорк",
  "usa": "нью-йорк",
  "канада": "торонто",
  "canada": "торонто",
  "мексика": "мехико",
  "mexico": "мехико",
  "бразилия": "сан-паулу",
  "brazil": "сан-паулу",
  "аргентина": "буэнос-айрес",
  "argentina": "буэнос-айрес",
  "катар": "доха",
  "qatar": "доха",
  "бахрейн": "бахрейн",
  "оман": "маскат",
  "иордания": "амман",
  "марокко": "марракеш",
  "тунис": "тунис",
  "шри-ланка": "коломбо",
  "мальдивы": "мале",
  "кипр": "ларнака",
  "мальта": "валлетта",
  "хорватия": "загреб",
  "черногория": "подгорица",
  "словения": "любляна",
  "румыния": "бухарест",
  "финляндия": "хельсинки",
  "швеция": "стокгольм",
  "норвегия": "осло",
  "дания": "копенгаген",
  "ирландия": "дублин",
  "бельгия": "брюссель",
  "люксембург": "люксембург",
}

/**
 * Получить IATA код города (также проверяет названия стран через маппинг)
 */
export function getIataCode(city: string): string | null {
  const normalized = city.toLowerCase().trim()
  // Direct city lookup
  if (IATA_CODES[normalized]) return IATA_CODES[normalized]
  // Country → capital city → IATA
  const capitalCity = COUNTRY_TO_CITY[normalized]
  if (capitalCity) return IATA_CODES[capitalCity] || null
  return null
}

/**
 * Преобразовать название страны в город (если возможно)
 */
export function countryToCity(name: string): string {
  const normalized = name.toLowerCase().trim()
  return COUNTRY_TO_CITY[normalized] || name
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

// ============================================
// REAL FLIGHT SEARCH (for FlightCard)
// ============================================

export interface RealFlight {
  // Core data from API
  origin: string
  destination: string
  originIata: string
  destinationIata: string
  departureAt: string      // ISO datetime
  returnAt?: string        // ISO datetime (if round-trip)
  airline: string          // Airline name (e.g., "Аэрофлот")
  flightNumber: string     // e.g., "SU 1234"
  price: number            // Total price in RUB
  pricePerPerson: number
  transfers: number
  duration: string         // Formatted: "4 ч 15 мин" or "—"

  // For FlightCard component
  departureDate: string    // Date only YYYY-MM-DD
  departureTime: string    // Time only HH:MM
  arrivalDate?: string
  arrivalTime?: string
  departureCity: string
  departureCode: string
  arrivalCity: string
  arrivalCode: string
  passengers: number
  direction: "outbound" | "return"
  dayNumber: number
  transfer: { city: string; duration: string } | null
  baggage: { handLuggage: string; checked: string }
  bookingUrl: string
  isFallback?: boolean
}

// Airline IATA codes to names mapping
const AIRLINE_NAMES: Record<string, string> = {
  "SU": "Аэрофлот",
  "S7": "S7 Airlines",
  "UT": "UTair",
  "U6": "Уральские авиалинии",
  "DP": "Победа",
  "N4": "Nordwind",
  "5N": "Smartavia",
  "A4": "Azimuth",
  "I8": "Ижавиа",
  "6R": "Alrosa",
  "TK": "Turkish Airlines",
  "PC": "Pegasus",
  "EK": "Emirates",
  "QR": "Qatar Airways",
  "EY": "Etihad",
  "FZ": "flydubai",
  "LH": "Lufthansa",
  "AF": "Air France",
  "BA": "British Airways",
  "AZ": "ITA Airways",
  "KL": "KLM",
  "OS": "Austrian",
  "LX": "Swiss",
  "SN": "Brussels Airlines",
  "LO": "LOT Polish",
  "OK": "Czech Airlines",
  "FB": "Bulgaria Air",
  "RO": "TAROM",
  "JU": "Air Serbia",
  "BT": "airBaltic",
  "A3": "Aegean Airlines",
  "W6": "Wizz Air",
  "FR": "Ryanair",
  "U2": "easyJet",
  "VY": "Vueling",
  "HY": "Uzbekistan Airways",
  "KC": "Air Astana",
  "B2": "Belavia",
  "J2": "AZAL",
  "FV": "Россия"
}

function getAirlineName(iataCode: string): string {
  return AIRLINE_NAMES[iataCode] || iataCode
}

function parseDateTime(isoString: string): { date: string; time: string } {
  const d = new Date(isoString)
  const date = d.toISOString().split("T")[0]
  const time = d.toTimeString().slice(0, 5)
  return { date, time }
}

// City names from IATA codes (reverse lookup)
const IATA_TO_CITY: Record<string, string> = {}
for (const [city, code] of Object.entries(IATA_CODES)) {
  // Prefer Russian names
  if (!IATA_TO_CITY[code] || city.match(/[а-яё]/i)) {
    IATA_TO_CITY[code] = city.charAt(0).toUpperCase() + city.slice(1)
  }
}

function getCityName(iata: string): string {
  return IATA_TO_CITY[iata] || iata
}

function formatDuration(minutes?: number): string {
  if (!minutes || minutes <= 0) return "—"
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} мин`
  if (m === 0) return `${h} ч`
  return `${h} ч ${m} мин`
}

interface LatestPriceItem {
  origin: string
  destination: string
  price: number
  airline: string
  flight_number: number
  departure_at: string
  return_at?: string
  expires_at: string
  transfers: number
  duration?: number
}

/**
 * Search for real flights on specific dates using Travelpayouts /v2/prices/latest
 * 
 * @param originIata - Origin airport IATA code (e.g., "MOW")
 * @param destinationIata - Destination airport IATA code (e.g., "IST")
 * @param departDate - Departure date YYYY-MM-DD
 * @param returnDate - Optional return date YYYY-MM-DD
 * @param passengers - Number of passengers
 * @param limit - Max number of results (default 3)
 */
export async function searchFlightsForDates(
  originIata: string,
  destinationIata: string,
  departDate: string,
  returnDate?: string,
  passengers: number = 1,
  limit: number = 3
): Promise<RealFlight[]> {
  if (!TRAVELPAYOUTS_API_TOKEN) {
    console.warn("TRAVELPAYOUTS_API_TOKEN not set, falling back to booking links")
    return []
  }

  const params = new URLSearchParams({
    origin: originIata,
    destination: destinationIata,
    currency: "rub",
    token: TRAVELPAYOUTS_API_TOKEN,
    limit: (limit * 2).toString(), // Request more to filter
    show_to_affiliates: "true",
    sorting: "price"
  })

  // Add departure date (month for broader results)
  const departMonth = departDate.slice(0, 7) // YYYY-MM
  params.set("beginning_of_period", departMonth)
  params.set("period_type", "month")

  try {
    console.log(`Travelpayouts: Searching flights ${originIata} -> ${destinationIata} for ${departMonth}`)

    const response = await fetch(
      `https://api.travelpayouts.com/v2/prices/latest?${params.toString()}`
    )

    if (!response.ok) {
      console.error(`Travelpayouts API error: ${response.status}`)
      return []
    }

    const data = await response.json()

    if (!data.success || !data.data || !Array.isArray(data.data)) {
      console.warn("Travelpayouts: No flight data in response")
      return []
    }

    const flights: RealFlight[] = []
    const targetDate = new Date(departDate).getTime()

    // Process outbound flights
    for (const item of data.data as LatestPriceItem[]) {
      // Check if departure is close to requested date (within 3 days)
      const itemDate = new Date(item.departure_at).getTime()
      const daysDiff = Math.abs(itemDate - targetDate) / (1000 * 60 * 60 * 24)

      if (daysDiff > 3) continue // Skip if too far from requested date

      const dep = parseDateTime(item.departure_at)
      const ret = item.return_at ? parseDateTime(item.return_at) : null

      const bookingUrl = getFlightSearchLink({
        originIata,
        destination: getCityName(destinationIata),
        destinationIata,
        departDate: dep.date,
        returnDate: ret?.date,
        adults: passengers,
        subId: "flightcard"
      })

      const outbound: RealFlight = {
        origin: getCityName(originIata),
        destination: getCityName(destinationIata),
        originIata,
        destinationIata,
        departureAt: item.departure_at,
        returnAt: item.return_at,
        airline: getAirlineName(item.airline),
        flightNumber: item.flight_number ? `${item.airline} ${item.flight_number}` : "",
        price: item.price,
        pricePerPerson: Math.round(item.price / passengers),
        transfers: item.transfers,
        duration: formatDuration(item.duration),

        departureDate: dep.date,
        departureTime: dep.time,
        arrivalDate: dep.date, // Approximate
        arrivalTime: "", // Not available in cache API
        departureCity: getCityName(originIata),
        departureCode: originIata,
        arrivalCity: getCityName(destinationIata),
        arrivalCode: destinationIata,
        passengers,
        direction: "outbound",
        dayNumber: 1,
        transfer: item.transfers > 0 ? { city: "Пересадка", duration: "~2ч" } : null,
        baggage: { handLuggage: "8 кг", checked: "23 кг" },
        bookingUrl
      }

      flights.push(outbound)

      // If round-trip, add return flight
      if (ret) {
        const returnBookingUrl = getFlightSearchLink({
          originIata: destinationIata,
          destination: getCityName(originIata),
          destinationIata: originIata,
          departDate: ret.date,
          adults: passengers,
          subId: "flightcard_return"
        })

        const returnFlight: RealFlight = {
          ...outbound,
          origin: getCityName(destinationIata),
          destination: getCityName(originIata),
          originIata: destinationIata,
          destinationIata: originIata,
          departureAt: item.return_at!,
          departureDate: ret.date,
          departureTime: ret.time,
          arrivalDate: ret.date,
          departureCity: getCityName(destinationIata),
          departureCode: destinationIata,
          arrivalCity: getCityName(originIata),
          arrivalCode: originIata,
          direction: "return",
          dayNumber: 0, // Will be set later based on trip duration
          price: item.price, // Show same price (round-trip total)
          pricePerPerson: Math.round(item.price / passengers),
          bookingUrl: returnBookingUrl
        }
        flights.push(returnFlight)
      }

      if (flights.length >= limit * 2) break
    }

    console.log(`Travelpayouts: Found ${flights.length} flights`)
    return flights.slice(0, limit * 2) // Return outbound + return pairs

  } catch (error) {
    console.error("searchFlightsForDates error:", error)
    return []
  }
}

/**
 * Generate fallback flight data with booking link when no real data available
 */
export function createFallbackFlight(
  originCity: string,
  originIata: string,
  destCity: string,
  destIata: string,
  departDate: string,
  returnDate: string | undefined,
  passengers: number,
  direction: "outbound" | "return",
  dayNumber: number
): RealFlight {
  const bookingUrl = getFlightSearchLink({
    origin: originCity,
    originIata,
    destination: destCity,
    destinationIata: destIata,
    departDate,
    returnDate,
    adults: passengers,
    subId: "fallback"
  })

  return {
    origin: originCity,
    destination: destCity,
    originIata,
    destinationIata: destIata,
    departureAt: departDate,
    returnAt: returnDate,
    airline: "Поиск авиабилетов",
    flightNumber: "",
    price: 0,
    pricePerPerson: 0,
    transfers: 0,
    duration: "—",

    departureDate: departDate,
    departureTime: "",
    arrivalDate: departDate,
    arrivalTime: "",
    departureCity: originCity,
    departureCode: originIata,
    arrivalCity: destCity,
    arrivalCode: destIata,
    passengers,
    direction,
    dayNumber,
    transfer: null,
    baggage: { handLuggage: "8 кг", checked: "23 кг" },
    bookingUrl,
    isFallback: true
  }
}

// ============================================
// POST-GENERATION LOGISTICS EXTRACTION
// ============================================

/**
 * Parse AI logistics format "Москва (SVO)" → { city: "Москва", iata: "SVO" }
 * Falls back to IATA lookup + country→city mapping
 */
export function parseCityIata(text: string): { city: string; iata: string } {
  if (!text) return { city: "", iata: "" }

  // Match "CityName (CODE)" pattern
  const match = text.match(/^(.+?)\s*\(([A-Z]{3})\)/)
  if (match) {
    return { city: match[1].trim(), iata: match[2] }
  }

  // No parenthesized IATA — try lookup
  const cleaned = text.replace(/\(.*?\)/g, "").trim()
  const resolved = countryToCity(cleaned)
  const iata = getIataCode(resolved) || ""
  return { city: resolved, iata }
}

/**
 * Check if a logistics mode string represents a flight
 */
export function isFlightMode(mode: string): boolean {
  if (!mode) return false
  const m = mode.toLowerCase()
  return m.includes("самолёт") || m.includes("самолет") || m.includes("перелёт") ||
    m.includes("перелет") || m.includes("flight") || m.includes("авиа")
}

interface HotelStay {
  city: string
  checkIn: string
  checkOut: string
  nights: number
  dayStart: number
  bookingUrl: string
  hotelName: string
  stars: number
  rating: number
  reviewsCount: number
  address: string
  guests: number
  pricePerNight: number
  totalPrice: number
  amenities: string[]
  photos: string[]
  photoQuery: string
  isFallback: boolean
}

/**
 * Walk itinerary days and group consecutive same-city days into hotel stays
 */
export function groupHotelStays(
  itinerary: any[],
  startDate: string,
  travelers: number
): HotelStay[] {
  if (!itinerary || itinerary.length === 0) return []

  const stays: HotelStay[] = []
  let currentCity = ""
  let stayStartDay = 1
  const baseDate = new Date(startDate)

  for (let i = 0; i < itinerary.length; i++) {
    const day = itinerary[i]
    const logistics = day?.logistics

    // Determine city for this day: use logistics.to if moving, else endCity, else previous city
    let dayCity = ""
    if (logistics?.to) {
      const parsed = parseCityIata(logistics.to)
      dayCity = parsed.city
    }
    if (!dayCity && day?.endCity) {
      dayCity = day.endCity
    }
    if (!dayCity && logistics?.from) {
      const parsed = parseCityIata(logistics.from)
      dayCity = parsed.city
    }
    if (!dayCity) dayCity = currentCity // same city as before

    if (dayCity && dayCity !== currentCity) {
      // Close previous stay
      if (currentCity && stayStartDay <= i) {
        const checkIn = new Date(baseDate)
        checkIn.setDate(checkIn.getDate() + stayStartDay - 1)
        const checkOut = new Date(baseDate)
        checkOut.setDate(checkOut.getDate() + i) // day i is 0-indexed from itinerary, but day numbers are 1-indexed
        const nights = Math.max(1, i - stayStartDay + 1)

        const ciStr = checkIn.toISOString().split("T")[0]
        const coStr = checkOut.toISOString().split("T")[0]

        stays.push({
          city: currentCity,
          checkIn: ciStr,
          checkOut: coStr,
          nights,
          dayStart: stayStartDay,
          bookingUrl: getHotelSearchLink({
            destination: currentCity,
            checkIn: ciStr,
            checkOut: coStr,
            adults: travelers,
            subId: `hotel_${stays.length}`
          }),
          hotelName: `Отели в ${currentCity}`,
          stars: 4,
          rating: 0,
          reviewsCount: 0,
          address: currentCity,
          guests: travelers,
          pricePerNight: 0,
          totalPrice: 0,
          amenities: ["WiFi", "Завтрак"],
          photos: [],
          photoQuery: `${currentCity} hotel`,
          isFallback: true
        })
      }
      currentCity = dayCity
      stayStartDay = i + 1 // 1-indexed day number
    } else if (!currentCity && dayCity) {
      currentCity = dayCity
      stayStartDay = i + 1
    }
  }

  // Close last stay
  if (currentCity) {
    const checkIn = new Date(baseDate)
    checkIn.setDate(checkIn.getDate() + stayStartDay - 1)
    const checkOut = new Date(baseDate)
    checkOut.setDate(checkOut.getDate() + itinerary.length - 1) // last night
    const nights = Math.max(1, itinerary.length - stayStartDay)

    const ciStr = checkIn.toISOString().split("T")[0]
    const coStr = checkOut.toISOString().split("T")[0]

    stays.push({
      city: currentCity,
      checkIn: ciStr,
      checkOut: coStr,
      nights: Math.max(1, nights),
      dayStart: stayStartDay,
      bookingUrl: getHotelSearchLink({
        destination: currentCity,
        checkIn: ciStr,
        checkOut: coStr,
        adults: travelers,
        subId: `hotel_${stays.length}`
      }),
      hotelName: `Отели в ${currentCity}`,
      stars: 4,
      rating: 0,
      reviewsCount: 0,
      address: currentCity,
      guests: travelers,
      pricePerNight: 0,
      totalPrice: 0,
      amenities: ["WiFi", "Завтрак"],
      photos: [],
      photoQuery: `${currentCity} hotel`,
      isFallback: true
    })
  }

  return stays
}

/**
 * Build FlightCard data from AI's logistics when Travelpayouts has no results.
 * Preserves AI's estimated price/duration/times.
 */
export function createAiFallbackFlight(
  leg: {
    from: { city: string; iata: string }
    to: { city: string; iata: string }
    date: string
    dayNumber: number
    direction: "outbound" | "return" | "intercity"
    aiData: any // raw logistics object from AI
  },
  travelers: number
): RealFlight {
  const ai = leg.aiData || {}

  // Parse price from AI (e.g., "25000 ₽" → 25000)
  const priceStr = String(ai.price || "0").replace(/[^\d]/g, "")
  const price = parseInt(priceStr) || 0

  const bookingUrl = getFlightSearchLink({
    origin: leg.from.city,
    originIata: leg.from.iata,
    destination: leg.to.city,
    destinationIata: leg.to.iata,
    departDate: leg.date,
    adults: travelers,
    subId: "ai_fallback"
  })

  return {
    origin: leg.from.city,
    destination: leg.to.city,
    originIata: leg.from.iata,
    destinationIata: leg.to.iata,
    departureAt: leg.date,
    returnAt: undefined,
    airline: ai.flightNumber ? getAirlineName(String(ai.flightNumber).slice(0, 2)) : "Поиск авиабилетов",
    flightNumber: ai.flightNumber || "",
    price,
    pricePerPerson: travelers > 0 ? Math.round(price / travelers) : price,
    transfers: 0,
    duration: ai.duration || "—",

    departureDate: leg.date,
    departureTime: ai.departureTime || "",
    arrivalDate: leg.date,
    arrivalTime: ai.arrivalTime || "",
    departureCity: leg.from.city,
    departureCode: leg.from.iata,
    arrivalCity: leg.to.city,
    arrivalCode: leg.to.iata,
    passengers: travelers,
    direction: leg.direction === "intercity" ? "outbound" : leg.direction,
    dayNumber: leg.dayNumber,
    transfer: null,
    baggage: { handLuggage: "8 кг", checked: "23 кг" },
    bookingUrl,
    isFallback: true
  }
}

/**
 * Main post-generation logistics extractor.
 * Parses the AI-generated itinerary for flight/hotel data,
 * then fetches real prices from Travelpayouts where possible.
 */
export async function extractLogisticsFromItinerary(
  routeData: any,
  departureCity: string,
  startDate: string,
  endDate: string,
  travelers: number
): Promise<{ flights: RealFlight[]; hotels: HotelStay[]; interCity: any[] }> {
  const itinerary: any[] = Array.isArray(routeData?.itinerary) ? routeData.itinerary : []

  if (itinerary.length === 0) {
    console.log("extractLogistics: no itinerary days, skipping")
    return { flights: [], hotels: [], interCity: [] }
  }

  // 1. Scan days for flight legs
  interface FlightLeg {
    from: { city: string; iata: string }
    to: { city: string; iata: string }
    date: string
    dayNumber: number
    direction: "outbound" | "return" | "intercity"
    aiData: any
  }

  const legs: FlightLeg[] = []
  const originParsed = parseCityIata(departureCity)
  if (!originParsed.iata) {
    originParsed.iata = getIataCode(departureCity) || ""
  }
  originParsed.city = departureCity

  const baseDate = new Date(startDate)

  for (let i = 0; i < itinerary.length; i++) {
    const day = itinerary[i]
    const lg = day?.logistics
    if (!lg || !lg.mode) continue

    if (!isFlightMode(lg.mode)) continue

    const from = parseCityIata(lg.from || "")
    const to = parseCityIata(lg.to || "")

    // Calculate date for this day
    const dayDate = new Date(baseDate)
    dayDate.setDate(dayDate.getDate() + i)
    const dateStr = dayDate.toISOString().split("T")[0]

    const dayNum = day.day || (i + 1)

    // Determine direction
    let direction: "outbound" | "return" | "intercity" = "intercity"
    if (i === 0 || (from.city.toLowerCase() === departureCity.toLowerCase())) {
      direction = "outbound"
    } else if (to.city.toLowerCase() === departureCity.toLowerCase()) {
      direction = "return"
    }

    legs.push({
      from,
      to,
      date: dateStr,
      dayNumber: dayNum,
      direction,
      aiData: lg
    })
  }

  console.log(`extractLogistics: found ${legs.length} flight legs in itinerary`)

  // 2. Fetch real flights from Travelpayouts for each leg
  const allFlights: RealFlight[] = []

  for (const leg of legs) {
    if (!leg.from.iata || !leg.to.iata) {
      console.log(`extractLogistics: no IATA for ${leg.from.city} → ${leg.to.city}, using AI fallback`)
      allFlights.push(createAiFallbackFlight(leg, travelers))
      continue
    }

    try {
      const returnDate = leg.direction === "outbound" ? endDate : undefined
      const realFlights = await searchFlightsForDates(
        leg.from.iata,
        leg.to.iata,
        leg.date,
        returnDate,
        travelers,
        2
      )

      if (realFlights.length > 0) {
        for (const rf of realFlights) {
          rf.dayNumber = leg.dayNumber
          allFlights.push(rf)
        }
      } else {
        console.log(`extractLogistics: no Travelpayouts results for ${leg.from.iata} → ${leg.to.iata}, using AI fallback`)
        allFlights.push(createAiFallbackFlight(leg, travelers))
      }
    } catch (err) {
      console.error(`extractLogistics: error searching ${leg.from.iata} → ${leg.to.iata}:`, err)
      allFlights.push(createAiFallbackFlight(leg, travelers))
    }
  }

  // 3. Group hotel stays from itinerary
  const hotels = groupHotelStays(itinerary, startDate, travelers)

  console.log(`extractLogistics: returning ${allFlights.length} flights, ${hotels.length} hotels`)

  return { flights: allFlights, hotels, interCity: [] }
}
