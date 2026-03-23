import { Wrench } from "lucide-react"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"
export const metadata = { title: "Технические работы — TraveLLM" }

async function getMaintenanceInfo() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data } = await supabase
      .from("app_settings")
      .select("maintenance_message, maintenance_eta")
      .single()
    return data
  } catch {
    return null
  }
}

export default async function MaintenancePage() {
  const info = await getMaintenanceInfo()

  const message =
    info?.maintenance_message ||
    "Мы проводим технические работы. Совсем скоро всё заработает!"

  const eta = info?.maintenance_eta
    ? new Date(info.maintenance_eta).toLocaleString("ru-RU", {
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="rounded-full bg-muted p-6">
            <Wrench className="h-12 w-12 text-muted-foreground animate-pulse" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Технические работы</h1>
          <p className="text-muted-foreground text-lg">{message}</p>
        </div>

        {eta && (
          <div className="rounded-xl border border-border bg-card p-4 text-sm">
            <span className="text-muted-foreground">Ожидаемое время завершения: </span>
            <span className="font-semibold">{eta}</span>
          </div>
        )}

        <p className="text-xs text-muted-foreground">TraveLLM</p>
      </div>
    </div>
  )
}
