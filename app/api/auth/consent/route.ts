import { NextResponse } from "next/server"
import { createCookieAuthClient } from "@/lib/server/supabase-server"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const authClient = await createCookieAuthClient()
  if (!authClient) {
    return NextResponse.json({ error: "Auth is not configured" }, { status: 500 })
  }

  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const version = typeof body.version === "string" ? body.version : null
  const acceptedAt = typeof body.acceptedAt === "string" ? body.acceptedAt : new Date().toISOString()
  const source = typeof body.source === "string" ? body.source : "auth"

  const { error } = await authClient.auth.updateUser({
    data: {
      personal_data_consent_version: version,
      personal_data_consent_at: acceptedAt,
      personal_data_consent_source: source,
    },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
