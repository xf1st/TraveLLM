/**
 * Server-only: validate & build a safe profiles UPDATE payload (self-service).
 * Used by PATCH /api/user/profile — avoids trusting PostgREST column-level writes from the browser.
 */

import { z } from "zod"
import type { SupabaseClient } from "@supabase/supabase-js"
import {
  PROFILE_BIO_MAX,
  sanitizeDisplayName,
  sanitizeBioText,
  sanitizeCitizenshipNationality,
  sanitizePlainPreferenceString,
  normalizeUsername,
  validateDisplayName,
  validateUsername,
  migrateLanguageList,
  filterInterestList,
  parseProfileAge,
} from "@/lib/profile-validation"

/** Keys we allow inside JSON `preferences` (anything else is dropped). */
const PREFERENCE_KEYS_ALLOWLIST = new Set([
  "gender",
  "age",
  "pace",
  "interestsDetailed",
  "accommodation",
  "profileBackground",
  "autoFavorites",
  "currency",
  "language",
  "defaultTripDuration",
  "travelFrequency",
  "visitedCountries",
  "preferredDestinations",
  "dietaryRestrictions",
  "religion",
  "budgetPreference",
  "travelStyle",
  "transport",
  "companionsCount",
  "citizenship",
  "nationality",
  "skipped",
  "languages",
])

const MAX_PREFERENCES_JSON_BYTES = 48_000

export const UserProfilePatchSchema = z
  .object({
    full_name: z.string().optional(),
    username: z.union([z.string(), z.null()]).optional(),
    bio: z.union([z.string(), z.null()]).optional(),
    citizenship: z.union([z.string(), z.null()]).optional(),
    nationality: z.union([z.string(), z.null()]).optional(),
    languages: z.array(z.string()).optional(),
    preferences: z.record(z.string(), z.unknown()).optional(),
    notifications_enabled: z.boolean().optional(),
    public_profile: z.boolean().optional(),
    avatar_url: z.union([z.string(), z.null()]).optional(),
  })
  .strict()

export type UserProfilePatchInput = z.infer<typeof UserProfilePatchSchema>

/** Max grapheme clusters for string values inside `preferences` JSON */
const PREFERENCE_STRING_MAX: Record<string, number> = {
  gender: 40,
  pace: 40,
  accommodation: 80,
  nationality: 80,
  religion: 80,
  currency: 12,
  language: 24,
  defaultTripDuration: 16,
  travelFrequency: 60,
  companionsCount: 8,
  profileBackground: 48,
  budgetPreference: 80,
  citizenship: 80,
}

function scrubPreferenceStrings(obj: Record<string, unknown>) {
  for (const key of Object.keys(obj)) {
    const v = obj[key]
    if (typeof v !== "string") continue
    const max = PREFERENCE_STRING_MAX[key] ?? 120
    obj[key] = sanitizePlainPreferenceString(v, max)
  }
}

function pickAllowlistedPreferences(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of PREFERENCE_KEYS_ALLOWLIST) {
    if (key in raw) out[key] = raw[key]
  }
  return out
}

function sanitizePreferencesPatch(
  patch: Record<string, unknown>,
  existing: Record<string, unknown> | null
): Record<string, unknown> {
  const base = { ...(existing && typeof existing === "object" ? existing : {}) }
  const picked = pickAllowlistedPreferences(patch)

  // Typed cleanup
  if ("interestsDetailed" in picked) {
    picked.interestsDetailed = filterInterestList(picked.interestsDetailed)
  }
  if ("age" in picked) {
    const a = picked.age
    if (a === null || a === "") {
      picked.age = null
    } else if (typeof a === "number" && Number.isFinite(a)) {
      const n = Math.round(a)
      picked.age = n >= 10 && n <= 120 ? n : base.age
    } else if (typeof a === "string") {
      const n = parseProfileAge(a)
      picked.age = n ?? base.age
    }
  }
  if ("visitedCountries" in picked && picked.visitedCountries !== null) {
    const v = picked.visitedCountries
    if (Array.isArray(v)) {
      picked.visitedCountries = v
        .map((x) => sanitizePlainPreferenceString(String(x || "").trim(), 120))
        .filter(Boolean)
        .slice(0, 200)
    } else if (typeof v === "string") {
      picked.visitedCountries = v
        .split(",")
        .map((s) => sanitizePlainPreferenceString(s.trim(), 120))
        .filter(Boolean)
        .slice(0, 200)
    }
  }
  if ("preferredDestinations" in picked && Array.isArray(picked.preferredDestinations)) {
    picked.preferredDestinations = picked.preferredDestinations
      .map((x) => sanitizePlainPreferenceString(String(x || "").trim(), 200))
      .filter(Boolean)
      .slice(0, 100)
  }
  if ("travelStyle" in picked && Array.isArray(picked.travelStyle)) {
    picked.travelStyle = picked.travelStyle
      .map((x) => sanitizePlainPreferenceString(String(x || "").trim(), 80))
      .filter(Boolean)
      .slice(0, 30)
  }
  if ("transport" in picked && Array.isArray(picked.transport)) {
    picked.transport = picked.transport
      .map((x) => sanitizePlainPreferenceString(String(x || "").trim(), 80))
      .filter(Boolean)
      .slice(0, 30)
  }
  if ("dietaryRestrictions" in picked && Array.isArray(picked.dietaryRestrictions)) {
    picked.dietaryRestrictions = picked.dietaryRestrictions
      .map((x) => sanitizePlainPreferenceString(String(x || "").trim(), 80))
      .filter(Boolean)
      .slice(0, 40)
  }
  if ("languages" in picked && Array.isArray(picked.languages)) {
    picked.languages = picked.languages
      .map((x) => sanitizePlainPreferenceString(String(x || "").trim(), 40))
      .filter(Boolean)
      .slice(0, 20)
  }
  if ("budgetPreference" in picked && picked.budgetPreference !== null && picked.budgetPreference !== undefined) {
    picked.budgetPreference = sanitizePlainPreferenceString(String(picked.budgetPreference).trim(), 80)
  }

  const merged = { ...base, ...picked }
  scrubPreferenceStrings(merged)
  const json = JSON.stringify(merged)
  if (json.length > MAX_PREFERENCES_JSON_BYTES) {
    throw new Error("preferences too large")
  }
  return merged
}

