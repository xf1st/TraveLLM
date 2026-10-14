"use client"

import { useEffect, useState } from "react"
import { Globe, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { appToast as toast } from "@/components/ui/sonner"

type Selection = "direct" | "environment"
type Status = { selection: Selection; runtime: string; connection: { mode: "direct" | "proxy"; configured: boolean; environmentDisablesProxy: boolean; settingsAvailable: boolean } }
type Check = { provider: "gemini" | "deepseek"; mode: "direct" | "proxy"; ok: boolean; durationMs: number; model: string; message: string }

export function NetworkSettingsCard() {
  const [status, setStatus] = useState<Status | null>(null)
  const [selection, setSelection] = useState<Selection>("environment")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [checking, setChecking] = useState(false)
  const [checks, setChecks] = useState<Check[]>([])
  const [checkedAt, setCheckedAt] = useState("")
  const [checkRuntime, setCheckRuntime] = useState("")

  async function load() {
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/admin/network", { cache: "no-store", signal: AbortSignal.timeout(15000) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Не удалось загрузить соединение.")
      setStatus(data); setSelection(data.selection)
    } catch (err) { setError(err instanceof Error ? err.message : "Не удалось загрузить соединение.") }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  async function save() {
    setSaving(true)
    try {
      const response = await fetch("/api/admin/network", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ selection }), signal: AbortSignal.timeout(20000) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Не удалось сохранить соединение.")
      toast.success("Способ соединения сохранён. Применится на всех процессах в течение 15 секунд.")
      await load()
    } catch (err) { toast.error(err instanceof Error ? err.message : "Не удалось сохранить соединение.") }
    finally { setSaving(false) }
  }

  async function testConnections() {
    setChecking(true)
    setChecks([])
    try {
      const response = await fetch("/api/admin/network/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "both" }), signal: AbortSignal.timeout(40000) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Проверка соединения не завершилась.")
      setChecks(data.results); setCheckedAt(data.checkedAt); setCheckRuntime(data.runtime)
    } catch (err) { toast.error(err instanceof Error ? err.message : "Проверка соединения не завершилась.") }
    finally { setChecking(false) }
  }

  const directGeminiWorks = checks.some(c => c.provider === "gemini" && c.mode === "direct" && c.ok)
  const proxyGeminiWorks = checks.some(c => c.provider === "gemini" && c.mode === "proxy" && c.ok)

  return <Card>
    <CardHeader><CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" />Соединение с AI и внешними сервисами</CardTitle></CardHeader>
    <CardContent className="space-y-5">
      <p className="text-sm text-muted-foreground">Проверка запускается на сервере, где работает сайт. После деплоя это будет ваш Timeweb. VPN у посетителя на эти запросы не влияет.</p>
      {loading ? <p role="status" className="text-sm">Загружаем способ соединения…</p> : error ? <div role="alert" className="space-y-2"><p className="text-sm text-destructive">{error}</p><Button variant="outline" onClick={load}>Повторить</Button></div> : <>
        <fieldset className="grid gap-3 sm:grid-cols-2" disabled={saving || checking}>
          <legend className="sr-only">Способ соединения</legend>
          {([
            { value: "direct", title: "Напрямую", text: "Сервер обращается к API без HTTP-прокси." },
            { value: "environment", title: "По настройке Timeweb", text: "Использует HTTP_PROXY / TRAVELLM_HTTP_PROXY из переменных сервера." },
          ] as const).map(item => <label key={item.value} className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${selection === item.value ? "border-primary bg-primary/5" : "border-border"}`}>
            <input type="radio" name="server-connection" value={item.value} checked={selection === item.value} onChange={() => setSelection(item.value)} className="mt-1 accent-[var(--primary)]" />
            <span><span className="block text-sm font-semibold">{item.title}</span><span className="mt-1 block text-xs text-muted-foreground">{item.text}</span></span>
          </label>)}
        </fieldset>
        <p className="text-sm">Сейчас сервер использует: <strong>{status?.connection.mode === "proxy" ? "прокси" : "прямое соединение"}</strong>. {status?.runtime === "development" && <span className="text-muted-foreground">Это локальное окружение, не Timeweb.</span>}</p>
        {status?.connection.environmentDisablesProxy && <p className="text-xs text-muted-foreground">В этом окружении задан TRAVELLM_HTTP_PROXY=off. Для использования прокси уберите off в переменных Timeweb и перезапустите приложение.</p>}
        {!status?.connection.settingsAvailable && <p role="alert" className="text-sm text-amber-500">Не удалось подтвердить текущую настройку из базы. Сервер сохраняет последний известный режим или использует переменные окружения.</p>}
        <Button onClick={save} disabled={saving || checking || selection === status?.selection}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Применить способ соединения</Button>
      </>}

      <div className="space-y-3 border-t pt-4">
        <Button variant="outline" onClick={testConnections} disabled={checking || saving}>{checking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Globe className="mr-2 h-4 w-4" />}{checking ? "Проверяем соединения…" : "Проверить напрямую и через прокси"}</Button>
        <p className="text-xs text-muted-foreground">Четыре коротких запроса: Gemini и DeepSeek двумя способами. Каждый ждёт не более 15 секунд. Запросы оплачиваются по тарифу API и не расходуют пользовательский лимит маршрутов. Проверка не меняет выбранный режим.</p>
        {checks.length > 0 && <>
          <p className="text-xs text-muted-foreground">{checkRuntime === "production" ? "Проверено с сервера развёрнутого сайта" : "Проверено локально, не с Timeweb"} · {new Date(checkedAt).toLocaleString("ru-RU")}</p>
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-muted-foreground"><th className="p-2">Модель</th><th className="p-2">Соединение</th><th className="p-2">Результат</th></tr></thead><tbody>{checks.map(c => <tr key={`${c.provider}-${c.mode}`} className="border-b"><td className="p-2">{c.provider === "gemini" ? "Gemini" : "DeepSeek"}<span className="block text-[10px] text-muted-foreground">{c.model}</span></td><td className="p-2 whitespace-nowrap">{c.mode === "direct" ? "Напрямую" : "Через прокси"}</td><td className="p-2"><span className={`flex items-center gap-1.5 ${c.ok ? "text-emerald-500" : "text-destructive"}`}>{c.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}{c.ok ? `${(c.durationMs / 1000).toFixed(1)} сек` : c.message}</span></td></tr>)}</tbody></table></div>
          <p className="text-sm">{directGeminiWorks ? "Gemini доступен напрямую. Для него прокси не требуется; выберите «Напрямую» и примените настройку." : proxyGeminiWorks ? "Gemini отвечает через прокси. Выберите настройку Timeweb с рабочим HTTP_PROXY." : "Gemini не ответил ни одним способом. Причина указана в таблице; покупать новый сервер до её выяснения не нужно."}</p>
        </>}
      </div>
    </CardContent>
  </Card>
}
