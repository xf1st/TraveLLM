"use client"

import Link from "next/link"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Sparkles, Globe, Shield, Heart, MapPin, Clock, Users, MessageCircle, MapIcon } from "lucide-react"
import Image from "next/image"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="container px-4 py-16 md:py-24 lg:py-32">
        <div className="mx-auto max-w-4xl text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            ИИ-помощник для ваших путешествий
          </div>
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-balance md:text-6xl lg:text-7xl">
            Путешествуйте с умом.{" "}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Путешествуйте с TravelMind
            </span>
          </h1>
          <p className="mb-10 text-lg text-muted-foreground text-balance md:text-xl lg:text-2xl">
            Персональный маршрут с учётом вашей культуры, вероисповедания и предпочтений. <br />
            Понимаем российских путешественников как никто другой.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto transition-all hover:scale-105">
              <Link href="/auth">
                <Sparkles className="h-5 w-5" />
                Начать бесплатно
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto bg-transparent transition-all hover:scale-105"
            >
              <Link href="#how-it-works">Как это работает</Link>
            </Button>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">3 бесплатных генерации маршрутов • Без кредитной карты</p>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-y bg-muted/30 py-16 md:py-24">
        <div className="container px-4">
          <div className="mb-12 text-center animate-in fade-in duration-700">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">Почему TravelMind?</h2>
            <p className="text-lg text-muted-foreground text-balance">Мы учитываем то, что важно именно вам</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Heart,
                title: "Культурная чуткость",
                desc: "Учитываем религиозные предпочтения, халяль, православные святыни, русскоязычные сообщества",
                delay: "100",
              },
              {
                icon: Shield,
                title: "Реальная безопасность",
                desc: "Оцениваем безопасность для россиян: принимают ли карту МИР, есть ли визовые ограничения",
                delay: "200",
              },
              {
                icon: Globe,
                title: "Субъективный подход",
                desc: "Маршруты с душой: #уютно, #тихо, #местная_кухня — описываем места человеческим языком",
                delay: "300",
              },
              {
                icon: MapPin,
                title: "3 варианта на выбор",
                desc: "Всегда предлагаем три разных маршрута: насыщенный, спокойный и сбалансированный",
                delay: "400",
              },
              {
                icon: Clock,
                title: "План день за днём",
                desc: "Детальный маршрут с временем, местами, стоимостью и культурными советами",
                delay: "500",
              },
              {
                icon: Users,
                title: "Для всех типов",
                desc: "Один, пара, семья с детьми или компания друзей — подберём маршрут для любого состава",
                delay: "600",
              },
            ].map((feature, i) => (
              <Card
                key={i}
                className="p-6 transition-all hover:shadow-lg hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-8 duration-700"
                style={{ animationDelay: `${feature.delay}ms` }}
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 transition-transform hover:scale-110">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-gradient-to-b from-background to-muted/20">
        <div className="container px-4">
          <div className="mx-auto max-w-5xl">
            <div className="mb-12 text-center animate-in fade-in duration-700">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                <MessageCircle className="h-4 w-4" />
                Ваш личный помощник в путешествии
              </div>
              <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">ИИ-гид всегда с вами</h2>
              <p className="text-lg text-muted-foreground text-balance">
                Спрашивайте что угодно во время поездки — получайте мгновенные персональные ответы
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 mb-12">
              <Card className="p-6 transition-all hover:shadow-lg animate-in fade-in slide-in-from-left-8 duration-700">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <MessageCircle className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-3 text-xl font-semibold">Умный чат-помощник</h3>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>Где поесть халяль или найти веганское кафе</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>Какие места посетить рядом с вами</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>Как добраться и где обменять деньги</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>Безопасно ли гулять вечером в этом районе</span>
                  </li>
                </ul>
              </Card>

              <Card className="p-6 transition-all hover:shadow-lg animate-in fade-in slide-in-from-right-8 duration-700 delay-200">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <MapIcon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-3 text-xl font-semibold">Интеграция с картой</h3>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>Видите ваш маршрут и точки интереса на карте</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>Навигация до любого места из плана</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>Рекомендации поблизости от вашей локации</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>Офлайн-доступ к сохранённым маршрутам</span>
                  </li>
                </ul>
              </Card>
            </div>

            <Card className="p-6 md:p-8 bg-gradient-to-br from-primary/5 to-background animate-in fade-in slide-in-from-bottom-8 duration-700 delay-400">
              <h3 className="mb-4 text-xl font-semibold">Примеры вопросов, которые вы можете задать:</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  "Где поблизости поесть халяль?",
                  "Что посмотреть вечером в этом районе?",
                  "Безопасно ли гулять здесь ночью?",
                  "Где обменять рубли по хорошему курсу?",
                  "Какие музеи работают в воскресенье?",
                  "Есть ли рядом православный храм?",
                  "Где арендовать велосипед?",
                  "Что попробовать из местной кухни?",
                ].map((question, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-lg bg-background p-3 text-sm transition-all hover:shadow-sm"
                  >
                    <MessageCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{question}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Example Routes */}
      <section className="py-16 md:py-24">
        <div className="container px-4">
          <div className="mb-12 text-center animate-in fade-in duration-700">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">Примеры маршрутов</h2>
            <p className="text-lg text-muted-foreground text-balance">Вот что мы создали для других путешественников</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                image: "/tbilisi-old-town-colorful-balconies.jpg",
                tags: ["#уютно", "#русскиеговорят"],
                title: "Тбилиси на неделю",
                duration: "7 дней • Комфорт • Культура и гастрономия",
                desc: "Старый город, винодельни Кахетии, серные бани и грузинская кухня",
              },
              {
                image: "/bali-rice-terraces-sunset.jpg",
                tags: ["#релакс", "#природа"],
                title: "Бали: отдых и йога",
                duration: "10 дней • Комфорт • Релакс и природа",
                desc: "Убуд, рисовые террасы, йога-ретриты и пляжи Нуса Дуа",
              },
              {
                image: "/istanbul-blue-mosque-architecture.jpg",
                tags: ["#культура", "#халяль"],
                title: "Стамбул: восток встречает запад",
                duration: "5 дней • Эконом • Культура и история",
                desc: "Голубая мечеть, Гранд-базар, Босфор и византийское наследие",
              },
              {
                image: "/-------------------------.jpg",
                tags: ["#природа", "#активность"],
                title: "Алтай: сила природы",
                duration: "8 дней • Комфорт • Природа и треккинг",
                desc: "Голубые озёра, горные перевалы, кедровые леса и звёздное небо",
              },
              {
                image: "/-----------------------------.jpg",
                tags: ["#современность", "#шоппинг"],
                title: "Дубай: город будущего",
                duration: "6 дней • Премиум • Шоппинг и развлечения",
                desc: "Бурдж Халифа, Dubai Mall, пляжи и пустынное сафари",
              },
              {
                image: "/--------------------.jpg",
                tags: ["#культура", "#халяль"],
                title: "Казань: две культуры",
                duration: "4 дня • Комфорт • Культура и история",
                desc: "Кремль, мечеть Кул-Шариф, Старо-Татанская слобода, татарская кухня",
              },
            ].map((route, i) => (
              <Card
                key={i}
                className="overflow-hidden transition-all hover:shadow-xl hover:-translate-y-2 animate-in fade-in slide-in-from-bottom-8 duration-700"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="relative h-48 w-full overflow-hidden">
                  <Image
                    src={route.image || "/placeholder.svg"}
                    alt={route.title}
                    fill
                    className="object-cover transition-transform hover:scale-110 duration-500"
                  />
                </div>
                <div className="p-6">
                  <div className="mb-2 flex flex-wrap gap-2">
                    {route.tags.map((tag, j) => (
                      <span key={j} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">{route.title}</h3>
                  <p className="mb-4 text-sm text-muted-foreground">{route.duration}</p>
                  <p className="text-muted-foreground">{route.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="border-y bg-muted/30 py-16 md:py-24">
        <div className="container px-4">
          <div className="mb-12 text-center animate-in fade-in duration-700">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">Как это работает</h2>
          </div>

          <div className="mx-auto max-w-3xl space-y-8">
            {[
              {
                num: "1",
                title: "Пройдите короткий тест",
                desc: "Ответьте на 5 вопросов о ваших предпочтениях — это займёт меньше минуты",
                delay: "0",
              },
              {
                num: "2",
                title: "Расскажите о поездке",
                desc: "Выберите направление, бюджет, длительность и стиль путешествия",
                delay: "100",
              },
              {
                num: "3",
                title: "Получите 3 варианта",
                desc: "ИИ создаст три уникальных маршрута: активный, спокойный и сбалансированный",
                delay: "200",
              },
              {
                num: "4",
                title: "Изучите детали",
                desc: "Подробный план день за днём: места, время, стоимость, культурные особенности",
                delay: "300",
              },
              {
                num: "5",
                title: "Путешествуйте с ИИ-гидом",
                desc: "В поездке задавайте вопросы гиду: где поесть, что посмотреть, как добраться",
                delay: "400",
              },
            ].map((step, i) => (
              <div
                key={i}
                className="flex gap-6 animate-in fade-in slide-in-from-left-8 duration-700"
                style={{ animationDelay: `${step.delay}ms` }}
              >
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground transition-transform hover:scale-110">
                  {step.num}
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-semibold">{step.title}</h3>
                  <p className="text-muted-foreground">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container px-4">
          <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 md:p-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
                Готовы спланировать идеальную поездку?
              </h2>
              <p className="mb-8 text-lg text-muted-foreground text-balance">
                Попробуйте бесплатно — создайте 3 маршрута без кредитной карты
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button asChild size="lg" className="w-full sm:w-auto transition-all hover:scale-105">
                  <Link href="/auth">
                    <Sparkles className="h-5 w-5" />
                    Начать планирование
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto bg-transparent transition-all hover:scale-105"
                >
                  <Link href="/my-trips">Посмотреть примеры</Link>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 TravelMind. Путешествуйте с умом.</p>
        </div>
      </footer>
    </div>
  )
}
