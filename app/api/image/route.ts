import { NextRequest, NextResponse } from "next/server";
import { getDestinationImage } from "@/lib/images";
import { checkIpRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
    const rl = checkIpRateLimit(req, "api-destination-image", 60);
    if (!rl.allowed) return rateLimitResponse(rl);

    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("query");

    if (!query) {
        return NextResponse.json({ url: null }, { status: 400 });
    }

    try {
        const imageUrl = await getDestinationImage(query);
        return NextResponse.json({ url: imageUrl }, {
            headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" }
        });
    } catch (error) {
        console.error("Image proxy error:", error);
        return NextResponse.json({ url: null }, { status: 500 });
    }
}
