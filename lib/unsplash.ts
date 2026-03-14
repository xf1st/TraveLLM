/**
 * Unsplash Photo Search
 * API: https://api.unsplash.com/search/photos
 * Rate limit: 50 req/hr (dev key), 5000 req/hr (production key)
 * CDN: images.unsplash.com — not blocked in Russia ✓
 * Get key: https://unsplash.com/developers
 */

import { ProxyAgent } from "undici"

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY
const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy

// Create a singleton dispatcher for the proxy
const proxyDispatcher = httpProxy ? new ProxyAgent(httpProxy) : undefined;

/**
 * Search Unsplash for photos matching query.
 * Returns array of image URLs (regular size, 1080px wide).
 * Returns [] on failure or missing key — caller falls through to next provider.
 */
export async function searchUnsplash(query: string, count: number = 1): Promise<string[]> {
    if (!UNSPLASH_ACCESS_KEY) return []

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4000)

    try {
        const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${Math.min(count, 10)}&orientation=landscape`
        
        const fetchOptions: any = {
            headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
            signal: controller.signal,
        }

        if (proxyDispatcher) {
            fetchOptions.dispatcher = proxyDispatcher;
        }

        const res = await fetch(url, fetchOptions)
        clearTimeout(timeoutId)

        if (!res.ok) return []

        const data = await res.json()
        const urls: string[] = (data.results || [])
            .slice(0, count)
            .map((r: any) => r.urls?.regular || r.urls?.full)
            .filter(Boolean)

        return urls
    } catch {
        clearTimeout(timeoutId)
        return []
    }
}
