import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/server/supabase-server"
import { getAiConnection } from "@/lib/server/ai-connection"
import { invalidateProxySettingsCache } from "@/lib/proxy-config"
import { getRequestUserId } from "@/lib/ai-usage-events"

export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied
  const client = createServiceRoleClient()
  if (!client) return NextResponse.json({ error: "Настройки сервера недоступны." }, { status: 503 })
  const { data, error } = await client.from("app_settings").select("id,proxy_disabled").single()
  if (error || !data) return NextResponse.json({ error: "Не удалось загрузить настройку соединения." }, { status: 503 })
  try {
    const connection = await getAiConnection("configured", true)
    return NextResponse.json({
      selection: data.proxy_disabled ? "direct" : "environment",
      connection: connection.status,
      runtime: process.env.NODE_ENV === "production" ? "production" : "development",
    }, { headers: { "Cache-Control": "private, no-store" } })
  } catch {
    return NextResponse.json({ error: "Некорректная настройка прокси в переменных сервера." }, { status: 503 })
  }
}

export async function PATCH(req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied
  const body = await req.json().catch(() => null)
  if (body?.selection !== "direct" && body?.selection !== "environment") {
    return NextResponse.json({ error: "Выберите способ соединения." }, { status: 400 })
  }
  const client = createServiceRoleClient()
  if (!client) return NextResponse.json({ error: "Настройки сервера недоступны." }, { status: 503 })
  const { data: current, error: readError } = await client.from("app_settings").select("id").single()
  if (readError || !current) return NextResponse.json({ error: "Не удалось загрузить настройки." }, { status: 503 })
  const { error } = await client.from("app_settings").update({ proxy_disabled: body.selection === "direct" }).eq("id", current.id)
  if (error) return NextResponse.json({ error: "Не удалось сохранить способ соединения." }, { status: 503 })
  invalidateProxySettingsCache()
  const userId = await getRequestUserId()
  if (userId) await client.from("admin_audit_log").insert({ admin_user_id: userId, action: "network.update", payload: { selection: body.selection } })
  return NextResponse.json({ ok: true, selection: body.selection })
}
