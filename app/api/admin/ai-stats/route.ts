import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const toNumber = (value: unknown) => {
    const num = Number(value)
    return Number.isFinite(num) ? num : 0
}

export async function GET(req: Request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey

        if (!supabaseUrl || !supabaseKey || !supabaseAnonKey) {
            return NextResponse.json({ error: "Supabase not configured" }, { status: 503 })
        }

        // Auth check: verify the caller is an admin
        const cookieStore = await cookies()
        const authClient = createServerClient(supabaseUrl, supabaseAnonKey, {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
            },
        })
        const { data: { user } } = await authClient.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        const { data: profile } = await authClient
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single()
        if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.warn("[AI Stats] WARNING: SUPABASE_SERVICE_ROLE_KEY is not set. Using ANON key. RLS policies may block access to trip data.")
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        // Get URL params for date filtering
        const { searchParams } = new URL(req.url)
        const period = searchParams.get("period") || "all" // today, week, month, all

        // Calculate date filter
        let dateFilter: string | null = null
        const now = new Date()

        if (period === "today") {
            const today = new Date(now)
            today.setHours(0, 0, 0, 0)
            dateFilter = today.toISOString()
        } else if (period === "week") {
            const weekAgo = new Date(now)
            weekAgo.setDate(weekAgo.getDate() - 7)
            dateFilter = weekAgo.toISOString()
        } else if (period === "month") {
            const monthAgo = new Date(now)
            monthAgo.setMonth(monthAgo.getMonth() - 1)
            dateFilter = monthAgo.toISOString()
        }

        let query = supabase
            .from("trips")
            .select("id, token_usage, created_at")
            .order("created_at", { ascending: false })

        if (dateFilter) {
            query = query.gte("created_at", dateFilter)
        }

        // Also get total trip count (regardless of token_usage)
        let countQuery = supabase
            .from("trips")
            .select("*", { count: "exact", head: true })

        if (dateFilter) {
            countQuery = countQuery.gte("created_at", dateFilter)
        }

        let usageEventsQuery = supabase
            .from("ai_usage_events")
            .select("prompt_tokens, completion_tokens, total_tokens, cost_usd, cost_rub, created_at")

        if (dateFilter) {
            usageEventsQuery = usageEventsQuery.gte("created_at", dateFilter)
        }

        const [{ data: trips, error }, { count: totalTripCount }, { data: usageEvents, error: usageEventsError }] = await Promise.all([
            query,
            countQuery,
            usageEventsQuery,
        ])

        if (error) {
            console.error("Failed to fetch AI stats:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
        if (usageEventsError && usageEventsError.code !== "42P01") {
            console.warn("[AI Stats] Failed to fetch ai_usage_events, fallback to trips only:", usageEventsError.message)
        }
        const mapEvents = (usageEvents || []).filter((e: any) => !e.source?.startsWith("route-generation"))

        // Find first trip with token usage for debugging
        const firstTripWithUsage = trips?.find(t => t.token_usage && Object.keys(t.token_usage).length > 0)
        const tripsWithTokenUsageCount = trips?.filter(t => t.token_usage).length || 0

        // Debug logging
        console.log("[AI Stats] Total trips in DB:", totalTripCount)
        console.log("[AI Stats] Trips fetched:", trips?.length || 0)
        console.log("[AI Stats] Trips with non-null token_usage:", tripsWithTokenUsageCount)
        console.log("[AI Stats] Map usage events:", mapEvents.length)

        if (firstTripWithUsage) {
            console.log("[AI Stats] Sample token_usage structure:", JSON.stringify(firstTripWithUsage.token_usage, null, 2))
        } else {
            console.log("[AI Stats] WARNING: No trips with token_usage found in the fetched batch")
        }

        // Aggregate statistics
        let totalPromptTokens = 0
        let totalCompletionTokens = 0
        let totalTokens = 0
        let totalCacheHitTokens = 0
        let totalCostUsd = 0
        let totalCostRub = 0
        let requestCount = 0

        for (const trip of trips || []) {
            const usage = trip.token_usage
            if (usage) {
                totalPromptTokens += toNumber(usage.promptTokens)
                totalCompletionTokens += toNumber(usage.completionTokens)
                totalTokens += toNumber(usage.totalTokens)
                totalCacheHitTokens += toNumber(usage.promptCacheHitTokens)
                totalCostUsd += toNumber(usage.costUsd)
                totalCostRub += toNumber(usage.costRub)
                requestCount++
            }
        }

        for (const event of mapEvents) {
            totalPromptTokens += toNumber(event.prompt_tokens)
            totalCompletionTokens += toNumber(event.completion_tokens)
            totalTokens += toNumber(event.total_tokens)
            totalCostUsd += toNumber(event.cost_usd)
            totalCostRub += toNumber(event.cost_rub)
            if (toNumber(event.total_tokens) > 0) {
                requestCount++
            }
        }

        // Calculate averages
        const avgTokensPerRequest = requestCount > 0 ? Math.round(totalTokens / requestCount) : 0
        const avgCostPerRequest = requestCount > 0 ? totalCostUsd / requestCount : 0
        const cacheHitRate = totalPromptTokens > 0
            ? ((totalCacheHitTokens / totalPromptTokens) * 100).toFixed(1)
            : "0"

        // Get daily breakdown for chart (last 7 days)
        const dailyStats: { date: string; tokens: number; cost: number; requests: number }[] = []

        for (let i = 6; i >= 0; i--) {
            const date = new Date(now)
            date.setDate(date.getDate() - i)
            date.setHours(0, 0, 0, 0)
            const nextDate = new Date(date)
            nextDate.setDate(nextDate.getDate() + 1)

            const dayTrips = (trips || []).filter(t => {
                const created = new Date(t.created_at)
                return created >= date && created < nextDate
            })
            const dayEvents = mapEvents.filter((event: any) => {
                const created = new Date(event.created_at)
                return created >= date && created < nextDate
            })

            let dayTokens = 0
            let dayCost = 0
            let dayRequests = 0

            for (const trip of dayTrips) {
                if (trip.token_usage) {
                    dayTokens += toNumber(trip.token_usage.totalTokens)
                    dayCost += toNumber(trip.token_usage.costUsd)
                    dayRequests++
                }
            }
            for (const event of dayEvents) {
                dayTokens += toNumber(event.total_tokens)
                dayCost += toNumber(event.cost_usd)
                if (toNumber(event.total_tokens) > 0) {
                    dayRequests++
                }
            }

            dailyStats.push({
                date: date.toISOString().split("T")[0],
                tokens: dayTokens,
                cost: dayCost,
                requests: dayRequests
            })
        }

        return NextResponse.json({
            period,
            summary: {
                totalRequests: requestCount,
                totalTrips: totalTripCount || 0,
                tripsWithTokenData: tripsWithTokenUsageCount,
                mapEventsCount: mapEvents.length,
                totalTokens,
                totalPromptTokens,
                totalCompletionTokens,
                totalCacheHitTokens,
                cacheHitRate: `${cacheHitRate}%`,
                totalCostUsd: Number(totalCostUsd.toFixed(4)),
                totalCostRub: Number(totalCostRub.toFixed(2)),
                avgTokensPerRequest,
                avgCostPerRequest: Number(avgCostPerRequest.toFixed(4))
            },
            dailyStats
        })
    } catch (error: any) {
        console.error("AI Stats API Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
