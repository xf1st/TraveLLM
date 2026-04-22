
import { NextRequest, NextResponse } from "next/server";
import { ProxyAgent } from "undici";
import { checkIpRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { isProxyDisabled } from "@/lib/proxy-config";

// Create a singleton dispatcher for the proxy
const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
const proxyDispatcher = httpProxy ? new ProxyAgent(httpProxy) : undefined;

export async function GET(req: NextRequest) {
    // IP rate limit: 60 req/min (image proxy is called often but should be bounded)
    const rl = await checkIpRateLimit(req, "proxy-image", 60)
    if (!rl.allowed) return rateLimitResponse(rl)

    const url = req.nextUrl.searchParams.get("url");

    if (!url) {
        return new NextResponse("Missing URL", { status: 400 });
    }

    try {
        // Security check: exact hostname match only (endsWith is bypassable via evil.images.unsplash.com)
        const allowedDomains = new Set([
            "images.unsplash.com",
            "images.pexels.com",
            "upload.wikimedia.org",
            "img.freepik.com",
            "pixabay.com",
            "cdn.pixabay.com",
        ]);

        let parsedUrl: URL;
        try {
            parsedUrl = new URL(url);
        } catch {
            return new NextResponse("Invalid URL", { status: 400 });
        }

        // Only allow https
        if (parsedUrl.protocol !== "https:") {
            return new NextResponse("Only HTTPS allowed", { status: 403 });
        }

        if (!allowedDomains.has(parsedUrl.hostname)) {
            return new NextResponse("Forbidden domain", { status: 403 });
        }

        const fetchOptions: any = {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Referer": "https://travellm.ru/",
            },
            signal: AbortSignal.timeout(8000)
        };

        if (proxyDispatcher) {
            const disabled = await isProxyDisabled()
            if (!disabled) {
                fetchOptions.dispatcher = proxyDispatcher;
            }
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

        // Reject non-image content types
        if (!contentType.startsWith("image/")) {
            return new NextResponse("Not an image", { status: 415 });
        }

        // Reject oversized images (>10 MB) to prevent memory exhaustion
        const contentLength = parseInt(response.headers.get("Content-Length") || "0", 10);
        if (contentLength > 10 * 1024 * 1024) {
            return new NextResponse("Image too large", { status: 413 });
        }

        const buffer = await response.arrayBuffer();

        // Double-check actual size after download
        if (buffer.byteLength > 10 * 1024 * 1024) {
            return new NextResponse("Image too large", { status: 413 });
        }

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
