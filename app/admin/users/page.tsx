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
import { Users, Search, MoreVertical, Shield, Ban, UserCheck, Mail, CreditCard } from "lucide-react"
import { toast } from "sonner"

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
  subscription_tier?: string
  site_access?: boolean
  subscription_expires_at?: string | null
  gen_limit_override?: number | null
  chat_limit_override?: number | null
  monthly_gen_used?: number
}

// Provider icon rendered as inline SVG to avoid extra dependencies
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
  // Default: email icon
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline-block opacity-50" aria-label="Email">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="m2 7 10 7 10-7"/>
    </svg>
  )
}

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
  const [subTier, setSubTier] = useState("free")
  const [subSiteAccess, setSubSiteAccess] = useState(false)
  const [subExpiresAt, setSubExpiresAt] = useState("")
  const [subGenOverride, setSubGenOverride] = useState("")
  const [subChatOverride, setSubChatOverride] = useState("")

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
      // non-critical, fail silently
    }
  }

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredUsers(users)
      return
    }

    const query = searchQuery.toLowerCase()
    setFilteredUsers(
      users.filter(
        (u) =>
          u.email.toLowerCase().includes(query) ||
          u.full_name?.toLowerCase().includes(query) ||
          u.id.toLowerCase().includes(query)
      )
    )
  }, [searchQuery, users])

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
        console.warn("Failed to load ai_usage_events, fallback to trips-only totals:", usageEventsError.message)
      }
      if (feedbackError && feedbackError.code !== "42P01") {
        console.warn("Failed to load trip_feedback stats:", feedbackError.message)
      }

      const aggregateByUser = new Map<
        string,
        {
          trips_count: number
          total_tokens: number
          total_cost_rub: number
          feedback_count: number
          feedback_rating_sum: number
        }
      >()

      for (const trip of trips || []) {
        if (!trip.user_id) continue
        const current =
          aggregateByUser.get(trip.user_id) || {
            trips_count: 0,
            total_tokens: 0,
            total_cost_rub: 0,
            feedback_count: 0,
            feedback_rating_sum: 0,
          }

        current.trips_count += 1
        if (trip.token_usage) {
          current.total_tokens += Number(trip.token_usage.totalTokens || 0)
          current.total_cost_rub += Number(trip.token_usage.costRub || 0)
        }

        aggregateByUser.set(trip.user_id, current)
      }

      for (const event of usageEvents || []) {
        if (!event.user_id) continue
        const current =
          aggregateByUser.get(event.user_id) || {
            trips_count: 0,
            total_tokens: 0,
            total_cost_rub: 0,
            feedback_count: 0,
            feedback_rating_sum: 0,
          }

        current.total_tokens += Number(event.total_tokens || 0)
        current.total_cost_rub += Number(event.cost_rub || 0)
        aggregateByUser.set(event.user_id, current)
      }

      for (const row of feedbackRows || []) {
        if (!row.user_id) continue
        const current =
          aggregateByUser.get(row.user_id) || {
            trips_count: 0,
            total_tokens: 0,
            total_cost_rub: 0,
            feedback_count: 0,
            feedback_rating_sum: 0,
          }

        current.feedback_count += 1
        current.feedback_rating_sum += Number(row.rating || 0)
        aggregateByUser.set(row.user_id, current)
      }

      const usersWithCounts = (profiles || []).map((user) => {
        const usage =
          aggregateByUser.get(user.id) || {
            trips_count: 0,
            total_tokens: 0,
            total_cost_rub: 0,
            feedback_count: 0,
            feedback_rating_sum: 0,
          }

        return {
          ...user,
          trips_count: usage.trips_count,
          total_tokens: usage.total_tokens,
          total_cost_rub: usage.total_cost_rub,
          feedback_count: usage.feedback_count,
          avg_feedback_rating:
            usage.feedback_count > 0 ? usage.feedback_rating_sum / usage.feedback_count : null,
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
      }

      updateData.blocked_until = blockUntil ? new Date(blockUntil).toISOString() : null

      const { error } = await supabase.from("profiles").update(updateData).eq("id", selectedUser.id)
      if (error) throw error

      const {
        data: { user },
      } = await supabase.auth.getUser()

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
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error("Не авторизован")

      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", inviteEmail)
        .single()

      if (existing) {
        const { error } = await supabase.from("profiles").update({ role: "admin" }).eq("id", existing.id)
        if (error) throw error
        toast.success("Пользователь повышен до администратора")
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
    setSubTier(user.subscription_tier || "free")
    setSubSiteAccess(user.site_access ?? false)
    setSubExpiresAt(user.subscription_expires_at ? new Date(user.subscription_expires_at).toISOString().slice(0, 10) : "")
    setSubGenOverride(user.gen_limit_override != null ? String(user.gen_limit_override) : "")
    setSubChatOverride(user.chat_limit_override != null ? String(user.chat_limit_override) : "")
    setSubscriptionDialogOpen(true)
  }

  const handleUpdateSubscription = async () => {
    if (!subscriptionUser) return
    try {
      const updateData: any = {
        subscription_tier: subTier,
        site_access: subSiteAccess,
        subscription_expires_at: subExpiresAt ? new Date(subExpiresAt).toISOString() : null,
        gen_limit_override: subGenOverride ? parseInt(subGenOverride) : null,
        chat_limit_override: subChatOverride ? parseInt(subChatOverride) : null,
      }

      const { error } = await supabase.from("profiles").update(updateData).eq("id", subscriptionUser.id)
      if (error) throw error

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from("admin_audit_log").insert({
          admin_user_id: user.id,
          action: "user.subscription_update",
          target_user_id: subscriptionUser.id,
          payload: updateData,
        })
      }

      toast.success("Подписка обновлена")
      setSubscriptionDialogOpen(false)
      setSubscriptionUser(null)
      fetchUsers()
    } catch (error: any) {
      toast.error(`Ошибка: ${error.message}`)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Users className="h-8 w-8" />
              Пользователи
            </h1>
            <p className="text-muted-foreground">
              Управление пользователями, блокировками, ролями и статистикой расходов
            </p>
          </div>
          <Button onClick={() => setInviteDialogOpen(true)}>
            <Mail className="mr-2 h-4 w-4" />
            Пригласить админа
          </Button>
        </div>

        <Card className="mb-6">
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

        {loading ? (
          <div className="text-center py-8">Загрузка...</div>
        ) : (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table className="min-w-[1240px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Имя</TableHead>
                    <TableHead>Роль</TableHead>
                    <TableHead>Доступ</TableHead>
                    <TableHead>Подписка</TableHead>
                    <TableHead>Сайт</TableHead>
                    <TableHead>Маршрутов</TableHead>
                    <TableHead>Токены</TableHead>
                    <TableHead>Потрачено</TableHead>
                    <TableHead>Отзывов</TableHead>
                    <TableHead>Сред. оценка</TableHead>
                    <TableHead>Регистрация</TableHead>
                    <TableHead>Последний вход</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1.5">
                          <span>{user.email}</span>
                          <span className="flex items-center gap-0.5 shrink-0">
                            {(providerMap[user.id] || []).map((p) => (
                              <span key={p} title={p === "google" ? "Google" : p === "github" ? "GitHub" : "Email/Пароль"}>
                                <ProviderIcon provider={p} />
                              </span>
                            ))}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{user.full_name || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === "admin" || user.role === "super_admin" ? "default" : "secondary"}>
                          {user.role === "super_admin"
                            ? "Супер-админ"
                            : user.role === "admin"
                              ? "Админ"
                              : "Пользователь"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.access_mode === "active"
                              ? "default"
                              : user.access_mode === "ai_blocked"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {user.access_mode === "active"
                            ? "Активен"
                            : user.access_mode === "ai_blocked"
                              ? "AI заблокирован"
                              : "Заблокирован"}
                        </Badge>
                        {user.block_reason && (
                          <div className="text-xs text-muted-foreground mt-1">{user.block_reason}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.subscription_tier === 'free' ? 'secondary' : user.subscription_tier === 'dev' ? 'destructive' : 'default'}>
                          {user.subscription_tier || 'free'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.site_access ? 'default' : 'secondary'}>
                          {user.site_access ? 'Да' : 'Нет'}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.trips_count || 0}</TableCell>
                      <TableCell>
                        {typeof user.total_tokens === "number" ? user.total_tokens.toLocaleString("ru-RU") : "-"}
                      </TableCell>
                      <TableCell>
                        {typeof user.total_cost_rub === "number" ? `${user.total_cost_rub.toFixed(2)} ₽` : "-"}
                      </TableCell>
                      <TableCell>{user.feedback_count || 0}</TableCell>
                      <TableCell>
                        {typeof user.avg_feedback_rating === "number"
                          ? `${user.avg_feedback_rating.toFixed(1)}/5`
                          : "-"}
                      </TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString("ru-RU")}</TableCell>
                      <TableCell>
                        {user.last_seen_at ? new Date(user.last_seen_at).toLocaleDateString("ru-RU") : "Никогда"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openSubscriptionDialog(user)}>
                              <CreditCard className="mr-2 h-4 w-4" />
                              Управление подпиской
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
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

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
                  placeholder="Опционально"
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
                    Оставьте пустым для бессрочной блокировки
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

        <Dialog open={subscriptionDialogOpen} onOpenChange={setSubscriptionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Управление подпиской</DialogTitle>
              <DialogDescription>
                {subscriptionUser ? `Пользователь: ${subscriptionUser.email}` : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Тариф</label>
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={subTier}
                  onChange={(e) => setSubTier(e.target.value)}
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="max">Max</option>
                  <option value="dev">Dev</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="site-access"
                  checked={subSiteAccess}
                  onChange={(e) => setSubSiteAccess(e.target.checked)}
                  className="h-4 w-4"
                />
                <label htmlFor="site-access" className="text-sm font-medium">Доступ к сайту (site_access)</label>
              </div>
              <div>
                <label className="text-sm font-medium">Дата истечения</label>
                <Input
                  type="date"
                  value={subExpiresAt}
                  onChange={(e) => setSubExpiresAt(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">Оставьте пустым для бессрочной подписки</p>
              </div>
              <div>
                <label className="text-sm font-medium">Лимит генераций (переопределение)</label>
                <Input
                  type="number"
                  value={subGenOverride}
                  onChange={(e) => setSubGenOverride(e.target.value)}
                  placeholder="Пусто = по умолчанию тарифа"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Лимит чата на маршрут (переопределение)</label>
                <Input
                  type="number"
                  value={subChatOverride}
                  onChange={(e) => setSubChatOverride(e.target.value)}
                  placeholder="Пусто = по умолчанию тарифа"
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
    </div>
  )
}
