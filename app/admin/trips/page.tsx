"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { MapPin, Search, ExternalLink, Calendar, Sparkles, Bot, Download } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { appToast as toast } from "@/components/ui/sonner"

type TokenUsage = {
  totalTokens?: number
  promptTokens?: number
  completionTokens?: number
  costUsd?: number
  costRub?: number
  model?: string
}

type Trip = {
  id: string
  title: string
  destination: string
  user_id: string
  user_email?: string
  created_at: string
  updated_at: string
  status: string
  itinerary: unknown
  countries: unknown
  token_usage?: unknown
  cover_image?: string | null
}

const parseMaybeJson = <T,>(value: unknown, fallback: T): T => {
  if (value == null) return fallback
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return fallback
    try {
      return JSON.parse(trimmed) as T
    } catch {
      return fallback
    }
  }
  return value as T
}

const normalizeTokenUsage = (value: unknown): TokenUsage | null => {
  const parsed = parseMaybeJson<Record<string, unknown> | null>(value, null)
  if (!parsed || typeof parsed !== "object") return null

  const toNum = (v: unknown) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }

  return {
    totalTokens: toNum(parsed.totalTokens),
    promptTokens: toNum(parsed.promptTokens),
    completionTokens: toNum(parsed.completionTokens),
    costUsd: toNum(parsed.costUsd),
    costRub: toNum(parsed.costRub),
    model: typeof parsed.model === "string" ? parsed.model : undefined,
  }
}

const getDaysCount = (trip: Trip) => {
  const itinerary = parseMaybeJson<any>(trip.itinerary, null)
  if (Array.isArray(itinerary)) return itinerary.length
  if (Array.isArray(itinerary?.days)) return itinerary.days.length
  if (typeof itinerary?.dayCount === "number") return itinerary.dayCount
  return 0
}

