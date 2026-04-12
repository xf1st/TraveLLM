import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { getRequestUserId } from "@/lib/ai-usage-events"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_BODY = 500

function makeClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: { get: (name) => cookieStore.get(name)?.value, set: () => {}, remove: () => {} },
  })
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const userId = await getRequestUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await context.params
  if (!UUID_REGEX.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "30", 10)))
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10))

  const cookieStore = await cookies()
  const supabase = makeClient(cookieStore)

  const { data, error } = await supabase
    .from("reel_comments")
    .select(`
      id, body, created_at,
      profiles:user_id ( username, full_name, avatar_url )
    `)
    .eq("reel_id", id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ comments: data ?? [] })
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const userId = await getRequestUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await context.params
  if (!UUID_REGEX.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

  let body: string
  try {
    const json = await req.json()
    body = typeof json?.body === "string" ? json.body.trim() : ""
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body || body.length > MAX_BODY) {
    return NextResponse.json({ error: "Comment must be 1–500 characters" }, { status: 422 })
  }

  const cookieStore = await cookies()
  const supabase = makeClient(cookieStore)

  const { data: inserted, error: insertErr } = await supabase
    .from("reel_comments")
    .insert({ reel_id: id, user_id: userId, body })
    .select("id, body, created_at")
    .single()

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  // Fetch profile for the response
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, full_name, avatar_url")
    .eq("id", userId)
    .single()

  return NextResponse.json({
    comment: { ...inserted, profiles: profile ?? null },
  }, { status: 201 })
}
