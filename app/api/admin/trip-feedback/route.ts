import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireAdmin, getServiceRoleKey } from "@/lib/admin-auth"

export async function GET() {
  const authErr = await requireAdmin()
  if (authErr) return authErr

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getServiceRoleKey(),
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { data, error } = await supabase
    .from("trip_feedback")
    .select("*")
    .order("updated_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const userIds = [...new Set((data || []).map((r: any) => r.user_id).filter(Boolean))]
  const tripIds = [...new Set((data || []).map((r: any) => r.trip_id).filter(Boolean))]

  const [profilesRes, tripsRes] = await Promise.all([
    userIds.length > 0
      ? supabase.from("profiles").select("id,email,full_name").in("id", userIds)
      : Promise.resolve({ data: [] }),
    tripIds.length > 0
      ? supabase.from("trips").select("id,title").in("id", tripIds)
      : Promise.resolve({ data: [] }),
  ])

  const profilesMap: Record<string, any> = {}
  ;(profilesRes.data || []).forEach((p: any) => { profilesMap[p.id] = p })
  const tripsMap: Record<string, any> = {}
  ;(tripsRes.data || []).forEach((t: any) => { tripsMap[t.id] = t })

  const enriched = (data || []).map((r: any) => ({
    ...r,
    trip_title: tripsMap[r.trip_id]?.title ?? null,
    user_name: profilesMap[r.user_id]?.full_name ?? null,
    user_email: profilesMap[r.user_id]?.email ?? null,
  }))

  return NextResponse.json({ feedback: enriched })
}
