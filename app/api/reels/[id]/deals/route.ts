import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { getRequestUserId } from "@/lib/ai-usage-events"
import {
  getFlightSearchLink,
  getHotellookLink,
  getIataCode,
  getCheapestTickets,
  hasApiToken,
  formatPrice,
} from "@/lib/travelpayouts"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const userId = await getRequestUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await context.params
  if (!UUID_REGEX.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const cookieStore = await cookies()
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: { get: (n) => cookieStore.get(n)?.value, set: () => {}, remove: () => {} },
  })

  const { data: reel } = await supabase
    .from("discovery_reels")
    .select("country, city, suggested_start_date, suggested_end_date")
    .eq("id", id)
    .maybeSingle()

  if (!reel) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const destination = reel.city || reel.country
  const destIata = getIataCode(destination) || getIataCode(reel.country) || undefined
  const originIata = "MOW" // По умолчанию Москва; в будущем брать из профиля

  const departDate = reel.suggested_start_date ?? undefined
  const returnDate = reel.suggested_end_date ?? undefined

  // Партнёрская ссылка на авиабилеты
  const flightLink = getFlightSearchLink({
    originIata,
    destinationIata: destIata,
    destination,
    departDate,
    returnDate,
  })

  // Партнёрская ссылка на отели
  const hotelLink = getHotellookLink({
    destination,
    checkIn: departDate,
    checkOut: returnDate,
    market: "ru",
  })

  // Реальная цена (если есть токен TravelPayouts)
  let cheapestPrice: number | null = null
  let priceFormatted: string | null = null

  if (hasApiToken() && destIata) {
    try {
      const month = departDate ? departDate.substring(0, 7) : undefined
      const result = await getCheapestTickets(originIata, destIata, month, undefined, "rub")
      const tickets = result?.data?.[destIata]
      if (tickets) {
        const prices = Object.values(tickets).map((t) => t.price).filter((p) => p > 0)
        if (prices.length > 0) {
          cheapestPrice = Math.min(...prices)
          priceFormatted = formatPrice(cheapestPrice, "rub")
        }
      }
    } catch {
      // Цена недоступна — продолжаем без неё
    }
  }

  return NextResponse.json({
    flightLink,
    hotelLink,
    destination,
    originCity: "Москва",
    cheapestPrice,
    priceFormatted,
    hasPriceData: cheapestPrice !== null,
  }, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  })
}
