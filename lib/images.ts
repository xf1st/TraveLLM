// Image Search Strategy for CIS/Global Compatibility:
// 1. Wikimedia Commons (Primary - Works in Russia, high quality)
// 2. Static Fallback (Reliable known images for popular destinations)

// --- In-memory cache for image URLs ---
const imageCache = new Map<string, { url: string; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

// --- Wikimedia Logic (Strict Photo Filter) ---

async function searchWikimedia(query: string) {
    try {
        // Clean up query first
        // 1. Split by comma/slash and take first part (e.g. "Paris, France" -> "Paris")
        let cleanQuery = query.split(/,| \/ /)[0].trim();

        // 2. Remove "travel" or "trip" if present to avoid duplication
        cleanQuery = cleanQuery.replace(/\s+(travel|trip|journey|vacation)$/i, "").trim();

        // 3. Construct intelligent queries
        const queries = [
            cleanQuery + " landmark",   // "Paris landmark" - good for iconic shots
            cleanQuery + " tourism",    // "Paris tourism"
            cleanQuery + " travel",     // "Paris travel" 
            cleanQuery,                 // "Paris" - broad
            "Tourism in " + cleanQuery  // "Tourism in Paris" - common Wiki category style
        ];

        // If query seems to be a country (no city), boost "landscape" or "nature"
        if (!cleanQuery.includes(" ")) {
            queries.push(cleanQuery + " landscape");
            queries.push(cleanQuery + " nature");
        }

        for (const q of queries) {
            if (!q || q.length < 2) continue;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

            try {
                // Use 'generator=search' to find pages, then get imageinfo
                const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrnamespace=6&prop=imageinfo&iiprop=url|extmetadata&format=json&origin=*&gsrlimit=15`;
                const res = await fetch(url, {
                    headers: { 'Accept': 'application/json' },
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (!res.ok) continue;
                const data = await res.json();

                if (data.query && data.query.pages) {
                    const pages = Object.values(data.query.pages) as any[];

                    // Efficient shuffle to not satisfy with just the first result always? 
                    // No, relevance is usually best first. But Wiki search can be weird.

                    // Strict Filter: Photos only (JPG), no maps/flags/icons
                    const validImage = pages.find(p => {
                        const imgUrl = p.imageinfo?.[0]?.url?.toLowerCase();
                        const title = p.title?.toLowerCase() || "";

                        if (!imgUrl) return false;

                        // Strict format check
                        if (!imgUrl.endsWith('.jpg') && !imgUrl.endsWith('.jpeg')) return false;

                        // Content blacklist
                        const blacklist = ['map', 'chart', 'diagram', 'coat of arms', 'flag', 'icon', 'logo', 'stamp', 'seal', 'location', 'stub', 'currency', 'coa'];
                        if (blacklist.some(word => title.includes(word))) return false;

                        // Size check (if available in metadata? Wiki doesn't always return dimensions easily in this query, but we assume file size is okay)

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
        return null; // No image found after all attempts
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
    "turkey": "https://upload.wikimedia.org/wikipedia/commons/2/25/Istanbul_Montage_2022.jpg",
    "турция": "https://upload.wikimedia.org/wikipedia/commons/2/25/Istanbul_Montage_2022.jpg",
    "egypt": "https://upload.wikimedia.org/wikipedia/commons/a/af/All_Gizah_Pyramids.jpg",
    "египет": "https://upload.wikimedia.org/wikipedia/commons/a/af/All_Gizah_Pyramids.jpg",
    "thailand": "https://upload.wikimedia.org/wikipedia/commons/f/fa/Maya_Bay%2C_Ko_Phi_Phi_Lee.jpg",
    "таиланд": "https://upload.wikimedia.org/wikipedia/commons/f/fa/Maya_Bay%2C_Ko_Phi_Phi_Lee.jpg",
    "japan": "https://upload.wikimedia.org/wikipedia/commons/6/67/Chureito_Pagoda_and_Mount_Fuji.jpg",
    "япония": "https://upload.wikimedia.org/wikipedia/commons/6/67/Chureito_Pagoda_and_Mount_Fuji.jpg",
    "china": "https://upload.wikimedia.org/wikipedia/commons/a/a4/Great_Wall_of_China_July_2006.jpg",
    "китай": "https://upload.wikimedia.org/wikipedia/commons/a/a4/Great_Wall_of_China_July_2006.jpg",
    "usa": "https://upload.wikimedia.org/wikipedia/commons/c/c7/Empire_State_Building_from_the_Top_of_the_Rock.jpg",
    "сша": "https://upload.wikimedia.org/wikipedia/commons/c/c7/Empire_State_Building_from_the_Top_of_the_Rock.jpg",
    "asia": "https://upload.wikimedia.org/wikipedia/commons/f/fa/Maya_Bay%2C_Ko_Phi_Phi_Lee.jpg",
    "азия": "https://upload.wikimedia.org/wikipedia/commons/f/fa/Maya_Bay%2C_Ko_Phi_Phi_Lee.jpg",
    "africa": "https://upload.wikimedia.org/wikipedia/commons/6/6b/Lion_d%27Afrique.jpg",
    "африка": "https://upload.wikimedia.org/wikipedia/commons/6/6b/Lion_d%27Afrique.jpg",
    "europe": "https://upload.wikimedia.org/wikipedia/commons/9/91/Prague_panorama.jpg",
    "европа": "https://upload.wikimedia.org/wikipedia/commons/9/91/Prague_panorama.jpg",
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
