/**
 * Pexels Photo Search
 * API: https://api.pexels.com/v1/search
 * Rate limit: 200 req/hr, 20k/month (free)
 * CDN: images.pexels.com — not blocked in Russia ✓
 */

import { HttpsProxyAgent } from "https-proxy-agent"

const PEXELS_API_KEY = process.env.PEXELS_API_KEY
const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy

/**
 * Search Pexels for photos matching query.
 * Returns array of image URLs (large size, ~940px wide).
 * Returns [] on failure or missing key — caller falls through to next provider.
 */
export async function searchPexels(query: string, count: number = 4): Promise<string[]> {
    if (!PEXELS_API_KEY) return []

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4000)

    try {
        const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${Math.min(count, 15)}&orientation=landscape`
        
        const fetchOptions: any = {
            headers: { Authorization: PEXELS_API_KEY },
            signal: controller.signal,
        }

        if (httpProxy) {
            try {
                fetchOptions.agent = new HttpsProxyAgent(httpProxy)
            } catch (e) {
                console.error("[searchPexels] Proxy agent error:", e)
            }
        }

        const res = await fetch(url, fetchOptions)
        clearTimeout(timeoutId)

        if (!res.ok) return []

        const data = await res.json()
        const photos: string[] = (data.photos || [])
            .slice(0, count)
            .map((p: any) => p.src?.large || p.src?.medium)
            .filter(Boolean)

        return photos
    } catch {
        clearTimeout(timeoutId)
        return []
    }
}
