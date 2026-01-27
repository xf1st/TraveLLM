"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Settings, Wrench, Save, AlertCircle } from "lucide-react"
import { toast } from "sonner"

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    maintenance_mode: false,
    maintenance_message: "",
    maintenance_allow_admin_bypass: true,
    maintenance_eta: "",
    ai_provider_deepseek_enabled: true,
    ai_provider_openrouter_enabled: true,
    generation_rate_limit_per_day: 10,
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from("app_settings").select("*").single()

      if (error) throw error

      if (data) {
        setSettings({
          maintenance_mode: data.maintenance_mode || false,
          maintenance_message: data.maintenance_message || "",
          maintenance_allow_admin_bypass: data.maintenance_allow_admin_bypass ?? true,
          maintenance_eta: data.maintenance_eta
            ? new Date(data.maintenance_eta).toISOString().slice(0, 16)
            : "",
          ai_provider_deepseek_enabled: data.ai_provider_deepseek_enabled ?? true,
          ai_provider_openrouter_enabled: data.ai_provider_openrouter_enabled ?? true,
          generation_rate_limit_per_day: data.generation_rate_limit_per_day || 10,
        })
      }
    } catch (error: any) {
      toast.error(`Ошибка загрузки: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Не авторизован")

      const updateData: any = {
        maintenance_mode: settings.maintenance_mode,
        maintenance_message: settings.maintenance_message || null,
        maintenance_allow_admin_bypass: settings.maintenance_allow_admin_bypass,
        ai_provider_deepseek_enabled: settings.ai_provider_deepseek_enabled,
        ai_provider_openrouter_enabled: settings.ai_provider_openrouter_enabled,
        generation_rate_limit_per_day: settings.generation_rate_limit_per_day,
      }

      if (settings.maintenance_eta) {
        updateData.maintenance_eta = new Date(settings.maintenance_eta).toISOString()
      } else {
        updateData.maintenance_eta = null
      }

      const { error } = await supabase.from("app_settings").update(updateData).eq("id", "id")

      if (error) throw error

      // Log to audit
      await supabase.from("admin_audit_log").insert({
        admin_user_id: user.id,
        action: "settings.update",
        payload: updateData,
      })

      toast.success("Настройки сохранены")
    } catch (error: any) {
      toast.error(`Ошибка сохранения: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">Загрузка...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Настройки
          </h1>
          <p className="text-muted-foreground">
            Глобальные настройки приложения, тех. работы, feature flags
          </p>
        </div>

        <div className="space-y-6">
          {/* Maintenance Mode */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Техническое обслуживание
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="maintenance_mode">Режим тех. работ</Label>
                  <p className="text-sm text-muted-foreground">
                    При включении всем пользователям показывается экран тех. работ
                  </p>
                </div>
                <Switch
                  id="maintenance_mode"
                  checked={settings.maintenance_mode}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, maintenance_mode: checked })
                  }
                />
              </div>

              {settings.maintenance_mode && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="maintenance_message">Сообщение для пользователей</Label>
                    <Textarea
                      id="maintenance_message"
                      value={settings.maintenance_message}
                      onChange={(e) =>
                        setSettings({ ...settings, maintenance_message: e.target.value })
                      }
                      placeholder="Мы проводим технические работы. Сервис будет доступен в ближайшее время."
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="maintenance_bypass">Разрешить админам обход</Label>
                      <p className="text-sm text-muted-foreground">
                        Админы смогут войти в админку даже во время тех. работ
                      </p>
                    </div>
                    <Switch
                      id="maintenance_bypass"
                      checked={settings.maintenance_allow_admin_bypass}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, maintenance_allow_admin_bypass: checked })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maintenance_eta">Ожидаемое время завершения</Label>
                    <Input
                      id="maintenance_eta"
                      type="datetime-local"
                      value={settings.maintenance_eta}
                      onChange={(e) =>
                        setSettings({ ...settings, maintenance_eta: e.target.value })
                      }
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* AI Providers */}
          <Card>
            <CardHeader>
              <CardTitle>AI провайдеры</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="deepseek_enabled">DeepSeek (основной)</Label>
                  <p className="text-sm text-muted-foreground">
                    Включить использование DeepSeek для генерации маршрутов
                  </p>
                </div>
                <Switch
                  id="deepseek_enabled"
                  checked={settings.ai_provider_deepseek_enabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, ai_provider_deepseek_enabled: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="openrouter_enabled">OpenRouter (резервный)</Label>
                  <p className="text-sm text-muted-foreground">
                    Включить использование OpenRouter как fallback
                  </p>
                </div>
                <Switch
                  id="openrouter_enabled"
                  checked={settings.ai_provider_openrouter_enabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, ai_provider_openrouter_enabled: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Rate Limits */}
          <Card>
            <CardHeader>
              <CardTitle>Лимиты генерации</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rate_limit">Максимум генераций на пользователя в день</Label>
                <Input
                  id="rate_limit"
                  type="number"
                  min="1"
                  max="100"
                  value={settings.generation_rate_limit_per_day}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      generation_rate_limit_per_day: parseInt(e.target.value) || 10,
                    })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  После превышения лимита пользователь не сможет создавать новые маршруты до
                  следующего дня
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} size="lg">
              {saving ? (
                <>
                  <AlertCircle className="mr-2 h-4 w-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Сохранить настройки
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