const getCountriesText = (trip: Trip) => {
  const countries = parseMaybeJson<any>(trip.countries, null)

  if (Array.isArray(countries) && countries.length > 0) {
    const names = countries
      .map((item: any) => {
        if (typeof item === "string") return item
        if (item && typeof item === "object") {
          return item.name || item.country || item.title || ""
        }
        return ""
      })
      .filter(Boolean)

    if (names.length > 0) return names.join(", ")
  }

  if (typeof countries === "string" && countries.trim()) return countries
  return trip.destination || "-"
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function AdminTripsPage() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>("all")

  useEffect(() => {
    fetchTrips()
  }, [])

  const filteredTrips = useMemo(() => {
    let filtered = trips

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((t) => {
        const title = String(t.title || "").toLowerCase()
        const destination = String(t.destination || "").toLowerCase()
        const email = String(t.user_email || "").toLowerCase()
        return title.includes(query) || destination.includes(query) || email.includes(query) || t.id.toLowerCase().includes(query)
      })
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((t) => String(t.status || "").toLowerCase() === filterStatus)
    }

    return filtered
  }, [trips, searchQuery, filterStatus])

  const fetchTrips = async () => {
    try {
      setLoading(true)

      const { data: tripsData, error: tripsError } = await supabase
        .from("trips")
        .select("id,title,destination,user_id,created_at,updated_at,status,itinerary,countries,token_usage,cover_image")
        .order("created_at", { ascending: false })
        .limit(500)

      if (tripsError) throw tripsError

      const rawTrips = (tripsData || []) as Trip[]
      const userIds = Array.from(new Set(rawTrips.map((t) => t.user_id).filter(Boolean)))

      let emailByUserId = new Map<string, string>()
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id,email")
          .in("id", userIds)

        if (profilesError) {
          console.warn("Failed to load trip owner emails:", profilesError.message)
        } else {
          emailByUserId = new Map((profiles || []).map((p: any) => [String(p.id), String(p.email || "-")]))
        }
      }

      const normalized = rawTrips.map((trip) => ({
        ...trip,
        user_email: emailByUserId.get(String(trip.user_id)) || "-",
        token_usage: normalizeTokenUsage(trip.token_usage),
      }))

      setTrips(normalized)
    } catch (error: any) {
      toast.error(`Ошибка загрузки маршрутов: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <MapPin className="h-6 w-6" />
            Маршруты
          </h1>
          <p className="text-sm text-muted-foreground">Просмотр созданных маршрутов, модели и стоимость</p>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по названию, направлению, email или ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant={filterStatus === "all" ? "default" : "outline"} onClick={() => setFilterStatus("all")} size="sm">
                  Все
                </Button>
                <Button variant={filterStatus === "draft" ? "default" : "outline"} onClick={() => setFilterStatus("draft")} size="sm">
                  Черновики
                </Button>
                <Button variant={filterStatus === "active" ? "default" : "outline"} onClick={() => setFilterStatus("active")} size="sm">
                  Активные
                </Button>
                <Button variant={filterStatus === "completed" ? "default" : "outline"} onClick={() => setFilterStatus("completed")} size="sm">
                  Завершено
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadJson(filteredTrips, `trips-export-${new Date().toISOString().slice(0, 10)}.json`)}
                  disabled={filteredTrips.length === 0}
                  title="Экспорт в JSON"
                >
                  <Download className="h-4 w-4 mr-1" />
                  JSON ({filteredTrips.length})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
        ) : (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Название</TableHead>
                    <TableHead>Направление</TableHead>
                    <TableHead>Пользователь</TableHead>
                    <TableHead className="text-center">Дни</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Токены</TableHead>
                    <TableHead>Стоимость</TableHead>
                    <TableHead>Создан</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrips.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Маршруты не найдены
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTrips.map((trip) => {
                      const status = String(trip.status || "draft").toLowerCase()
                      const tokenUsage = trip.token_usage as TokenUsage | null

                      return (
                        <TableRow key={trip.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2 min-w-0 max-w-[400px]">
                              {trip.cover_image && (
                                <img src={trip.cover_image} alt="" className="h-8 w-12 rounded object-cover shrink-0 opacity-80" />
                              )}
                              <span className="truncate" title={trip.title}>{trip.title || "Без названия"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate max-w-[150px]">{getCountriesText(trip)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm break-all min-w-[120px] max-w-[180px]">{trip.user_email || "-"}</div>
                          </TableCell>
                          <TableCell className="text-center tabular-nums">{getDaysCount(trip)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={status === "active" ? "default" : (status === "completed" ? "secondary" : "outline")}
                              className={cn(
                                "text-[10px] whitespace-nowrap",
                                status === "planning" && "bg-amber-500/10 text-amber-600 border-amber-500/20"
                              )}
                            >
                              {status === "active" ? "Активен" : 
                               status === "completed" ? "Завершён" : 
                               status === "planning" ? "В процессе" : "Черновик"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {typeof tokenUsage?.totalTokens === "number" ? (
                              <div className="flex flex-col gap-0.5 text-sm tabular-nums" title={tokenUsage.model || ""}>
                                <div className="flex items-center gap-1.5">
                                  <span>{tokenUsage.totalTokens.toLocaleString("ru-RU")}</span>
                                  {tokenUsage.model?.toLowerCase().includes("gemini") ? (
                                    <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                                  ) : tokenUsage.model?.toLowerCase().includes("deepseek") ? (
                                    <Bot className="h-3.5 w-3.5 text-indigo-500" />
                                  ) : null}
                                </div>
                                {tokenUsage.model && (
                                  <span className="text-[10px] text-muted-foreground uppercase opacity-70">
                                    {tokenUsage.model.replace("gemini-", "G-").replace("deepseek-", "DS-")}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="tabular-nums text-sm">
                            {typeof tokenUsage?.costRub === "number"
                              ? `${tokenUsage.costRub.toFixed(2)} RUB`
                              : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm whitespace-nowrap">
                              <Calendar className="h-3 w-3" />
                              {new Date(trip.created_at).toLocaleDateString("ru-RU")}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="Скачать JSON"
                                onClick={() => downloadJson(trip, `trip-${trip.id.slice(0, 8)}.json`)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Link href={`/trip/${trip.id}`} target="_blank">
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {filteredTrips.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground text-center">
            Показано {filteredTrips.length} из {trips.length} маршрутов
          </div>
        )}
      </div>
    </div>
  )
}
