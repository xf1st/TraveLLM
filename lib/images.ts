// Image Search Strategy for CIS/Global Compatibility:
// 1. Wikimedia Commons (Primary - Works in Russia, high quality)
// 2. Static Fallback (Reliable known images for popular destinations)

// --- Wikimedia Logic (Strict Photo Filter) ---

async function searchWikimedia(query: string) {
    try {
        const queries = [
            query + " travel",
            query + " landmark",
            query + " city",
            query.split(' ').slice(0, 2).join(' '),
            query.split(' ')[0]
        ];

        for (const q of queries) {
            if (!q || q.length < 2) continue;

            const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrnamespace=6&prop=imageinfo&iiprop=url|extmetadata&format=json&origin=*&gsrlimit=15`;
            const res = await fetch(url, {
                headers: { 'Accept': 'application/json' }
            });

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
    // 1. Try Wikimedia (Primary - Works in Russia)
    const wikiImage = await searchWikimedia(query);
    if (wikiImage) return wikiImage;

    // 2. Fallback: Known static images for popular destinations
    return getStaticFallback(query);
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
