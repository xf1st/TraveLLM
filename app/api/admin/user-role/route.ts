import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Role changes: only super_admin. Cannot modify another super_admin.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { targetUserId, action } = body as { targetUserId?: string; action?: "demote_admin" | "promote_admin" }

    if (!targetUserId || !action) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 })
    }

    const cookieStore = await cookies()
    const authClient = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    })
    const {
      data: { user },
    } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: actorProfile } = await authClient.from("profiles").select("role").eq("id", user.id).single()

    if (!actorProfile || actorProfile.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: targetProfile, error: targetErr } = await adminClient
      .from("profiles")
      .select("id, role")
      .eq("id", targetUserId)
      .single()

    if (targetErr || !targetProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (targetProfile.role === "super_admin") {
      return NextResponse.json({ error: "Cannot modify super admin" }, { status: 403 })
    }

    if (action === "demote_admin") {
      if (targetProfile.role !== "admin") {
        return NextResponse.json({ error: "Target is not an admin" }, { status: 400 })
      }
      const { error } = await adminClient.from("profiles").update({ role: "user" }).eq("id", targetUserId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else if (action === "promote_admin") {
      const { error } = await adminClient.from("profiles").update({ role: "admin" }).eq("id", targetUserId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    await adminClient.from("admin_audit_log").insert({
      admin_user_id: user.id,
      action: `admin.role.${action}`,
      target_user_id: targetUserId,
      payload: { action },
    })

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
