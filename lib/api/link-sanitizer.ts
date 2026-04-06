/**
 * Post-generation link sanitizer.
 *
 * Checks breakable partner URLs server-side (HEAD requests) and replaces
 * broken ones with working search fallbacks before the itinerary reaches
 * the client.
 *
 * Covered partners and fields:
 *   hotel.bookingUrl — Yandex Travel specific hotel page  → city search fallback
 *   hotel.link       — Ostrovok specific hotel page       → ostrovok search fallback
 *   hotel.link       — Booking.com specific hotel page    → booking search fallback
 *
 * NOT checked (always-valid search/formula URLs):
 *   Aviasales (/search/{ORG}{DATE}{DEST})  — formula-generated, always valid
 *   Ostrovok /hotel/search/?q=…            — search URL, always valid
 *   Booking.com /search.html?ss=…          — search URL, always valid
 *   Sutochno city subdomains               — always valid
 *   Tripster / Sputnik8 city pages         — always valid
 *
 * Runs all probes in parallel with a short per-request timeout so total
 * added latency ≈ max(individual_response_time) rather than sum.
 */

import { sanitizeYandexTravelUrl } from "@/lib/tp-media"

const TIMEOUT_MS = 4_000

// Domains we're allowed to probe (SSRF guard — never probe arbitrary hosts)
// Booking.com is intentionally excluded: they return 200 even for non-existent
// hotel pages (soft redirect to search), so HEAD probing is useless there.
// Booking hotel-specific pages are always downgraded without probing.
const ALLOWED_CHECK_DOMAINS = [
    "travel.yandex.ru",
    "ostrovok.ru",
]

/* ─── URL classifiers & fallback builders ────────────────────────────────── */

// ── Yandex Travel ────────────────────────────────────────────────────────────
// specific hotel: /hotels/{city}/{hotel-slug}/   ← AI-guessed slug, 404-prone
// city search:    /hotels/{city}/                ← always works

function isYandexHotelPage(url: string): boolean {
    try {
        const u = new URL(url)
        if (!u.hostname.includes("travel.yandex.ru")) return false
        const seg = u.pathname.replace(/^\/|\/$/g, "").split("/")
        return seg.length >= 3 && seg[0] === "hotels"
    } catch { return false }
}

function yandexCityFallback(url: string): string {
    try {
        const u = new URL(url)
        // Normalize city slug via the same fixer used at render time
        // (e.g. "sankt-peterburg" → "saint-petersburg")
        const rawCity = u.pathname.replace(/^\/|\/$/g, "").split("/")[1]
        const normalized = sanitizeYandexTravelUrl(
            `https://travel.yandex.ru/hotels/${rawCity}/placeholder/`
        )
        const citySlug = new URL(normalized).pathname.replace(/^\/|\/$/g, "").split("/")[1]
        const f = new URL(`https://travel.yandex.ru/hotels/${citySlug}/`)
        for (const k of ["checkinDate", "checkoutDate", "adults", "children"]) {
            const v = u.searchParams.get(k)
            if (v) f.searchParams.set(k, v)
        }
        return f.toString()
    } catch { return url }
}

// ── Ostrovok ─────────────────────────────────────────────────────────────────
// specific hotel: /hotel/{country}/{city}/{mid…}/   ← real hotel page, can 404
// search:         /hotel/search/?q=…               ← always works

function isOstrovokHotelPage(url: string): boolean {
    try {
        const u = new URL(url)
        if (!u.hostname.includes("ostrovok.ru")) return false
        const seg = u.pathname.replace(/^\/|\/$/g, "").split("/")
        // /hotel/russia/irkutsk/mid123456/  → seg = ["hotel","russia","irkutsk","mid…"]
        // /hotel/search/                    → seg = ["hotel","search"]
        return seg[0] === "hotel" && seg[1] !== "search" && seg.length >= 3
    } catch { return false }
}

function ostrovokSearchFallback(url: string, act: any): string {
    try {
        const u = new URL(url)
        const seg = u.pathname.replace(/^\/|\/$/g, "").split("/")
        // seg[2] is city slug (e.g. "irkutsk")
        const citySlug = seg[2] || ""
        const placeName = act?.placeName || ""
        const q = [placeName, citySlug].filter(Boolean).join(" ")
        const f = new URL("https://ostrovok.ru/hotel/search/")
        if (q) f.searchParams.set("q", q)
        for (const k of ["checkin", "checkout", "guests"]) {
            const v = u.searchParams.get(k)
            if (v) f.searchParams.set(k, v)
        }
        return f.toString()
    } catch { return url }
}

// ── Booking.com ───────────────────────────────────────────────────────────────
// specific hotel: /hotel/{country}/{name}.html   ← real hotel page, can 404
// search:         /search.html?ss=…             ← always works

function isBookingHotelPage(url: string): boolean {
    try {
        const u = new URL(url)
        if (!u.hostname.includes("booking.com")) return false
        return u.pathname.startsWith("/hotel/")
    } catch { return false }
}

