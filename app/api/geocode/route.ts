import { NextRequest, NextResponse } from "next/server";
import { ProxyAgent } from "undici";
import { checkIpRateLimit, rateLimitResponse } from "@/lib/rate-limit";

// Create a singleton dispatcher for the proxy
const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
const proxyDispatcher = httpProxy ? new ProxyAgent(httpProxy) : undefined;

export async function GET(req: NextRequest) {
    // IP rate limit: 20 req/min — Nominatim policy: 1 req/s per IP; we proxy so limit ourselves
    const rl = checkIpRateLimit(req, "geocode", 20)
    if (!rl.allowed) return rateLimitResponse(rl)

    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("query");

    if (!query || query.trim().length === 0) {
        return NextResponse.json({ error: "Missing query parameter" }, { status: 400 });
    }

    // Limit query length to prevent abuse
    if (query.length > 200) {
        return NextResponse.json({ error: "Query too long" }, { status: 400 });
    }

    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
        
        const fetchOptions: any = {
            headers: {
                'User-Agent': 'TraveLLM-AI-App'
            },
            signal: AbortSignal.timeout(8000)
        };
        
        if (proxyDispatcher) {
            fetchOptions.dispatcher = proxyDispatcher;
        }

        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
            return NextResponse.json({ error: "Geocoding API error" }, { status: response.status });
        }

        const data = await response.json();
        
        if (data && data.length > 0) {
            return NextResponse.json({
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
            }, {
                headers: { "Cache-Control": "public, max-age=86400" } // Cache for 24h
            });
        }
        
        return NextResponse.json({ error: "Not found" }, { status: 404 });

    } catch (error) {
        console.error("Geocoding proxy error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
