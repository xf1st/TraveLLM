import { NextResponse } from "next/server"
import { createCookieAuthClient } from "@/lib/server/supabase-server"

export const runtime = "nodejs"

export async function GET() {
  const authClient = await createCookieAuthClient()
  if (!authClient) {
    return NextResponse.json({ user: null, error: "Auth is not configured" }, { status: 500 })
  }

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ user: null })
  }

  return NextResponse.json({ user })
}
