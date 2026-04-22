import { NextRequest, NextResponse } from "next/server";
import { ProxyAgent } from "undici";
import { checkIpRateLimit, rateLimitResponse } from "@/lib/rate-limit";

// Create a singleton dispatcher for the proxy
const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
const proxyDispatcher = httpProxy ? new ProxyAgent(httpProxy) : undefined;

export async function GET(req: NextRequest) {
    // IP rate limit: 30 req/min — open-meteo is free but has fair-use limits
    const rl = await checkIpRateLimit(req, "weather", 30)
    if (!rl.allowed) return rateLimitResponse(rl)

    const searchParams = req.nextUrl.searchParams;
    const lat = Number(searchParams.get("lat"));
    const lon = Number(searchParams.get("lon"));
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");

    function parseWeatherDate(s: string): Date | null {
        if (!s) return null
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
            const d = new Date(`${s}T12:00:00.000Z`)
            return Number.isNaN(d.getTime()) ? null : d
        }
        const d = new Date(s)
        return Number.isNaN(d.getTime()) ? null : d
    }

    const startDateParsed = startParam ? parseWeatherDate(startParam) : null
    const endDateParsed = endParam ? parseWeatherDate(endParam) : null

    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !startDateParsed || !endDateParsed) {
        return NextResponse.json({ error: "Missing or invalid parameters" }, { status: 400 });
    }

    // Validate coordinate bounds
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }

    try {
        const startDate = startDateParsed
        const endDate = endDateParsed

        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const start = new Date(startDate);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setUTCHours(0, 0, 0, 0);

        if (end.getTime() < start.getTime()) {
            return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
        }

        const isPast = end < today;
        const isNearFuture = start >= today && (start.getTime() - today.getTime()) <= 14 * 24 * 60 * 60 * 1000;

        let url = '';

        if (isPast) {
           url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startStr}&end_date=${endStr}&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum&timezone=auto`;
        } else if (isNearFuture) {
           url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&start_date=${startStr}&end_date=${endStr}&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum&current_weather=true&timezone=auto`;
        } else {
           // Far future: use historical data from last year as an approximation
           const lastYearStart = new Date(startDate);
           lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
           const lastYearEnd = new Date(endDate);
           lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1);
           
           const lyStartStr = lastYearStart.toISOString().split('T')[0];
           const lyEndStr = lastYearEnd.toISOString().split('T')[0];

           url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${lyStartStr}&end_date=${lyEndStr}&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum&timezone=auto`;
        }

        const fetchOptions: any = { signal: AbortSignal.timeout(8000) };
        if (proxyDispatcher) {
            fetchOptions.dispatcher = proxyDispatcher;
        }

        const res = await fetch(url, fetchOptions);
        
        if (!res.ok) {
            console.error('Failed to fetch weather from', url, res.statusText);
            return NextResponse.json({ error: "Weather API error" }, { status: res.status });
        }
        
        const data = await res.json();

        if (!data.daily || !data.daily.time) {
             return NextResponse.json([]);
        }

        const weatherData = data.daily.time.map((time: string, index: number) => ({
          date: time,
          maxTemp: data.daily.temperature_2m_max[index],
          minTemp: data.daily.temperature_2m_min[index],
          weatherCode: data.daily.weather_code[index],
          precipitationSum: data.daily.precipitation_sum?.[index] || 0,
          currentTemp: (index === 0 && data.current_weather && startStr === today.toISOString().split('T')[0]) ? data.current_weather.temperature : undefined
        }));

        return NextResponse.json(weatherData, {
            headers: { "Cache-Control": "public, max-age=3600" }
        });

    } catch (error) {
        console.error("Weather API error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
