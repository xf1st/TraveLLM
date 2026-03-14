/**
 * Image Search — Multi-Provider Waterfall
 *
 * Gallery (/api/gallery):  Pexels → Wikimedia → static fallback
 * Hero    (/api/image):    Unsplash → Wikimedia → static fallback
 * Hotels:                  Hotellook URL pattern (unchanged, in travelpayouts.ts)
 */

import { searchPexels } from "./pexels"
import { searchUnsplash } from "./unsplash"
import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"
import { ProxyAgent } from "undici"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy

const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null
const supabaseAdmin = (supabaseUrl && supabaseServiceKey) ? createClient(supabaseUrl, supabaseServiceKey) : null

// Create a singleton dispatcher for the proxy
const proxyDispatcher = httpProxy ? new ProxyAgent(httpProxy) : undefined;

/**
 * Custom fetch with optional proxy support for server-side requests in restricted environments.
 */
async function proxiedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const fetchOptions: any = { ...options };
    if (proxyDispatcher && !url.includes(supabaseUrl)) {
        // Use proxy only for external requests (undici ProxyAgent for Node 18+ native fetch)
        fetchOptions.dispatcher = proxyDispatcher;
    }
    return fetch(url, fetchOptions);
}

/**
 * Auto-translate Russian queries to English for better search results.
 * Used by both Hero and Gallery search.
 */
async function translateToEnglish(text: string): Promise<string> {
    if (!/[а-яёА-ЯЁ]/.test(text)) return text;
    
    try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ru|en`
        const res = await proxiedFetch(url, { signal: AbortSignal.timeout(3000) })
        if (!res.ok) return text
        const data = await res.json()
        const translated: string = data?.responseData?.translatedText || ""
        
        // MyMemory returns "MYMEMORY WARNING" on quota exceed
        if (translated && !translated.startsWith("MYMEMORY WARNING") && translated.toLowerCase() !== "error") {
            console.log(`[images] translated: "${text}" → "${translated}"`)
            return translated
        }
    } catch (e) {
        console.warn("[images] translation failed:", e)
    }
    return text
}

async function uploadToStorage(url: string, prefix: string): Promise<string | null> {
    if (!supabaseAdmin) return null;
    try {
        // 1. Download image
        const response = await proxiedFetch(url, { signal: AbortSignal.timeout(8000) });
        if (!response.ok) return null;
        const buffer = await response.arrayBuffer();

        // 2. Generate filename (hash of URL to avoid duplicates)
        const hashHex = crypto.createHash("sha256").update(url).digest("hex").slice(0, 16);
        
        const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
        const filename = `${prefix}_${hashHex}.${ext}`;

        // 3. Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from("destination-images")
            .upload(filename, Buffer.from(buffer), {
                contentType: response.headers.get("content-type") || "image/jpeg",
                upsert: true
            });

        if (uploadError) {
            console.error("[Storage Upload] Error:", uploadError);
            return null;
        }

        // 4. Get public URL
        const { data: { publicUrl } } = supabaseAdmin.storage
            .from("destination-images")
            .getPublicUrl(filename);

        return publicUrl;
    } catch (e) {
        console.error("[Storage Upload] Exception:", e);
        return null;
    }
}

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
            try {
                const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrnamespace=6&prop=imageinfo&iiprop=url|extmetadata&format=json&origin=*&gsrlimit=15`
                const res = await proxiedFetch(url, { 
                    signal: AbortSignal.timeout(4000),
                    headers: { Accept: "application/json" }
                })
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
            } catch (e) {
                // Continue to next query
            }
        }
    } catch (error) {
        console.error("Wikimedia search failed:", error)
    }
    return null
}

