import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

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

        // Build query - get ALL trips and filter in JS instead of using Supabase filter
        // This matches how the admin/trips page successfully retrieves data
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

        const [{ data: trips, error }, { count: totalTripCount }] = await Promise.all([
            query,
            countQuery
        ])

        if (error) {
            console.error("Failed to fetch AI stats:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Find first trip with token usage for debugging
        const firstTripWithUsage = trips?.find(t => t.token_usage && Object.keys(t.token_usage).length > 0)

        // Debug logging
        console.log("[AI Stats] Total trips in DB:", totalTripCount)
        console.log("[AI Stats] Trips fetched:", trips?.length || 0)
        console.log("[AI Stats] Trips with non-null token_usage:", trips?.filter(t => t.token_usage).length || 0)

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
                totalTrips: totalTripCount || 0,
                tripsWithTokenData: trips?.length || 0,
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
