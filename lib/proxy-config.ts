/**
 * Shared proxy configuration.
 *
 * Reads `proxy_disabled` from the `app_settings` table (cached 60 s).
 * When the admin toggle is ON the proxy dispatcher is never returned,
 * even if HTTP_PROXY env var is set.
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null

let cachedDisabled: boolean | null = null
let cacheTs = 0
const CACHE_TTL = 60_000 // 60 seconds

/**
 * Returns `true` when admin has flipped the "disable proxy" switch.
 * Result is cached for 60 s to avoid hitting Supabase on every image request.
 */
export async function isProxyDisabled(): Promise<boolean> {
    if (cachedDisabled !== null && Date.now() - cacheTs < CACHE_TTL) {
        return cachedDisabled
    }
    if (!supabase) return false

    try {
        const { data } = await supabase
            .from("app_settings")
            .select("proxy_disabled")
            .single()
        cachedDisabled = !!data?.proxy_disabled
        cacheTs = Date.now()
        return cachedDisabled
    } catch {
        return cachedDisabled ?? false
    }
}
