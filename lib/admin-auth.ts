/**
 * Shared helper for verifying admin role in API routes.
 * Usage:
 *   const authError = await requireAdmin()
 *   if (authError) return authError
 */

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function requireAdmin(): Promise<NextResponse | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, access_mode, blocked_until")
    .eq("id", user.id)
    .single()

  if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (profile.access_mode === "full_blocked") {
    return NextResponse.json({ error: "Account suspended" }, { status: 403 })
  }

  if (profile.blocked_until && new Date(profile.blocked_until) > new Date()) {
    return NextResponse.json({ error: "Account temporarily suspended" }, { status: 403 })
  }

  return null // OK
}

/** Throws if SUPABASE_SERVICE_ROLE_KEY is missing — fail loudly, never silently degrade */
export function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set")
  return key
}
