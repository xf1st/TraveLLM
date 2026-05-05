import { NextResponse } from "next/server"
import { createServiceRoleClient, getServerUser } from "@/lib/server/supabase-server"

export const runtime = "nodejs"

const TRIP_LIST_COLUMNS =
  "id,title,destination,cover_image,start_date,end_date,tags,total_cost,budget_range,safety_info,is_public,created_at,updated_at"
const PAGE_SIZE_MAX = 50

function toRange(searchParams: URLSearchParams) {
  const from = Math.max(0, Number(searchParams.get("from") || 0) || 0)
  const limitRaw = Number(searchParams.get("limit") || 12) || 12
  const limit = Math.min(PAGE_SIZE_MAX, Math.max(1, limitRaw))
  return { from, to: from + limit - 1, limit }
}

export async function GET(request: Request) {
  const { user, error } = await getServerUser()
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createServiceRoleClient()
  if (!admin) {
    return NextResponse.json({ error: "Database is not configured" }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const view = searchParams.get("view") === "favorites" ? "favorites" : "my"
  const { from, to } = toRange(searchParams)

  if (view === "favorites") {
    const { data, error: favError } = await admin
      .from("favorites")
      .select(`trip_id, trips(${TRIP_LIST_COLUMNS})`)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (favError) {
      console.error("[api/trips] favorites", favError.message)
      return NextResponse.json({ error: "Failed to load favorites" }, { status: 500 })
    }

    const rows = data || []
    return NextResponse.json({
      trips: rows.map((row: any) => row.trips).filter(Boolean),
      favoriteIds: rows.map((row: any) => row.trip_id),
      total: rows.length,
      hasMore: false,
    })
  }

  const [countRes, tripsRes, favRes] = await Promise.all([
    admin
      .from("trips")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    admin
      .from("trips")
      .select(TRIP_LIST_COLUMNS)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, to),
    admin
      .from("favorites")
      .select("trip_id")
      .eq("user_id", user.id),
  ])

  if (countRes.error || tripsRes.error || favRes.error) {
    console.error("[api/trips] load", countRes.error?.message || tripsRes.error?.message || favRes.error?.message)
    return NextResponse.json({ error: "Failed to load trips" }, { status: 500 })
  }

  const total = countRes.count || 0
  const trips = tripsRes.data || []

  return NextResponse.json({
    trips,
    favoriteIds: (favRes.data || []).map((row: any) => row.trip_id),
    total,
    hasMore: to + 1 < total,
  })
}

export async function DELETE(request: Request) {
  const { user, error } = await getServerUser()
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createServiceRoleClient()
  if (!admin) {
    return NextResponse.json({ error: "Database is not configured" }, { status: 500 })
  }

  const body = await request.json().catch(() => ({}))
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((id: unknown) => typeof id === "string" && id.length <= 80)
    : []

  if (ids.length === 0) {
    return NextResponse.json({ error: "No trip ids" }, { status: 400 })
  }

  const { error: deleteError } = await admin
    .from("trips")
    .delete()
    .eq("user_id", user.id)
    .in("id", ids)

  if (deleteError) {
    console.error("[api/trips] delete", deleteError.message)
    return NextResponse.json({ error: "Failed to delete trips" }, { status: 500 })
  }

  return NextResponse.json({ ok: true, deleted: ids.length })
}
