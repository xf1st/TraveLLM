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

    const query = sanitizeQuery(rawQuery)

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
