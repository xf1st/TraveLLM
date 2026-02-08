"use client"

import { useEffect, useState } from "react"
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
import { MapPin, Search, ExternalLink, Calendar } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface TokenUsage {
  totalTokens?: number
  promptTokens?: number
  completionTokens?: number
  costUsd?: number
  costRub?: number
}

interface Trip {
  id: string
  title: string
  destination: string
  user_id: string
  user_email?: string
  created_at: string
  updated_at: string
  status: string
  itinerary: any
  countries: any[]
  token_usage?: TokenUsage | null
}

export default function AdminTripsPage() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [filteredTrips, setFilteredTrips] = useState<Trip[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>("all")

  useEffect(() => {
    fetchTrips()
  }, [])

  useEffect(() => {
    let filtered = trips

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          t.title?.toLowerCase().includes(query) ||
          t.destination?.toLowerCase().includes(query) ||
          t.user_email?.toLowerCase().includes(query) ||
          t.id.toLowerCase().includes(query)
      )
    }

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter((t) => t.status === filterStatus)
    }

    setFilteredTrips(filtered)
  }, [searchQuery, filterStatus, trips])

  const fetchTrips = async () => {
    try {
      setLoading(true)
      const { data: tripsData, error: tripsError } = await supabase
        .from("trips")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500)

      if (tripsError) throw tripsError

      // Get user emails for each trip
      const tripsWithEmails = await Promise.all(
        (tripsData || []).map(async (trip) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", trip.user_id)
            .single()

          return { ...trip, user_email: profile?.email || "—" }
        })
      )

      setTrips(tripsWithEmails)
      setFilteredTrips(tripsWithEmails)
    } catch (error: any) {
      toast.error(`Ошибка загрузки: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const getDaysCount = (trip: Trip) => {
    if (Array.isArray(trip.itinerary)) {
      return trip.itinerary.length
    }
    return 0
  }

  const getCountries = (trip: Trip) => {
    if (Array.isArray(trip.countries)) {
      return trip.countries.map((c: any) => c.name || c).join(", ")
    }
    return trip.destination || "—"
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <MapPin className="h-8 w-8" />
            Маршруты
          </h1>
          <p className="text-muted-foreground">
            Просмотр всех маршрутов, поиск и фильтрация
          </p>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по названию, месту назначения, email пользователя или ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filterStatus === "all" ? "default" : "outline"}
                  onClick={() => setFilterStatus("all")}
                  size="sm"
                >
                  Все
                </Button>
                <Button
                  variant={filterStatus === "draft" ? "default" : "outline"}
                  onClick={() => setFilterStatus("draft")}
                  size="sm"
                >
                  Черновики
                </Button>
                <Button
                  variant={filterStatus === "active" ? "default" : "outline"}
                  onClick={() => setFilterStatus("active")}
                  size="sm"
                >
                  Активные
                </Button>
                <Button
                  variant={filterStatus === "completed" ? "default" : "outline"}
                  onClick={() => setFilterStatus("completed")}
                  size="sm"
                >
                  Завершённые
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-8">Загрузка...</div>
        ) : (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table className="min-w-[1000px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Название</TableHead>
                    <TableHead>Направление</TableHead>
                    <TableHead>Пользователь</TableHead>
                    <TableHead>Дней</TableHead>
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
                    filteredTrips.map((trip) => (
                      <TableRow key={trip.id}>
                        <TableCell className="font-medium">
                          {trip.title || "Без названия"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {getCountries(trip)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{trip.user_email || "—"}</div>
                          <div className="text-xs text-muted-foreground">{trip.user_id.slice(0, 8)}...</div>
                        </TableCell>
                        <TableCell>{getDaysCount(trip)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              trip.status === "active"
                                ? "default"
                                : trip.status === "completed"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {trip.status === "active"
                              ? "Активен"
                              : trip.status === "completed"
                                ? "Завершён"
                                : "Черновик"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {trip.token_usage?.totalTokens
                            ? trip.token_usage.totalTokens.toLocaleString("ru-RU")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {trip.token_usage?.costRub
                            ? `${trip.token_usage.costRub.toFixed(2)} ₽`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            {new Date(trip.created_at).toLocaleDateString("ru-RU")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(trip.created_at).toLocaleTimeString("ru-RU", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/trip/${trip.id}`} target="_blank">
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
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
