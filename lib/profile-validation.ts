/**
 * Shared profile field limits & sanitizers (client + server).
 */

export const PROFILE_NAME_MAX = 30
export const PROFILE_USERNAME_MAX = 30
export const PROFILE_USERNAME_MIN = 3
export const PROFILE_TEXT_MAX = 255

/** Display name: letters (any script), digits, spaces, hyphen, apostrophe */
const NAME_PATTERN = /^[\p{L}0-9\s\-']+$/u

/** Username: letters, digits, underscore, hyphen */
const USERNAME_VALID = /^[\p{L}0-9_-]+$/u

/** Strip disallowed chars and cap length */
export function sanitizeDisplayName(raw: string): string {
  return raw
    .replace(/[^\p{L}0-9\s\-']/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, PROFILE_NAME_MAX)
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
  if (s.length > PROFILE_NAME_MAX) return { ok: false, error: "long" }
  if (!NAME_PATTERN.test(s)) return { ok: false, error: "chars" }
  return { ok: true }
}

export function sanitizeLongText(raw: string, max: number = PROFILE_TEXT_MAX): string {
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .slice(0, max)
}

export function sanitizeCitizenshipNationality(raw: string): string {
  return sanitizeLongText(raw.trim(), PROFILE_TEXT_MAX)
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
