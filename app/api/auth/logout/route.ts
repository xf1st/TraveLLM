import { NextResponse } from "next/server"
import { createCookieAuthClient } from "@/lib/server/supabase-server"

export const runtime = "nodejs"

export async function POST() {
  const authClient = await createCookieAuthClient()
  if (!authClient) {
    return NextResponse.json({ ok: true })
  }

  await authClient.auth.signOut()
  return NextResponse.json({ ok: true })
}
