import { NextRequest, NextResponse } from "next/server";
import { getDestinationImage } from "@/lib/images";

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("query");

    if (!query) {
        return NextResponse.json({ url: null }, { status: 400 });
    }

    try {
        const imageUrl = await getDestinationImage(query);
        return NextResponse.json({ url: imageUrl });
    } catch (error) {
        console.error("Image proxy error:", error);
        return NextResponse.json({ url: null }, { status: 500 });
    }
}
