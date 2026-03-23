import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { z } from "zod"

const ModerationBodySchema = z.object({
  targetUserId: z.string().uuid(),
  access_mode: z.enum(["active", "ai_blocked", "full_blocked"]).optional(),
  block_reason: z.string().max(2000).nullable().optional(),
  blocked_until: z.string().nullable().optional(),
  gen_limit_override: z.number().int().min(0).max(999999999).nullable().optional(),
  chat_limit_override: z.number().int().min(0).max(999999999).nullable().optional(),
})

/**
 * Block / limits updates with service role.
 * Rules: super_admin targets cannot be modified.
 * admin targets: only super_admin actor can modify.
 */
export async function POST(request: Request) {
  try {
    const raw = await request.json()
    const parsedBody = ModerationBodySchema.safeParse(raw)
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsedBody.error.flatten() },
        { status: 400 },
      )
    }
    const { targetUserId, access_mode, block_reason, blocked_until, gen_limit_override, chat_limit_override } =
      parsedBody.data

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

    if (!actorProfile || (actorProfile.role !== "admin" && actorProfile.role !== "super_admin")) {
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

    if (targetProfile.role === "admin" && actorProfile.role !== "super_admin") {
      return NextResponse.json({ error: "Only super admin can modify other admins" }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {}
    if (access_mode !== undefined) {
      updateData.access_mode = access_mode
      updateData.block_reason = block_reason ?? null
      updateData.blocked_until = blocked_until ? new Date(blocked_until).toISOString() : null
    }
    if (gen_limit_override !== undefined) {
      updateData.gen_limit_override = gen_limit_override
    }
    if (chat_limit_override !== undefined) {
      updateData.chat_limit_override = chat_limit_override
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const { error: upErr } = await adminClient.from("profiles").update(updateData).eq("id", targetUserId)
    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 })
    }

    const actionTag =
      access_mode !== undefined
        ? `user.${access_mode}`
        : gen_limit_override !== undefined || chat_limit_override !== undefined
          ? "user.limits_update"
          : "user.update"

    await adminClient.from("admin_audit_log").insert({
      admin_user_id: user.id,
      action: actionTag,
      target_user_id: targetUserId,
      payload: updateData,
    })

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
