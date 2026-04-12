import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { getRequestUserId } from "@/lib/ai-usage-events"

export async function GET(request: Request) {
  const userId = await getRequestUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 })
  }

  const { searchParams } = new URL(request.url)
  const limitRaw = parseInt(searchParams.get("limit") || "50", 10)
  const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, limitRaw)) : 50

  const cookieStore = await cookies()
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: (name) => cookieStore.get(name)?.value,
      set: () => {},
      remove: () => {},
    },
  })

  const { data, error } = await supabase.rpc("get_liked_reels", {
    p_user_id: userId,
    p_limit: limit,
  })

  if (error) {
    console.error("[api/reels/liked]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ reels: data ?? [] })
}
