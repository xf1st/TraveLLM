import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin, getServiceRoleKey } from "@/lib/admin-auth"

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  return createClient(url, getServiceRoleKey())
}

export async function GET() {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const supabase = getAdminClient()
    const { data, error } = await supabase
      .from("image_cache")
      .select("*")
      .order("updated_at", { ascending: false })

    if (error) throw error
    return NextResponse.json({ cache: data })
  } catch (error: any) {
    console.error("[Admin Image Cache API] GET Error:", error)
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 })
  }
}

const DeleteBodySchema = z.object({
  query: z.union([
    z.string().min(1),
    z.array(z.string().min(1)).min(1),
  ]),
})

export async function DELETE(req: Request) {
  const authError = await requireAdmin()
  if (authError) return authError

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = DeleteBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { query } = parsed.data

  try {
    const supabase = getAdminClient()

    if (Array.isArray(query)) {
      const results = await Promise.all(
        query.map(q => supabase.from("image_cache").delete().eq("query", q))
      )
      const failed = results.find(r => r.error)
      if (failed) throw failed.error
    } else {
      const { error } = await supabase.from("image_cache").delete().eq("query", query)
      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[Admin Image Cache API] DELETE Error:", error)
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 })
  }
}
