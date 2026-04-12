import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { getRequestUserId } from "@/lib/ai-usage-events"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function makeClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: { get: (name) => cookieStore.get(name)?.value, set: () => {}, remove: () => {} },
  })
}

async function getLikesCount(supabase: ReturnType<typeof makeClient>, reelId: string) {
  const { count } = await supabase
    .from("reel_likes")
    .select("*", { count: "exact", head: true })
    .eq("reel_id", reelId)
  return count ?? 0
}

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const userId = await getRequestUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await context.params
  if (!UUID_REGEX.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

  const cookieStore = await cookies()
  const supabase = makeClient(cookieStore)

  const { error } = await supabase
    .from("reel_likes")
    .insert({ reel_id: id, user_id: userId })

  // Ignore duplicate (already liked)
  if (error && error.code !== "23505") {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const likes_count = await getLikesCount(supabase, id)
  return NextResponse.json({ likes_count, is_liked: true })
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const userId = await getRequestUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await context.params
  if (!UUID_REGEX.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

  const cookieStore = await cookies()
  const supabase = makeClient(cookieStore)

  const { error } = await supabase
    .from("reel_likes")
    .delete()
    .eq("reel_id", id)
    .eq("user_id", userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const likes_count = await getLikesCount(supabase, id)
  return NextResponse.json({ likes_count, is_liked: false })
}
