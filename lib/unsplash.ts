/**
 * Unsplash Photo Search
 * API: https://api.unsplash.com/search/photos
 * Rate limit: 50 req/hr (dev key), 5000 req/hr (production key)
 * CDN: images.unsplash.com — not blocked in Russia ✓
 * Get key: https://unsplash.com/developers
 */

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY

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
        const res = await fetch(url, {
            headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
            signal: controller.signal,
        })
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
