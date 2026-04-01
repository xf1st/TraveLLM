/**
 * Pixabay Photo Search
 * API: https://pixabay.com/api/
 * Rate limit: 100 req/min (free key)
 * CDN: pixabay.com — not blocked in Russia ✓
 * Get key: https://pixabay.com/api/docs/
 */

const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY
const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy

// Create a singleton dispatcher for the proxy
let proxyDispatcher: any = undefined;
if (typeof window === "undefined" && httpProxy) {
    try {
        const undici = eval('require("undici")');
        proxyDispatcher = new undici.ProxyAgent(httpProxy);
    } catch(e) {}
}

/**
 * Search Pixabay for photos matching query.
 * Returns array of image URLs (large size, ~1280px wide).
 * Returns [] on failure or missing key — caller falls through to next provider.
 */
export async function searchPixabay(query: string, count: number = 4, page: number = 1): Promise<string[]> {
    if (!PIXABAY_API_KEY) return []

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4000)

    try {
        const safePage = Math.min(Math.max(1, page), 100)
        const url = `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&per_page=${Math.min(count, 20)}&safesearch=true&page=${safePage}`

        const fetchOptions: any = {
            signal: controller.signal,
        }

        if (proxyDispatcher) {
            fetchOptions.dispatcher = proxyDispatcher;
        }

        const res = await fetch(url, fetchOptions)
        clearTimeout(timeoutId)

        if (!res.ok) return []

        const data = await res.json()
        const photos: string[] = (data.hits || [])
            .slice(0, count)
            .map((h: any) => h.largeImageURL || h.webformatURL)
            .filter(Boolean)

        return photos
    } catch {
        clearTimeout(timeoutId)
        return []
    }
}
