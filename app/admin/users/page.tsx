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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Users, Search, MoreVertical, Shield, Ban, UserCheck, Mail, CreditCard, ChevronDown, ChevronUp, TrendingUp, Plane } from "lucide-react"
import { appToast as toast } from "@/components/ui/sonner"

interface User {
  id: string
  email: string
  full_name: string | null
  role: string
  access_mode: string
  block_reason: string | null
  blocked_until: string | null
  created_at: string
  last_seen_at: string | null
  trips_count?: number
  total_tokens?: number
  total_cost_rub?: number
  feedback_count?: number
  avg_feedback_rating?: number | null
  gen_limit_override?: number | null
  chat_limit_override?: number | null
  monthly_gen_used?: number
}

function ProviderIcon({ provider }: { provider: string }) {
  if (provider === "google") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" className="inline-block" aria-label="Google">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    )
  }
  if (provider === "github") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="inline-block opacity-70" aria-label="GitHub">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
      </svg>
    )
  }
  if (provider === "yandex") {
    return (
      <div className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#FF0000] text-white" aria-label="Yandex">
        <span className="font-bold text-[9px] leading-none pt-[1px] font-sans pr-[1px]">Я</span>
      </div>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline-block opacity-50" aria-label="Email">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="m2 7 10 7 10-7"/>
    </svg>
  )
}