function validateAvatarUrl(url: string | null): string | null {
  if (url === null) return null
  const s = url.trim()
  if (!s) return null
  if (s.length > 2048) throw new Error("avatar_url too long")
  if (!s.startsWith("https://")) throw new Error("avatar_url must be https")
  // Storage public URLs for this app, or Google avatar from OAuth metadata
  const ok =
    /https:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\/avatars\//.test(s) ||
    /^https:\/\/lh3\.googleusercontent\.com\//.test(s) ||
    /^https:\/\/[^/]+\.googleusercontent\.com\//.test(s)
  if (!ok) throw new Error("avatar_url not allowed")
  return s
}

export type ProfilePatchResult =
  | { ok: true; row: Record<string, unknown> }
  | { ok: false; error: string; code?: string; status: number }

export async function applyUserProfilePatch(
  admin: SupabaseClient,
  userId: string,
  body: UserProfilePatchInput
): Promise<ProfilePatchResult> {
  const { data: existing, error: fetchErr } = await admin.from("profiles").select("*").eq("id", userId).single()
  if (fetchErr || !existing) {
    return { ok: false, error: "Profile not found", status: 404 }
  }

  const update: Record<string, unknown> = {}

  if (body.full_name !== undefined) {
    const nameVal = sanitizeDisplayName(body.full_name)
    const check = validateDisplayName(nameVal)
    if (!check.ok) {
      return { ok: false, error: "Invalid full_name", code: check.error, status: 400 }
    }
    update.full_name = nameVal
  }

  if (body.username !== undefined) {
    const uNorm = body.username === null ? "" : normalizeUsername(body.username)
    if (!uNorm) {
      update.username = null
    } else {
      const usernameCheck = validateUsername(uNorm)
      if (!usernameCheck.ok) {
        return { ok: false, error: "Invalid username", code: usernameCheck.error, status: 400 }
      }
      const { data: taken } = await admin.from("profiles").select("id").eq("username", uNorm).neq("id", userId).maybeSingle()
      if (taken) {
        return { ok: false, error: "Username already taken", code: "username_taken", status: 409 }
      }
      update.username = uNorm
    }
  }

  if (body.bio !== undefined) {
    update.bio = body.bio === null ? null : sanitizeBioText(body.bio, PROFILE_BIO_MAX) || null
  }

  if (body.citizenship !== undefined) {
    update.citizenship = body.citizenship === null ? null : sanitizeCitizenshipNationality(body.citizenship) || null
  }
  if (body.nationality !== undefined) {
    update.nationality = body.nationality === null ? null : sanitizeCitizenshipNationality(body.nationality) || null
  }

  if (body.languages !== undefined) {
    update.languages = migrateLanguageList(body.languages)
  }

  if (body.notifications_enabled !== undefined) {
    update.notifications_enabled = body.notifications_enabled
  }

  if (body.public_profile !== undefined) {
    update.public_profile = body.public_profile
  }

  if (body.avatar_url !== undefined) {
    try {
      update.avatar_url = validateAvatarUrl(body.avatar_url === null ? null : String(body.avatar_url))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Invalid avatar_url"
      return { ok: false, error: msg, status: 400 }
    }
  }

  if (body.preferences !== undefined) {
    try {
      const existingPrefs =
        existing.preferences && typeof existing.preferences === "object" && !Array.isArray(existing.preferences)
          ? (existing.preferences as Record<string, unknown>)
          : {}
      update.preferences = sanitizePreferencesPatch(body.preferences, existingPrefs)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Invalid preferences"
      return { ok: false, error: msg, status: 400 }
    }
  }

  if (Object.keys(update).length === 0) {
    return { ok: false, error: "Nothing to update", status: 400 }
  }

  update.updated_at = new Date().toISOString()

  const { data: updated, error: upErr } = await admin.from("profiles").update(update).eq("id", userId).select().single()

  if (upErr) {
    if (upErr.code === "23505") {
      return { ok: false, error: "Username already taken", code: "username_taken", status: 409 }
    }
    return { ok: false, error: "Update failed", status: 500 }
  }

  return { ok: true, row: updated as Record<string, unknown> }
}
