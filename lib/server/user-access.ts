/**
 * Server-side enforcement of profiles.access_mode / blocked_until.
 * UI guards are not enough — AI and data APIs must call these helpers after auth.
 */

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export type UserAccessState = {
  accessMode: string
  blockedUntil: string | null
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

/** Load access flags; missing profile row → active (onboarding / edge cases). */
export async function fetchUserAccessState(userId: string): Promise<UserAccessState | null> {
  const admin = getAdminClient()
  if (!admin) return null

  const { data, error } = await admin
    .from("profiles")
    .select("access_mode, blocked_until")
    .eq("id", userId)
    .maybeSingle()

  if (error) {
    console.error("[user-access] fetch profile", error)
    return null
  }

  if (!data) {
    return { accessMode: "active", blockedUntil: null }
  }

  return {
    accessMode: typeof data.access_mode === "string" && data.access_mode ? data.access_mode : "active",
    blockedUntil: data.blocked_until ?? null,
  }
}

export function isTemporaryBlockActive(blockedUntil: string | null): boolean {
  if (!blockedUntil) return false
  const t = new Date(blockedUntil)
  return Number.isFinite(t.getTime()) && t > new Date()
}

/**
 * full_blocked or active temporary block → 403.
 */
export function denyIfFullBlocked(state: UserAccessState): NextResponse | null {
  if (isTemporaryBlockActive(state.blockedUntil)) {
    return NextResponse.json(
      { error: "Access temporarily restricted", code: "temporarily_blocked" },
      { status: 403 },
    )
  }
  if (state.accessMode === "full_blocked") {
    return NextResponse.json({ error: "Access denied", code: "full_blocked" }, { status: 403 })
  }
  return null
}

/**
 * full_blocked, temp block, or ai_blocked → 403 (any paid / LLM usage).
 */
export function denyIfAiOrFullBlocked(state: UserAccessState): NextResponse | null {
  const full = denyIfFullBlocked(state)
  if (full) return full
  if (state.accessMode === "ai_blocked") {
    return NextResponse.json(
      { error: "AI features are disabled for this account", code: "ai_blocked" },
      { status: 403 },
    )
  }
  return null
}

export async function enforceFullSiteAccess(userId: string): Promise<NextResponse | null> {
  const state = await fetchUserAccessState(userId)
  if (!state) {
    return NextResponse.json({ error: "Server is not configured" }, { status: 503 })
  }
  return denyIfFullBlocked(state)
}

export async function enforceAiAccess(userId: string): Promise<NextResponse | null> {
  const state = await fetchUserAccessState(userId)
  if (!state) {
    return NextResponse.json({ error: "Server is not configured" }, { status: 503 })
  }
  return denyIfAiOrFullBlocked(state)
}
