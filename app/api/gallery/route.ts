import { NextRequest, NextResponse } from "next/server";
import { getGalleryImages } from "@/lib/images";

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("query");
    const count = parseInt(searchParams.get("count") || "4");

    if (!query) {
        return NextResponse.json({ images: [] }, { status: 400 });
    }

    try {
        const images = await getGalleryImages(query, count);
        return NextResponse.json({ images }, {
            headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" }
        });
    } catch (error) {
        console.error("Gallery API error:", error);
        return NextResponse.json({ images: [] }, { status: 500 });
    }
}
