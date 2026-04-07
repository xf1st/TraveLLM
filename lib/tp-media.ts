/**
 * Travelpayouts — обёртка глубоких ссылок на партнёров (редирект с marker / p / u / tr_id).
 * По умолчанию: emrld.ltd/re (как в кабинете). Переопределение: NEXT_PUBLIC_TP_AFFILIATE_REDIRECT_URL.
 *
 * ID программ `p` — в кабинете Travelpayouts → программа → инструменты / ссылки.
 */

import type { BookingMarket } from "./booking-market"

function getAffiliateRedirectBase(): string {
  const raw = (process.env.NEXT_PUBLIC_TP_AFFILIATE_REDIRECT_URL || "https://emrld.ltd/re").trim()
  return raw.replace(/\/+$/, "")
}

const TP_MEDIA_BASE = getAffiliateRedirectBase()

const MARKER = process.env.NEXT_PUBLIC_TRAVELPAYOUTS_MARKER || ""

export type TpProgramKey =
  | "yandexTravel"
  | "ostrovok"
  | "tripster"
  | "sputnik8"
  | "kiwitaxi"
  | "sutochno"

const PROGRAM_ENV: Record<TpProgramKey, string | undefined> = {
  yandexTravel: process.env.NEXT_PUBLIC_TP_P_YANDEX_TRAVEL,
  ostrovok: process.env.NEXT_PUBLIC_TP_P_OSTROVOK,
  tripster: process.env.NEXT_PUBLIC_TP_P_TRIPSTER,
  sputnik8: process.env.NEXT_PUBLIC_TP_P_SPUTNIK8 || "1173",
  kiwitaxi: process.env.NEXT_PUBLIC_TP_P_KIWITAXI,
  sutochno: process.env.NEXT_PUBLIC_TP_P_SUTOCHNO,
}

export function getTpProgramId(key: TpProgramKey): string {
  return (PROGRAM_ENV[key] || "").trim()
}

export function getTpTrId(): string {
  return (process.env.NEXT_PUBLIC_TP_TR_ID || "TRAVELLM").trim()
}

/**
 * Оборачивает целевой URL партнёра в affiliate-редирект (если заданы маркер и p).
 * Иначе возвращает targetUrl без изменений.
 */
export function buildTpMediaDeepLink(
  programId: string,
  targetUrl: string,
  options?: { subMarker?: string; trId?: string }
): string {
  if (!targetUrl.startsWith("http")) return targetUrl
  if (!MARKER || !programId) return targetUrl
  const marker = options?.subMarker ? `${MARKER}.${options.subMarker}` : MARKER
  const trId = options?.trId ?? getTpTrId()
  const u = encodeURIComponent(targetUrl)
  return `${TP_MEDIA_BASE}?marker=${encodeURIComponent(marker)}&p=${encodeURIComponent(programId)}&u=${u}&tr_id=${encodeURIComponent(trId)}`
}

/**
 * Если модель подставила шаблон вместо реального tp.media (p=ID_ПРОГРАММЫ, u=ENCODEURIComponent(...)),
 * извлекаем целевой https из параметра u, чтобы пользователь всё равно попал на отель/партнёра.
 * Поддерживаются tp.media, emrld.ltd и другие редиректы Travelpayouts с параметром u.
 */
export function unwrapTravelpayoutsDeepLink(url: string): string {
    if (!url || !url.startsWith("http")) return url
    try {
        const parsed = new URL(url)
        const host = parsed.hostname.replace(/^www\./, "")
        const looksLikeTpRedirect =
            host === "tp.media" ||
            host === "emrld.ltd" ||
            host.endsWith("travelpayouts.com")
        if (!looksLikeTpRedirect) return url

        const rawU = parsed.searchParams.get("u")
        if (!rawU) return url

        let inner = decodeURIComponent(rawU)

        const badEncodeLiteral = /^ENCODEURIComponent\s*\(\s*(https?:\/\/[^)]+)\s*\)\s*$/i.exec(inner)
        if (badEncodeLiteral) return badEncodeLiteral[1].trim()

        if (inner.startsWith("http")) return inner

        const anyHttp = inner.match(/https?:\/\/[^\s"'<>)]+/)
        if (anyHttp) return anyHttp[0].replace(/[),;.]+$/, "")
    } catch {
        /* keep original */
    }
    return url
}

