"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowRight, Map } from "lucide-react"
import { supabase, signInWithGoogle } from "@/lib/supabase"
import { toast } from "sonner"

export default function AuthPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        router.push("/plan")
      }
    })
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      toast.error(error.message)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Check if profile exists and has preferences
        const { data: profile } = await supabase
          .from('profiles')
          .select('preferences')
          .eq('id', user.id)
          .single()

        if (profile?.preferences) {
          router.push("/plan")
        } else {
          router.push("/onboarding")
        }
      } else {
        router.push("/onboarding")
      }
      localStorage.setItem("user", JSON.stringify({ email, name: "Пользователь" }))
    }
    setLoading(false)
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name }
      }
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success("Регистрация успешна! Проверьте вашу почту для подтверждения аккаунта.")
      localStorage.setItem("user", JSON.stringify({ email, name }))
      // Перенаправляем на страницу подтверждения email
      router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`)
    }
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    const { error } = await signInWithGoogle()
    if (error) toast.error(error.message)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-md px-4 py-16 md:py-24">
        {/* Logo & Title */}
        <div className="mb-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary mb-6 shadow-lg">
            <Map className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="mb-3 text-3xl font-semibold tracking-tight">Добро пожаловать</h1>
          <p className="text-muted-foreground">Войдите или создайте аккаунт для продолжения</p>
        </div>

        <Card className="p-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          {/* Google Login */}
          <Button
            variant="outline"
            className="w-full gap-3 h-12 font-medium"
            onClick={handleGoogleLogin}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Войти через Google
          </Button>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-3 text-muted-foreground font-medium">Или используйте email</span>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login">Вход</TabsTrigger>
              <TabsTrigger value="signup">Регистрация</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="ivan@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-sm font-medium">Пароль</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full h-12" disabled={loading}>
                  {loading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <>
                      Войти
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-sm font-medium">Имя</Label>
                  <Input
                    id="signup-name"
                    placeholder="Иван"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="ivan@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm font-medium">Пароль</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full h-12" disabled={loading}>
                  {loading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <>
                      Создать аккаунт
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Продолжая, вы соглашаетесь с{" "}
          <Link href="#" className="text-primary hover:underline underline-offset-4">
            условиями использования
          </Link>
        </p>
      </main>
    </div>
  )
}
