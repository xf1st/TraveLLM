/**
 * Image Search — Multi-Provider Waterfall
 *
 * Gallery (/api/gallery):  Pexels → Wikimedia → static fallback
 * Hero    (/api/image):    Unsplash → Wikimedia → static fallback
 * Hotels:                  Hotellook URL pattern (unchanged, in travelpayouts.ts)
 *
 * Why Pexels/Unsplash instead of Wikimedia-only:
 * - Wikimedia is partially blocked in Russia (server-side AND client CDN)
 * - Pexels CDN (images.pexels.com) is not blocked in Russia ✓
 * - Unsplash CDN (images.unsplash.com) is not blocked in Russia ✓
 * - Both cover niche queries (restaurants, parks, local places) that Wikimedia misses
 */

import { searchPexels } from "./pexels"
import { searchUnsplash } from "./unsplash"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null

// --- In-memory cache ---
const imageCache = new Map<string, { url: string; timestamp: number }>()
const galleryCache = new Map<string, { urls: string[]; timestamp: number }>()
const CACHE_TTL = 1000 * 60 * 60 // 1 hour

// --- Wikimedia Commons ---

async function searchWikimedia(query: string): Promise<string | null> {
    try {
        let cleanQuery = query.split(/,| \/ /)[0].trim()
        cleanQuery = cleanQuery.replace(/\s+(travel|trip|journey|vacation)$/i, "").trim()

        const queries = [
            cleanQuery + " landmark",
            cleanQuery + " tourism",
            cleanQuery + " travel",
            cleanQuery,
            "Tourism in " + cleanQuery,
        ]
        if (!cleanQuery.includes(" ")) {
            queries.push(cleanQuery + " landscape")
            queries.push(cleanQuery + " nature")
        }

        for (const q of queries) {
            if (!q || q.length < 2) continue
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 4000)
            try {
                const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrnamespace=6&prop=imageinfo&iiprop=url|extmetadata&format=json&origin=*&gsrlimit=15`
                const res = await fetch(url, {
                    headers: { Accept: "application/json" },
                    signal: controller.signal,
                })
                clearTimeout(timeoutId)
                if (!res.ok) continue
                const data = await res.json()
                if (data.query?.pages) {
                    const pages = Object.values(data.query.pages) as any[]
                    const validImage = pages.find((p) => {
                        const imgUrl = p.imageinfo?.[0]?.url?.toLowerCase()
                        const title = p.title?.toLowerCase() || ""
                        if (!imgUrl) return false
                        if (!imgUrl.endsWith(".jpg") && !imgUrl.endsWith(".jpeg")) return false
                        const blacklist = ["map", "chart", "diagram", "coat of arms", "flag", "icon", "logo", "stamp", "seal", "location", "stub", "currency", "coa"]
                        if (blacklist.some((w) => title.includes(w))) return false
                        return true
                    })
                    if (validImage) return validImage.imageinfo[0].url
                }
            } catch {
                clearTimeout(timeoutId)
                continue
            }
        }
        return null
    } catch {
        return null
    }
}

async function searchWikimediaGallery(query: string, count: number): Promise<string[]> {
    const queries = [
        query,
        query + " landmark",
        query + " tourism",
        query + " architecture",
    ]
    if (query.includes(",")) {
        const dest = query.split(",").pop()?.trim()
        if (dest && dest.length > 2) {
            queries.push(dest + " travel")
            queries.push(dest + " city")
        }
    } else {
        const words = query.split(" ")
        if (words.length > 1) {
            const last = words[words.length - 1]
            if (last.length > 3) queries.push(last + " travel")
        }
    }

    const results = new Set<string>()
    for (const q of queries) {
        if (results.size >= count) break
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000)
        try {
            const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrnamespace=6&prop=imageinfo&iiprop=url|extmetadata&format=json&origin=*&gsrlimit=${count * 2}`
            const res = await fetch(url, { signal: controller.signal })
            clearTimeout(timeoutId)
            if (!res.ok) continue
            const data = await res.json()
            if (data.query?.pages) {
                const pages = Object.values(data.query.pages) as any[]
                for (const p of pages) {
                    if (results.size >= count) break
                    const imgUrl = p.imageinfo?.[0]?.url
                    if (!imgUrl) continue
                    const lower = imgUrl.toLowerCase()
                    const title = p.title?.toLowerCase() || ""
                    if (!lower.endsWith(".jpg") && !lower.endsWith(".jpeg")) continue
                    if (["map", "flag", "coat of arms", "logo", "icon"].some((w) => title.includes(w))) continue
                    results.add(imgUrl)
                }
            }
        } catch {
            clearTimeout(timeoutId)
            continue
        }
    }
    return Array.from(results)
}

