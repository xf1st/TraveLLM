/**
 * Shared profile field limits & sanitizers (client + server).
 * Hardens against UI-breaking / spoofing text: fullwidth, zero-width, combining abuse, stored markup.
 */

/** Display name max grapheme clusters (audit: ≤100) */
export const PROFILE_NAME_MAX = 100
export const PROFILE_USERNAME_MAX = 30
export const PROFILE_USERNAME_MIN = 3
/** Bio max grapheme clusters (audit: ≤500) */
export const PROFILE_BIO_MAX = 500
/** Generic short text (legacy / misc) */
export const PROFILE_TEXT_MAX = 255
/** Citizenship / nationality single-line fields */
export const PROFILE_LOCALE_LINE_MAX = 80

/** Zero-width, BOM, bidi overrides, invisible format chars */
const INVISIBLE_CHARS =
  /[\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF\uFFF9-\uFFFB]/g

/** Display name: letters (any script), digits, spaces, hyphen, apostrophe */
const NAME_PATTERN = /^[\p{L}0-9\s\-']+$/u

/** Username: letters, digits, underscore, hyphen */
const USERNAME_VALID = /^[\p{L}0-9_-]+$/u

function getGraphemeSegmenter(): Intl.Segmenter | null {
  try {
    if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
      return new Intl.Segmenter(undefined, { granularity: "grapheme" })
    }
  } catch {
    /* ignore */
  }
  return null
}

export function countGraphemes(s: string): number {
  const seg = getGraphemeSegmenter()
  if (seg) return [...seg.segment(s)].length
  return [...s].length
}

/** Truncate to at most `max` user-perceived grapheme clusters */
export function sliceGraphemesMax(s: string, max: number): string {
  const seg = getGraphemeSegmenter()
  if (seg) {
    let n = 0
    let out = ""
    for (const { segment } of seg.segment(s)) {
      if (n >= max) break
      out += segment
      n++
    }
    return out
  }
  return [...s].slice(0, max).join("")
}

/** NFKC + strip invisible + strip angle brackets + C0/C1 controls */
export function normalizeProfileScalar(raw: string): string {
  let s = raw.normalize("NFKC")
  s = s.replace(INVISIBLE_CHARS, "")
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
  s = s.replace(/[<>]/g, "")
  return s
}

/** Preference / locale one-line string */
export function sanitizePlainPreferenceString(raw: string, maxGraphemes: number): string {
  const s = normalizeProfileScalar(raw).trim()
  return sliceGraphemesMax(s, maxGraphemes)
}

export function sanitizeDisplayName(raw: string): string {
  let s = normalizeProfileScalar(raw)
  s = s.replace(/[^\p{L}0-9\s\-']/gu, "")
  s = s.replace(/\s+/g, " ").trim()
  return sliceGraphemesMax(s, PROFILE_NAME_MAX)
}

export function sanitizeUsernameInput(raw: string): string {
  return raw.replace(/[^\p{L}0-9_-]/gu, "").slice(0, PROFILE_USERNAME_MAX)
}

export function normalizeUsername(raw: string): string {
  return sanitizeUsernameInput(raw.trim()).toLowerCase()
}

export type UsernameValidationError = "empty" | "short" | "long" | "chars"

export function validateUsername(value: string): { ok: true } | { ok: false; error: UsernameValidationError } {
  const s = normalizeUsername(value)
  if (!s) return { ok: true }
  if (s.length < PROFILE_USERNAME_MIN) return { ok: false, error: "short" }
  if (s.length > PROFILE_USERNAME_MAX) return { ok: false, error: "long" }
  if (!USERNAME_VALID.test(s)) return { ok: false, error: "chars" }
  return { ok: true }
}

export function validateDisplayName(value: string): { ok: true } | { ok: false; error: "empty" | "long" | "chars" } {
  const s = sanitizeDisplayName(value)
  if (!s) return { ok: false, error: "empty" }
  if (countGraphemes(s) > PROFILE_NAME_MAX) return { ok: false, error: "long" }
  if (!NAME_PATTERN.test(s)) return { ok: false, error: "chars" }
  return { ok: true }
}

/** Bio: allow normal punctuation; no HTML-ish brackets; cap graphemes and newlines */
export function sanitizeBioText(raw: string, maxGraphemes: number = PROFILE_BIO_MAX): string {
  let s = normalizeProfileScalar(raw).trim()
  const lines = s.split(/\n/)
  if (lines.length > 40) s = lines.slice(0, 40).join("\n")
  return sliceGraphemesMax(s, maxGraphemes)
}

/** Legacy helper — prefer sanitizeBioText for bio; this stays for short generic fields */
export function sanitizeLongText(raw: string, max: number = PROFILE_TEXT_MAX): string {
  const s = normalizeProfileScalar(raw).trim()
  return sliceGraphemesMax(s, Math.min(max, PROFILE_BIO_MAX))
}

export function sanitizeCitizenshipNationality(raw: string): string {
  return sanitizePlainPreferenceString(raw, PROFILE_LOCALE_LINE_MAX)
}

/** Fixed language tags stored in profiles.languages */
export const PROFILE_LANGUAGE_IDS = ["ru", "en", "learning_local", "other"] as const
export type ProfileLanguageId = (typeof PROFILE_LANGUAGE_IDS)[number]

/** Must match INTEREST_CONFIG / i18n profile.interests.* */
export const PROFILE_INTEREST_IDS = [
  "nature",
  "history",
  "local",
  "photo",
  "tech",
  "nightlife",
  "shopping",
  "spiritual",
  "food",
  "museums",
] as const
export type ProfileInterestId = (typeof PROFILE_INTEREST_IDS)[number]

const LEGACY_LANG_MAP: Record<string, ProfileLanguageId> = {
  русский: "ru",
  russian: "ru",
  ру: "ru",
  английский: "en",
  english: "en",
  англ: "en",
  gb: "en",
  "учу местный": "learning_local",
  местный: "learning_local",
  learning_local: "learning_local",
  другие: "other",
  other: "other",
}

/** Map legacy free-text tags to fixed ids; drop unknown */
export function migrateLanguageList(raw: unknown): ProfileLanguageId[] {
  if (!Array.isArray(raw)) return []
  const out: ProfileLanguageId[] = []
  for (const item of raw) {
    const s = String(item || "")
      .trim()
      .toLowerCase()
    if (!s) continue
    if ((PROFILE_LANGUAGE_IDS as readonly string[]).includes(s)) {
      const id = s as ProfileLanguageId
      if (!out.includes(id)) out.push(id)
      continue
    }
    const mapped = LEGACY_LANG_MAP[s]
    if (mapped && !out.includes(mapped)) out.push(mapped)
  }
  return out
}

export function filterInterestList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const allowed = new Set(PROFILE_INTEREST_IDS as readonly string[])
  const out: string[] = []
  for (const item of raw) {
    const k = String(item || "")
      .trim()
      .toLowerCase()
    if (allowed.has(k) && !out.includes(k)) out.push(k)
  }
  return out
}

const AGE_MIN = 10
const AGE_MAX = 120

export function parseProfileAge(raw: string): number | null {
  const n = parseInt(raw, 10)
  if (Number.isNaN(n)) return null
  if (n < AGE_MIN || n > AGE_MAX) return null
  return n
}