type SortKey = "created_at" | "last_seen_at" | "trips_count" | "total_cost_rub" | "email"
type SortDir = "asc" | "desc"

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [blockDialogOpen, setBlockDialogOpen] = useState(false)
  const [blockMode, setBlockMode] = useState<"ai_blocked" | "full_blocked" | "active">("active")
  const [blockReason, setBlockReason] = useState("")
  const [blockUntil, setBlockUntil] = useState("")
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [providerMap, setProviderMap] = useState<Record<string, string[]>>({})
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false)
  const [subscriptionUser, setSubscriptionUser] = useState<User | null>(null)
  const [subGenOverride, setSubGenOverride] = useState("")
  const [subChatOverride, setSubChatOverride] = useState("")
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>("created_at")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  useEffect(() => {
    fetchUsers()
    fetchProviders()
  }, [])

  const fetchProviders = async () => {
    try {
      const res = await fetch("/api/admin/user-providers")
      if (res.ok) {
        const data = await res.json()
        setProviderMap(data.providers || {})
      }
    } catch {
      // non-critical
    }
  }

  useEffect(() => {
    let result = [...users]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          u.full_name?.toLowerCase().includes(q) ||
          u.id.toLowerCase().includes(q)
      )
    }
    result.sort((a, b) => {
      let av: any, bv: any
      if (sortKey === "email") { av = a.email; bv = b.email }
      else if (sortKey === "trips_count") { av = a.trips_count || 0; bv = b.trips_count || 0 }
      else if (sortKey === "total_cost_rub") { av = a.total_cost_rub || 0; bv = b.total_cost_rub || 0 }
      else if (sortKey === "last_seen_at") { av = a.last_seen_at || ""; bv = b.last_seen_at || "" }
      else { av = a.created_at; bv = b.created_at }
      if (av < bv) return sortDir === "asc" ? -1 : 1
      if (av > bv) return sortDir === "asc" ? 1 : -1
      return 0
    })
    setFilteredUsers(result)
  }, [searchQuery, users, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("desc") }
  }

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return null
    return sortDir === "desc" ? <ChevronDown className="h-3 w-3 inline ml-0.5" /> : <ChevronUp className="h-3 w-3 inline ml-0.5" />
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })

      if (profilesError) throw profilesError

      const [
        { data: trips, error: tripsError },
        { data: usageEvents, error: usageEventsError },
        { data: feedbackRows, error: feedbackError },
      ] = await Promise.all([
        supabase.from("trips").select("user_id, token_usage"),
        supabase.from("ai_usage_events").select("user_id, total_tokens, cost_rub"),
        supabase.from("trip_feedback").select("user_id, rating"),
      ])

      if (tripsError) throw tripsError
      if (usageEventsError && usageEventsError.code !== "42P01") {
        console.warn("ai_usage_events load error:", usageEventsError.message)
      }
      if (feedbackError && feedbackError.code !== "42P01") {
        console.warn("trip_feedback load error:", feedbackError.message)
      }

      const agg = new Map<string, { trips_count: number; total_tokens: number; total_cost_rub: number; feedback_count: number; feedback_rating_sum: number }>()

      for (const trip of trips || []) {
        if (!trip.user_id) continue
        const c = agg.get(trip.user_id) || { trips_count: 0, total_tokens: 0, total_cost_rub: 0, feedback_count: 0, feedback_rating_sum: 0 }
        c.trips_count += 1
        if (trip.token_usage) {
          c.total_tokens += Number(trip.token_usage.totalTokens || 0)
          c.total_cost_rub += Number(trip.token_usage.costRub || 0)
        }
        agg.set(trip.user_id, c)
      }

      for (const event of usageEvents || []) {
        if (!event.user_id) continue
        const c = agg.get(event.user_id) || { trips_count: 0, total_tokens: 0, total_cost_rub: 0, feedback_count: 0, feedback_rating_sum: 0 }
        c.total_tokens += Number(event.total_tokens || 0)
        c.total_cost_rub += Number(event.cost_rub || 0)
        agg.set(event.user_id, c)
      }

      for (const row of feedbackRows || []) {
        if (!row.user_id) continue
        const c = agg.get(row.user_id) || { trips_count: 0, total_tokens: 0, total_cost_rub: 0, feedback_count: 0, feedback_rating_sum: 0 }
        c.feedback_count += 1
        c.feedback_rating_sum += Number(row.rating || 0)
        agg.set(row.user_id, c)
      }

      const usersWithCounts = (profiles || []).map((user) => {
        const u = agg.get(user.id) || { trips_count: 0, total_tokens: 0, total_cost_rub: 0, feedback_count: 0, feedback_rating_sum: 0 }
        return {
          ...user,
          trips_count: u.trips_count,
          total_tokens: u.total_tokens,
          total_cost_rub: u.total_cost_rub,
          feedback_count: u.feedback_count,
          avg_feedback_rating: u.feedback_count > 0 ? u.feedback_rating_sum / u.feedback_count : null,
        }
      })

      setUsers(usersWithCounts)
      setFilteredUsers(usersWithCounts)
    } catch (error: any) {
      toast.error(`Ошибка загрузки: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleBlockUser = async () => {
    if (!selectedUser) return
    try {
      const updateData: any = {
        access_mode: blockMode,
        block_reason: blockReason || null,
        blocked_until: blockUntil ? new Date(blockUntil).toISOString() : null,
      }
      const { error } = await supabase.from("profiles").update(updateData).eq("id", selectedUser.id)
      if (error) throw error

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from("admin_audit_log").insert({
          admin_user_id: user.id,
          action: `user.${blockMode}`,
          target_user_id: selectedUser.id,
          payload: { reason: blockReason, until: blockUntil || null },
        })
      }

      toast.success(
        blockMode === "active"
          ? "Доступ восстановлен"
          : blockMode === "ai_blocked"
            ? "Доступ к AI заблокирован"
            : "Пользователь заблокирован"
      )
      setBlockDialogOpen(false)
      setSelectedUser(null)
      setBlockReason("")
      setBlockUntil("")
      fetchUsers()
    } catch (error: any) {
      toast.error(`Ошибка: ${error.message}`)
    }
  }

  const handleInviteAdmin = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Введите email")
      return
    }
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Не авторизован")

      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", inviteEmail)
        .single()

      if (existing) {
        const { error } = await supabase.from("profiles").update({ role: "admin" }).eq("id", existing.id)
        if (error) throw error
        toast.success("Пользователь назначен администратором")
      } else {
        const { error } = await supabase.from("admin_invites").insert({
          email: inviteEmail,
          invited_by: user.id,
        })
        if (error) throw error
        await supabase.from("admin_audit_log").insert({
          admin_user_id: user.id,
          action: "admin.invite",
          payload: { email: inviteEmail },
        })
        toast.success("Приглашение отправлено")
      }

      setInviteDialogOpen(false)
      setInviteEmail("")
      fetchUsers()
    } catch (error: any) {
      toast.error(`Ошибка: ${error.message}`)
    }
  }

  const openBlockDialog = (user: User, mode: "ai_blocked" | "full_blocked" | "active") => {
    setSelectedUser(user)
    setBlockMode(mode)
    setBlockReason(user.block_reason || "")
    setBlockUntil(user.blocked_until ? new Date(user.blocked_until).toISOString().slice(0, 16) : "")
    setBlockDialogOpen(true)
  }

  const openSubscriptionDialog = (user: User) => {
    setSubscriptionUser(user)
    setSubGenOverride(user.gen_limit_override != null ? String(user.gen_limit_override) : "")
    setSubChatOverride(user.chat_limit_override != null ? String(user.chat_limit_override) : "")
    setSubscriptionDialogOpen(true)
  }

  const handleUpdateSubscription = async () => {
    if (!subscriptionUser) return
    try {
      const updateData: any = {
        gen_limit_override: subGenOverride ? parseInt(subGenOverride) : null,
        chat_limit_override: subChatOverride ? parseInt(subChatOverride) : null,
      }
      const { error } = await supabase.from("profiles").update(updateData).eq("id", subscriptionUser.id)
      if (error) throw error

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from("admin_audit_log").insert({
          admin_user_id: user.id,
          action: "user.limits_update",
          target_user_id: subscriptionUser.id,
          payload: updateData,
        })
      }

      toast.success("Лимиты обновлены")
      setSubscriptionDialogOpen(false)
      setSubscriptionUser(null)
      fetchUsers()
    } catch (error: any) {
      toast.error(`Ошибка: ${error.message}`)
    }
  }

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("ru-RU") : null

  // --- Summary stats ---
  const totalUsers = users.length
  const activeUsers = users.filter(u => u.last_seen_at && (Date.now() - new Date(u.last_seen_at).getTime()) < 7 * 86400000).length
  const totalTrips = users.reduce((s, u) => s + (u.trips_count || 0), 0)
  const totalCost = users.reduce((s, u) => s + (u.total_cost_rub || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Пользователи
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Управление аккаунтами и подписками
          </p>
        </div>
        <Button onClick={() => setInviteDialogOpen(true)} size="sm">
          <Mail className="mr-2 h-4 w-4" />
          Пригласить админа
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-2xl font-black">{totalUsers}</div>
          <div className="text-xs text-muted-foreground">Всего</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-black text-emerald-500">{activeUsers}</div>
          <div className="text-xs text-muted-foreground">Активны (7д)</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-black">{totalTrips}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1"><Plane className="h-3 w-3" /> Маршрутов</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-black">{totalCost.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">RUB</span></div>
          <div className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> AI расходы</div>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по email, имени или ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-background"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("email")}>
                    Пользователь <SortIcon k="email" />
                  </TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="cursor-pointer select-none text-center" onClick={() => toggleSort("trips_count")}>
                    Маршруты <SortIcon k="trips_count" />
                  </TableHead>
                  <TableHead className="cursor-pointer select-none text-center" onClick={() => toggleSort("total_cost_rub")}>
                    AI, RUB <SortIcon k="total_cost_rub" />
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("created_at")}>
                    Регистрация <SortIcon k="created_at" />
                  </TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const isExpanded = expandedUser === user.id
                  return (
                    <TableRow
                      key={user.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                    >
                      {/* User info */}
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-sm truncate">{user.email}</span>
                              <span className="flex items-center gap-0.5 shrink-0">
                                {(providerMap[user.id] || []).map((p) => (
                                  <span key={p} title={p}>
                                    <ProviderIcon provider={p} />
                                  </span>
                                ))}
                              </span>
                            </div>
                            {user.full_name && (
                              <div className="text-xs text-muted-foreground truncate">{user.full_name}</div>
                            )}
                            {isExpanded && (
                              <div className="mt-2 text-xs space-y-1 text-muted-foreground border-t pt-2 border-dashed">
                                <div>ID: <span className="font-mono text-[10px]">{user.id}</span></div>
                                <div>Токены: {(user.total_tokens || 0).toLocaleString("ru-RU")}</div>
                                {user.feedback_count ? (
                                  <div>Отзывы: {user.feedback_count} (средн. {user.avg_feedback_rating?.toFixed(1)}/5)</div>
                                ) : null}
                                <div>Последний визит: {fmtDate(user.last_seen_at) || "Никогда"}</div>
                                {user.block_reason && <div className="text-red-500">Причина блока: {user.block_reason}</div>}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col gap-1">
                          <Badge variant={user.role === "admin" || user.role === "super_admin" ? "default" : "secondary"} className="w-fit text-[10px]">
                            {user.role === "super_admin" ? "Супер" : user.role === "admin" ? "Админ" : "Юзер"}
                          </Badge>
                          <Badge
                            variant={
                              user.access_mode === "active" ? "default"
                                : user.access_mode === "ai_blocked" ? "secondary"
                                  : "destructive"
                            }
                            className="w-fit text-[10px]"
                          >
                            {user.access_mode === "active" ? "Активен"
                              : user.access_mode === "ai_blocked" ? "AI блок"
                                : "Заблокирован"}
                          </Badge>
                        </div>
                      </TableCell>

                      {/* Trips */}
                      <TableCell className="text-center font-medium tabular-nums">
                        {user.trips_count || 0}
                      </TableCell>

                      {/* Cost */}
                      <TableCell className="text-center tabular-nums text-sm">
                        {typeof user.total_cost_rub === "number" && user.total_cost_rub > 0
                          ? `${user.total_cost_rub.toFixed(2)}`
                          : "-"}
                      </TableCell>

                      {/* Created */}
                      <TableCell className="text-sm tabular-nums text-muted-foreground whitespace-nowrap">
                        {fmtDate(user.created_at)}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openSubscriptionDialog(user)}>
                              <CreditCard className="mr-2 h-4 w-4" />
                              Лимиты пользователя
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openBlockDialog(user, "active")}>
                              <UserCheck className="mr-2 h-4 w-4" />
                              Восстановить доступ
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openBlockDialog(user, "ai_blocked")}>
                              <Ban className="mr-2 h-4 w-4" />
                              Заблокировать AI
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openBlockDialog(user, "full_blocked")}>
                              <Shield className="mr-2 h-4 w-4" />
                              Полная блокировка
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Block Dialog */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {blockMode === "active"
                ? "Восстановить доступ"
                : blockMode === "ai_blocked"
                  ? "Заблокировать доступ к AI"
                  : "Заблокировать пользователя"}
            </DialogTitle>
            <DialogDescription>
              {selectedUser ? `Пользователь: ${selectedUser.email}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Причина</label>
              <Input
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Необязательно"
                className="mt-1"
              />
            </div>
            {blockMode !== "active" && (
              <div>
                <label className="text-sm font-medium">Заблокировать до (дата и время)</label>
                <Input
                  type="datetime-local"
                  value={blockUntil}
                  onChange={(e) => setBlockUntil(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Оставьте пустым для постоянной блокировки
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleBlockUser}>Применить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Limits Dialog */}
      <Dialog open={subscriptionDialogOpen} onOpenChange={setSubscriptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Лимиты пользователя</DialogTitle>
            <DialogDescription>
              {subscriptionUser ? `Пользователь: ${subscriptionUser.email}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Лимит генераций в месяц</label>
              <Input
                type="number"
                value={subGenOverride}
                onChange={(e) => setSubGenOverride(e.target.value)}
                placeholder="Пусто = стандартный лимит (10)"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Персональный override. Пусто — использует глобальный лимит 10/месяц.</p>
            </div>
            <div>
              <label className="text-sm font-medium">Лимит сообщений чата на маршрут</label>
              <Input
                type="number"
                value={subChatOverride}
                onChange={(e) => setSubChatOverride(e.target.value)}
                placeholder="Пусто = стандартный лимит"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubscriptionDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleUpdateSubscription}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Пригласить админа</DialogTitle>
            <DialogDescription>
              Введите email пользователя. Если аккаунт уже существует, ему будет назначена роль администратора.
              Если нет, будет создано приглашение.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleInviteAdmin}>Пригласить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
