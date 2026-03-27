/**
 * Booking / affiliate market by site hostname.
 * .ru stack (Aviasales RU, Yandex Travel, RZD, Ostrovok) vs global (Booking, Trip.com, Aviasales.com, etc.)
 */

export type BookingMarket = "ru" | "world"

function normalizeHost(host: string | null | undefined): string {
  if (!host) return ""
  return host.toLowerCase().split(":")[0]?.replace(/^\[|\]$/g, "") || ""
}

/**
 * Infer market from Host / X-Forwarded-Host only (not Accept-Language).
 * localhost: NEXT_PUBLIC_BOOKING_MARKET=world|ru for testing.
 */
export function getBookingMarketFromHost(host: string | null | undefined): BookingMarket {
  const h = normalizeHost(host)
  if (!h) return "ru"

  if (h === "localhost" || h === "127.0.0.1") {
    const v = process.env.NEXT_PUBLIC_BOOKING_MARKET
    if (v === "world") return "world"
    return "ru"
  }

  if (h === "travellm.world" || h.endsWith(".travellm.world")) return "world"
  if (h.endsWith(".ru")) return "ru"

  return "world"
}

export function getBookingMarketFromRequest(req: Request): BookingMarket {
  const xf = req.headers.get("x-forwarded-host")
  const host = req.headers.get("host")
  return getBookingMarketFromHost(xf || host)
}