function bookingSearchFallback(url: string, act: any): string {
    try {
        const u = new URL(url)
        // Extract country code from /hotel/{cc}/name.html
        const seg = u.pathname.replace(/^\/|\/$/g, "").split("/")
        const placeName = act?.placeName || ""
        const q = placeName || seg[seg.length - 1]?.replace(".html", "").replace(/-/g, " ") || ""
        const f = new URL("https://www.booking.com/search.html")
        if (q) f.searchParams.set("ss", q)
        for (const k of ["checkin", "checkout", "group_adults"]) {
            const v = u.searchParams.get(k)
            if (v) f.searchParams.set(k, v)
        }
        return f.toString()
    } catch { return url }
}

/* ─── HTTP probe ─────────────────────────────────────────────────────────── */

async function probeUrl(url: string): Promise<number> {
    try {
        const u = new URL(url)
        if (!ALLOWED_CHECK_DOMAINS.some(d => u.hostname.endsWith(d))) return 0

        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
        try {
            const res = await fetch(url, {
                method: "HEAD",
                signal: controller.signal,
                redirect: "follow",
                headers: { "User-Agent": "Mozilla/5.0 (compatible; TraveLLM-LinkCheck/1.0)" },
            })
            return res.status
        } finally {
            clearTimeout(timer)
        }
    } catch {
        return 0 // timeout / network error → treat as unknown, keep original
    }
}

/* ─── Candidate collection ───────────────────────────────────────────────── */

type LinkField = "bookingUrl" | "link"

interface Candidate {
    dayIdx: number
    actIdx: number
    field: LinkField
    url: string
    fallback: string
    /** Skip HTTP probe and always apply the fallback (for Booking.com soft-404s) */
    alwaysReplace?: boolean
}

function collectCandidates(itinerary: any[]): Candidate[] {
    const out: Candidate[] = []

    itinerary.forEach((day: any, di) => {
        if (!Array.isArray(day?.activities)) return
        day.activities.forEach((act: any, ai: number) => {
            if (act?.type !== "hotel") return

            // bookingUrl — Yandex Travel specific page (probe needed)
            if (typeof act.bookingUrl === "string") {
                const url = act.bookingUrl.trim()
                if (isYandexHotelPage(url)) {
                    out.push({ dayIdx: di, actIdx: ai, field: "bookingUrl", url, fallback: yandexCityFallback(url) })
                }
                // Booking.com /hotel/… specific page — always replace (soft-404, probe useless)
                if (isBookingHotelPage(url)) {
                    out.push({ dayIdx: di, actIdx: ai, field: "bookingUrl", url, fallback: bookingSearchFallback(url, act), alwaysReplace: true })
                }
            }

            // link — Ostrovok specific page (probe), or Booking.com specific page (always replace)
            if (typeof act.link === "string") {
                const url = act.link.trim()
                if (isOstrovokHotelPage(url)) {
                    out.push({ dayIdx: di, actIdx: ai, field: "link", url, fallback: ostrovokSearchFallback(url, act) })
                } else if (isBookingHotelPage(url)) {
                    out.push({ dayIdx: di, actIdx: ai, field: "link", url, fallback: bookingSearchFallback(url, act), alwaysReplace: true })
                }
            }
        })
    })

    return out
}

/* ─── Main export ────────────────────────────────────────────────────────── */

/**
 * Scans itinerary for breakable hotel booking/link URLs, probes them in
 * parallel, and replaces 4xx/5xx responses with working search fallbacks.
 *
 * - status 0   (timeout / network error) → keep original (don't touch working URLs)
 * - status 4xx / 5xx → replace with search fallback
 */
export async function sanitizeBookingLinks(itinerary: unknown): Promise<unknown> {
    if (!Array.isArray(itinerary)) return itinerary

    const candidates = collectCandidates(itinerary)
    if (candidates.length === 0) return itinerary

    // Split: always-replace (Booking.com) vs probe-first (Yandex, Ostrovok)
    const alwaysReplace = candidates.filter(c => c.alwaysReplace)
    const toProbe = candidates.filter(c => !c.alwaysReplace)

    // Probe the rest in parallel
    const probed = await Promise.all(
        toProbe.map(async (c) => ({ ...c, status: await probeUrl(c.url) }))
    )
    const brokenProbed = probed.filter(r => r.status >= 400 && r.status < 600)

    const broken = [...alwaysReplace, ...brokenProbed]
    if (broken.length === 0) return itinerary

    const patched = JSON.parse(JSON.stringify(itinerary))
    for (const b of broken) {
        patched[b.dayIdx].activities[b.actIdx][b.field] = b.fallback
        const reason = b.alwaysReplace ? "always-replace" : `HTTP ${(b as any).status}`
        console.log(`[link-sanitizer] ${b.field} ${b.url} → ${reason} → ${b.fallback}`)
    }

    return patched
}
