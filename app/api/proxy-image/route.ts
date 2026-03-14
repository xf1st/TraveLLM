
import { NextRequest, NextResponse } from "next/server";
import { ProxyAgent } from "undici";

// Create a singleton dispatcher for the proxy
const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
const proxyDispatcher = httpProxy ? new ProxyAgent(httpProxy) : undefined;

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get("url");

    if (!url) {
        return new NextResponse("Missing URL", { status: 400 });
    }

    try {
        // Security check: only allow specific domains
        const allowedDomains = [
            "images.unsplash.com",
            "images.pexels.com",
            "upload.wikimedia.org",
            "img.freepik.com"
        ];

        const parsedUrl = new URL(url);
        if (!allowedDomains.some(domain => parsedUrl.hostname.endsWith(domain))) {
            return new NextResponse("Forbidden domain", { status: 403 });
        }

        const fetchOptions: any = {
            headers: {
                "User-Agent": "TraveLM-Image-Proxy/1.0",
            },
            signal: AbortSignal.timeout(8000)
        };

        if (proxyDispatcher) {
            fetchOptions.dispatcher = proxyDispatcher;
        }

        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
            // Cache error responses so clients don't hammer the same broken URL repeatedly
            return new NextResponse(`Failed to fetch image: ${response.statusText}`, {
                status: response.status,
                headers: { "Cache-Control": "public, max-age=3600" }
            });
        }

        const contentType = response.headers.get("Content-Type") || "image/jpeg";
        const buffer = await response.arrayBuffer();

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
    } catch (error) {
        console.error("Proxy error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