/**
 * Known wrong city slugs the LLM tends to generate → correct Yandex Travel city slug.
 * Yandex Travel uses English transliteration, not Russian (`saint-petersburg` not `sankt-peterburg`).
 */
const YANDEX_CITY_SLUG_FIX: Record<string, string> = {
  "sankt-peterburg": "saint-petersburg",
  "sankth-peterburg": "saint-petersburg",
  "sankt-petersburg": "saint-petersburg",
  "st-petersburg": "saint-petersburg",
  "st-peterburg": "saint-petersburg",
  "spb": "saint-petersburg",
  "moskva": "moscow",
  "nizhny-novgorod": "nizhniy-novgorod",
  "nizhni-novgorod": "nizhniy-novgorod",
  "vladivostok-city": "vladivostok",
  "novosibirsk-city": "novosibirsk",
  "yekaterinburg": "ekaterinburg",
  "ekaterinburg-city": "ekaterinburg",
}

/**
 * Fix common LLM mistakes in Yandex Travel hotel URLs:
 * 1. /hotels/{city}/hotel/{slug}/ → /hotels/{city}/{slug}/
 * 2. underscores in slug → hyphens
 * 3. wrong city slug (e.g. sankt-peterburg → saint-petersburg)
 */
export function sanitizeYandexTravelUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase()
    if (host !== "travel.yandex.ru") return url

    // Remove spurious /hotel/ segment: /hotels/{city}/hotel/{slug} → /hotels/{city}/{slug}
    parsed.pathname = parsed.pathname.replace(
      /^(\/hotels\/[^/]+)\/hotel\//,
      "$1/"
    )

    const parts = parsed.pathname.split("/").filter(Boolean)
    if (parts.length >= 2 && parts[0] === "hotels") {
      // Normalize city slug (part[1])
      const cityRaw = parts[1].replace(/_/g, "-").toLowerCase()
      parts[1] = YANDEX_CITY_SLUG_FIX[cityRaw] ?? cityRaw

      // Replace underscores with hyphens in hotel slug (parts[2] if present)
      if (parts.length >= 3) {
        parts[2] = parts[2].replace(/_/g, "-")
      }

      parsed.pathname = "/" + parts.join("/") + "/"
    }

    return parsed.toString()
  } catch {
    return url
  }
}

function ostrovokDdMmYyyyToIso(s: string): string {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s)
  if (!m) return s
  return `${m[3]}-${m[2]}-${m[1]}`
}

/**
 * `/hotel/search/` on ostrovok.ru returns 404 — rewrite to homepage deep link.
 * (Same shape as `buildOstrovokRuHomeSearchUrl` in travelpayouts; kept here to avoid import cycle.)
 */
function rewriteOstrovokRuToHomeSearch(parsed: URL): string {
  const q = parsed.searchParams.get("q")?.trim()
  const destParam = parsed.searchParams.get("destination")?.trim()
  const destination = (destParam || (q ? decodeURIComponent(q.replace(/\+/g, " ")) : "")).trim()
  if (!destination) return parsed.toString()

  const sp = new URLSearchParams()
  sp.set("destination", destination)
  let ci = parsed.searchParams.get("checkin") || undefined
  let co = parsed.searchParams.get("checkout") || undefined
  if (ci && /^\d{2}\.\d{2}\.\d{4}$/.test(ci)) ci = ostrovokDdMmYyyyToIso(ci)
  if (co && /^\d{2}\.\d{2}\.\d{4}$/.test(co)) co = ostrovokDdMmYyyyToIso(co)
  if (ci) sp.set("checkin", ci)
  if (co) sp.set("checkout", co)
  const guestsRaw = parsed.searchParams.get("guests") || parsed.searchParams.get("adults")
  const adults = guestsRaw ? Math.min(30, Math.max(1, parseInt(guestsRaw, 10) || 2)) : 2
  sp.set("adults", String(adults))
  const markerFromUrl = parsed.searchParams.get("marker")
  if (markerFromUrl) sp.set("marker", markerFromUrl)
  else if (MARKER) sp.set("marker", MARKER)
  return `https://ostrovok.ru/?${sp.toString()}`
}

/**
 * Fix common LLM mistakes in Ostrovok hotel URLs:
 * 1. Replace underscores with hyphens in slug
 * 2. Legacy `/hotel/search/` → working `/?destination=…&checkin=…`
 * 3. Homepage with `q=` but no `destination` → normalize
 */
