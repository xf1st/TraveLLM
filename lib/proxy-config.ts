/**
 * Shared proxy configuration.
 *
 * Reads `proxy_disabled` from the `app_settings` table (cached 15 s).
 * When the admin toggle is ON the proxy dispatcher is never returned,
 * even if HTTP_PROXY env var is set.
 */

import { createClient } from "@supabase/supabase-js"
import { fetchWithTimeout } from "./fetch-with-timeout.ts"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey, {
    global: { fetch: (input, init) => fetchWithTimeout(input, init, 4000) },
}) : null

let cachedDisabled: boolean | null = null
let cacheTs = 0
const CACHE_TTL = 15_000
let inFlight: Promise<boolean> | null = null
let settingsAvailable = false
let providersEnabled = { gemini: true, deepseek: true }

export function invalidateProxySettingsCache() { cacheTs = 0 }
export function areProxySettingsAvailable() { return settingsAvailable }
export async function isAiProviderEnabled(provider: "gemini" | "deepseek") {
    await isProxyDisabled()
    return providersEnabled[provider]
}

/**
 * Returns `true` when admin has flipped the "disable proxy" switch.
 * Result is cached for 60 s to avoid hitting Supabase on every image request.
 */
export async function isProxyDisabled(forceRefresh = false): Promise<boolean> {
    if (!forceRefresh && cacheTs > 0 && Date.now() - cacheTs < CACHE_TTL) {
        return cachedDisabled ?? false
    }
    if (!supabase || typeof window !== "undefined") return false
    if (inFlight) return inFlight

    inFlight = (async () => { try {
        const { data, error } = await supabase
            .from("app_settings")
            .select("proxy_disabled,ai_provider_openrouter_enabled,ai_provider_deepseek_enabled")
            .single()
        if (error || !data || typeof data.proxy_disabled !== "boolean") throw new Error("Settings unavailable")
        settingsAvailable = true
        cachedDisabled = data.proxy_disabled
        providersEnabled = {
            gemini: data.ai_provider_openrouter_enabled !== false,
            deepseek: data.ai_provider_deepseek_enabled !== false,
        }
        cacheTs = Date.now()
        return cachedDisabled
    } catch {
        settingsAvailable = false
        cacheTs = Date.now()
        // Keep the last confirmed choice when settings are temporarily unavailable.
        return cachedDisabled ?? false
    } })()
    try { return await inFlight } finally { inFlight = null }
}
