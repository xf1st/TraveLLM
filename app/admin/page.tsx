"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, MapPin, Activity, AlertCircle, Cpu, DollarSign, Zap, TrendingUp } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface AIStats {
  summary: {
    totalRequests: number
    totalTokens: number
    totalCostUsd: number
    totalCostRub: number
    avgTokensPerRequest: number
    cacheHitRate: string
  }
  dailyStats: { date: string; tokens: number; cost: number; requests: number }[]
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTrips: 0,
    activeUsers: 0,
    blockedUsers: 0,
    todayTrips: 0,
    thisWeekTrips: 0,
  })
  const [aiStats, setAiStats] = useState<AIStats | null>(null)
  const [aiStatsPeriod, setAiStatsPeriod] = useState<"today" | "week" | "month" | "all">("week")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Total users
        const { count: totalUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })

        // Active users (last 30 days)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const { count: activeUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('last_seen_at', thirtyDaysAgo.toISOString())

        // Blocked users
        const { count: blockedUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .neq('access_mode', 'active')

        // Total trips
        const { count: totalTrips } = await supabase
          .from('trips')
          .select('*', { count: 'exact', head: true })

        // Today trips
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const { count: todayTrips } = await supabase
          .from('trips')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', today.toISOString())

        // This week trips
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        const { count: thisWeekTrips } = await supabase
          .from('trips')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', weekAgo.toISOString())

        setStats({
          totalUsers: totalUsers || 0,
          totalTrips: totalTrips || 0,
          activeUsers: activeUsers || 0,
          blockedUsers: blockedUsers || 0,
          todayTrips: todayTrips || 0,
          thisWeekTrips: thisWeekTrips || 0,
        })
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  // Fetch AI stats
  useEffect(() => {
    const fetchAiStats = async () => {
      try {
        const res = await fetch(`/api/admin/ai-stats?period=${aiStatsPeriod}`)
        if (res.ok) {
          const data = await res.json()
          setAiStats(data)
        }
      } catch (error) {
        console.error('Failed to fetch AI stats:', error)
      }
    }
    fetchAiStats()
  }, [aiStatsPeriod])

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Загрузка...</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Админ-панель</h1>
          <p className="text-muted-foreground">Управление пользователями и маршрутами</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего пользователей</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeUsers} активных за 30 дней
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Заблокированных</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.blockedUsers}</div>
              <p className="text-xs text-muted-foreground">
                Пользователей с ограничениями
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего маршрутов</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTrips}</div>
              <p className="text-xs text-muted-foreground">
                {stats.thisWeekTrips} за неделю, {stats.todayTrips} сегодня
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Быстрые действия</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Link href="/admin/users">
                  <Button variant="outline" size="sm" className="w-full">
                    Управление пользователями
                  </Button>
                </Link>
                <Link href="/admin/trips">
                  <Button variant="outline" size="sm" className="w-full">
                    Все маршруты
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Usage Statistics */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" />
              Статистика DeepSeek AI
            </h2>
            <div className="flex gap-2">
              {(["today", "week", "month", "all"] as const).map((period) => (
                <Button
                  key={period}
                  variant={aiStatsPeriod === period ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAiStatsPeriod(period)}
                >
                  {period === "today" ? "Сегодня" : period === "week" ? "Неделя" : period === "month" ? "Месяц" : "Всё время"}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Запросов к AI</CardTitle>
                <Zap className="h-4 w-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-400">
                  {aiStats?.summary.totalRequests || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  ~{aiStats?.summary.avgTokensPerRequest?.toLocaleString() || 0} токенов/запрос
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Токенов использовано</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-400">
                  {(aiStats?.summary.totalTokens || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Кэш: {aiStats?.summary.cacheHitRate || "0%"}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Стоимость (USD)</CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-400">
                  ${aiStats?.summary.totalCostUsd?.toFixed(2) || "0.00"}
                </div>
                <p className="text-xs text-muted-foreground">
                  ~${aiStats?.summary.avgCostPerRequest?.toFixed(4) || "0"}/запрос
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Стоимость (RUB)</CardTitle>
                <span className="text-amber-400 font-bold">₽</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-400">
                  {aiStats?.summary.totalCostRub?.toFixed(0) || "0"} ₽
                </div>
                <p className="text-xs text-muted-foreground">
                  Курс ~100 ₽/$
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Daily chart */}
          {aiStats?.dailyStats && aiStats.dailyStats.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Использование за последние 7 дней</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between h-32 gap-2">
                  {aiStats.dailyStats.map((day, i) => {
                    const maxTokens = Math.max(...aiStats.dailyStats.map(d => d.tokens), 1)
                    const height = (day.tokens / maxTokens) * 100
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full bg-primary/20 rounded-t transition-all hover:bg-primary/30"
                          style={{ height: `${Math.max(height, 4)}%` }}
                          title={`${day.tokens.toLocaleString()} токенов, $${day.cost.toFixed(4)}`}
                        />
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(day.date).toLocaleDateString("ru-RU", { weekday: "short" })}
                        </span>
                        <span className="text-[10px] font-medium">{day.requests}</span>
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>Запросов</span>
                  <span>Наведите для деталей</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/admin/users">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Пользователи
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Просмотр и управление пользователями, блокировки, приглашения админов
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/trips">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Маршруты
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Просмотр всех маршрутов, поиск, фильтры по пользователям и датам
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/health">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Тестирование
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Проверка API, БД, Storage и внешних провайдеров
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/settings">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Настройки
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Тех. работы, feature flags, глобальные настройки
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
