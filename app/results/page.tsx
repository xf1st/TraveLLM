"use client"

import { useState } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, ArrowRight, Sparkles } from "lucide-react"
import Image from "next/image"

const mockResults = [
  {
    id: "1",
    title: "Тбилиси и винные долины",
    destination: "Грузия",
    duration: "7 дней",
    tags: ["#уютно", "#гастрономия", "#русскиеговорят"],
    safetyLevel: 9,
    budget: "₽45,000",
    image: "/tbilisi-old-town-colorful-balconies.jpg",
    description: "Идеальный маршрут для гастрономического путешествия с винными турами в Кахетию",
    style: "Сбалансированный",
  },
  {
    id: "2",
    title: "Батуми и побережье",
    destination: "Грузия",
    duration: "7 дней",
    tags: ["#море", "#тихо", "#расслабленно"],
    safetyLevel: 9,
    budget: "₽42,000",
    image: "/batumi-seaside-boulevard-sunset.jpg",
    description: "Спокойный отдых на Черноморском побережье с морепродуктами",
    style: "Расслабленный",
  },
  {
    id: "3",
    title: "Горная Грузия: Казбеги и Сванетия",
    destination: "Грузия",
    duration: "7 дней",
    tags: ["#горы", "#активно", "#природа"],
    safetyLevel: 8,
    budget: "₽48,000",
    image: "/kazbegi-mountain-church-georgia.jpg",
    description: "Трекинг по горам с посещением древних башен и храмов",
    style: "Активный",
  },
  {
    id: "7",
    title: "Золотое кольцо России",
    destination: "Россия",
    duration: "5 дней",
    tags: ["#история", "#православие", "#культура"],
    safetyLevel: 10,
    budget: "₽28,000",
    image: "/-----------------------------.jpg",
    description: "Древние города: Владимир, Суздаль, Ярославль с посещением храмов и монастырей",
    style: "Культурный",
  },
  {
    id: "8",
    title: "Сочи: Море и горы",
    destination: "Россия",
    duration: "7 дней",
    tags: ["#море", "#активность", "#природа"],
    safetyLevel: 10,
    budget: "₽55,000",
    image: "/------------------------.jpg",
    description: "Пляжный отдых на Черном море с возможностью подняться в горы и посетить Красную Поляну",
    style: "Комбинированный",
  },
  {
    id: "9",
    title: "Байкал: Чистейшее озеро планеты",
    destination: "Россия",
    duration: "6 дней",
    tags: ["#природа", "#экотуризм", "#треккинг"],
    safetyLevel: 9,
    budget: "₽52,000",
    image: "/------------------------.jpg",
    description: "Путешествие вокруг Байкала с трекингом, отдыхом на берегу и баней",
    style: "Приключенческий",
  },
  {
    id: "4",
    title: "Алтай: Сила природы",
    destination: "Россия",
    duration: "8 дней",
    tags: ["#природа", "#активность", "#треккинг"],
    safetyLevel: 9,
    budget: "₽42,000",
    image: "/------------------------.jpg",
    description: "Горные озера, водопады, трекинг по живописным тропам Горного Алтая",
    style: "Активный",
  },
  {
    id: "6",
    title: "Казань: Две культуры",
    destination: "Россия",
    duration: "4 дня",
    tags: ["#культура", "#халяль", "#история"],
    safetyLevel: 10,
    budget: "₽22,000",
    image: "/--------------------.jpg",
    description: "Знакомство с татарской культурой, посещение Кремля и мечети Кул-Шариф",
    style: "Культурный",
  },
  {
    id: "5",
    title: "Дубай: Город будущего",
    destination: "ОАЭ",
    duration: "6 дней",
    tags: ["#современность", "#шоппинг", "#халяль"],
    safetyLevel: 10,
    budget: "₽95,000",
    image: "/---------------------.jpg",
    description: "Небоскрёбы, торговые центры, пляжи и традиционные рынки",
    style: "Роскошный",
  },
]

export default function ResultsPage() {
  const [selectedTrip, setSelectedTrip] = useState<string | null>("1")

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-7xl px-4 py-12">
        <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            Персонализированные маршруты готовы
          </div>
          <h1 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">Ваши идеальные маршруты</h1>
          <p className="text-lg text-muted-foreground">
            Мы создали {mockResults.length} уникальных вариантов с учётом ваших предпочтений. Выберите тот, что вам
            больше подходит.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {mockResults.map((trip, index) => (
            <Card
              key={trip.id}
              className={`group overflow-hidden transition-all hover:shadow-xl hover:-translate-y-2 animate-in fade-in slide-in-from-bottom-8 duration-700 cursor-pointer ${
                selectedTrip === trip.id ? "ring-2 ring-primary shadow-lg" : ""
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => setSelectedTrip(trip.id)}
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={trip.image || "/placeholder.svg"}
                  alt={trip.title}
                  fill
                  className="object-cover transition-transform group-hover:scale-110 duration-500"
                />
                <div className="absolute left-3 top-3 rounded-full bg-background/90 px-3 py-1 text-xs font-semibold backdrop-blur">
                  {trip.style}
                </div>
                <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium backdrop-blur">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  {trip.safetyLevel}/10
                </div>
              </div>

              <div className="p-5">
                <div className="mb-3">
                  <h3 className="mb-1 text-lg font-semibold text-balance">{trip.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {trip.destination} • {trip.duration}
                  </p>
                </div>

                <p className="mb-4 text-sm text-muted-foreground leading-relaxed">{trip.description}</p>

                <div className="mb-4 flex flex-wrap gap-2">
                  {trip.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs font-normal">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t border-border pt-4">
                  <span className="text-lg font-semibold text-primary">{trip.budget}</span>
                  <Button asChild size="sm" className="transition-all hover:scale-105">
                    <Link href={`/trip/${trip.id}`}>
                      Подробнее
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
          <p className="mb-4 text-sm text-muted-foreground">Не нравится ни один из вариантов?</p>
          <Button variant="outline" size="lg" asChild className="transition-all hover:scale-105 bg-transparent">
            <Link href="/plan">Создать новый маршрут</Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