// --- Static fallbacks for popular destinations ---
const FALLBACK_IMAGES: Record<string, string> = {
    россия: "https://upload.wikimedia.org/wikipedia/commons/4/49/Red_Square_Moscow.JPG",
    moscow: "https://upload.wikimedia.org/wikipedia/commons/4/49/Red_Square_Moscow.JPG",
    москва: "https://upload.wikimedia.org/wikipedia/commons/4/49/Red_Square_Moscow.JPG",
    france: "https://upload.wikimedia.org/wikipedia/commons/a/a8/Tour_Eiffel_Wikimedia_Commons.jpg",
    франция: "https://upload.wikimedia.org/wikipedia/commons/a/a8/Tour_Eiffel_Wikimedia_Commons.jpg",
    paris: "https://upload.wikimedia.org/wikipedia/commons/a/a8/Tour_Eiffel_Wikimedia_Commons.jpg",
    париж: "https://upload.wikimedia.org/wikipedia/commons/a/a8/Tour_Eiffel_Wikimedia_Commons.jpg",
    spain: "https://upload.wikimedia.org/wikipedia/commons/9/99/Sagrada_Familia_01.jpg",
    испания: "https://upload.wikimedia.org/wikipedia/commons/9/99/Sagrada_Familia_01.jpg",
    italy: "https://upload.wikimedia.org/wikipedia/commons/d/d8/Colosseum_in_Rome-April_2007-1-_copie_2B.jpg",
    италия: "https://upload.wikimedia.org/wikipedia/commons/d/d8/Colosseum_in_Rome-April_2007-1-_copie_2B.jpg",
    germany: "https://upload.wikimedia.org/wikipedia/commons/e/ec/Brandenburger_Tor_nachts.jpg",
    германия: "https://upload.wikimedia.org/wikipedia/commons/e/ec/Brandenburger_Tor_nachts.jpg",
    poland: "https://upload.wikimedia.org/wikipedia/commons/1/1c/Krak%C3%B3w_-_Sukiennice_1.jpg",
    польша: "https://upload.wikimedia.org/wikipedia/commons/1/1c/Krak%C3%B3w_-_Sukiennice_1.jpg",
    czech: "https://upload.wikimedia.org/wikipedia/commons/9/91/Prague_panorama.jpg",
    чехия: "https://upload.wikimedia.org/wikipedia/commons/9/91/Prague_panorama.jpg",
    прага: "https://upload.wikimedia.org/wikipedia/commons/9/91/Prague_panorama.jpg",
    грузия: "https://upload.wikimedia.org/wikipedia/commons/a/a2/Tbilisi_View.jpg",
    georgia: "https://upload.wikimedia.org/wikipedia/commons/a/a2/Tbilisi_View.jpg",
    tbilisi: "https://upload.wikimedia.org/wikipedia/commons/a/a2/Tbilisi_View.jpg",
    тбилиси: "https://upload.wikimedia.org/wikipedia/commons/a/a2/Tbilisi_View.jpg",
    amsterdam: "https://upload.wikimedia.org/wikipedia/commons/b/b1/Keizersgracht_Amsterdam.jpg",
    амстердам: "https://upload.wikimedia.org/wikipedia/commons/b/b1/Keizersgracht_Amsterdam.jpg",
    turkey: "https://upload.wikimedia.org/wikipedia/commons/2/25/Istanbul_Montage_2022.jpg",
    турция: "https://upload.wikimedia.org/wikipedia/commons/2/25/Istanbul_Montage_2022.jpg",
    egypt: "https://upload.wikimedia.org/wikipedia/commons/a/af/All_Gizah_Pyramids.jpg",
    египет: "https://upload.wikimedia.org/wikipedia/commons/a/af/All_Gizah_Pyramids.jpg",
    thailand: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Maya_Bay%2C_Ko_Phi_Phi_Lee.jpg",
    таиланд: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Maya_Bay%2C_Ko_Phi_Phi_Lee.jpg",
    japan: "https://upload.wikimedia.org/wikipedia/commons/6/67/Chureito_Pagoda_and_Mount_Fuji.jpg",
    япония: "https://upload.wikimedia.org/wikipedia/commons/6/67/Chureito_Pagoda_and_Mount_Fuji.jpg",
    china: "https://upload.wikimedia.org/wikipedia/commons/a/a4/Great_Wall_of_China_July_2006.jpg",
    китай: "https://upload.wikimedia.org/wikipedia/commons/a/a4/Great_Wall_of_China_July_2006.jpg",
    usa: "https://upload.wikimedia.org/wikipedia/commons/c/c7/Empire_State_Building_from_the_Top_of_the_Rock.jpg",
    сша: "https://upload.wikimedia.org/wikipedia/commons/c/c7/Empire_State_Building_from_the_Top_of_the_Rock.jpg",
    asia: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Maya_Bay%2C_Ko_Phi_Phi_Lee.jpg",
    азия: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Maya_Bay%2C_Ko_Phi_Phi_Lee.jpg",
    africa: "https://upload.wikimedia.org/wikipedia/commons/6/6b/Lion_d%27Afrique.jpg",
    африка: "https://upload.wikimedia.org/wikipedia/commons/6/6b/Lion_d%27Afrique.jpg",
    europe: "https://upload.wikimedia.org/wikipedia/commons/9/91/Prague_panorama.jpg",
    европа: "https://upload.wikimedia.org/wikipedia/commons/9/91/Prague_panorama.jpg",
    travel: "https://upload.wikimedia.org/wikipedia/commons/c/cc/Travel_022.jpg",
}

