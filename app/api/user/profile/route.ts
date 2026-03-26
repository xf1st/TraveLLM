import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { normalizePartnerPromo } from "@/lib/partner-promo-client"
import { UserProfilePatchSchema, applyUserProfilePatch } from "@/lib/server/user-profile-patch"

export const runtime = "nodejs"

/**
 * Self-service profile updates (name, username, prefs, avatar URL, etc.).
 * Uses the user session + service role with a strict field allowlist — do not PATCH profiles from the browser.
 */
export async function PATCH(request: Request) {
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

    const rl = checkRateLimit(user.id, "user-profile-patch", 24)
    if (!rl.allowed) return rateLimitResponse(rl)

    let json: unknown
    try {
      json = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = UserProfilePatchSchema.safeParse(json)
    if (!parsed.success) {
      console.warn("[user/profile] schema reject", parsed.error.flatten())
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Onboarding / edge cases: row may not exist yet (no upsert from client).
    const { data: rowExists } = await admin.from("profiles").select("id").eq("id", user.id).maybeSingle()
    if (!rowExists) {
      const meta = user.user_metadata as Record<string, unknown> | undefined
      const promoRaw = meta?.partner_promo_code
      const partnerPromo =
        typeof promoRaw === "string" ? normalizePartnerPromo(promoRaw) : null
      const { error: insErr } = await admin.from("profiles").insert({
        id: user.id,
        email: user.email ?? null,
        full_name: (typeof meta?.full_name === "string" ? meta.full_name : null) ?? null,
        ...(partnerPromo ? { partner_promo_code: partnerPromo } : {}),
      })
      if (insErr && insErr.code !== "23505") {
        console.error("[user/profile] insert profile", insErr)
        return NextResponse.json({ error: "Could not create profile" }, { status: 500 })
      }
    }

    const result = await applyUserProfilePatch(admin, user.id, parsed.data)
    if (!result.ok) {
      return NextResponse.json({ error: result.error, code: result.code }, { status: result.status })
    }

    return NextResponse.json({ ok: true, profile: result.row })
  } catch (e: unknown) {
    console.error("[user/profile PATCH]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
