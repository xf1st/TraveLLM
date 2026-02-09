"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowRight, Loader2, Mail, Lock, User } from "lucide-react"
import { supabase, signInWithGoogle } from "@/lib/supabase"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

function AuthContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const defaultTab = searchParams.get('tab') || 'login'

  // Check if on admin subdomain
  const isAdminSubdomain = typeof window !== 'undefined' && window.location.host.startsWith('admin.')
  const defaultRedirect = isAdminSubdomain ? '/admin' : '/plan'

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        router.push(defaultRedirect)
      }
    })
  }, [router, defaultRedirect])

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
          router.push(defaultRedirect)
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
    <div className="min-h-screen bg-black text-white selection:bg-primary/30 flex flex-col">
      <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-zinc-900 to-black pointer-events-none" />

      <div className="relative z-10 w-full">
        <Header />
      </div>

      <main className="container relative z-10 max-w-md px-4 py-20 flex-1 flex flex-col justify-center">
        {/* Logo & Title */}
        <div className="mb-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="inline-flex mb-8 p-4 rounded-full bg-white/5 border border-white/5 backdrop-blur-xl shadow-2xl">
            <Logo size={48} />
          </div>
          <h1 className="mb-3 text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-500">
            Добро пожаловать
          </h1>
          <p className="text-zinc-400 text-lg">Войдите, чтобы продолжить путешествие</p>
        </div>

        <Card className="p-1 animate-in fade-in slide-in-from-bottom-8 duration-700 bg-zinc-900/50 backdrop-blur-2xl border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
          <div className="p-7">
            {/* Google Login */}
            <Button
              variant="outline"
              className="w-full gap-3 h-14 font-bold rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-white hover:text-white transition-all hover:scale-[1.02]"
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
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-widest">
                <span className="bg-[#121214] px-3 text-zinc-500 font-bold">Или</span>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-zinc-800/50 p-1 rounded-xl h-12">
                <TabsTrigger value="login" className="rounded-lg font-bold data-[state=active]:bg-zinc-700 data-[state=active]:text-white data-[state=active]:shadow-md">Вход</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-lg font-bold data-[state=active]:bg-zinc-700 data-[state=active]:text-white data-[state=active]:shadow-md">Регистрация</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="animate-in fade-in slide-in-from-right-4 duration-300">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-zinc-400 font-medium ml-1">Email</Label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-3.5 h-5 w-5 text-zinc-500 group-focus-within:text-primary transition-colors" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-12 h-12 bg-zinc-800/50 border-white/5 rounded-xl text-lg focus:border-primary/50 focus:ring-primary/20 transition-all placeholder:text-zinc-600"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password" className="text-zinc-400 font-medium ml-1">Пароль</Label>
                      <Link href="/auth/reset-password" className="text-xs text-primary hover:text-primary/80 transition-colors">
                        Забыли пароль?
                      </Link>
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-3.5 h-5 w-5 text-zinc-500 group-focus-within:text-primary transition-colors" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pl-12 h-12 bg-zinc-800/50 border-white/5 rounded-xl text-lg focus:border-primary/50 focus:ring-primary/20 transition-all placeholder:text-zinc-600"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-14 rounded-xl text-lg font-bold bg-white text-black hover:bg-zinc-200 mt-4 shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all hover:scale-[1.02]" disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Войти
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="animate-in fade-in slide-in-from-right-4 duration-300">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-zinc-400 font-medium ml-1">Имя</Label>
                    <div className="relative group">
                      <User className="absolute left-4 top-3.5 h-5 w-5 text-zinc-500 group-focus-within:text-primary transition-colors" />
                      <Input
                        id="signup-name"
                        placeholder="Иван"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="pl-12 h-12 bg-zinc-800/50 border-white/5 rounded-xl text-lg focus:border-primary/50 focus:ring-primary/20 transition-all placeholder:text-zinc-600"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-zinc-400 font-medium ml-1">Email</Label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-3.5 h-5 w-5 text-zinc-500 group-focus-within:text-primary transition-colors" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-12 h-12 bg-zinc-800/50 border-white/5 rounded-xl text-lg focus:border-primary/50 focus:ring-primary/20 transition-all placeholder:text-zinc-600"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-zinc-400 font-medium ml-1">Пароль</Label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-3.5 h-5 w-5 text-zinc-500 group-focus-within:text-primary transition-colors" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pl-12 h-12 bg-zinc-800/50 border-white/5 rounded-xl text-lg focus:border-primary/50 focus:ring-primary/20 transition-all placeholder:text-zinc-600"
                      />
                    </div>
                    {/* Password Strength Indicator */}
                    {password && (
                      <div className="space-y-1 mt-2">
                        <div className="flex gap-1 h-1">
                          {[1, 2, 3, 4].map((level) => {
                            const strength = password.length > 8 ? (/[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3) : (password.length > 5 ? 2 : 1);
                            const active = strength >= level;
                            const color = strength === 1 ? 'bg-red-500' : strength === 2 ? 'bg-orange-500' : strength === 3 ? 'bg-yellow-500' : 'bg-emerald-500';
                            return (
                              <div key={level} className={`flex-1 rounded-full transition-all duration-300 ${active ? color : 'bg-white/10'}`} />
                            )
                          })}
                        </div>
                        <p className="text-xs text-right text-zinc-500">
                          {password.length > 8 && /[A-Z]/.test(password) && /[0-9]/.test(password) ? 'Отличный пароль' :
                            password.length > 8 ? 'Хороший пароль' :
                              password.length > 5 ? 'Средний пароль' : 'Слабый пароль'}
                        </p>
                      </div>
                    )}
                  </div>
                  <Button type="submit" className="w-full h-14 rounded-xl text-lg font-bold bg-white text-black hover:bg-zinc-200 mt-4 shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all hover:scale-[1.02]" disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Создать аккаунт
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </Card>

        <p className="mt-8 text-center text-sm text-zinc-500">
          Продолжая, вы соглашаетесь с{" "}
          <Link href="#" className="text-zinc-300 hover:text-white hover:underline underline-offset-4 transition-colors">
            условиями использования
          </Link>
        </p>
      </main>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <AuthContent />
    </Suspense>
  )
}
