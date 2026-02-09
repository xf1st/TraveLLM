
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

    // 2. Trips & Usage
    const { data: trips } = await supabase
        .from('trips')
        .select('token_usage')
        .gte('created_at', startIso)
        .lt('created_at', endIso)

    let tokens = 0
    let costRub = 0
    let costUsd = 0

    trips?.forEach((t: any) => {
        if (t.token_usage) {
            tokens += t.token_usage.totalTokens || 0
            costRub += t.token_usage.costRub || 0
            costUsd += t.token_usage.costUsd || 0
        }
    })

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

    // Fetch all trips in period with user_id
    const { data: trips } = await supabase
        .from('trips')
        .select('user_id, token_usage')
        .gte('created_at', date.toISOString())

    if (!trips) return []

    // Map to aggregate by user
    const userStats = new Map<string, { userId: string, costRub: number, tokens: number, trips: number }>()

    trips.forEach((t: any) => {
        if (!t.user_id || !t.token_usage) return

        const current = userStats.get(t.user_id) || { userId: t.user_id, costRub: 0, tokens: 0, trips: 0 }

        current.costRub += t.token_usage.costRub || 0
        current.tokens += t.token_usage.totalTokens || 0
        current.trips += 1

        userStats.set(t.user_id, current)
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
