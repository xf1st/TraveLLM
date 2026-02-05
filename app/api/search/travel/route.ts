/**
 * Real-Time Travel Search API
 *
 * Uses Perplexity/Sonar via OpenRouter to search the web for actual
 * available flights and hotels with real prices, names, and details.
 *
 * This replaces hardcoded/approximate data with live web search results.
 */

import { NextResponse } from "next/server"
import { openrouterInference } from "@/lib/openrouter"
import { getFlightSearchLink, getHotelSearchLink, getIataCode } from "@/lib/travelpayouts"

interface SearchRequest {
    departureCity: string
    destinationCity: string
    startDate: string
    endDate: string
    passengers?: number
    rooms?: number
    budgetLevel?: string
}

function parseJsonResponse(raw: string): any {
    if (!raw) throw new Error("Empty response")

    let clean = raw.match(/\{[\s\S]*\}/)?.[0] || raw

    // Basic JSON repair
    clean = clean.replace(/:\s*#([a-zA-Zа-яА-Я0-9_]+)/g, ': "#$1"')

    if (!clean.trim().endsWith('}')) {
        let openBraces = (clean.match(/\{/g) || []).length
        let closeBraces = (clean.match(/\}/g) || []).length
        while (openBraces > closeBraces) { clean += '}'; closeBraces++ }
    }

    return JSON.parse(clean)
}

export async function POST(req: Request) {
    try {
        const body: SearchRequest = await req.json()
        const {
            departureCity,
            destinationCity,
            startDate,
            endDate,
            passengers = 2,
            rooms = 1,
            budgetLevel = "comfort"
        } = body

        if (!departureCity || !destinationCity || !startDate || !endDate) {
            return NextResponse.json(
                { error: "Missing required fields: departureCity, destinationCity, startDate, endDate" },
                { status: 400 }
            )
        }

        // Generate partner booking links
        const originIata = getIataCode(departureCity)
        const destIata = getIataCode(destinationCity)

        const flightBookingUrl = getFlightSearchLink({
            origin: departureCity,
            originIata: originIata || undefined,
            destination: destinationCity,
            destinationIata: destIata || undefined,
            departDate: startDate,
            returnDate: endDate,
            adults: passengers,
            subId: "search_api"
        })

        const hotelBookingUrl = getHotelSearchLink({
            destination: destinationCity,
            checkIn: startDate,
            checkOut: endDate,
            adults: passengers,
            rooms,
            subId: "search_api"
        })

        const searchPrompt = `
You are a real-time travel data search engine. Search the web NOW for ACTUAL available flights and hotels.

SEARCH PARAMETERS:
- From: ${departureCity} (${originIata || "unknown IATA"})
- To: ${destinationCity} (${destIata || "unknown IATA"})
- Departure: ${startDate}
- Return: ${endDate}
- Passengers: ${passengers}
- Budget level: ${budgetLevel}

TASK 1 - FLIGHTS:
Search aviasales.ru, google flights, skyscanner for REAL flights from ${departureCity} to ${destinationCity} on ${startDate}.
Also search return flights on ${endDate}.
For each flight provide:
- Real airline name
- Real flight number (e.g. TK413, SU1234)
- Departure city name and IATA code
- Arrival city name and IATA code
- Departure and arrival times
- Exact date
- Duration
- Price in RUB (per person)
- Total price for ${passengers} passengers
- Transfer info: if direct say null. If with transfer, give transfer city, airport code, and layover duration.
- Baggage: hand luggage weight, checked baggage weight
Find at least 2-3 flight options (cheapest, fastest, best value).

TASK 2 - HOTELS:
Search booking.com, ostrovok.ru, hotels.com for REAL hotels in ${destinationCity} for dates ${startDate} to ${endDate}.
For each hotel provide:
- Real hotel name (exact name from booking site)
- Star rating (1-5)
- Guest review score (out of 10)
- Number of reviews
- Address
- Price per night in RUB
- Total price for the stay
- Number of nights
- Amenities list (WiFi, Breakfast, Pool, Spa, Gym, Parking, AC, Restaurant, etc.)
- Photo search query for the hotel
Find 3 hotels: budget option, mid-range, and premium.

OUTPUT FORMAT - Valid JSON only:
{
  "flights": [
    {
      "direction": "outbound",
      "airline": "Turkish Airlines",
      "flightNumber": "TK413",
      "departureCity": "${departureCity}",
      "departureCode": "${originIata || "XXX"}",
      "departureDate": "${startDate}",
      "departureTime": "07:25",
      "arrivalCity": "${destinationCity}",
      "arrivalCode": "${destIata || "XXX"}",
      "arrivalDate": "${startDate}",
      "arrivalTime": "10:55",
      "duration": "3ч 30мин",
      "price": 14500,
      "passengers": ${passengers},
      "totalPrice": ${passengers * 14500},
      "transfer": null,
      "baggage": { "handLuggage": "8 кг", "checked": "23 кг" },
      "bookingUrl": "${flightBookingUrl}"
    }
  ],
  "hotels": [
    {
      "hotelName": "Real Hotel Name",
      "stars": 4,
      "rating": 8.5,
      "reviewsCount": 2340,
      "address": "Real Address, ${destinationCity}",
      "checkIn": "${startDate}",
      "checkOut": "${endDate}",
      "nights": 7,
      "guests": ${passengers},
      "pricePerNight": 6500,
      "totalPrice": 45500,
      "amenities": ["WiFi", "Завтрак", "Бассейн", "Кондиционер"],
      "photos": [],
      "photoQuery": "Real Hotel Name ${destinationCity} exterior",
      "bookingUrl": "${hotelBookingUrl}"
    }
  ]
}

CRITICAL RULES:
- Output ONLY valid JSON, no markdown, no explanation text
- ALL prices must be in Russian Rubles (₽/RUB)
- Use REAL data from your web search, not invented data
- Include REAL hotel and airline names
- Flight numbers should be real (e.g. TK413, SU2134, etc.)
- If you can't find exact data, use the most recent available data
- bookingUrl for flights: "${flightBookingUrl}"
- bookingUrl for hotels: "${hotelBookingUrl}"
`

        const raw = await openrouterInference(
            [
                { role: "system", content: "You are a real-time travel search engine. Search the web for actual available flights and hotels. Output valid JSON only. All prices in RUB." },
                { role: "user", content: searchPrompt }
            ],
            {
                maxTokens: 6000,
                temperature: 0.1,
                model: "perplexity/sonar-reasoning-pro"
            }
        )

        const parsed = parseJsonResponse(raw)

        // Ensure booking URLs are populated
        if (parsed.flights) {
            for (const flight of parsed.flights) {
                if (!flight.bookingUrl) {
                    flight.bookingUrl = flightBookingUrl
                }
                if (!flight.passengers) {
                    flight.passengers = passengers
                }
            }
        }

        if (parsed.hotels) {
            for (const hotel of parsed.hotels) {
                if (!hotel.bookingUrl) {
                    hotel.bookingUrl = hotelBookingUrl
                }
                if (!hotel.guests) {
                    hotel.guests = passengers
                }
            }
        }

        return NextResponse.json({
            success: true,
            departureCity,
            destinationCity,
            dates: { start: startDate, end: endDate },
            passengers,
            ...parsed
        })

    } catch (error: any) {
        console.error("Travel Search API Error:", error)
        return NextResponse.json(
            { error: error.message || "Search failed", success: false },
            { status: 500 }
        )
    }
}
