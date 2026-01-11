"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, RefreshCw, Activity, Key, Database } from "lucide-react"

interface HealthStatus {
  status: string
  timestamp: string
  environment: {
    NODE_ENV: string
    GROQ_API_KEY_EXISTS: boolean
    HUGGING_FACE_TOKEN_EXISTS: boolean
    NEXT_PUBLIC_SUPABASE_URL_EXISTS: boolean
    NEXT_PUBLIC_SUPABASE_ANON_KEY_EXISTS: boolean
  }
  api_endpoints: {
    groq: string
    health: string
  }
  dependencies: {
    groq_sdk: string
    huggingface: string
    supabase: string
  }
}

export default function ApiStatusPage() {
  const [healthData, setHealthData] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHealth = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/health")
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      setHealthData(data)
    } catch (err: any) {
      setError(err.message)
      console.error("Health check failed:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealth()
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  const testGroqAPI = async () => {
    try {
      const response = await fetch("/api/groq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departureCity: "Москва",
          destinationType: "abroad",
          countryCount: "1",
          budget: "comfort",
          startDate: "2024-06-01",
          endDate: "2024-06-07",
          travelStyle: ["culture"],
          companions: "couple",
          preferences: {},
          paymentMethods: ["card"],
          requireRussianGuide: false
        })
      })

      const result = await response.json()
      alert(response.ok ? "✅ Groq API работает!" : `❌ Ошибка: ${result.error || response.statusText}`)
    } catch (err: any) {
      alert(`❌ Ошибка запроса: ${err.message}`)
    }
  }

  if (loading && !healthData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Загрузка статуса API...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-6 max-w-md">
          <div className="flex items-center gap-3 text-destructive mb-4">
            <XCircle className="h-6 w-6" />
            <span className="font-semibold">Ошибка API</span>
          </div>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchHealth} className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Попробовать снова
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Статус API TraveLM</h1>
          <p className="text-muted-foreground">
            Мониторинг работоспособности API endpoints и переменных окружения
          </p>
        </div>

        {healthData && (
          <div className="space-y-6">
            {/* Overall Status */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Activity className="h-6 w-6" />
                  <span className="font-semibold">Общий статус</span>
                </div>
                <Badge variant={healthData.status === "ok" ? "default" : "destructive"}>
                  {healthData.status === "ok" ? "Работает" : "Ошибка"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Последняя проверка: {new Date(healthData.timestamp).toLocaleString("ru-RU")}
              </p>
            </Card>

            {/* Environment Variables */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Key className="h-6 w-6" />
                <span className="font-semibold">Переменные окружения</span>
              </div>
              <div className="grid gap-3">
                {Object.entries(healthData.environment).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="font-mono text-sm">{key}</span>
                    <Badge variant={value ? "default" : "destructive"}>
                      {value ? "✅ Есть" : "❌ Отсутствует"}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            {/* API Endpoints */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Database className="h-6 w-6" />
                <span className="font-semibold">API Endpoints</span>
              </div>
              <div className="space-y-2">
                {Object.entries(healthData.api_endpoints).map(([name, desc]) => (
                  <div key={name} className="p-3 rounded-lg border">
                    <div className="font-mono text-sm mb-1">{name}</div>
                    <div className="text-sm text-muted-foreground">{desc}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Test Button */}
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold mb-1">Тестирование Groq API</h3>
                  <p className="text-sm text-muted-foreground">
                    Проверить работу генерации маршрутов с тестовыми данными
                  </p>
                </div>
                <Button onClick={testGroqAPI} disabled={loading}>
                  {loading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Тестировать
                </Button>
              </div>
            </Card>

            {/* Refresh Button */}
            <div className="flex justify-center">
              <Button onClick={fetchHealth} variant="outline" size="lg">
                <RefreshCw className="h-4 w-4 mr-2" />
                Обновить статус
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
