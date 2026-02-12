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
import { Users, Search, MoreVertical, Shield, Ban, UserCheck, Mail } from "lucide-react"
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

  useEffect(() => {
    fetchUsers()
  }, [])

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
                      <TableCell className="font-medium">{user.email}</TableCell>
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
