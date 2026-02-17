/**
 * Google Places Photos API client.
 *
 * Returns real user-uploaded photos of specific places from Google Maps.
 * Server-side only: the API key never reaches the browser.
 * Photo URLs are resolved to lh3.googleusercontent.com (no key in URL).
 */

const PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY

/**
 * Resolve a Google Places photo_reference to a clean lh3.googleusercontent.com URL
 * by following the redirect server-side (HEAD request, no data transferred).
 */
async function resolvePhotoRef(photoRef: string): Promise<string | null> {
    const endpoint = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photoRef}&key=${PLACES_KEY}`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)
    try {
        const res = await fetch(endpoint, {
            method: "HEAD",
            redirect: "follow",
            signal: controller.signal,
        })
        clearTimeout(timeout)
        // After redirect, URL is lh3.googleusercontent.com/places/... (no API key)
        if (res.ok && res.url && !res.url.includes("googleapis.com/maps/api")) {
            return res.url
        }
        return null
    } catch {
        clearTimeout(timeout)
        return null
    }
}

/**
 * Find photos for a specific named place using Google Places API.
 *
 * @param query  Specific place name + city, e.g. "Советская площадь Ставрополь" or "Hotel Moskva Belgrade"
 * @param count  Max number of photos to return
 */
export async function searchGooglePlacesPhotos(query: string, count: number = 4): Promise<string[]> {
    if (!PLACES_KEY) return []

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)

    try {
        const res = await fetch(
            `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=photos&key=${PLACES_KEY}`,
            { signal: controller.signal }
        )
        clearTimeout(timeout)

        if (!res.ok) return []
        const data = await res.json()

        const photos: Array<{ photo_reference: string }> = data.candidates?.[0]?.photos
        if (!photos?.length) return []

        const refs = photos.slice(0, count).map((p) => p.photo_reference).filter(Boolean)

        // Resolve all photo refs in parallel
        const urls = await Promise.all(refs.map(resolvePhotoRef))
        return urls.filter((u): u is string => u !== null)
    } catch {
        clearTimeout(timeout)
        return []
    }
}
