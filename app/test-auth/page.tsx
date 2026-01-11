"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

export default function TestAuthPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [testResults, setTestResults] = useState<any[]>([])

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      setLoading(false)
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const testLogout = async () => {
    setTestResults([])
    
    try {
      // Тестируем выход
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        setTestResults([{
          type: 'error',
          message: `Ошибка при выходе: ${error.message}`,
          icon: <XCircle className="h-5 w-5 text-red-500" />
        }])
      } else {
        setTestResults([{
          type: 'success',
          message: 'Выход выполнен успешно!',
          icon: <CheckCircle className="h-5 w-5 text-green-500" />
        }])
        
        // Очищаем localStorage
        localStorage.removeItem("user")
        
        // Проверяем состояние после выхода
        setTimeout(async () => {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) {
            setTestResults(prev => [...prev, {
              type: 'success',
              message: 'Сессия успешно очищена',
              icon: <CheckCircle className="h-5 w-5 text-green-500" />
            }])
          } else {
            setTestResults(prev => [...prev, {
              type: 'error',
              message: 'Сессия не была очищена',
              icon: <XCircle className="h-5 w-5 text-red-500" />
            }])
          }
        }, 1000)
      }
    } catch (error) {
      setTestResults([{
        type: 'error',
        message: `Произошла ошибка: ${error}`,
        icon: <XCircle className="h-5 w-5 text-red-500" />
      }])
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container max-w-2xl px-4 py-12">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Тестирование аутентификации</h1>
            <p className="text-muted-foreground">Проверка работы входа и выхода из системы</p>
          </div>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Текущий статус</h2>
            {user ? (
              <div className="space-y-2">
                <p><strong>Пользователь авторизован:</strong> ✅</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>ID:</strong> {user.id}</p>
                <p><strong>Создан:</strong> {new Date(user.created_at).toLocaleString()}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p><strong>Пользователь авторизован:</strong> ❌</p>
                <p className="text-muted-foreground">Вы не вошли в систему</p>
              </div>
            )}
          </Card>

          {user && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Тестирование выхода</h2>
              <Button onClick={testLogout} className="w-full">
                Тестировать выход
              </Button>
              
              {testResults.length > 0 && (
                <div className="mt-4 space-y-2">
                  {testResults.map((result, index) => (
                    <div key={index} className={`flex items-center gap-2 p-3 rounded-lg ${
                      result.type === 'success' ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20'
                    }`}>
                      {result.icon}
                      <span className={result.type === 'success' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
                        {result.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Действия</h2>
            <div className="space-y-2">
              {user ? (
                <Button variant="outline" className="w-full" onClick={() => window.location.href = "/auth"}>
                  Перейти на страницу входа
                </Button>
              ) : (
                <Button className="w-full" onClick={() => window.location.href = "/auth"}>
                  Войти в аккаунт
                </Button>
              )}
              <Button variant="ghost" className="w-full" onClick={() => window.location.href = "/"}>
                На главную
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}
