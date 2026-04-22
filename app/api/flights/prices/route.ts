import { NextResponse } from "next/server"
import { z } from "zod"
import {
  getCheapestTickets,
  getPriceCalendar,
  getWeekMatrix,
  getSpecialOffers,
  getPopularDestinations,
  getIataCode,
  hasApiToken,
  formatPrice,
  findMinPrice
} from "@/lib/travelpayouts"
import { checkIpRateLimit, rateLimitResponse } from "@/lib/rate-limit"

/**
 * API для получения цен на авиабилеты через Travelpayouts
 *
 * GET /api/flights/prices?origin=MOW&destination=PAR&date=2025-03-15
 * GET /api/flights/prices?action=calendar&origin=MOW&destination=PAR&date=2025-03
 * GET /api/flights/prices?action=special&origin=MOW
 * GET /api/flights/prices?action=popular&origin=MOW
 */

const FlightsQuerySchema = z.object({
  action: z.enum(["cheap", "calendar", "matrix", "special", "popular"]).default("cheap"),
  origin: z.string().max(100).default(""),
  destination: z.string().max(100).default(""),
  date: z.string().max(20).default(""),
  return: z.string().max(20).default(""),
  currency: z.enum(["rub", "usd", "eur"]).default("rub"),
})

export async function GET(request: Request) {
  // Rate limit: 30 req/min per IP (prevents TravelPayouts quota abuse)
  const rl = await checkIpRateLimit(request, "flights-prices", 30)
  if (!rl.allowed) return rateLimitResponse(rl)

  const { searchParams } = new URL(request.url)

  const parsed = FlightsQuerySchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { action, origin: originParam, destination: destinationParam, date, return: returnDate, currency } = parsed.data

  // Конвертируем названия городов в IATA если нужно
  const origin = originParam.length === 3
    ? originParam.toUpperCase()
    : getIataCode(originParam) || originParam.toUpperCase()

  const destination = destinationParam.length === 3
    ? destinationParam.toUpperCase()
    : getIataCode(destinationParam) || destinationParam.toUpperCase()

  if (!hasApiToken()) {
    return NextResponse.json(
      { error: "Travelpayouts API token not configured", hasToken: false },
      { status: 503 }
    )
  }

  try {
    switch (action) {
      case "cheap": {
        // Самые дешёвые билеты
        if (!origin || !destination) {
          return NextResponse.json(
            { error: "origin and destination are required" },
            { status: 400 }
          )
        }

        const month = date ? date.substring(0, 7) : undefined // YYYY-MM
        const returnMonth = returnDate ? returnDate.substring(0, 7) : undefined

        const result = await getCheapestTickets(origin, destination, month, returnMonth, currency)

        if (!result) {
          return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 })
        }

        // Форматируем ответ для удобства
        const tickets = result.data[destination]
        if (!tickets) {
          return NextResponse.json({
            success: true,
            origin,
            destination,
            currency,
            tickets: [],
            message: "No tickets found for this route"
          })
        }

        const formattedTickets = Object.entries(tickets).map(([key, ticket]) => ({
          transfers: parseInt(key),
          price: ticket.price,
          priceFormatted: formatPrice(ticket.price, currency),
          airline: ticket.airline,
          departureAt: ticket.departure_at,
          returnAt: ticket.return_at,
          expiresAt: ticket.expires_at
        }))

        return NextResponse.json({
          success: true,
          origin,
          destination,
          currency,
          tickets: formattedTickets,
          cheapest: formattedTickets.length > 0
            ? formattedTickets.reduce((min, t) => t.price < min.price ? t : min)
            : null
        })
      }

      case "calendar": {
        // Календарь цен
        if (!origin || !destination || !date) {
          return NextResponse.json(
            { error: "origin, destination and date are required" },
            { status: 400 }
          )
        }

        const prices = await getPriceCalendar(origin, destination, date, currency)

        if (!prices) {
          return NextResponse.json({ error: "Failed to fetch calendar" }, { status: 500 })
        }

        const minPrice = findMinPrice(prices)

        return NextResponse.json({
          success: true,
          origin,
          destination,
          currency,
          prices: prices.map(p => ({
            ...p,
            priceFormatted: formatPrice(p.price, currency)
          })),
          cheapestDay: minPrice ? {
            date: minPrice.departure_at,
            price: minPrice.price,
            priceFormatted: formatPrice(minPrice.price, currency)
          } : null
        })
      }

      case "matrix": {
        // Матрица цен на неделю
        if (!origin || !destination || !date || !returnDate) {
          return NextResponse.json(
            { error: "origin, destination, date and return are required" },
            { status: 400 }
          )
        }

        const matrix = await getWeekMatrix(origin, destination, date, returnDate, currency)

        if (!matrix) {
          return NextResponse.json({ error: "Failed to fetch week matrix" }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          origin,
          destination,
          currency,
          matrix: matrix.map(p => ({
            departDate: p.depart_date,
            returnDate: p.return_date,
            price: p.value,
            priceFormatted: formatPrice(p.value, currency),
            transfers: p.number_of_changes
          }))
        })
      }

      case "special": {
        // Спецпредложения
        const offers = await getSpecialOffers(origin || undefined, currency)

        if (!offers) {
          return NextResponse.json({ error: "Failed to fetch special offers" }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          origin: origin || "auto",
          currency,
          offers: offers.slice(0, 10).map(o => ({
            ...o,
            priceFormatted: formatPrice(o.price, currency)
          }))
        })
      }

      case "popular": {
        // Популярные направления
        if (!origin) {
          return NextResponse.json(
            { error: "origin is required" },
            { status: 400 }
          )
        }

        const destinations = await getPopularDestinations(origin, currency)

        if (!destinations) {
          return NextResponse.json({ error: "Failed to fetch popular destinations" }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          origin,
          currency,
          destinations: destinations.slice(0, 10).map(d => ({
            ...d,
            priceFormatted: formatPrice(d.price, currency)
          }))
        })
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Flights API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