async function searchWikimediaGallery(query: string, count: number): Promise<string[]> {
    const results = new Set<string>()
    try {
        const queries = [
            query,
            query + " landmark",
            query + " tourism",
            query + " scenic",
        ]
        
        for (const q of queries) {
            if (results.size >= count) break
            try {
                const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrnamespace=6&prop=imageinfo&iiprop=url|extmetadata&format=json&origin=*&gsrlimit=${count * 2}`
                const res = await proxiedFetch(url, { signal: AbortSignal.timeout(4000) })
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
            } catch (e) { }
        }
    } catch (error) {
        console.error("Wikimedia gallery search failed:", error)
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
    balkan: "https://upload.wikimedia.org/wikipedia/commons/b/b3/Belgrade_Montage_2022.jpg",
    балканы: "https://upload.wikimedia.org/wikipedia/commons/b/b3/Belgrade_Montage_2022.jpg",
    belgrade: "https://upload.wikimedia.org/wikipedia/commons/b/b3/Belgrade_Montage_2022.jpg",
    белград: "https://upload.wikimedia.org/wikipedia/commons/b/b3/Belgrade_Montage_2022.jpg",
    serbia: "https://upload.wikimedia.org/wikipedia/commons/b/b3/Belgrade_Montage_2022.jpg",
    сербия: "https://upload.wikimedia.org/wikipedia/commons/b/b3/Belgrade_Montage_2022.jpg",
    bosnia: "https://upload.wikimedia.org/wikipedia/commons/d/d7/Sarajevo_Montage_2023.jpg",
    босния: "https://upload.wikimedia.org/wikipedia/commons/d/d7/Sarajevo_Montage_2023.jpg",
    sarajevo: "https://upload.wikimedia.org/wikipedia/commons/d/d7/Sarajevo_Montage_2023.jpg",
    сараево: "https://upload.wikimedia.org/wikipedia/commons/d/d7/Sarajevo_Montage_2023.jpg",
    egypt: "https://upload.wikimedia.org/wikipedia/commons/a/af/All_Gizah_Pyramids.jpg",
    египет: "https://upload.wikimedia.org/wikipedia/commons/a/af/All_Gizah_Pyramids.jpg",
    dubai: "https://upload.wikimedia.org/wikipedia/commons/c/c2/Dubai_Skyline_2015.jpg",
    дубай: "https://upload.wikimedia.org/wikipedia/commons/c/c2/Dubai_Skyline_2015.jpg",
    thailand: "https://upload.wikimedia.org/wikipedia/commons/0/04/Wat_Arun_by_Nand_Nirodh.jpg",
    таиланд: "https://upload.wikimedia.org/wikipedia/commons/0/04/Wat_Arun_by_Nand_Nirodh.jpg",
    japan: "https://upload.wikimedia.org/wikipedia/commons/b/b2/Fuji_from_Pagoda.jpg",
    япония: "https://upload.wikimedia.org/wikipedia/commons/b/b2/Fuji_from_Pagoda.jpg",
    travel: "https://upload.wikimedia.org/wikipedia/commons/c/cc/Travel_022.jpg",
}

function getStaticFallback(query: string): string {
    const q = query.toLowerCase()
    for (const key in FALLBACK_IMAGES) {
        if (q.includes(key)) return FALLBACK_IMAGES[key]
    }
    return FALLBACK_IMAGES["travel"]
}

export async function getDestinationImage(query: string): Promise<string> {
    const cacheKey = query.toLowerCase().trim()

    // 0. Skip fetching for airports/stations - they rarely produce good travel photos
    const skipKeywords = ["аэропорт", "airport", "вокзал", "station", "перелет", "flight", "transfer", "трансфер"]
    if (skipKeywords.some(k => cacheKey.includes(k))) {
        return "https://upload.wikimedia.org/wikipedia/commons/c/cc/Travel_022.jpg"
    }

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

    // Auto-translate if Russian
    const translatedQuery = await translateToEnglish(query);

    // Enhance query for better hero covers if it's just a short name (like "Belgrade")
    let enhancedQuery = translatedQuery;
    const wordCount = translatedQuery.trim().split(/\s+/).length;
    if (wordCount <= 2 && !translatedQuery.toLowerCase().includes("hotel") && !translatedQuery.toLowerCase().includes("restaurant")) {
        enhancedQuery = `${translatedQuery} landmark cityscape`;
    }

    let result: string | null = null

    // 1. Unsplash (highest quality, landscape, CDN not blocked in Russia)
    let unsplashUrls = await searchUnsplash(enhancedQuery, 1)
    
    // 1.2 Fallback to translated query without enhancement
    if (unsplashUrls.length === 0 && enhancedQuery !== translatedQuery) {
        unsplashUrls = await searchUnsplash(translatedQuery, 1)
    }

    // 1.4 Fallback to just the first 2 words if it's a long tagged query
    if (unsplashUrls.length === 0 && wordCount > 2) {
        const simpleQuery = translatedQuery.split(/\s+/).slice(0, 2).join(" ");
        unsplashUrls = await searchUnsplash(simpleQuery, 1)
    }

    // 1.6 Last ditch effort for Unsplash: try the last 2 words (often contains city/location)
    if (unsplashUrls.length === 0 && wordCount > 2) {
        const lastWords = translatedQuery.split(/\s+/).slice(-2).join(" ");
        unsplashUrls = await searchUnsplash(lastWords, 1)
    }

    if (unsplashUrls.length > 0) {
        result = unsplashUrls[0]
    }

    // 2. Pexels (broader database, good for hotels/bars/specific spots)
    if (!result) {
        let pexelsUrls = await searchPexels(translatedQuery, 1)
        
        if (pexelsUrls.length === 0 && wordCount > 2) {
            const simpleQuery = translatedQuery.split(/\s+/).slice(0, 2).join(" ");
            pexelsUrls = await searchPexels(simpleQuery, 1)
        }

        if (pexelsUrls.length === 0 && wordCount > 2) {
            const lastWords = translatedQuery.split(/\s+/).slice(-2).join(" ");
            pexelsUrls = await searchPexels(lastWords, 1)
        }

        if (pexelsUrls.length > 0) {
            result = pexelsUrls[0]
        }
    }

    // 3. Wikimedia fallback (may be blocked on RU client, but proxy handles it)
    if (!result) {
        let wikiImg = await searchWikimedia(translatedQuery)
        if (wikiImg) result = wikiImg
    }

    // 4. Static Wikimedia map (last resort)
    if (!result) {
        result = getStaticFallback(query) // Use original query for fallback check as it has RU keys
    }

    // --- Persistency Save ---
    if (supabase && result) {
        // If it's an external URL, try to cache it in our storage
        if (result.startsWith("http") && !result.includes(supabaseUrl)) {
            const storageUrl = await uploadToStorage(result, "hero");
            if (storageUrl) result = storageUrl;
        }

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
 *   3. Wikimedia — encyclopedia photos as supplement
 *   4. Local fallback — always succeeds
 */
export async function getGalleryImages(query: string, count: number = 4, excludeUrls?: string[]): Promise<string[]> {
    const cacheKey = `gallery:${query.toLowerCase().trim()}:${count}`

    // Build exclusion set for fast lookup
    const excluded = excludeUrls && excludeUrls.length > 0 ? new Set(excludeUrls) : null

    // Check in-memory cache (only if no exclusions, to avoid serving cached+excluded results)
    if (!excluded) {
        const cached = galleryCache.get(cacheKey)
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.urls
    }

    // --- Persistency Check (only if no exclusions) ---
    if (!excluded && supabase) {
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

        // Pre-seed seen set with excluded URLs so they're never returned
        if (excluded) {
            for (const u of excluded) seen.add(u)
        }

        const addUrls = (urls: string[]) => {
            for (const u of urls) {
                if (finalUrls.length >= count) break
                if (u && !seen.has(u)) { seen.add(u); finalUrls.push(u) }
            }
        }

        // Auto-translate if Russian
        const translatedQuery = await translateToEnglish(query);

        // 1. Unsplash + Pexels in parallel (fastest path, covers most queries)
        const [unsplashUrls, pexelsUrls] = await Promise.all([
            searchUnsplash(translatedQuery, count),
            searchPexels(translatedQuery, count),
        ])
        addUrls(unsplashUrls)
        addUrls(pexelsUrls)

        // 2. Wikimedia supplement — only if genuinely short on images
        if (finalUrls.length < count) {
            const wikiUrls = await searchWikimediaGallery(translatedQuery, count - finalUrls.length)
            addUrls(wikiUrls)
        }

        // 3. Local fallback
        if (finalUrls.length === 0) {
            finalUrls.push("/tbilisi-old-town.jpg")
        }

        // --- Persistency Save ---
        if (supabase && finalUrls.length > 0) {
            // Upload images to our storage to bypass blocks
            const storedUrls = await Promise.all(
                finalUrls.map(async (u) => {
                    if (u.startsWith("http") && !u.includes(supabaseUrl)) {
                        try {
                            return await uploadToStorage(u, "gallery") || u;
                        } catch (e) {
                            console.error("[getGalleryImages] upload failed for", u, e);
                            return u;
                        }
                    }
                    return u;
                })
            );

            supabase.from("image_cache")
                .upsert({ query: cacheKey, gallery_urls: storedUrls, updated_at: new Date().toISOString() }, { onConflict: "query" })
                .then(({ error }) => error && console.error("[Image Cache] gallery save error:", error))
            
            // Return stored URLs for the caller
            galleryCache.set(cacheKey, { urls: storedUrls, timestamp: Date.now() })
            return storedUrls
        }

        galleryCache.set(cacheKey, { urls: finalUrls, timestamp: Date.now() })
        return finalUrls
    } catch (e) {
        console.error("[getGalleryImages] generic error:", e);
        return ["/tbilisi-old-town.jpg"]
    }
}
