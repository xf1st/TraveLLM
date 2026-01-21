"use client"

import Link from "next/link"
import { Header } from "@/components/header"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Sparkles, Shield, Zap, Map, ChevronRight, Compass, Clock, Star, ArrowRight } from "lucide-react"
import Image from "next/image"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Skeleton } from "@/components/ui/skeleton"
import { TripImage } from "@/components/TripImage"

function ImageWithSkeleton({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [loaded, setLoaded] = useState(false)

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={`${className} ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
      />
      {!loaded && <Skeleton className="absolute inset-0 h-full w-full" />}
    </>
  )
}

export default function LandingPage() {
  const [user, setUser] = useState<any>(null)
  const [userTrips, setUserTrips] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)

      if (session?.user) {
        // Загружаем маршруты пользователя
        const { data: trips } = await supabase
          .from('trips')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(3)

        setUserTrips(trips || [])
      }

      setLoading(false)
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary/30 border-t-primary" />
      </div>
    )
  }

  // Персонализированная страница для авторизованных пользователей
  if (user) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />

        <main className="flex-1">
          {/* Персонализированный Hero */}
          <section className="relative overflow-hidden pt-16 pb-24 md:pt-24 md:pb-36">
            {/* Subtle gradient background */}
            <div className="absolute inset-0 -z-10">
              <div className="absolute top-0 right-1/4 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px]" />
            </div>

            <div className="container px-4 md:px-6">
              <div className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card px-5 py-2.5 text-sm font-medium shadow-sm">
                  <Sparkles className="h-4 w-4 text-primary" />
                  С возвращением, {user.user_metadata?.full_name || user.email?.split('@')[0]}!
                </div>

                <h1 className="text-4xl font-semibold tracking-tight md:text-6xl lg:text-7xl">
                  Ваши путешествия<br />
                  <span className="text-gradient">
                    продолжаются
                  </span>
                </h1>

                <p className="max-w-2xl text-lg text-muted-foreground md:text-xl mx-auto leading-relaxed">
                  Готовы к новому приключению? Создайте персонализированный маршрут или продолжите исследование уже запланированных поездок.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4 justify-center pt-4">
                  <Button asChild size="xl" className="rounded-full shadow-lg">
                    <Link href="/plan">
                      <Compass className="mr-2 h-5 w-5" />
                      Создать маршрут
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="rounded-full">
                    <Link href="/my-trips">
                      <Map className="mr-2 h-5 w-5" />
                      Мои поездки
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Последние маршруты */}
          {userTrips.length > 0 && (
            <section className="py-24 border-t border-border/50">
              <div className="container px-4">
                <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-4">
                  <div className="space-y-3">
                    <h2 className="text-3xl font-semibold md:text-4xl tracking-tight">Ваши последние маршруты</h2>
                    <p className="text-muted-foreground text-lg">Продолжайте планирование или создайте новые приключения</p>
                  </div>
                  <Button variant="ghost" className="text-primary font-medium group h-auto p-0">
                    Все маршруты <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {userTrips.map((trip, i) => (
                    <Card key={i} className="group overflow-hidden p-0 animate-in fade-in slide-in-from-bottom-8 duration-700 hover:-translate-y-1" style={{ animationDelay: `${i * 100}ms` }}>
                      <div className="relative aspect-[4/3] w-full overflow-hidden">
                        <TripImage
                          src={trip.image_url}
                          query={trip.destination || trip.title}
                          alt={trip.title}
                          className="h-full w-full group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium z-10">
                          {trip.destination}
                        </div>
                      </div>
                      <div className="p-5">
                        <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">{trip.title}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-4">
                          <Clock className="h-3.5 w-3.5" /> {trip.duration || '7 дней'}
                        </p>
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`h-3.5 w-3.5 ${i < (trip.rating || 5) ? 'fill-primary text-primary' : 'text-muted'}`} />
                          ))}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Быстрые действия */}
          <section className="container px-4 py-24">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-semibold md:text-4xl mb-4 tracking-tight">Быстрые действия</h2>
              <p className="text-muted-foreground text-lg">Все необходимые инструменты для планирования путешествий</p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: <Compass className="h-6 w-6" />,
                  title: "Новый маршрут",
                  desc: "Создайте персонализированный план путешествия",
                  href: "/plan",
                  gradient: "from-blue-500 to-cyan-500"
                },
                {
                  icon: <Map className="h-6 w-6" />,
                  title: "Мои поездки",
                  desc: "Управляйте сохраненными маршрутами",
                  href: "/my-trips",
                  gradient: "from-emerald-500 to-teal-500"
                },
                {
                  icon: <Star className="h-6 w-6" />,
                  title: "Популярные места",
                  desc: "Откройте для себя новые направления",
                  href: "/results",
                  gradient: "from-violet-500 to-purple-500"
                },
                {
                  icon: <Zap className="h-6 w-6" />,
                  title: "AI гид",
                  desc: "Получите умные рекомендации",
                  href: "/trip/ai",
                  gradient: "from-orange-500 to-amber-500"
                }
              ].map((action, i) => (
                <Card
                  key={i}
                  className="group cursor-pointer hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-8 duration-700"
                  style={{ animationDelay: `${i * 75}ms` }}
                  onClick={() => window.location.href = action.href}
                >
                  <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${action.gradient} text-white shadow-lg transition-transform group-hover:scale-110`}>
                    {action.icon}
                  </div>
                  <h3 className="mb-2 text-lg font-semibold tracking-tight">{action.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{action.desc}</p>
                </Card>
              ))}
            </div>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header floating />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-28 pb-24 md:pt-36 md:pb-36 lg:pt-44 lg:pb-44">
          {/* Subtle gradient backgrounds */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 right-1/4 h-[600px] w-[600px] rounded-full bg-primary/5 blur-[150px]" />
            <div className="absolute bottom-0 left-1/4 h-[400px] w-[400px] rounded-full bg-primary/3 blur-[120px]" />
          </div>

          <div className="container px-4 md:px-6">
            <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-12">
              {/* Left Column: Text Content */}
              <div className="flex-1 text-center lg:text-left space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000">
                <div className="inline-flex items-center gap-2.5 rounded-full border border-border/50 bg-card px-5 py-2.5 text-sm font-medium shadow-sm">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Интеллектуальное планирование путешествий
                </div>

                <h1 className="text-5xl font-semibold tracking-tight md:text-6xl lg:text-7xl leading-[1.1]">
                  Вдохновляем вас <br />
                  <span className="text-foreground">путешествовать</span> <br />
                  <span className="text-gradient italic">
                    умнее и дальше
                  </span>
                </h1>

                <p className="max-w-xl text-lg text-muted-foreground md:text-xl leading-relaxed mx-auto lg:mx-0">
                  TraveLM — это ваш личный ИИ-архитектор приключений, который превращает
                  ваши мечты в идеально выверенные маршруты за несколько секунд.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start pt-2">
                  <Button asChild size="xl" className="rounded-full shadow-lg">
                    <Link href="/auth">Начать приключение <ArrowRight className="ml-2 h-5 w-5" /></Link>
                  </Button>
                  <Button asChild variant="ghost" size="lg" className="rounded-full">
                    <Link href="#features">Узнать больше</Link>
                  </Button>
                </div>
              </div>

              {/* Right Column: Hero Image */}
              <div className="flex-1 relative w-full max-w-[560px] lg:max-w-none animate-in fade-in zoom-in-95 duration-1000 delay-200">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl shadow-2xl ring-1 ring-border/10">
                  <Image
                    src="https://loremflickr.com/1200/900/travel,scenery,sunset/all"
                    alt="Beautiful World"
                    fill
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                </div>

                {/* Floating Social Proof Card */}
                <Card className="absolute -bottom-6 -left-6 md:left-auto md:-right-6 p-5 shadow-xl backdrop-blur-md flex items-center gap-4 animate-in slide-in-from-bottom-8 duration-700 delay-500">
                  <div className="flex -space-x-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-11 w-11 rounded-full border-2 border-background overflow-hidden bg-muted">
                        <img src={`https://i.pravatar.cc/100?u=${i}`} alt="user" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="text-xl font-semibold tracking-tight">100k+</div>
                    <div className="text-xs text-muted-foreground font-medium">счастливых туристов</div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Popular Places Section */}
        <section className="py-24 border-t border-border/50">
          <div className="container px-4">
            <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-4">
              <div className="space-y-3">
                <h2 className="text-3xl font-semibold md:text-4xl tracking-tight">Популярные места</h2>
                <p className="text-muted-foreground text-lg">Направления, которые выбирают наши путешественники</p>
              </div>
              <Button variant="ghost" className="text-primary font-medium group h-auto p-0">
                Все направления <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Дубай: Пустынное Сафари",
                  country: "ОАЭ",
                  duration: "7 дней / 6 ночей",
                  rating: 5,
                  image: "https://loremflickr.com/600/400/dubai,desert/all"
                },
                {
                  title: "Бали: Путь к Дзену",
                  country: "Индонезия",
                  duration: "9 дней / 8 ночей",
                  rating: 5,
                  image: "https://loremflickr.com/600/400/bali,resort/all"
                },
                {
                  title: "Мальдивы: Магия Океана",
                  country: "Мальдивы",
                  duration: "8 дней / 7 ночей",
                  rating: 5,
                  image: "https://loremflickr.com/600/400/maldives,beach/all"
                }
              ].map((d, i) => (
                <Card key={i} className="group overflow-hidden p-0 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-8 duration-700" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="relative aspect-[4/3] w-full overflow-hidden">
                    <img
                      src={d.image}
                      alt={d.title}
                      className="object-cover h-full w-full transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium">
                      {d.country}
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">{d.title}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-4">
                      <Map className="h-3.5 w-3.5" /> {d.duration}
                    </p>
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Sparkles key={i} className={`h-3.5 w-3.5 ${i < d.rating ? 'fill-primary text-primary' : 'text-muted'}`} />
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Why TraveLM Section */}
        <section id="features" className="container px-4 py-24 md:py-32">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="lg:w-1/3 text-center lg:text-left space-y-6">
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Почему выбирают нас?</h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Мы объединили мощь современных нейросетей с глубоким пониманием потребностей современного исследователя мира.
              </p>
              <div className="pt-4">
                <div className="flex items-center gap-8 justify-center lg:justify-start">
                  <div className="flex flex-col items-center lg:items-start">
                    <span className="text-4xl font-semibold tracking-tight">10k+</span>
                    <span className="text-sm text-muted-foreground font-medium">Юзеров</span>
                  </div>
                  <div className="h-12 w-px bg-border" />
                  <div className="flex flex-col items-center lg:items-start">
                    <span className="text-4xl font-semibold tracking-tight">50k+</span>
                    <span className="text-sm text-muted-foreground font-medium">Маршрутов</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:w-2/3 grid gap-5 sm:grid-cols-2">
              {[
                {
                  icon: <Zap className="h-6 w-6" />,
                  title: "Мгновенная генерация",
                  desc: "Создайте детальный план на 14 дней за считанные секунды.",
                  gradient: "from-amber-500 to-orange-500"
                },
                {
                  icon: <Shield className="h-6 w-6" />,
                  title: "Персонализация",
                  desc: "Учет диет, религии и личных интересов в каждом пункте.",
                  gradient: "from-emerald-500 to-teal-500"
                },
                {
                  icon: <Map className="h-6 w-6" />,
                  title: "Локальный опыт",
                  desc: "Секретные места, о которых знают только местные жители.",
                  gradient: "from-blue-500 to-cyan-500"
                },
                {
                  icon: <Sparkles className="h-6 w-6" />,
                  title: "Культурный код",
                  desc: "Глубокое понимание менталитета и особенностей региона.",
                  gradient: "from-violet-500 to-purple-500"
                }
              ].map((f, i) => (
                <Card key={i} className="group hover:-translate-y-1 animate-in fade-in slide-in-from-right-8 duration-700" style={{ animationDelay: `${i * 75}ms` }}>
                  <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.gradient} text-white shadow-lg transition-transform group-hover:scale-110`}>
                    {f.icon}
                  </div>
                  <h3 className="mb-2 text-lg font-semibold tracking-tight">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="container px-4 py-24">
          <Card className="relative overflow-hidden bg-foreground text-background p-12 md:p-20 text-center border-0">
            {/* Subtle glow effects */}
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 h-[400px] w-[400px] rounded-full bg-primary/20 blur-[150px]" />
            <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 h-[300px] w-[300px] rounded-full bg-primary/10 blur-[120px]" />

            <div className="relative z-10 max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <h2 className="text-4xl font-semibold md:text-5xl tracking-tight leading-tight">
                Готовы исследовать <br />
                мир вместе с ИИ?
              </h2>
              <p className="text-background/70 text-lg md:text-xl leading-relaxed">
                Присоединяйтесь к тысячам путешественников, которые уже доверяют нам
                создание своих идеальных маршрутов. Бесплатно.
              </p>
              <Button asChild size="xl" className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl">
                <Link href="/auth">Начать сейчас <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
            </div>
          </Card>
        </section>
      </main>

      <footer className="py-12 border-t border-border/50">
        <div className="container px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2.5">
              <Logo size={36} />
              <span className="text-xl font-semibold tracking-tight">TraveLM</span>
            </div>

            <nav className="flex gap-8 text-sm font-medium text-muted-foreground">
              <Link href="#" className="hover:text-foreground transition-colors">Обзор</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Помощь</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Политика</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Контакты</Link>
            </nav>

            <p className="text-sm text-muted-foreground">
              © 2026 TraveLM AI. Все права защищены.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
