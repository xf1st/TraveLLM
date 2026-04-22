import { NextRequest, NextResponse } from "next/server"
import { checkIpRateLimit, rateLimitResponse } from "@/lib/rate-limit"

export async function GET(req: NextRequest) {
    const rl = await checkIpRateLimit(req, "geocode-cities", 30)
    if (!rl.allowed) return rateLimitResponse(rl)

    const { searchParams } = req.nextUrl
    const name = searchParams.get("name")
    const count = Math.min(parseInt(searchParams.get("count") || "10", 10), 20)
    const language = searchParams.get("language") === "en" ? "en" : "ru"

    if (!name || name.trim().length < 2) {
        return NextResponse.json({ results: [] })
    }
    if (name.length > 200) {
        return NextResponse.json({ error: "Query too long" }, { status: 400 })
    }

    try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=${count}&language=${language}&format=json`
        const response = await fetch(url, {
            signal: AbortSignal.timeout(8000),
            headers: { "User-Agent": "TraveLLM-AI-App" },
        })

        if (!response.ok) {
            return NextResponse.json({ results: [] }, { status: response.status })
        }

        const data = await response.json()
        return NextResponse.json(data, {
            headers: { "Cache-Control": "public, max-age=300" },
        })
    } catch (err) {
        console.error("City geocoding proxy error:", err)
        return NextResponse.json({ results: [] }, { status: 502 })
    }
}
