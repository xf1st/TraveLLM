
// Simple client-side geocoding using Nominatim (OpenStreetMap)
// Respects rate limits (1 request per second strictly)

const CACHE_KEY = 'geocoding_cache'
const RATE_LIMIT_MS = 1500

let lastRequestTime = 0

export async function getCoordinates(placeName: string): Promise<{lat: number, lng: number} | null> {
    if (!placeName) return null

    // Check Local Storage Cache
    try {
        const cacheRaw = localStorage.getItem(CACHE_KEY)
        const cache = cacheRaw ? JSON.parse(cacheRaw) : {}
        if (cache[placeName]) {
            return cache[placeName]
        }
    } catch (e) {
        // Ignore storage errors
    }

    // Rate Limit Wait
    const now = Date.now()
    const timeSinceLast = now - lastRequestTime
    if (timeSinceLast < RATE_LIMIT_MS) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS - timeSinceLast))
    }

    lastRequestTime = Date.now()

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(placeName)}&limit=1`, {
            headers: {
                'User-Agent': 'TraveLLM-AI-App'
            }
        })

        if (!response.ok) return null

        const data = await response.json()
        if (data && data.length > 0) {
            const coords = {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
            }

            // Save to Cache
            try {
                const cacheRaw = localStorage.getItem(CACHE_KEY)
                const cache = cacheRaw ? JSON.parse(cacheRaw) : {}
                cache[placeName] = coords
                localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
            } catch (e) {
                 // Ignore
            }

            return coords
        }
    } catch (error) {
        console.error("Geocoding error:", error)
    }

    return null
}
