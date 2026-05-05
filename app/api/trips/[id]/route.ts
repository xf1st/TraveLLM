import { NextResponse } from "next/server"
import { createServiceRoleClient, getServerUser } from "@/lib/server/supabase-server"

export const runtime = "nodejs"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Params = {
  params: Promise<{ id: string }>
}

async function getTripContext(params: Params["params"]) {
  const { id } = await params
  if (!UUID_RE.test(id)) {
    return { id, response: NextResponse.json({ error: "Invalid trip id" }, { status: 400 }) }
  }

  const admin = createServiceRoleClient()
  if (!admin) {
    return { id, response: NextResponse.json({ error: "Database is not configured" }, { status: 500 }) }
  }

  const { user } = await getServerUser()
  return { id, admin, user, response: null }
}

export async function GET(_request: Request, { params }: Params) {
  const context = await getTripContext(params)
  if (context.response) return context.response

  const { id, admin, user } = context
  const { data: trip, error } = await admin!
    .from("trips")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("[api/trips/:id] load", error.message)
    return NextResponse.json({ error: "Failed to load trip" }, { status: 500 })
  }

  if (!trip) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const isOwner = Boolean(user && trip.user_id === user.id)
  if (!isOwner && !trip.is_public) {
    return NextResponse.json({ error: "Unauthorized" }, { status: user ? 403 : 401 })
  }

  let isFavorite = false
  if (user) {
    const { data: favorite } = await admin!
      .from("favorites")
      .select("trip_id")
      .eq("trip_id", id)
      .eq("user_id", user.id)
      .maybeSingle()
    isFavorite = Boolean(favorite)
  }

  return NextResponse.json({
    trip,
    user: user || null,
    isOwner,
    isFavorite,
  })
}

export async function PATCH(request: Request, { params }: Params) {
  const context = await getTripContext(params)
  if (context.response) return context.response

  const { id, admin, user } = context
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const patch: Record<string, unknown> = {}

  if (typeof body.is_public === "boolean") patch.is_public = body.is_public
  if ("itinerary" in body) patch.itinerary = body.itinerary

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No allowed fields" }, { status: 400 })
  }

  const { data, error } = await admin!
    .from("trips")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle()

  if (error) {
    console.error("[api/trips/:id] patch", error.message)
    return NextResponse.json({ error: "Failed to update trip" }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: Request, { params }: Params) {
  const context = await getTripContext(params)
  if (context.response) return context.response

  const { id, admin, user } = context
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await admin!
    .from("trips")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle()

  if (error) {
    console.error("[api/trips/:id] delete", error.message)
    return NextResponse.json({ error: "Failed to delete trip" }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
