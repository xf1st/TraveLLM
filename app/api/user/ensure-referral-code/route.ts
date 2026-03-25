import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

function normCode(v: unknown): string {
  if (v == null) return ""
  const s = String(v).trim()
  return s.length >= 4 ? s.toUpperCase() : ""
}

/**
 * Ensures the current user has a profiles.referral_code (DB trigger fills it on INSERT/UPDATE when empty).
 */
export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return NextResponse.json({ error: "Server not configured" }, { status: 503 })
    }

    const cookieStore = await cookies()
    const authClient = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set() {},
        remove() {},
      },
    })

    const {
      data: { user },
      error: authErr,
    } = await authClient.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    let { data: row, error: selErr } = await admin
      .from("profiles")
      .select("referral_code")
      .eq("id", user.id)
      .maybeSingle()

    if (selErr) {
      console.error("[ensure-referral-code] select", selErr)
      return NextResponse.json({ error: selErr.message }, { status: 500 })
    }

    if (!row) {
      const { error: insErr } = await admin.from("profiles").insert({
        id: user.id,
        email: user.email ?? null,
      })
      if (insErr && insErr.code !== "23505") {
        console.error("[ensure-referral-code] insert", insErr)
        return NextResponse.json({ error: "Could not create profile" }, { status: 500 })
      }
      const sel = await admin.from("profiles").select("referral_code").eq("id", user.id).single()
      if (sel.error || !sel.data) {
        return NextResponse.json({ error: "Profile not found after insert" }, { status: 500 })
      }
      row = sel.data
    }

    let code = normCode(row?.referral_code)
    if (code) {
      return NextResponse.json({ ok: true, referral_code: code })
    }

    const { error: upErr } = await admin
      .from("profiles")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", user.id)

    if (upErr) {
      console.error("[ensure-referral-code] update", upErr)
      return NextResponse.json({ error: upErr.message }, { status: 500 })
    }

    const { data: after, error: againErr } = await admin
      .from("profiles")
      .select("referral_code")
      .eq("id", user.id)
      .single()

    if (againErr || !after) {
      return NextResponse.json(
        {
          error: "referral_code_missing",
          hint: "Apply migration 20250325130000_referral_program.sql (trigger profiles_ensure_referral_code)",
        },
        { status: 500 },
      )
    }

    code = normCode(after.referral_code)
    if (!code) {
      return NextResponse.json(
        {
          error: "referral_code_missing",
          hint: "DB trigger profiles_ensure_referral_code may be missing or disabled",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ ok: true, referral_code: code })
  } catch (e: unknown) {
    console.error("[ensure-referral-code]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
