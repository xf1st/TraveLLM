"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, ArrowRight, CheckCircle, RefreshCw } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { appToast as toast } from "@/components/ui/sonner"

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    const emailFromParams = searchParams.get("email")
    if (emailFromParams) {
      setEmail(emailFromParams)
    }
  }, [searchParams])

  const handleResendEmail = async () => {
    if (!email) {
      toast.error("Пожалуйста, введите ваш email")
      return
    }

    setIsResending(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      })

      if (error) {
        toast.error(error.message)
      } else {
        toast.success("Письмо подтверждения отправлено повторно!")
      }
    } catch (error) {
      toast.error("Произошла ошибка при отправке письма")
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-md px-4 py-12 md:py-20">
        <div className="mb-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <h1 className="mb-3 text-3xl font-bold">Подтвердите email</h1>
          <p className="text-muted-foreground">
            Мы отправили вам письмо со ссылкой для подтверждения регистрации
          </p>
        </div>

        <Card className="p-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="space-y-6">
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{email || "your@email.com"}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Проверьте вашу почту и перейдите по ссылке в письме для активации аккаунта
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                    Что дальше?
                  </p>
                  <ul className="text-blue-800 dark:text-blue-200 space-y-1 text-xs">
                    <li>• Откройте письмо от TraveLLM в вашей почте</li>
                    <li>• Нажмите на кнопку "Подтвердить email"</li>
                    <li>• Вы будете перенаправлены в приложение</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  Не получили письмо?
                </p>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleResendEmail}
                  disabled={isResending}
                >
                  {isResending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Отправляем...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Отправить повторно
                    </>
                  )}
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Или</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Введите email для повторной отправки</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ivan@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="text-center pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Уже подтвердили email?{" "}
                <Link 
                  href="/auth" 
                  className="text-primary hover:underline font-medium"
                >
                  Войти в аккаунт
                </Link>
              </p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground font-medium animate-pulse">Загрузка...</p>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}

