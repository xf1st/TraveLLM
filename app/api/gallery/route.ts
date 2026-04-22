import { NextRequest, NextResponse } from "next/server";
import { getGalleryImages } from "@/lib/images";
import { checkIpRateLimit, rateLimitResponse } from "@/lib/rate-limit";

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
    // IP rate limit: 30 image searches per minute
    const rl = await checkIpRateLimit(req, "gallery", 30)
    if (!rl.allowed) return rateLimitResponse(rl)

    const searchParams = req.nextUrl.searchParams;
    const rawQuery = searchParams.get("query");

    if (!rawQuery || rawQuery.trim().length === 0) {
        return NextResponse.json({ images: [] }, { status: 400 });
    }

    // Limit query length
    if (rawQuery.length > 300) {
        return NextResponse.json({ images: [] }, { status: 400 });
    }

    // Cap count to prevent abusive bulk image fetches
    const count = Math.min(Math.max(1, parseInt(searchParams.get("count") || "4")), 12);

    const variantRaw = parseInt(searchParams.get("variant") || "0", 10);
    const variant = Number.isFinite(variantRaw) ? Math.min(29, Math.max(0, variantRaw)) : 0;

    // Limit exclude list size
    const excludeParam = (searchParams.get("exclude") || "").slice(0, 4000)
    const excludeUrls = excludeParam ? excludeParam.split(",").filter(Boolean).slice(0, 50) : []

    const query = sanitizeQuery(rawQuery)

    try {
        const images = await getGalleryImages(
            query,
            count,
            excludeUrls.length > 0 ? excludeUrls : undefined,
            { variant }
        );
        return NextResponse.json({ images }, {
            headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" }
        });
    } catch (error) {
        console.error("Gallery API error:", error);
        return NextResponse.json({ images: [] }, { status: 500 });
    }
}
