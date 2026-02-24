import { NextRequest, NextResponse } from "next/server";
import { getGalleryImages } from "@/lib/images";

// Terms that when present in imageQuery would produce inappropriate results
const NSFW_TERMS = ['condom', 'sex', 'porn', 'nude', 'naked', 'adult', 'erotic', 'fetish', 'bdsm', 'lingerie', 'xxx']

// Category-based safe fallback queries when sanitized query becomes too short
const SAFE_FALLBACKS: Record<string, string> = {
    food: 'restaurant interior cozy dining table warm lighting',
    hotel: 'hotel lobby modern elegant interior',
    activity: 'city street travel landmark architecture',
}

function sanitizeQuery(q: string): string {
    let safe = q
    for (const term of NSFW_TERMS) {
        safe = safe.replace(new RegExp(`\\b${term}s?\\b`, 'gi'), '')
    }
    safe = safe.trim().replace(/\s+/g, ' ')
    // If sanitized query is too short, use a safe food/travel fallback
    return safe.length > 8 ? safe : SAFE_FALLBACKS.food
}

function hasCyrillic(text: string): boolean {
    return /[а-яёА-ЯЁ]/.test(text)
}

async function translateToEnglish(text: string): Promise<string> {
    try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ru|en`
        const res = await fetch(url, { signal: AbortSignal.timeout(2500) })
        if (!res.ok) return text
        const data = await res.json()
        const translated: string = data?.responseData?.translatedText || ""
        // MyMemory returns "MYMEMORY WARNING" on quota exceed
        if (translated && !translated.startsWith("MYMEMORY WARNING") && translated.toLowerCase() !== "error") {
            console.log(`[gallery] translated: "${text}" → "${translated}"`)
            return translated
        }
    } catch {
        // timeout or network error — use original
    }
    return text
}

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const rawQuery = searchParams.get("query");
    const count = parseInt(searchParams.get("count") || "4");
    // Comma-separated list of already-used image URLs to exclude (trip-wide dedup)
    const excludeParam = searchParams.get("exclude") || ""
    const excludeUrls = excludeParam ? excludeParam.split(",").filter(Boolean) : []

    if (!rawQuery) {
        return NextResponse.json({ images: [] }, { status: 400 });
    }

    let query = sanitizeQuery(rawQuery)

    // Auto-translate Russian queries to English before sending to Pexels
    if (hasCyrillic(query)) {
        query = await translateToEnglish(query)
        query = sanitizeQuery(query) // re-sanitize after translation
    }

    try {
        const images = await getGalleryImages(query, count, excludeUrls.length > 0 ? excludeUrls : undefined);
        return NextResponse.json({ images }, {
            headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" }
        });
    } catch (error) {
        console.error("Gallery API error:", error);
        return NextResponse.json({ images: [] }, { status: 500 });
    }
}
