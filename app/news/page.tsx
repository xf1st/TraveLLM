"use client"

import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, TrendingUp, Plane, Shield, Info, Calendar, ArrowRight, Bell } from "lucide-react"
import Image from "next/image"
import { useState } from "react"

const newsItems = {
  all: [
    {
      id: "1",
      category: "Визы",
      title: "Грузия упрощает визовый режим для россиян",
      summary:
        "С 1 марта 2024 года граждане РФ могут находиться в Грузии до 90 дней без визы. Достаточно загранпаспорта.",
      date: "2 дня назад",
      image: "/tbilisi-old-town-colorful-balconies.jpg",
      tags: ["Грузия", "Визы", "Важно"],
      priority: "high",
    },
    {
      id: "2",
      category: "Безопасность",
      title: "Обновлен список безопасных стран для путешествий",
      summary: "МИД РФ обновил рекомендации по безопасности. Турция, ОАЭ и Грузия остаются в зеленой зоне.",
      date: "3 дня назад",
      image: "/istanbul-blue-mosque-architecture.jpg",
      tags: ["Безопасность", "МИД"],
      priority: "medium",
    },
    {
      id: "3",
      category: "Авиация",
      title: "Возобновлены прямые рейсы Москва - Тбилиси",
      summary: "С 15 марта авиакомпания Аэрофлот возобновляет ежедневные рейсы в столицу Грузии. Цены от ₽12,000.",
      date: "5 дней назад",
      image: "/airplane-in-flight.png",
      tags: ["Авиация", "Грузия"],
      priority: "medium",
    },
    {
      id: "4",
      category: "Карты",
      title: "Карта МИР теперь работает в Узбекистане",
      summary: "Банковская система Узбекистана подключилась к НСПК. Карты МИР принимаются во всех крупных городах.",
      date: "1 неделю назад",
      image: "/credit-card-close-up.png",
      tags: ["Карта МИР", "Узбекистан"],
      priority: "low",
    },
    {
      id: "5",
      category: "Путешествия",
      title: "Топ-10 направлений для весеннего отдыха",
      summary:
        "Эксперты составили рейтинг лучших мест для путешествий в марте-апреле 2024. Лидируют Сочи, Алтай и Байкал.",
      date: "1 неделю назад",
      image: "/------------------------.jpg",
      tags: ["Россия", "Весна"],
      priority: "low",
    },
    {
      id: "6",
      category: "Безопасность",
      title: "Предупреждение о ситуации на Ближнем Востоке",
      summary: "МИД РФ рекомендует воздержаться от поездок в Израиль и соседние страны до стабилизации ситуации.",
      date: "2 недели назад",
      image: "/middle-east.jpg",
      tags: ["Безопасность", "МИД", "Важно"],
      priority: "high",
    },
  ],
  visas: [],
  safety: [],
  travel: [],
}

// Фильтруем новости по категориям
newsItems.visas = newsItems.all.filter((item) => item.category === "Визы")
newsItems.safety = newsItems.all.filter((item) => item.category === "Безопасность")
newsItems.travel = newsItems.all.filter((item) => item.category === "Путешествия" || item.category === "Авиация")

export default function NewsPage() {
  const [activeTab, setActiveTab] = useState("all")

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Визы":
        return <Plane className="h-4 w-4" />
      case "Безопасность":
        return <Shield className="h-4 w-4" />
      case "Авиация":
        return <Plane className="h-4 w-4" />
      case "Карты":
        return <Info className="h-4 w-4" />
      default:
        return <TrendingUp className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-l-red-500"
      case "medium":
        return "border-l-yellow-500"
      default:
        return "border-l-primary"
    }
  }

  const renderNewsGrid = (items: typeof newsItems.all) => (
    <div className="grid gap-6 md:grid-cols-2">
      {items.map((item, i) => (
        <Card
          key={item.id}
          className={`overflow-hidden border-l-4 ${getPriorityColor(
            item.priority,
          )} transition-all hover:shadow-xl hover:-translate-y-2 animate-in fade-in slide-in-from-bottom-8 duration-700`}
          style={{ animationDelay: `${i * 150}ms` }}
        >
          <div className="relative aspect-video overflow-hidden">
            <Image
              src={item.image || "/placeholder.svg"}
              alt={item.title}
              fill
              className="object-cover transition-transform hover:scale-110 duration-500"
            />
            <Badge
              variant="secondary"
              className="absolute left-3 top-3 bg-background/90 backdrop-blur flex items-center gap-1"
            >
              {getCategoryIcon(item.category)}
              {item.category}
            </Badge>
          </div>
          <div className="p-5">
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {item.date}
            </div>
            <h3 className="mb-2 font-semibold text-balance">{item.title}</h3>
            <p className="mb-4 text-sm text-muted-foreground line-clamp-2">{item.summary}</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="group w-full justify-between transition-all hover:scale-105">
              Читать далее
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-6xl px-4 py-12">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div>
            <h1 className="mb-2 text-3xl font-bold tracking-tight">Новости для путешественников</h1>
            <p className="text-muted-foreground">Актуальная информация о визах, безопасности и лучших направлениях</p>
          </div>
          <Button variant="outline" size="lg" className="transition-all hover:scale-105 bg-transparent">
            <Bell className="h-5 w-5" />
            Подписаться на уведомления
          </Button>
        </div>

        {/* Important Alert */}
        <Card className="mb-8 border-l-4 border-l-yellow-500 bg-yellow-500/5 p-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-500/20">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <h3 className="mb-1 font-semibold">Важное обновление</h3>
              <p className="text-sm text-muted-foreground">
                С 1 марта 2024 изменились правила въезда в Грузию. Проверьте актуальную информацию перед поездкой.
              </p>
            </div>
          </div>
        </Card>

        {/* News Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">Все новости</TabsTrigger>
            <TabsTrigger value="visas">Визы</TabsTrigger>
            <TabsTrigger value="safety">Безопасность</TabsTrigger>
            <TabsTrigger value="travel">Путешествия</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            {renderNewsGrid(newsItems.all)}
          </TabsContent>

          <TabsContent value="visas" className="mt-6">
            {newsItems.visas.length > 0 ? (
              renderNewsGrid(newsItems.visas)
            ) : (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">Нет новостей в этой категории</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="safety" className="mt-6">
            {newsItems.safety.length > 0 ? (
              renderNewsGrid(newsItems.safety)
            ) : (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">Нет новостей в этой категории</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="travel" className="mt-6">
            {newsItems.travel.length > 0 ? (
              renderNewsGrid(newsItems.travel)
            ) : (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">Нет новостей в этой категории</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