function getStaticFallback(query: string): string {
    const lower = query.toLowerCase()
    for (const [key, url] of Object.entries(FALLBACK_IMAGES)) {
        if (lower.includes(key)) return url
    }
    return FALLBACK_IMAGES["travel"]
}

// --- Query helpers ---

/** Extract non-Cyrillic words from query (for Pexels which doesn't index Russian). */
function extractLatinWords(query: string): string {
    return query
        .split(/\s+/)
        .filter(w => /[a-zA-Z]/.test(w))
        .join(" ")
        .trim()
}

/** Shorten query to last 2 words — helps when specific name has no Pexels results. */
function shortenQuery(query: string): string | null {
    const words = query.trim().split(/\s+/)
    return words.length > 2 ? words.slice(-2).join(" ") : null
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Hero / destination image.
 * Waterfall: Unsplash → Wikimedia → local fallback
 * NOTE: Static Wikimedia URLs removed from early-return path —
 *       they are blocked in Russia client-side.
 */
export async function getDestinationImage(query: string): Promise<string> {
    const cacheKey = query.toLowerCase().trim()

    const cached = imageCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.url

    // --- Persistency Check ---
    if (supabase) {
        try {
            const { data } = await supabase
                .from("image_cache")
                .select("image_url")
                .eq("query", cacheKey)
                .maybeSingle()
            if (data?.image_url) {
                imageCache.set(cacheKey, { url: data.image_url, timestamp: Date.now() })
                return data.image_url
            }
        } catch (e) {
            console.error("[Image Cache] selective fetch failed:", e)
        }
    }

    let result: string | null = null

    // 1. Unsplash (highest quality, landscape, CDN not blocked in Russia)
    const unsplashUrls = await searchUnsplash(query, 1)
    if (unsplashUrls.length > 0) {
        result = unsplashUrls[0]
    }

    // 2. Wikimedia fallback (may be blocked on RU client, but works for non-RU)
    if (!result) {
        const wikiImg = await searchWikimedia(query)
        if (wikiImg) result = wikiImg
    }

    // 3. Static Wikimedia map (last resort — blocked in RU but at least not empty)
    if (!result) {
        result = getStaticFallback(query)
    }

    // --- Persistency Save ---
    if (supabase && result) {
        supabase.from("image_cache")
            .upsert({ query: cacheKey, image_url: result, updated_at: new Date().toISOString() }, { onConflict: "query" })
            .then(({ error }) => error && console.error("[Image Cache] save error:", error))
    }

    imageCache.set(cacheKey, { url: result, timestamp: Date.now() })
    return result
}

/**
 * Activity / place gallery (multiple images).
 *
 * Server waterfall:
 *   1. Unsplash  — not blocked in Russia, high quality landscape photos
 *   2. Pexels    — blocked in Russia without VPN, but client handles via /api/proxy-image
 *   3. Pexels retry — latin/shortened query if Cyrillic got no results
 *   4. Wikimedia — encyclopedia photos as supplement
 *   5. Local fallback — always succeeds
 *
 * NOTE: Pexels CDN (images.pexels.com) IS blocked in Russia without VPN.
 *       TripImage component handles this client-side: direct → proxy → /api/image → fallback.
 *
 * @param query  Descriptive query (e.g. "rooftop restaurant Istanbul")
 * @param count  Max number of images
 */
export async function getGalleryImages(query: string, count: number = 4): Promise<string[]> {
    const cacheKey = `gallery:${query.toLowerCase().trim()}:${count}`

    const cached = galleryCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.urls

    // --- Persistency Check ---
    if (supabase) {
        try {
            const { data } = await supabase
                .from("image_cache")
                .select("gallery_urls")
                .eq("query", cacheKey)
                .maybeSingle()
            if (data?.gallery_urls && Array.isArray(data.gallery_urls)) {
                galleryCache.set(cacheKey, { urls: data.gallery_urls, timestamp: Date.now() })
                return data.gallery_urls
            }
        } catch (e) {
            console.error("[Image Cache] gallery fetch failed:", e)
        }
    }

    try {
        const seen = new Set<string>()
        const finalUrls: string[] = []

        const addUrls = (urls: string[]) => {
            for (const u of urls) {
                if (finalUrls.length >= count) break
                if (u && !seen.has(u)) { seen.add(u); finalUrls.push(u) }
            }
        }

        // 1. Unsplash + Pexels in parallel (fastest path, covers most queries)
        const latinQuery = extractLatinWords(query)
        const shortQuery = shortenQuery(query)
        const pexelsFallbackQuery = latinQuery || shortQuery || query

        const [unsplashUrls, pexelsUrls] = await Promise.all([
            searchUnsplash(query, count),
            searchPexels(query, count),
        ])
        addUrls(unsplashUrls)
        addUrls(pexelsUrls)

        // 2. Pexels retry with simplified query (only if still short AND query had Cyrillic)
        if (finalUrls.length < count && pexelsFallbackQuery !== query) {
            const retryUrls = await searchPexels(pexelsFallbackQuery, count - finalUrls.length)
            addUrls(retryUrls)
        }

        // 3. Wikimedia supplement — only if genuinely short on images
        if (finalUrls.length < count) {
            const wikiUrls = await searchWikimediaGallery(query, count - finalUrls.length)
            addUrls(wikiUrls)
        }

        // 4. Local fallback
        if (finalUrls.length === 0) {
            finalUrls.push("/tbilisi-old-town.jpg")
        }

        // --- Persistency Save ---
        if (supabase && finalUrls.length > 0) {
            supabase.from("image_cache")
                .upsert({ query: cacheKey, gallery_urls: finalUrls, updated_at: new Date().toISOString() }, { onConflict: "query" })
                .then(({ error }) => error && console.error("[Image Cache] gallery save error:", error))
        }

        galleryCache.set(cacheKey, { urls: finalUrls, timestamp: Date.now() })
        return finalUrls
    } catch {
        return ["/tbilisi-old-town.jpg"]
    }
}
