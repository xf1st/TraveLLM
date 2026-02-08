"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Users, Search, MoreVertical, Shield, Ban, UserCheck, Mail, Calendar } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

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
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredUsers(
        users.filter(
          (u) =>
            u.email.toLowerCase().includes(query) ||
            u.full_name?.toLowerCase().includes(query) ||
            u.id.toLowerCase().includes(query)
        )
      )
    }
  }, [searchQuery, users])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error

      // Get trip counts and token usage for each user
      const usersWithCounts = await Promise.all(
        (data || []).map(async (user) => {
          const { data: trips, count } = await supabase
            .from("trips")
            .select("token_usage", { count: "exact" })
            .eq("user_id", user.id)

          let total_tokens = 0
          let total_cost_rub = 0
          if (trips) {
            for (const trip of trips) {
              if (trip.token_usage) {
                total_tokens += trip.token_usage.totalTokens || 0
                total_cost_rub += trip.token_usage.costRub || 0
              }
            }
          }

          return { ...user, trips_count: count || 0, total_tokens, total_cost_rub }
        })
      )

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

      if (blockUntil) {
        updateData.blocked_until = new Date(blockUntil).toISOString()
      } else {
        updateData.blocked_until = null
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", selectedUser.id)

      if (error) throw error

      // Log to audit
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from("admin_audit_log").insert({
          admin_user_id: user.id,
          action: `user.${blockMode}`,
          target_user_id: selectedUser.id,
          payload: { reason: blockReason, until: blockUntil },
        })
      }

      toast.success(
        blockMode === "active"
          ? "Доступ восстановлен"
          : blockMode === "ai_blocked"
            ? "Генерация заблокирована"
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

      // Check if user already exists
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", inviteEmail)
        .single()

      if (existing) {
        // User exists, just upgrade to admin
        const { error } = await supabase
          .from("profiles")
          .update({ role: "admin" })
          .eq("id", existing.id)

        if (error) throw error

        toast.success("Пользователь повышен до админа")
      } else {
        // Create invite
        const { error } = await supabase.from("admin_invites").insert({
          email: inviteEmail,
          invited_by: user.id,
        })

        if (error) throw error

        // Log to audit
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
    setBlockUntil(
      user.blocked_until ? new Date(user.blocked_until).toISOString().slice(0, 16) : ""
    )
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
              Управление пользователями, блокировки, приглашения админов
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
              <Table className="min-w-[1100px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Имя</TableHead>
                    <TableHead>Роль</TableHead>
                    <TableHead>Доступ</TableHead>
                    <TableHead>Маршрутов</TableHead>
                    <TableHead>Токены</TableHead>
                    <TableHead>Потрачено</TableHead>
                    <TableHead>Регистрация</TableHead>
                    <TableHead>Последний вход</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>{user.full_name || "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.role === "admin" || user.role === "super_admin"
                              ? "default"
                              : "secondary"
                          }
                        >
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
                          <div className="text-xs text-muted-foreground mt-1">
                            {user.block_reason}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{user.trips_count || 0}</TableCell>
                      <TableCell>
                        {user.total_tokens
                          ? user.total_tokens.toLocaleString("ru-RU")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {user.total_cost_rub
                          ? `${user.total_cost_rub.toFixed(2)} ₽`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString("ru-RU")}
                      </TableCell>
                      <TableCell>
                        {user.last_seen_at
                          ? new Date(user.last_seen_at).toLocaleDateString("ru-RU")
                          : "Никогда"}
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

        {/* Block Dialog */}
        <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {blockMode === "active"
                  ? "Восстановить доступ"
                  : blockMode === "ai_blocked"
                    ? "Заблокировать генерацию AI"
                    : "Заблокировать пользователя"}
              </DialogTitle>
              <DialogDescription>
                {selectedUser && `Пользователь: ${selectedUser.email}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Причина блокировки</label>
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

        {/* Invite Admin Dialog */}
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Пригласить админа</DialogTitle>
              <DialogDescription>
                Введите email пользователя. Если он уже зарегистрирован, ему будет выдана роль
                админа. Если нет — будет создано приглашение.
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
