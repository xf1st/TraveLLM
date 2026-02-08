import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(req: Request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json({ error: "Supabase not configured" }, { status: 503 })
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

        // Build query
        let query = supabase
            .from("trips")
            .select("token_usage, created_at")
            .not("token_usage", "is", null)

        if (dateFilter) {
            query = query.gte("created_at", dateFilter)
        }

        const { data: trips, error } = await query

        if (error) {
            console.error("Failed to fetch AI stats:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
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
                totalPromptTokens += usage.promptTokens || 0
                totalCompletionTokens += usage.completionTokens || 0
                totalTokens += usage.totalTokens || 0
                totalCacheHitTokens += usage.promptCacheHitTokens || 0
                totalCostUsd += usage.costUsd || 0
                totalCostRub += usage.costRub || 0
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

            let dayTokens = 0
            let dayCost = 0
            let dayRequests = 0

            for (const trip of dayTrips) {
                if (trip.token_usage) {
                    dayTokens += trip.token_usage.totalTokens || 0
                    dayCost += trip.token_usage.costUsd || 0
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
