"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { appToast as toast } from "@/components/ui/sonner"
import { Loader2, RefreshCw, Clapperboard, Sparkles } from "lucide-react"
import {
  REEL_CREATIVITY_DEFAULT,
  REEL_CREATIVITY_MAX,
  REEL_CREATIVITY_MIN,
  reelCreativityToTemperature,
} from "@/lib/reel-creativity"

type ReelRow = {
  id: string
  title: string
  country: string
  city: string | null
  locale: string
  published: boolean
  anchor_day: number
  created_at: string
}

export default function AdminReelsPage() {
  const [reels, setReels] = useState<ReelRow[]>([])
  const [loading, setLoading] = useState(true)
  const [batchMsg, setBatchMsg] = useState<string | null>(null)
  const [genCount, setGenCount] = useState(1)
  const [genLocale, setGenLocale] = useState<"ru" | "en">("ru")
  const [genPublish, setGenPublish] = useState(false)
  const [genCreativity, setGenCreativity] = useState(REEL_CREATIVITY_DEFAULT)
  const [genLoading, setGenLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/reels", { credentials: "include" })
      const j = (await res.json()) as { reels?: ReelRow[]; error?: string }
      if (!res.ok) throw new Error(j.error || "Failed")
      setReels(j.reels ?? [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка загрузки")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const togglePublished = async (id: string, next: boolean) => {
    try {
      const res = await fetch(`/api/admin/reels/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: next }),
      })
      const j = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(j.error || "PATCH failed")
      setReels((prev) => prev.map((r) => (r.id === id ? { ...r, published: next } : r)))
      toast.success(next ? "Опубликовано" : "Снято с публикации")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка")
    }
  }

  const runBatchInfo = async () => {
    setBatchMsg(null)
    try {
      const res = await fetch("/api/admin/reels/batch", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status" }),
      })
      const j = (await res.json()) as { message?: string; error?: string; reels_generation_enabled?: boolean }
      if (!res.ok) throw new Error(j.error || "Failed")
      setBatchMsg(j.message || JSON.stringify(j))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка")
    }
  }

  const runGenerate = async () => {
    setBatchMsg(null)
    setGenLoading(true)
    try {
      const n = Math.min(5, Math.max(1, genCount))
      const res = await fetch("/api/admin/reels/batch", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          count: n,
          locale: genLocale,
          published: genPublish,
          creativity: genCreativity,
        }),
      })
      const j = (await res.json()) as {
        error?: string
        created_count?: number
        requested_count?: number
        errors?: { index: number; message: string }[]
        gemini_usage?: { costUsd?: number; totalTokens?: number }
      }
      if (!res.ok) throw new Error(j.error || "Генерация не удалась")
      const failed = j.errors?.length ?? 0
      if (failed > 0) {
        toast.error(`Создано ${j.created_count ?? 0}, ошибок: ${failed}`)
        setBatchMsg(JSON.stringify(j, null, 2))
      } else {
        toast.success(`Создано карточек: ${j.created_count ?? 0}`)
        setBatchMsg(
          `OK: ${j.created_count}/${j.requested_count}. Токены: ~${j.gemini_usage?.totalTokens ?? "?"}, ~$${(j.gemini_usage?.costUsd ?? 0).toFixed(4)}`,
        )
      }
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка")
    } finally {
      setGenLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Clapperboard className="h-8 w-8" />
            Trip Reels
          </h1>
          <p className="text-muted-foreground mt-1">
            Лента /reels. Генерация через AI (Gemini) + подбор фото — только при включённом флаге в Настройках.
            После модерации выключите флаг и публикуйте карточки переключателем.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Обновить
          </Button>
          <Button variant="secondary" size="sm" onClick={runBatchInfo}>
            Статус батча
          </Button>
        </div>
      </div>

      <Card className="border-violet-500/30 bg-violet-950/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-400" />
            Генерация карточек (AI)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-white/60">
            Запрос к OpenRouter (Gemini) + поиск изображений. За раз не больше 5 карточек. Новые строки по умолчанию
            не в ленте, пока не включите «Сразу опубликовать» или не опубликуете вручную.
          </p>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="gen_count">Сколько штук</Label>
              <Input
                id="gen_count"
                type="number"
                min={1}
                max={5}
                value={genCount}
                onChange={(e) => setGenCount(parseInt(e.target.value, 10) || 1)}
                className="w-24 bg-black/40 border-white/20"
              />
            </div>
            <div className="space-y-2">
              <Label>Язык карточки</Label>
              <Select value={genLocale} onValueChange={(v) => setGenLocale(v as "ru" | "en")}>
                <SelectTrigger className="w-[140px] bg-black/40 border-white/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ru">Русский</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Switch id="gen_pub" checked={genPublish} onCheckedChange={setGenPublish} />
              <Label htmlFor="gen_pub" className="cursor-pointer">
                Сразу опубликовать
              </Label>
            </div>
            <Button onClick={runGenerate} disabled={genLoading} className="gap-2">
              {genLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Сгенерировать
            </Button>
          </div>

          <div className="space-y-2 pt-1 border-t border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor="gen_creativity" className="text-white/90">
                Креативность модели
              </Label>
              <span className="text-xs tabular-nums text-violet-300/90">
                {genCreativity} · temperature ≈ {reelCreativityToTemperature(genCreativity).toFixed(2)}
              </span>
            </div>
            <input
              id="gen_creativity"
              type="range"
              min={REEL_CREATIVITY_MIN}
              max={REEL_CREATIVITY_MAX}
              value={genCreativity}
              onChange={(e) => setGenCreativity(Number(e.target.value))}
              className="w-full max-w-md h-2 cursor-pointer appearance-none rounded-full bg-white/15 accent-violet-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-400 [&::-webkit-slider-thumb]:shadow-md"
            />
            <p className="text-xs text-white/45 max-w-xl">
              Ниже — предсказуемее и ближе к шаблону; выше — смелее идеи и формулировки (чуть выше риск «ломать» JSON —
              тогда просто повторите генерацию). В батч подмешиваются последние карточки из БД, чтобы не дублировать темы; при
              повторах поднимите креативность.
            </p>
          </div>
        </CardContent>
      </Card>

      {batchMsg && (
        <Card className="border-white/20 bg-white/5">
          <CardHeader>
            <CardTitle className="text-base">Статус / последний ответ</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-white/80 whitespace-pre-wrap">{batchMsg}</CardContent>
        </Card>
      )}

      <Card className="border-white/10">
        <CardHeader>
          <CardTitle>Все записи ({reels.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Загрузка…</div>
          ) : reels.length === 0 ? (
            <p className="text-muted-foreground">Нет строк в discovery_reels</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-white/10">
                    <th className="pb-2 pr-4">Название</th>
                    <th className="pb-2 pr-4">Локация</th>
                    <th className="pb-2 pr-4">Locale</th>
                    <th className="pb-2 pr-4">День якоря</th>
                    <th className="pb-2">Публикация</th>
                  </tr>
                </thead>
                <tbody>
                  {reels.map((r) => (
                    <tr key={r.id} className="border-b border-white/5">
                      <td className="py-3 pr-4 font-medium">{r.title}</td>
                      <td className="py-3 pr-4 text-white/70">
                        {r.city ? `${r.city}, ${r.country}` : r.country}
                      </td>
                      <td className="py-3 pr-4">{r.locale}</td>
                      <td className="py-3 pr-4">{r.anchor_day}</td>
                      <td className="py-3">
                        <Switch
                          checked={r.published}
                          onCheckedChange={(c) => togglePublished(r.id, c)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
