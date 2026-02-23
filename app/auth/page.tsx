"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ModeToggle } from "@/components/mode-toggle"
import { ArrowRight, Loader2, Mail, Lock, User } from "lucide-react"
import { supabase, signInWithGoogle } from "@/lib/supabase"
import { toast } from "sonner"
import { motion } from "framer-motion"


function AuthContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "login")

  const isAdminSubdomain = typeof window !== "undefined" && window.location.host.startsWith("admin.")
  const defaultRedirect = isAdminSubdomain ? "/admin" : "/plan"

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) router.push(defaultRedirect)
    })
  }, [router, defaultRedirect])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error(error.message)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("preferences").eq("id", user.id).single()
        const next = searchParams.get("next")
        router.push(next || (profile?.preferences ? defaultRedirect : "/onboarding"))
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
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success("Регистрация успешна! Проверьте вашу почту.")
      localStorage.setItem("user", JSON.stringify({ email, name }))
      router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`)
    }
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    const { error } = await signInWithGoogle()
    if (error) toast.error(error.message)
  }

  const handleYandexLogin = () => {
    window.location.href = "/api/auth/yandex"
  }

  const handleVkLogin = () => {
    window.location.href = "/api/auth/vk"
  }

  const passwordStrength = (p: string) =>
    p.length > 8 ? (/[A-Z]/.test(p) && /[0-9]/.test(p) ? 4 : 3) : p.length > 5 ? 2 : 1

  const strengthLabel = (s: number) =>
    s === 4 ? "Отличный пароль" : s === 3 ? "Хороший пароль" : s === 2 ? "Средний пароль" : "Слабый пароль"

  const strengthColor = (s: number) =>
    s === 1 ? "bg-red-500" : s === 2 ? "bg-orange-400" : s === 3 ? "bg-yellow-400" : "bg-emerald-500"

  return (
    <div className="min-h-screen flex relative">
      {/* ── MOBILE background photo + overlay ── */}
      <div
        className="absolute inset-0 bg-cover bg-center lg:hidden"
        style={{ backgroundImage: "url('/auth-bg2.png')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/45 to-black/75 lg:hidden" />

      {/* ── LEFT PANEL — always dark, branded ── */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[55%] relative overflow-hidden flex-col bg-[#060612]">
        {/* Background photo */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/auth-bg2.png')" }}
        />
        {/* Bottom gradient for text readability */}
        <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />


        {/* Main content — pinned to bottom */}
        <div className="relative z-10 mt-auto px-10 xl:px-14 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-semibold mb-6 tracking-wide uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              AI Travel Assistant
            </div>

            {/* Heading */}
            <h1 className="text-4xl xl:text-5xl font-black text-white leading-[1.08] tracking-tight mb-4">
              Откройте мир<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-blue-300 via-blue-500 to-indigo-200">
                с AI‑гидом
              </span>
            </h1>
            <p className="text-base xl:text-lg text-white/75 leading-relaxed mb-8 max-w-sm">
              Персональные маршруты с реальными ценами на авиабилеты и отели — за секунды.
            </p>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 max-w-xs">
              {[
                { num: "10K+", label: "маршрутов" },
                { num: "50+", label: "стран" },
                { num: "4.9★", label: "рейтинг" },
              ].map((s) => (
                <div key={s.num} className="text-center p-3 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm">
                  <div className="text-lg font-black text-white">{s.num}</div>
                  <div className="text-[11px] text-white/55 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Bottom brand */}
          <div className="flex items-center gap-3 mt-8">
            <Logo size={22} />
            <span className="text-white/35 text-xs">TraveLLM · ваш AI-путеводитель</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL — theme-aware desktop / glass mobile ── */}
      <div className="flex-1 flex flex-col relative z-10 lg:bg-background min-h-screen">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 sm:px-8 pt-6">
          <div className="flex items-center gap-2 lg:hidden">
            <Logo size={28} />
            <span className="font-black text-lg text-white">TraveLLM</span>
          </div>
          <div className="lg:ml-auto">
            <ModeToggle />
          </div>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-8">
          {/* Glass card on mobile, plain on desktop */}
          <div className="w-full max-w-[400px] rounded-3xl p-6 sm:p-8
            bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl
            lg:p-0 lg:bg-transparent lg:backdrop-blur-none lg:border-0 lg:shadow-none">

            {/* Logo on desktop */}
            <div className="hidden lg:flex items-center gap-2.5 mb-8">
              <Logo size={32} />
              <span className="font-black text-xl text-foreground">TraveLLM</span>
            </div>

            {/* Dynamic heading */}
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-6"
            >
              <h2 className="text-2xl sm:text-3xl font-black text-white lg:text-foreground">
                {activeTab === "login" ? "С возвращением!" : "Добро пожаловать!"}
              </h2>
              <p className="text-white/70 lg:text-muted-foreground mt-1.5 text-sm sm:text-base">
                {activeTab === "login"
                  ? "Продолжите путешествие там, где остановились"
                  : "Создайте аккаунт и спланируйте первый маршрут"}
              </p>
            </motion.div>

            {/* OAuth buttons */}
            <div className="flex flex-col gap-3 mb-5">
              <Button
                variant="outline"
                className="w-full h-11 gap-3 font-semibold rounded-xl transition-all
                  bg-white/15 border-white/30 text-white hover:bg-white/25
                  lg:bg-transparent lg:border-border lg:text-foreground lg:hover:bg-accent"
                onClick={handleGoogleLogin}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Войти через Google
              </Button>

              {/*
              <Button
                variant="outline"
                className="w-full h-11 gap-3 font-semibold rounded-xl transition-all
                  bg-[#ffcc00]/20 border-[#ffcc00]/40 text-white hover:bg-[#ffcc00]/30
                  lg:bg-transparent lg:border-border lg:text-foreground lg:hover:bg-accent"
                onClick={handleYandexLogin}
              >
                <div className="h-5 w-5 shrink-0 rounded-full flex items-center justify-center bg-[#FF0000] text-white">
                  <span className="font-bold text-sm leading-none pt-[1px] font-sans pr-[1px]">Я</span>
                </div>
                Войти через Яндекс
              </Button>
              */}

              {/*
              <Button
                variant="outline"
                className="w-full h-11 gap-3 font-semibold rounded-xl transition-all
                  bg-[#0077FF]/20 border-[#0077FF]/40 text-white hover:bg-[#0077FF]/30
                  lg:bg-transparent lg:border-border lg:text-foreground lg:hover:bg-accent"
                onClick={handleVkLogin}
              >
                <div className="h-5 w-5 shrink-0 rounded-[4px] flex items-center justify-center bg-[#0077FF] text-white">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13.162 18.994c.609 0 .858-.406.851-.915-.031-1.917.714-2.949 2.059-1.604 1.488 1.488 1.796 2.519 3.603 2.519h3.2c.808 0 1.126-.26 1.126-.668 0-.863-1.421-2.386-2.625-3.504-1.686-1.543-1.724-1.6-1.02-2.813 2.06-3.486 3.384-4.67 3.141-5.469-.253-.836-1.3-.464-4.269-.464-1.42 0-1.924.915-2.22 1.573-.259.575-1.253 2.86-2.259 4.825-1.522 2.96-2.228 3.14-2.561 2.967-.333-.173-.273-1.036-.266-4.339.006-3.238-.458-3.98-1.421-4.232-.572-.15-1.002-.246-2.583-.284-2.022-.05-3.693.02-4.664.444-.805.35-1.365 1.134-1.009 1.19.464.073 1.293.284 1.765 1.054.493.805.474 2.56.474 2.56s.2 3.106-.576 3.538c-.775.433-1.908-1.122-4.14-5.01-.84-1.464-1.46-3.085-1.583-3.401-.176-.453-.418-1.528-1.844-1.528H.35C.13 5.422.015 5.568.005 5.76c-.012.235.19.658 2.073 3.606 3.841 6.012 7.724 9.628 11.084 9.628z"/>
                  </svg>
                </div>
                Войти через ВКонтакте
              </Button>
              */}
            </div>

            {/* Divider */}
            <div className="relative mb-5">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/20 lg:border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 text-[11px] uppercase tracking-widest font-medium
                  bg-transparent text-white/50
                  lg:bg-background lg:text-muted-foreground">
                  или через email
                </span>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-5 h-10 rounded-xl p-1
                bg-white/15 lg:bg-muted">
                <TabsTrigger
                  value="login"
                  className="rounded-lg text-sm font-semibold text-white/70
                    data-[state=active]:bg-white/25 data-[state=active]:text-white data-[state=active]:shadow-sm
                    lg:text-foreground/70 lg:data-[state=active]:bg-background lg:data-[state=active]:text-foreground"
                >
                  Войти
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="rounded-lg text-sm font-semibold text-white/70
                    data-[state=active]:bg-white/25 data-[state=active]:text-white data-[state=active]:shadow-sm
                    lg:text-foreground/70 lg:data-[state=active]:bg-background lg:data-[state=active]:text-foreground"
                >
                  Регистрация
                </TabsTrigger>
              </TabsList>

              {/* Login */}
              <TabsContent value="login" className="space-y-4 mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="login-email" className="text-sm font-medium text-white/80 lg:text-foreground">Email адрес</Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 h-4 w-4 text-white/50 lg:text-muted-foreground pointer-events-none" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-10 h-11 rounded-xl
                          bg-white/10 border-white/20 text-white placeholder:text-white/35
                          lg:bg-background lg:border-input lg:text-foreground lg:placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password" className="text-sm font-medium text-white/80 lg:text-foreground">Пароль</Label>
                      <Link href="/auth/reset-password" className="text-xs text-white/60 hover:text-white underline-offset-4 hover:underline lg:text-primary lg:hover:text-primary/80">
                        Забыли пароль?
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 h-4 w-4 text-white/50 lg:text-muted-foreground pointer-events-none" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pl-10 h-11 rounded-xl
                          bg-white/10 border-white/20 text-white placeholder:text-white/35
                          lg:bg-background lg:border-input lg:text-foreground lg:placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-11 rounded-xl font-bold" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Войти <ArrowRight className="ml-2 h-4 w-4" /></>}
                  </Button>
                </form>
              </TabsContent>

              {/* Signup */}
              <TabsContent value="signup" className="space-y-4 mt-0">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-name" className="text-sm font-medium text-white/80 lg:text-foreground">Как вас зовут?</Label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 h-4 w-4 text-white/50 lg:text-muted-foreground pointer-events-none" />
                      <Input
                        id="signup-name"
                        placeholder="Иван"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="pl-10 h-11 rounded-xl
                          bg-white/10 border-white/20 text-white placeholder:text-white/35
                          lg:bg-background lg:border-input lg:text-foreground lg:placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email" className="text-sm font-medium text-white/80 lg:text-foreground">Email адрес</Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 h-4 w-4 text-white/50 lg:text-muted-foreground pointer-events-none" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-10 h-11 rounded-xl
                          bg-white/10 border-white/20 text-white placeholder:text-white/35
                          lg:bg-background lg:border-input lg:text-foreground lg:placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-password" className="text-sm font-medium text-white/80 lg:text-foreground">Пароль</Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 h-4 w-4 text-white/50 lg:text-muted-foreground pointer-events-none" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pl-10 h-11 rounded-xl
                          bg-white/10 border-white/20 text-white placeholder:text-white/35
                          lg:bg-background lg:border-input lg:text-foreground lg:placeholder:text-muted-foreground"
                      />
                    </div>
                    {password && (
                      <div className="space-y-1 pt-1">
                        <div className="flex gap-1 h-1">
                          {[1, 2, 3, 4].map((level) => {
                            const s = passwordStrength(password)
                            return (
                              <div
                                key={level}
                                className={`flex-1 rounded-full transition-all duration-300 ${s >= level ? strengthColor(s) : "bg-white/20 lg:bg-muted"}`}
                              />
                            )
                          })}
                        </div>
                        <p className="text-xs text-right text-white/50 lg:text-muted-foreground">
                          {strengthLabel(passwordStrength(password))}
                        </p>
                      </div>
                    )}
                  </div>
                  <Button type="submit" className="w-full h-11 rounded-xl font-bold" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Создать аккаунт <ArrowRight className="ml-2 h-4 w-4" /></>}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <p className="mt-5 text-center text-xs text-white/45 lg:text-muted-foreground">
              Продолжая, вы соглашаетесь с{" "}
              <Link href="#" className="underline underline-offset-4 text-white/60 hover:text-white lg:text-muted-foreground lg:hover:text-foreground transition-colors">
                условиями использования
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 text-center">
          <p className="text-xs text-white/30 lg:text-muted-foreground/60">Privacy Policy · Terms of Service</p>
        </div>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <AuthContent />
    </Suspense>
  )
}
