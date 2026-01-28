// Image Search Strategy for CIS/Global Compatibility:
// 1. Wikimedia Commons (Primary - Works in Russia, high quality)
// 2. Static Fallback (Reliable known images for popular destinations)

// --- In-memory cache for image URLs ---
const imageCache = new Map<string, { url: string; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

// --- Wikimedia Logic (Strict Photo Filter) ---

async function searchWikimedia(query: string) {
    try {
        // Only try first 2 queries to speed up
        const queries = [
            query + " travel",
            query + " landmark"
        ];

        for (const q of queries) {
            if (!q || q.length < 2) continue;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout per request

            try {
                const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrnamespace=6&prop=imageinfo&iiprop=url|extmetadata&format=json&origin=*&gsrlimit=10`;
                const res = await fetch(url, {
                    headers: { 'Accept': 'application/json' },
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (!res.ok) continue;
                const data = await res.json();

                if (data.query && data.query.pages) {
                    const pages = Object.values(data.query.pages) as any[];

                    // Strict Filter: Photos only (JPG), no maps/flags/icons
                    const validImage = pages.find(p => {
                        const imgUrl = p.imageinfo?.[0]?.url?.toLowerCase();
                        const title = p.title?.toLowerCase() || "";

                        if (!imgUrl) return false;

                        // Must be JPG
                        if (!imgUrl.endsWith('.jpg') && !imgUrl.endsWith('.jpeg')) return false;

                        // Content blacklist
                        const blacklist = ['map', 'chart', 'diagram', 'coat of arms', 'flag', 'icon', 'logo', 'stamp', 'seal', 'location'];
                        if (blacklist.some(word => title.includes(word))) return false;

                        return true;
                    });

                    if (validImage) {
                        return validImage.imageinfo[0].url;
                    }
                }
            } catch (fetchError) {
                clearTimeout(timeoutId);
                // Timeout or network error, try next query
                continue;
            }
        }
        return null;
    } catch (e) {
        return null;
    }
}

// --- Reliable Fallback URLs ---
const FALLBACK_IMAGES: Record<string, string> = {
    "россия": "https://upload.wikimedia.org/wikipedia/commons/4/49/Red_Square_Moscow.JPG",
    "moscow": "https://upload.wikimedia.org/wikipedia/commons/4/49/Red_Square_Moscow.JPG",
    "москва": "https://upload.wikimedia.org/wikipedia/commons/4/49/Red_Square_Moscow.JPG",
    "france": "https://upload.wikimedia.org/wikipedia/commons/a/a8/Tour_Eiffel_Wikimedia_Commons.jpg",
    "франция": "https://upload.wikimedia.org/wikipedia/commons/a/a8/Tour_Eiffel_Wikimedia_Commons.jpg",
    "paris": "https://upload.wikimedia.org/wikipedia/commons/a/a8/Tour_Eiffel_Wikimedia_Commons.jpg",
    "париж": "https://upload.wikimedia.org/wikipedia/commons/a/a8/Tour_Eiffel_Wikimedia_Commons.jpg",
    "spain": "https://upload.wikimedia.org/wikipedia/commons/9/99/Sagrada_Familia_01.jpg",
    "испания": "https://upload.wikimedia.org/wikipedia/commons/9/99/Sagrada_Familia_01.jpg",
    "italy": "https://upload.wikimedia.org/wikipedia/commons/d/d8/Colosseum_in_Rome-April_2007-1-_copie_2B.jpg",
    "италия": "https://upload.wikimedia.org/wikipedia/commons/d/d8/Colosseum_in_Rome-April_2007-1-_copie_2B.jpg",
    "germany": "https://upload.wikimedia.org/wikipedia/commons/e/ec/Brandenburger_Tor_nachts.jpg",
    "германия": "https://upload.wikimedia.org/wikipedia/commons/e/ec/Brandenburger_Tor_nachts.jpg",
    "poland": "https://upload.wikimedia.org/wikipedia/commons/1/1c/Krak%C3%B3w_-_Sukiennice_1.jpg",
    "польша": "https://upload.wikimedia.org/wikipedia/commons/1/1c/Krak%C3%B3w_-_Sukiennice_1.jpg",
    "czech": "https://upload.wikimedia.org/wikipedia/commons/9/91/Prague_panorama.jpg",
    "чехия": "https://upload.wikimedia.org/wikipedia/commons/9/91/Prague_panorama.jpg",
    "praha": "https://upload.wikimedia.org/wikipedia/commons/9/91/Prague_panorama.jpg",
    "прага": "https://upload.wikimedia.org/wikipedia/commons/9/91/Prague_panorama.jpg",
    "грузия": "https://upload.wikimedia.org/wikipedia/commons/a/a2/Tbilisi_View.jpg",
    "georgia": "https://upload.wikimedia.org/wikipedia/commons/a/a2/Tbilisi_View.jpg",
    "tbilisi": "https://upload.wikimedia.org/wikipedia/commons/a/a2/Tbilisi_View.jpg",
    "тбилиси": "https://upload.wikimedia.org/wikipedia/commons/a/a2/Tbilisi_View.jpg",
    "amsterdam": "https://upload.wikimedia.org/wikipedia/commons/b/b1/Keizersgracht_Amsterdam.jpg",
    "амстердам": "https://upload.wikimedia.org/wikipedia/commons/b/b1/Keizersgracht_Amsterdam.jpg",
    "netherlands": "https://upload.wikimedia.org/wikipedia/commons/b/b1/Keizersgracht_Amsterdam.jpg",
    "нидерланды": "https://upload.wikimedia.org/wikipedia/commons/b/b1/Keizersgracht_Amsterdam.jpg",
    "travel": "https://upload.wikimedia.org/wikipedia/commons/c/cc/Travel_022.jpg"
};

function getStaticFallback(query: string): string {
    const lowerQuery = query.toLowerCase();
    for (const [key, url] of Object.entries(FALLBACK_IMAGES)) {
        if (lowerQuery.includes(key)) {
            return url;
        }
    }
    return FALLBACK_IMAGES["travel"];
}

// --- Main Export ---

export async function getDestinationImage(query: string) {
    const cacheKey = query.toLowerCase().trim();

    // Check cache first
    const cached = imageCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.url;
    }

    // Check static fallback first (instant)
    const staticImage = getStaticFallback(query);
    if (staticImage !== FALLBACK_IMAGES["travel"]) {
        imageCache.set(cacheKey, { url: staticImage, timestamp: Date.now() });
        return staticImage;
    }

    // Try Wikimedia (slower, with timeout)
    const wikiImage = await searchWikimedia(query);
    if (wikiImage) {
        imageCache.set(cacheKey, { url: wikiImage, timestamp: Date.now() });
        return wikiImage;
    }

    // Fallback to generic travel image
    imageCache.set(cacheKey, { url: staticImage, timestamp: Date.now() });
    return staticImage;
}

export async function getGalleryImages(query: string, count: number = 4) {
    try {
        const queries = [
            query,
            query + " landmark",
            query + " city",
            query + " travel"
        ];

        const results: string[] = [];

        for (const q of queries) {
            if (results.length >= count) break;

            const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrnamespace=6&prop=imageinfo&iiprop=url&format=json&origin=*&gsrlimit=${count * 2}`;
            const res = await fetch(url);

            if (!res.ok) continue;
            const data = await res.json();

            if (data.query && data.query.pages) {
                const pages = Object.values(data.query.pages) as any[];
                for (const p of pages) {
                    if (results.length >= count) break;
                    const imgUrl = p.imageinfo?.[0]?.url?.toLowerCase();
                    if (imgUrl && (imgUrl.endsWith('.jpg') || imgUrl.endsWith('.jpeg'))) {
                        results.push(p.imageinfo[0].url);
                    }
                }
            }
        }

        return results;
    } catch (e) {
        return [];
    }
}
