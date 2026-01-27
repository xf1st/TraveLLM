"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Activity, CheckCircle2, XCircle, Loader2, Database, Cloud, Zap, Image as ImageIcon } from "lucide-react"
import { toast } from "sonner"

interface HealthCheck {
  name: string
  status: "pending" | "success" | "error"
  message: string
  duration?: number
}

export default function AdminHealthPage() {
  const [checks, setChecks] = useState<HealthCheck[]>([])
  const [running, setRunning] = useState(false)

  const runChecks = async () => {
    setRunning(true)
    const results: HealthCheck[] = []

    // 1. Database Connection
    const dbStart = Date.now()
    try {
      const { error } = await supabase.from("profiles").select("id").limit(1)
      const duration = Date.now() - dbStart
      if (error) throw error
      results.push({
        name: "База данных (Supabase)",
        status: "success",
        message: "Подключение успешно",
        duration,
      })
    } catch (error: any) {
      results.push({
        name: "База данных (Supabase)",
        status: "error",
        message: error.message || "Ошибка подключения",
        duration: Date.now() - dbStart,
      })
    }

    // 2. RLS Policies Check
    const rlsStart = Date.now()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Не авторизован")

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      if (profile?.role !== "admin" && profile?.role !== "super_admin") {
        throw new Error("Нет прав админа")
      }

      // Try to read all profiles (admin only)
      const { error } = await supabase.from("profiles").select("id").limit(1)
      if (error) throw error

      results.push({
        name: "RLS политики (Admin доступ)",
        status: "success",
        message: "Админские права работают корректно",
        duration: Date.now() - rlsStart,
      })
    } catch (error: any) {
      results.push({
        name: "RLS политики (Admin доступ)",
        status: "error",
        message: error.message || "Ошибка проверки RLS",
        duration: Date.now() - rlsStart,
      })
    }

    // 3. Storage Check
    const storageStart = Date.now()
    try {
      const { data, error } = await supabase.storage.from("avatars").list("", { limit: 1 })
      if (error) throw error
      results.push({
        name: "Storage (Supabase)",
        status: "success",
        message: "Доступ к хранилищу работает",
        duration: Date.now() - storageStart,
      })
    } catch (error: any) {
      results.push({
        name: "Storage (Supabase)",
        status: "error",
        message: error.message || "Ошибка доступа к хранилищу",
        duration: Date.now() - storageStart,
      })
    }

    // 4. DeepSeek API Check
    const deepseekStart = Date.now()
    try {
      const response = await fetch("/api/deepseek", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departureCity: "Москва",
          destinationType: "country",
          countryCount: 1,
          budget: "medium",
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          travelStyle: "relaxed",
          companions: "solo",
          preferences: [],
          paymentMethods: ["card"],
          requireRussianGuide: true,
        }),
      })

      const duration = Date.now() - deepseekStart
      if (!response.ok) {
        const text = await response.text()
        throw new Error(`HTTP ${response.status}: ${text.slice(0, 100)}`)
      }

      // Don't wait for full response, just check if it starts
      results.push({
        name: "AI API (DeepSeek)",
        status: "success",
        message: "API отвечает (тестовый запрос)",
        duration,
      })
    } catch (error: any) {
      results.push({
        name: "AI API (DeepSeek)",
        status: "error",
        message: error.message || "Ошибка запроса к AI API",
        duration: Date.now() - deepseekStart,
      })
    }

    // 5. Image API Check
    const imageStart = Date.now()
    try {
      const response = await fetch("/api/image?query=Москва", {
        method: "GET",
      })
      const duration = Date.now() - imageStart
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      results.push({
        name: "Image API",
        status: "success",
        message: "API изображений работает",
        duration,
      })
    } catch (error: any) {
      results.push({
        name: "Image API",
        status: "error",
        message: error.message || "Ошибка Image API",
        duration: Date.now() - imageStart,
      })
    }

    // 6. App Settings Check
    const settingsStart = Date.now()
    try {
      const { data, error } = await supabase.from("app_settings").select("*").single()
      if (error) throw error
      results.push({
        name: "App Settings",
        status: "success",
        message: `Maintenance: ${data?.maintenance_mode ? "ВКЛ" : "ВЫКЛ"}`,
        duration: Date.now() - settingsStart,
      })
    } catch (error: any) {
      results.push({
        name: "App Settings",
        status: "error",
        message: error.message || "Ошибка чтения настроек",
        duration: Date.now() - settingsStart,
      })
    }

    setChecks(results)
    setRunning(false)
    toast.success("Проверки завершены")
  }

  useEffect(() => {
    // Auto-run on mount
    runChecks()
  }, [])

  const successCount = checks.filter((c) => c.status === "success").length
  const errorCount = checks.filter((c) => c.status === "error").length

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Activity className="h-8 w-8" />
              Тестирование системы
            </h1>
            <p className="text-muted-foreground">
              Проверка работоспособности API, БД, Storage и внешних провайдеров
            </p>
          </div>
          <Button onClick={runChecks} disabled={running}>
            {running ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Проверка...
              </>
            ) : (
              <>
                <Activity className="mr-2 h-4 w-4" />
                Запустить проверки
              </>
            )}
          </Button>
        </div>

        {checks.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Результаты</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div>
                  <div className="text-2xl font-bold text-green-500">{successCount}</div>
                  <div className="text-sm text-muted-foreground">Успешно</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-500">{errorCount}</div>
                  <div className="text-sm text-muted-foreground">Ошибок</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{checks.length}</div>
                  <div className="text-sm text-muted-foreground">Всего</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {checks.map((check, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {check.status === "pending" ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      ) : check.status === "success" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <h3 className="font-semibold">{check.name}</h3>
                      <Badge
                        variant={
                          check.status === "success"
                            ? "default"
                            : check.status === "error"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {check.status === "pending"
                          ? "Проверка..."
                          : check.status === "success"
                          ? "OK"
                          : "Ошибка"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground ml-8">{check.message}</p>
                    {check.duration !== undefined && (
                      <p className="text-xs text-muted-foreground ml-8 mt-1">
                        Время ответа: {check.duration}ms
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {checks.length === 0 && !running && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Нажмите "Запустить проверки" для начала тестирования
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
