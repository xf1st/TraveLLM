/**
 * Travelpayouts tp.media — обёртка глубоких ссылок на партнёров.
 * Формат: https://tp.media/r?marker=...&p=PROGRAM_ID&u=ENCODED_TARGET&tr_id=...
 *
 * ID программ `p` смотри в кабинете Travelpayouts → программа → инструменты / ссылки.
 */

const TP_MEDIA_BASE = "https://tp.media/r"

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
 * Оборачивает целевой URL партнёра в tp.media (если заданы маркер и p).
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
