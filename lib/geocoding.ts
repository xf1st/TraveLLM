
// Simple client-side geocoding proxy wrapper
// Real requests and rate-limiting happen on the server now

const CACHE_KEY = 'geocoding_cache'

export async function getCoordinates(placeName: string): Promise<{lat: number, lng: number} | null> {
    if (!placeName) return null

    // Check Local Storage Cache first
    try {
        if (typeof window !== 'undefined') {
            const cacheRaw = localStorage.getItem(CACHE_KEY)
            const cache = cacheRaw ? JSON.parse(cacheRaw) : {}
            if (cache[placeName]) {
                return cache[placeName]
            }
        }
    } catch (e) {
        // Ignore storage errors
    }

    try {
        // Fetch via our Next.js API proxy to avoid client-side ISP blocks (uses undici ProxyAgent)
        const response = await fetch(`/api/geocode?query=${encodeURIComponent(placeName)}`)

        if (!response.ok) return null

        const data = await response.json()
        
        if (data && data.lat !== undefined && data.lng !== undefined) {
            const coords = { lat: data.lat, lng: data.lng }

            // Save to Cache
            try {
                if (typeof window !== 'undefined') {
                    const cacheRaw = localStorage.getItem(CACHE_KEY)
                    const cache = cacheRaw ? JSON.parse(cacheRaw) : {}
                    cache[placeName] = coords
                    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
                }
            } catch (e) {
                 // Ignore
            }

            return coords
        }
    } catch (error) {
        console.error("Geocoding proxy fetch error:", error)
    }

    return null
}