export function sanitizeOstrovokUrl(url: string): string {
  try {
    let u = url.trim().replace(/['";]+$/, "")
    const parsed = new URL(u)
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase()
    if (host !== "ostrovok.ru") return url

    // Replace underscores with hyphens in the entire path for Ostrovok
    parsed.pathname = parsed.pathname.replace(/_/g, "-")

    const path = parsed.pathname.replace(/\/$/, "") || "/"
    if (path === "/hotel/search" || path.startsWith("/hotel/search/")) {
      return rewriteOstrovokRuToHomeSearch(parsed)
    }
    if (path === "/" && parsed.searchParams.get("q")?.trim() && !parsed.searchParams.get("destination")?.trim()) {
      return rewriteOstrovokRuToHomeSearch(parsed)
    }

    return parsed.toString()
  } catch {
    return url
  }
}

const PARTNER_HOST_TO_PROGRAM: Array<{ test: (h: string) => boolean; key: TpProgramKey }> = [
  { test: (h) => h === "travel.yandex.ru" || h.endsWith(".travel.yandex.ru"), key: "yandexTravel" },
  { test: (h) => h.endsWith("ostrovok.ru"), key: "ostrovok" },
  { test: (h) => h.endsWith("sutochno.ru"), key: "sutochno" },
  { test: (h) => h.endsWith("tripster.ru") || h === "experience.tripster.ru", key: "tripster" },
  { test: (h) => h.includes("sputnik8.com"), key: "sputnik8" },
  { test: (h) => h.endsWith("kiwitaxi.ru"), key: "kiwitaxi" },
]

/**
 * Returns true when Travelpayouts Drive script is configured.
 * Drive auto-wraps partner links on the page — manual emrld.ltd wrapping
 * would cause a double-redirect and broken links.
 */
export function isDriveEnabled(): boolean {
  return !!process.env.NEXT_PUBLIC_TRAVELPAYOUTS_DRIVE_SCRIPT_URL?.trim()
}

/**
 * Sanitize partner URL + optionally wrap in emrld.ltd/re.
 *
 * When Drive is enabled → only sanitize (fix LLM mistakes), return plain partner URL.
 * When Drive is NOT enabled → sanitize + wrap in affiliate redirect.
 */
export function maybeWrapPartnerAffiliateUrl(
  url: string,
  options?: { subMarker?: string; market?: BookingMarket }
): string {
  if (!url?.startsWith("http")) return url

  // Always unwrap broken LLM emrld redirects first
  url = unwrapTravelpayoutsDeepLink(url)
  // Fix known LLM mistakes (wrong path segments, underscores)
  url = sanitizeYandexTravelUrl(url)
  url = sanitizeOstrovokUrl(url)

  // Drive handles affiliate wrapping automatically — return clean URL.
  // EXCEPTION: legacy Ostrovok /hotel/search/ URLs — Drive could break them;
  // URLs should be normalized to ostrovok.ru/?… first (see sanitizeOstrovokUrl).
  if (isDriveEnabled()) {
    const isOstrovokLegacySearch = /ostrovok\.ru\/hotel\/search/i.test(url)
    if (!isOstrovokLegacySearch) return url
    // Fall through to manual emrld.ltd wrap for rare legacy URLs
  }

  // No Drive — manual affiliate wrap via emrld.ltd/re
  const market = options?.market ?? "ru"
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase()
    if (host === "emrld.ltd" || host === "tp.media" || host.endsWith("travelpayouts.com")) {
      return url
    }
    let key: TpProgramKey | undefined
    for (const row of PARTNER_HOST_TO_PROGRAM) {
      if (row.test(host)) {
        key = row.key
        break
      }
    }
    if (!key) return url
    if (market === "world" && key !== "yandexTravel") return url
    const pid = getTpProgramId(key)
    if (!pid || !MARKER) return url
    return buildTpMediaDeepLink(pid, url, { subMarker: options?.subMarker })
  } catch {
    return url
  }
}

/** Для подсказок в промпте: какие p заданы в .env */
export function getTpProgramIdsForPrompt(): Record<TpProgramKey, string> {
  return {
    yandexTravel: getTpProgramId("yandexTravel"),
    ostrovok: getTpProgramId("ostrovok"),
    tripster: getTpProgramId("tripster"),
    sputnik8: getTpProgramId("sputnik8"),
    kiwitaxi: getTpProgramId("kiwitaxi"),
    sutochno: getTpProgramId("sutochno"),
  }
}
