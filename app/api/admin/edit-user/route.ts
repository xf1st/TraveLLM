import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { z } from "zod"

const EditUserSchema = z.object({
  targetUserId: z.string().uuid(),
  action: z.enum([
    "update_profile",   // full_name, username, bio
    "update_email",     // email via auth.admin
    "update_role",      // role
    "update_limits",    // gen_limit_override, chat_limit_override
    "reset_password",   // sends reset email
    "delete_user",      // hard delete
  ]),
  // update_profile
  full_name: z.string().max(100).optional(),
  username: z.string().max(30).optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  // update_email
  email: z.string().email().max(254).optional(),
  // update_role
  role: z.enum(["user", "admin"]).optional(),
  // update_limits
  gen_limit_override: z.number().int().min(0).max(999999999).optional().nullable(),
  chat_limit_override: z.number().int().min(0).max(999999999).optional().nullable(),
})

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return NextResponse.json({ error: "Server not configured" }, { status: 503 })
    }

    // Auth check — super_admin only
    const cookieStore = await cookies()
    const authClient = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    })
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: actorProfile } = await authClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (actorProfile?.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden: super_admin only" }, { status: 403 })
    }

    // Validate body
    const raw = await request.json()
    const parsed = EditUserSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 })
    }

    const body = parsed.data
    const { targetUserId, action } = body

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Fetch target to check they exist and aren't super_admin
    const { data: target, error: targetErr } = await adminClient
      .from("profiles")
      .select("id, role, email")
      .eq("id", targetUserId)
      .single()

    if (targetErr || !target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (target.role === "super_admin") {
      return NextResponse.json({ error: "Cannot edit super_admin" }, { status: 403 })
    }

    // --- Actions ---

    if (action === "update_profile") {
      const updateData: Record<string, unknown> = {}
      if (body.full_name !== undefined) updateData.full_name = body.full_name
      if (body.username !== undefined) updateData.username = body.username
      if (body.bio !== undefined) updateData.bio = body.bio

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
      }

      // Check username uniqueness if changing
      if (body.username) {
        const { data: existing } = await adminClient
          .from("profiles")
          .select("id")
          .eq("username", body.username)
          .neq("id", targetUserId)
          .maybeSingle()
        if (existing) {
          return NextResponse.json({ error: "Username already taken" }, { status: 409 })
        }
      }

      const { error } = await adminClient
        .from("profiles")
        .update(updateData)
        .eq("id", targetUserId)
      if (error) {
        console.error("[admin-edit-user] update_profile error:", error)
        return NextResponse.json({ error: "Database error" }, { status: 500 })
      }
    }

    else if (action === "update_email") {
      if (!body.email) {
        return NextResponse.json({ error: "email required" }, { status: 400 })
      }
      // Check email uniqueness
      const { data: existing } = await adminClient
        .from("profiles")
        .select("id")
        .eq("email", body.email)
        .neq("id", targetUserId)
        .maybeSingle()
      if (existing) {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 })
      }

      const { error } = await adminClient.auth.admin.updateUserById(targetUserId, {
        email: body.email,
      })
      if (error) {
        console.error("[admin-edit-user] update_email error:", error)
        return NextResponse.json({ error: "Failed to update email" }, { status: 500 })
      }

      // Also sync profiles table
      await adminClient
        .from("profiles")
        .update({ email: body.email })
        .eq("id", targetUserId)
    }

    else if (action === "update_role") {
      if (!body.role) {
        return NextResponse.json({ error: "role required" }, { status: 400 })
      }
      const { error } = await adminClient
        .from("profiles")
        .update({ role: body.role })
        .eq("id", targetUserId)
      if (error) {
        console.error("[admin-edit-user] update_role error:", error)
        return NextResponse.json({ error: "Database error" }, { status: 500 })
      }
    }

    else if (action === "update_limits") {
      const updateData: Record<string, unknown> = {}
      if (body.gen_limit_override !== undefined) updateData.gen_limit_override = body.gen_limit_override
      if (body.chat_limit_override !== undefined) updateData.chat_limit_override = body.chat_limit_override
      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
      }
      const { error } = await adminClient
        .from("profiles")
        .update(updateData)
        .eq("id", targetUserId)
      if (error) {
        console.error("[admin-edit-user] update_limits error:", error)
        return NextResponse.json({ error: "Database error" }, { status: 500 })
      }
    }

    else if (action === "reset_password") {
      const { error } = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email: target.email as string,
      })
      if (error) {
        console.error("[admin-edit-user] reset_password error:", error)
        return NextResponse.json({ error: "Failed to generate reset link" }, { status: 500 })
      }
    }

    else if (action === "delete_user") {
      // Write audit BEFORE delete (FK will become NULL after deletion)
      const { targetUserId: _tid, ...auditPayload } = body
      await adminClient.from("admin_audit_log").insert({
        admin_user_id: user.id,
        action: "user.delete_user",
        target_user_id: targetUserId,
        payload: { ...auditPayload, _deleted_email: target.email ?? null },
      }).then(() => {}, (err) => console.error("[audit] failed to write delete_user log:", err))

      const { error } = await adminClient.auth.admin.deleteUser(targetUserId)
      if (error) {
        console.error("[admin-edit-user] deleteUser error:", error)
        return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
      }
      return NextResponse.json({ ok: true })
    }

    // Audit log (body уже содержит action — не дублируем ключ в payload)
    const { targetUserId: _tid, ...auditPayload } = body
    await adminClient.from("admin_audit_log").insert({
      admin_user_id: user.id,
      action: `user.${action}`,
      target_user_id: targetUserId,
      payload: auditPayload,
    }).then(() => {}, (err) => console.error("[audit] failed to write log:", err))

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error("[admin-edit-user] unhandled error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
