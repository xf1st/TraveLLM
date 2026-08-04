/**
 * Image Search — Multi-Provider Waterfall
 *
 * Gallery (/api/gallery):  Unsplash + Pexels + Pixabay (parallel) → Wikimedia → static fallback
 * Hero    (/api/image):    Unsplash → Pexels → Pixabay → Wikimedia → static fallback
 * Hotels:                  Hotellook URL pattern (unchanged, in travelpayouts.ts)
 */

import { searchPexels } from "./pexels"
import { searchPixabay } from "./pixabay"
import { searchUnsplash } from "./unsplash"
import { isProxyDisabled } from "./proxy-config"
import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy

const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null
const supabaseAdmin = (supabaseUrl && supabaseServiceKey) ? createClient(supabaseUrl, supabaseServiceKey) : null

// Create a singleton dispatcher for the proxy
let proxyDispatcher: any = undefined;
if (typeof window === "undefined" && httpProxy) {
    try {
        const undici = eval('require("undici")');
        proxyDispatcher = new undici.ProxyAgent(httpProxy);
    } catch(e) {}
}

/**
 * Custom fetch with optional proxy support for server-side requests in restricted environments.
 */
async function proxiedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const fetchOptions: any = { ...options };
    // Add browser-like headers so CDNs (Pexels, Unsplash, Pixabay) don't reject server requests
    fetchOptions.headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Referer": "https://travellm.ru/",
        ...(options.headers as Record<string, string> ?? {}),
    };
    // Skip proxy if admin disabled it or if it's an internal request
    if (proxyDispatcher && !url.includes(supabaseUrl)) {
        const disabled = await isProxyDisabled()
        if (!disabled) {
            fetchOptions.dispatcher = proxyDispatcher;
        }
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

        const candidates = await Promise.all(queries.slice(0, 3).map(async (q) => {
            if (!q || q.length < 2) return null
            try {
                const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrnamespace=6&prop=imageinfo&iiprop=url|extmetadata&format=json&origin=*&gsrlimit=15`
                const res = await proxiedFetch(url, { 
                    signal: AbortSignal.timeout(4000),
                    headers: { Accept: "application/json" }
                })
                if (!res.ok) return null
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
            } catch {}
            return null
        }))

        return candidates.find((candidate): candidate is string => Boolean(candidate)) ?? null
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

    // Auto-translate if Russian
    const translatedQuery = await translateToEnglish(query);

    // Enhance query for better hero covers if it's just a short name (like "Belgrade")
    let enhancedQuery = translatedQuery;
    const wordCount = translatedQuery.trim().split(/\s+/).length;
    if (wordCount <= 2 && !translatedQuery.toLowerCase().includes("hotel") && !translatedQuery.toLowerCase().includes("restaurant")) {
        enhancedQuery = `${translatedQuery} landmark cityscape`;
    }

    const searchProviders = async (unsplashQuery: string, stockQuery: string): Promise<string | null> => {
        const [unsplashUrls, pexelsUrls, pixabayUrls] = await Promise.all([
            searchUnsplash(unsplashQuery, 1),
            searchPexels(stockQuery, 1),
            searchPixabay(stockQuery, 1),
        ])
        return unsplashUrls[0] || pexelsUrls[0] || pixabayUrls[0] || null
    }

    // Query independent providers concurrently. A provider timeout now costs one
    // timeout window instead of accumulating across the whole waterfall.
    let result = await searchProviders(enhancedQuery, translatedQuery)

    if (!result) {
        const fallbackQueries = wordCount > 2
            ? [
                translatedQuery.split(/\s+/).slice(-2).join(" "),
                translatedQuery.split(/\s+/).slice(0, 2).join(" "),
            ]
            : enhancedQuery !== translatedQuery
                ? [translatedQuery]
                : []

        for (const fallbackQuery of Array.from(new Set(fallbackQueries))) {
            result = await searchProviders(fallbackQuery, fallbackQuery)
            if (result) break
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

    const finalResult = result ?? getStaticFallback(query)
    imageCache.set(cacheKey, { url: finalResult, timestamp: Date.now() })
    return finalResult
}

/**
 * Activity / place gallery (multiple images).
 *
 * Server waterfall:
 *   1. Unsplash  — not blocked in Russia, high quality landscape photos
 *   2. Pexels    — blocked in Russia without VPN, but client handles via /api/proxy-image
 *   3. Wikimedia — encyclopedia photos as supplement
 *   4. Local fallback — always succeeds
 *
 * @param options.variant — 0–29; maps to API page 1–10 so same city fallback queries get different photos per activity
 */
export async function getGalleryImages(
    query: string,
    count: number = 4,
    excludeUrls?: string[],
    options?: { variant?: number }
): Promise<string[]> {
    const variantIndex = Math.min(29, Math.max(0, options?.variant ?? 0))
    const page = 1 + (variantIndex % 10)
    const cacheKey = `gallery:${query.toLowerCase().trim()}:${count}:v${variantIndex}`

    // Build exclusion set for fast lookup
    const excluded = excludeUrls && excludeUrls.length > 0 ? new Set(excludeUrls) : null

    // Check in-memory cache (only if no exclusions, to avoid serving cached+excluded results)
    if (!excluded) {
        const cached = galleryCache.get(cacheKey)
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.urls
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

        // 1. Unsplash + Pexels + Pixabay in parallel (fastest path, covers most queries)
        const [unsplashUrls, pexelsUrls, pixabayUrls] = await Promise.all([
            searchUnsplash(translatedQuery, count, page),
            searchPexels(translatedQuery, count, page),
            searchPixabay(translatedQuery, count, page),
        ])
        addUrls(unsplashUrls)
        addUrls(pexelsUrls)
        addUrls(pixabayUrls)

        // 2. Wikimedia supplement — only if genuinely short on images
        if (finalUrls.length < count) {
            const wikiUrls = await searchWikimediaGallery(translatedQuery, count - finalUrls.length)
            addUrls(wikiUrls)
        }

        // 3. Retry with simplified destination-only query if specific name returned nothing
        //    e.g. "Georgia speakeasy cocktail bar" instead of "travel landmark The Chronos Keyhole Georgia"
        if (finalUrls.length === 0) {
            const words = translatedQuery.split(/\s+/).filter(w => w.length > 2)
            if (words.length > 2) {
                // Last 2 words are typically city/country — try them alone
                const simpleQuery = words.slice(-2).join(" ")
                const [u2, p2, px2] = await Promise.all([
                    searchUnsplash(simpleQuery, count, page),
                    searchPexels(simpleQuery, count, page),
                    searchPixabay(simpleQuery, count, page),
                ])
                addUrls(u2); addUrls(p2); addUrls(px2)
                if (finalUrls.length < count) {
                    const wikiUrls2 = await searchWikimediaGallery(simpleQuery, count - finalUrls.length)
                    addUrls(wikiUrls2)
                }
            }
        }

        // 4. Truly last resort: return empty — PlaceGallery hides itself gracefully
        //    (don't show a random Tbilisi photo for unrelated activities)
        // finalUrls stays [] — caller sees empty array, gallery won't render

        galleryCache.set(cacheKey, { urls: finalUrls, timestamp: Date.now() })
        return finalUrls
    } catch (e) {
        console.error("[getGalleryImages] generic error:", e);
        return []
    }
}
