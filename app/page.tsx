"use client"

import Link from "next/link"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Sparkles, Shield, Zap, Map, ChevronRight, Compass, Clock, Star } from "lucide-react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

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
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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
          <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32">
            <div className="container px-4 md:px-6">
              <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                  <Sparkles className="h-4 w-4" />
                  С возвращением, {user.user_metadata?.full_name || user.email?.split('@')[0]}!
                </div>
                
                <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl">
                  Ваши путешествия<br />
                  <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    продолжаются
                  </span>
                </h1>
                
                <p className="max-w-2xl text-lg text-muted-foreground md:text-xl mx-auto">
                  Готовы к новому приключению? Создайте персонализированный маршрут или продолжите исследование уже запланированных поездок.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center gap-4 justify-center pt-4">
                  <Button asChild size="lg" className="h-14 px-10 text-lg font-bold rounded-full transition-all hover:scale-105 shadow-xl shadow-primary/20">
                    <Link href="/plan">
                      <Compass className="mr-2 h-5 w-5" />
                      Создать маршрут
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" size="lg" className="h-14 px-8 text-lg font-medium hover:bg-primary/5">
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
            <section className="bg-muted/30 py-24">
              <div className="container px-4">
                <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-4">
                  <div className="space-y-2">
                    <h2 className="text-3xl font-extrabold md:text-5xl tracking-tight">Ваши последние маршруты</h2>
                    <p className="text-muted-foreground text-lg">Продолжайте планирование или создайте новые приключения</p>
                  </div>
                  <Button variant="link" className="text-primary font-bold text-lg group h-auto p-0">
                    Все маршруты <ChevronRight className="ml-1 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </div>

                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {userTrips.map((trip, i) => (
                    <Card key={i} className="group relative overflow-hidden rounded-3xl border-none shadow-lg transition-all hover:shadow-2xl hover:-translate-y-2 flex flex-col h-full bg-background animate-in fade-in slide-in-from-bottom-8 duration-700" style={{ animationDelay: `${i * 150}ms` }}>
                      <div className="relative aspect-[4/3] w-full overflow-hidden">
                        <img
                          src={trip.image_url || `https://loremflickr.com/600/400/${trip.destination},travel/all`}
                          alt={trip.title}
                          className="object-cover h-full w-full transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          {trip.destination}
                        </div>
                      </div>
                      <div className="p-6 flex flex-col flex-1 justify-between">
                        <div>
                          <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors leading-tight">{trip.title}</h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1 font-medium mb-4">
                            <Clock className="h-3 w-3" /> {trip.duration || '7 дней'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`h-3 w-3 ${i < (trip.rating || 5) ? 'fill-primary text-primary' : 'text-muted'}`} />
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
            <div className="text-center mb-16">
              <h2 className="text-3xl font-extrabold md:text-4xl mb-4">Быстрые действия</h2>
              <p className="text-muted-foreground text-lg">Все необходимые инструменты для планирования путешествий</p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: <Compass className="h-6 w-6" />,
                  title: "Новый маршрут",
                  desc: "Создайте персонализированный план путешествия",
                  href: "/plan",
                  color: "bg-blue-500"
                },
                {
                  icon: <Map className="h-6 w-6" />,
                  title: "Мои поездки",
                  desc: "Управляйте сохраненными маршрутами",
                  href: "/my-trips",
                  color: "bg-green-500"
                },
                {
                  icon: <Star className="h-6 w-6" />,
                  title: "Популярные места",
                  desc: "Откройте для себя новые направления",
                  href: "/results",
                  color: "bg-purple-500"
                },
                {
                  icon: <Zap className="h-6 w-6" />,
                  title: "AI гид",
                  desc: "Получите умные рекомендации",
                  href: "/trip/ai",
                  color: "bg-orange-500"
                }
              ].map((action, i) => (
                <Card key={i} className="group p-6 transition-all hover:bg-primary/[0.03] border border-white/10 dark:border-white/5 shadow-xl hover:shadow-2xl rounded-[2rem] animate-in fade-in slide-in-from-bottom-8 duration-700 backdrop-blur-sm bg-white/40 dark:bg-white/5 cursor-pointer" style={{ animationDelay: `${i * 100}ms` }} onClick={() => window.location.href = action.href}>
                  <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg text-white transition-transform group-hover:scale-110 group-hover:rotate-6" style={{ backgroundColor: action.color.replace('500', '600') }}>
                    {action.icon}
                  </div>
                  <h3 className="mb-3 text-2xl font-bold tracking-tight">{action.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm font-medium">{action.desc}</p>
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
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32 lg:pt-28 lg:pb-36">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
              {/* Left Column: Text Content */}
              <div className="flex-1 text-center lg:text-left space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                  <Sparkles className="h-4 w-4" />
                  Интеллектуальное планирование путешествий
                </div>

                <h1 className="text-5xl font-extrabold tracking-tight md:text-7xl lg:text-8xl leading-[1.1]">
                  Вдохновляем вас <br />
                  <span className="text-foreground">путешествовать</span> <br />
                  <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent italic">
                    умнее и дальше
                  </span>
                </h1>

                <p className="max-w-2xl text-lg text-muted-foreground md:text-xl leading-relaxed mx-auto lg:mx-0">
                  В современном быстро меняющемся мире важно быть на шаг впереди.
                  TraveLM — это ваш личный ИИ-архитектор приключений, который превращает
                  ваши мечты в идеально выверенные маршруты за несколько секунд.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start pt-4">
                  <Button asChild size="lg" className="h-14 px-10 text-lg font-bold rounded-full transition-all hover:scale-105 shadow-xl shadow-primary/20">
                    <Link href="/auth">Начать приключение <ChevronRight className="ml-2 h-5 w-5" /></Link>
                  </Button>
                  <Button asChild variant="ghost" size="lg" className="h-14 px-8 text-lg font-medium hover:bg-primary/5">
                    <Link href="#features">Узнать больше</Link>
                  </Button>
                </div>
              </div>

              {/* Right Column: Hero Image with Organic Shape */}
              <div className="flex-1 relative w-full max-w-[600px] lg:max-w-none animate-in fade-in zoom-in-95 duration-1000 delay-200">
                <div
                  className="relative aspect-[16/10] w-full overflow-hidden shadow-2xl shadow-primary/20 ring-1 ring-white/20 backdrop-blur-3xl"
                  style={{
                    clipPath: "polygon(0 20%, 35% 20%, 35% 0, 100% 0, 100% 80%, 75% 80%, 75% 100%, 0 100%)",
                    borderRadius: "2.5rem"
                  }}
                >
                  <Image
                    src="https://loremflickr.com/1200/800/travel,scenery,sunset/all"
                    alt="Beautiful World"
                    fill
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </div>

                {/* Social Proof Card Floating */}
                <Card className="absolute -bottom-6 -right-6 md:right-0 p-4 shadow-2xl border-none bg-background/90 backdrop-blur-md flex items-center gap-4 animate-in slide-in-from-bottom-8 duration-700 delay-500 rounded-2xl">
                  <div className="flex -space-x-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-10 w-10 rounded-full border-2 border-background overflow-hidden bg-muted">
                        <img src={`https://i.pravatar.cc/100?u=${i}`} alt="user" />
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="text-lg font-bold tracking-tight">100k+</div>
                    <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">счастливых туристов</div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Popular Places Section */}
        <section className="bg-muted/30 py-24">
          <div className="container px-4">
            <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-4">
              <div className="space-y-2">
                <h2 className="text-3xl font-extrabold md:text-5xl tracking-tight">Популярные места</h2>
                <p className="text-muted-foreground text-lg">Направления, которые выбирают наши путешественники</p>
              </div>
              <Button variant="link" className="text-primary font-bold text-lg group h-auto p-0">
                Все направления <ChevronRight className="ml-1 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
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
                <Card key={i} className="group relative overflow-hidden rounded-3xl border-none shadow-lg transition-all hover:shadow-2xl hover:-translate-y-2 flex flex-col h-full bg-background animate-in fade-in slide-in-from-bottom-8 duration-700" style={{ animationDelay: `${i * 150}ms` }}>
                  <div className="relative aspect-[4/3] w-full overflow-hidden">
                    <img
                      src={d.image}
                      alt={d.title}
                      className="object-cover h-full w-full transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      {d.country}
                    </div>
                  </div>
                  <div className="p-6 flex flex-col flex-1 justify-between">
                    <div>
                      <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors leading-tight">{d.title}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 font-medium mb-4">
                        <Map className="h-3 w-3" /> {d.duration}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Sparkles key={i} className={`h-3 w-3 ${i < d.rating ? 'fill-primary text-primary' : 'text-muted'}`} />
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
              <h2 className="text-4xl font-extrabold tracking-tight md:text-5xl">Почему выбирают нас?</h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Мы объединили мощь современных нейросетей с глубоким пониманием потребностей современного исследователя мира.
              </p>
              <div className="pt-4">
                <div className="flex items-center gap-4 justify-center lg:justify-start">
                  <div className="flex flex-col items-center">
                    <span className="text-3xl font-bold">10k+</span>
                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">Юзеров</span>
                  </div>
                  <div className="h-10 w-px bg-border mx-2" />
                  <div className="flex flex-col items-center">
                    <span className="text-3xl font-bold">50k+</span>
                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">Маршрутов</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:w-2/3 grid gap-6 sm:grid-cols-2">
              {[
                {
                  icon: <Zap className="h-6 w-6" />,
                  title: "Мгновенная генерация",
                  desc: "Создайте детальный план на 14 дней за считанные секунды."
                },
                {
                  icon: <Shield className="h-6 w-6" />,
                  title: "Персонализация",
                  desc: "Учет диет, религии и личных интересов в каждом пункте."
                },
                {
                  icon: <Map className="h-6 w-6" />,
                  title: "Локальный опыт",
                  desc: "Секретные места, о которых знают только местные жители."
                },
                {
                  icon: <Sparkles className="h-6 w-6" />,
                  title: "Культурный код",
                  desc: "Глубокое понимание менталитета и особенностей региона."
                }
              ].map((f, i) => (
                <Card key={i} className="group p-8 transition-all hover:bg-primary/[0.03] border border-white/10 dark:border-white/5 shadow-xl hover:shadow-2xl rounded-[2rem] animate-in fade-in slide-in-from-right-8 duration-700 backdrop-blur-sm bg-white/40 dark:bg-white/5" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20 text-white transition-transform group-hover:scale-110 group-hover:rotate-6">
                    {f.icon}
                  </div>
                  <h3 className="mb-3 text-2xl font-bold tracking-tight">{f.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm font-medium">{f.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="container px-4 py-24">
          <div className="relative overflow-hidden rounded-[3rem] bg-foreground text-background p-12 md:p-24 text-center">
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 h-96 w-96 rounded-full bg-primary/20 blur-[120px]" />
            <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-primary/10 blur-[100px]" />

            <div className="relative z-10 max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <h2 className="text-4xl font-extrabold md:text-6xl tracking-tight leading-tight italic">
                Готовы исследовать <br />
                мир вместе с ИИ?
              </h2>
              <p className="text-background/70 text-lg md:text-xl leading-relaxed">
                Присоединяйтесь к тысячам путешественников, которые уже доверяют нам
                создание своих идеальных маршрутов. Бесплатно и навсегда.
              </p>
              <Button asChild size="lg" className="h-16 px-12 text-xl font-bold rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:scale-105 shadow-2xl shadow-primary/20">
                <Link href="/auth">Начать сейчас</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 border-t mt-12">
        <div className="container px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Map className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-black italic tracking-tighter uppercase">TraveLM</span>
            </div>

            <nav className="flex gap-8 text-sm font-medium text-muted-foreground">
              <Link href="#" className="hover:text-primary transition-colors">Обзор</Link>
              <Link href="#" className="hover:text-primary transition-colors">Помощь</Link>
              <Link href="#" className="hover:text-primary transition-colors">Политика</Link>
              <Link href="#" className="hover:text-primary transition-colors">Контакты</Link>
            </nav>

            <p className="text-xs text-muted-foreground font-medium">
              © 2026 TraveLM AI. Все права защищены.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
