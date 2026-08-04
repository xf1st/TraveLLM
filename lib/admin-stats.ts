
import { createClient } from '@supabase/supabase-js'

export type StatsResult = {
    users: number
    trips: number
    tokens: number
    costRub: number
    costUsd: number
}

// Helper to get Supabase Client lazily
// This prevents build errors when environment variables might not be fully loaded globally
function getSupabase() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseUrl || !supabaseKey) {
        console.error('Supabase credentials missing in admin-stats')
        throw new Error('Supabase credentials missing')
    }

    return createClient(supabaseUrl, supabaseKey)
}

function toNumber(value: unknown): number {
    const num = Number(value)
    return Number.isFinite(num) ? num : 0
}

/**
 * Get aggregated stats for a specific time range
 */
export async function getStatsForPeriod(startDate: Date, endDate: Date): Promise<StatsResult> {
    const supabase = getSupabase()
    const startIso = startDate.toISOString()
    const endIso = endDate.toISOString()

    // 1. New Users
    const { count: users } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startIso)
        .lt('created_at', endIso)

    // 2. Trips & AI usage
    const [{ data: trips }, { data: usageEvents, error: usageEventsError }] = await Promise.all([
        supabase
            .from('trips')
            .select('token_usage')
            .gte('created_at', startIso)
            .lt('created_at', endIso),
        supabase
            .from('ai_usage_events')
            .select('source, total_tokens, cost_rub, cost_usd')
            .gte('created_at', startIso)
            .lt('created_at', endIso)
    ])

    let tokens = 0
    let costRub = 0
    let costUsd = 0

    trips?.forEach((t: any) => {
        if (t.token_usage) {
            tokens += toNumber(t.token_usage.totalTokens)
            costRub += toNumber(t.token_usage.costRub)
            costUsd += toNumber(t.token_usage.costUsd)
        }
    })
    if (!usageEventsError || usageEventsError.code === '42P01') {
        usageEvents?.forEach((event: any) => {
            if (event.source === 'route-generation') return
            tokens += toNumber(event.total_tokens)
            costRub += toNumber(event.cost_rub)
            costUsd += toNumber(event.cost_usd)
        })
    }

    return {
        users: users || 0,
        trips: trips?.length || 0,
        tokens,
        costRub,
        costUsd
    }
}

/**
 * Get top spenders (users with most expensive trips)
 */
export async function getTopSpenders(limit = 10, days = 30) {
    const supabase = getSupabase()
    const date = new Date()
    date.setDate(date.getDate() - days)

    const [tripsResult, usageEventsResult] = await Promise.all([
        supabase
            .from('trips')
            .select('user_id, token_usage')
            .gte('created_at', date.toISOString()),
        supabase
            .from('ai_usage_events')
            .select('user_id, source, total_tokens, cost_rub')
            .gte('created_at', date.toISOString())
    ])

    const trips = tripsResult.data || []
    const usageEvents = usageEventsResult.error?.code === '42P01' ? [] : (usageEventsResult.data || [])

    if (!trips.length && !usageEvents.length) return []

    // Map to aggregate by user
    const userStats = new Map<string, { userId: string, costRub: number, tokens: number, trips: number }>()

    trips.forEach((t: any) => {
        if (!t.user_id || !t.token_usage) return

        const current = userStats.get(t.user_id) || { userId: t.user_id, costRub: 0, tokens: 0, trips: 0 }

        current.costRub += toNumber(t.token_usage.costRub)
        current.tokens += toNumber(t.token_usage.totalTokens)
        current.trips += 1

        userStats.set(t.user_id, current)
    })

    usageEvents.forEach((event: any) => {
        if (!event.user_id || event.source === 'route-generation') return

        const current = userStats.get(event.user_id) || { userId: event.user_id, costRub: 0, tokens: 0, trips: 0 }
        current.costRub += toNumber(event.cost_rub)
        current.tokens += toNumber(event.total_tokens)
        userStats.set(event.user_id, current)
    })

    // Sort by cost
    const sorted = Array.from(userStats.values())
        .sort((a, b) => b.costRub - a.costRub)
        .slice(0, limit)

    // Fetch all user profiles in a single query
    const userIds = sorted.map(s => s.userId)
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name, telegram_chat_id')
        .in('id', userIds)

    const profileMap = new Map(
        (profiles || []).map(p => [p.id, p])
    )

    const enriched = sorted.map(s => {
        const profile = profileMap.get(s.userId)
        return {
            ...s,
            email: profile?.email || 'Unknown',
            name: profile?.full_name || 'No Name'
        }
    })

    return enriched
}
