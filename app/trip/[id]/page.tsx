"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, MapPin, ChevronRight, MessageSquare, Car, Train, Bike, Footprints, ExternalLink } from "lucide-react"

const transportIcons = {
  walk: Footprints,
  car: Car,
  transit: Train,
  bike: Bike,
}

const mockTrip = {
  id: "1",
  title: "Тбилиси и винные долины",
  destination: "Грузия",
  duration: "7 дней",
  tags: ["#уютно", "#гастрономия", "#русскиеговорят"],
  safetyLevel: 9,
  budget: "₽45,000",
  image: "/tbilisi-old-town-panorama.jpg",
  days: [
    {
      day: 1,
      title: "Прибытие и знакомство со Старым городом",
      activities: [
        {
          time: "14:00",
          title: "Прибытие в Тбилиси",
          description: "Встреча в аэропорту, трансфер в отель",
          location: "Международный аэропорт Тбилиси",
          address: "Sagarejo Hwy, Tbilisi",
          coordinates: { lat: 41.6692, lng: 44.9547 },
          distance: "18 км до центра",
          transport: "car" as const,
        },
        {
          time: "16:00",
          title: "Прогулка по району Абанотубани",
          description: "Серные бани, набережная Куры, водопад",
          location: "Старый город, Абанотубани",
          address: "Abanotubani, Old Tbilisi",
          coordinates: { lat: 41.6897, lng: 44.8096 },
          distance: "1.2 км",
          transport: "walk" as const,
          tips: "Здесь много русскоговорящих, легко общаться",
        },
        {
          time: "19:00",
          title: "Ужин в традиционном ресторане",
          description: "Хинкали, хачапури, местное вино",
          location: 'Ресторан "Шави Ломи"',
          address: "13 Zandukeli St, Tbilisi",
          coordinates: { lat: 41.6945, lng: 44.8015 },
          distance: "800 м",
          transport: "walk" as const,
        },
      ],
    },
    {
      day: 2,
      title: "Исторический центр и крепость Нарикала",
      activities: [
        {
          time: "10:00",
          title: "Кафедральный собор Самеба",
          description: "Главный православный храм Грузии",
          location: "Собор Святой Троицы",
          address: "1 Ilia Chavchavadze Ave, Tbilisi",
          coordinates: { lat: 41.6977, lng: 44.8174 },
          distance: "2.5 км",
          transport: "transit" as const,
          tips: "Вход свободный, фотографировать можно",
        },
        {
          time: "13:00",
          title: "Обед на проспекте Руставели",
          description: "Попробуйте хачапури по-аджарски",
          location: "Проспект Руставели",
          address: "Rustaveli Ave, Tbilisi",
          coordinates: { lat: 41.6938, lng: 44.8015 },
          distance: "1.8 км",
          transport: "walk" as const,
        },
        {
          time: "15:00",
          title: "Фуникулёр к крепости Нарикала",
          description: "Панорамный вид на весь город",
          location: "Крепость Нарикала",
          address: "Narikala Fortress, Tbilisi",
          coordinates: { lat: 41.6879, lng: 44.8082 },
          distance: "600 м (фуникулёр)",
          transport: "transit" as const,
        },
      ],
    },
    {
      day: 3,
      title: "Винный тур в Кахетию",
      activities: [
        {
          time: "09:00",
          title: "Выезд в регион Кахетия",
          description: "Винодельческий регион Грузии",
          location: "Кахетия",
          address: "Kakheti Region",
          coordinates: { lat: 41.6488, lng: 45.6947 },
          distance: "110 км",
          transport: "car" as const,
        },
        {
          time: "11:00",
          title: "Винодельня Шуми",
          description: "Дегустация 5 сортов вина с закусками",
          location: "Цинандали",
          address: "Tsinandali, Kakheti",
          coordinates: { lat: 41.8944, lng: 45.5858 },
          distance: "3 км",
          transport: "car" as const,
        },
        {
          time: "14:00",
          title: "Обед в грузинской усадьбе",
          description: "Традиционные блюда в семейной атмосфере",
          location: "Телави",
          address: "Telavi, Kakheti",
          coordinates: { lat: 41.9182, lng: 45.4733 },
          distance: "15 км",
          transport: "car" as const,
        },
        {
          time: "16:00",
          title: "Монастырь Алаверди",
          description: "Древний храм XI века",
          location: "Алаверди",
          address: "Alaverdi Monastery, Kakheti",
          coordinates: { lat: 42.0278, lng: 45.3756 },
          distance: "12 км",
          transport: "car" as const,
        },
      ],
    },
  ],
}

const hasSubscription = false // Set to true for subscribers

export default function TripDetailPage() {
  const router = useRouter()
  const [expandedDay, setExpandedDay] = useState<number | null>(1)

  const handleAddressClick = (coordinates?: { lat: number; lng: number }, address?: string) => {
    if (hasSubscription && coordinates) {
      // With subscription: open in app map
      router.push(`/guide/${mockTrip.id}?lat=${coordinates.lat}&lng=${coordinates.lng}`)
    } else if (address) {
      // Without subscription: open in Google Maps
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, "_blank")
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Image */}
      <div className="relative aspect-[21/9] w-full overflow-hidden">
        <img src={mockTrip.image || "/placeholder.svg"} alt={mockTrip.title} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
      </div>

      <main className="container max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {mockTrip.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
            <div className="ml-auto flex items-center gap-2 text-sm font-medium">
              <Shield className="h-4 w-4 text-primary" />
              Безопасность {mockTrip.safetyLevel}/10
            </div>
          </div>

          <h1 className="mb-2 text-3xl font-bold tracking-tight text-balance md:text-4xl">{mockTrip.title}</h1>
          <p className="text-lg text-muted-foreground">
            {mockTrip.destination} • {mockTrip.duration} • {mockTrip.budget}
          </p>
        </div>

        {/* Days */}
        <div className="mb-8 space-y-4">
          {mockTrip.days.map((day, dayIndex) => (
            <Card
              key={day.day}
              className="overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700"
              style={{ animationDelay: `${dayIndex * 100}ms` }}
            >
              <button
                onClick={() => setExpandedDay(expandedDay === day.day ? null : day.day)}
                className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-muted/50"
              >
                <div>
                  <div className="mb-1 text-sm font-medium text-primary">День {day.day}</div>
                  <div className="font-semibold">{day.title}</div>
                </div>
                <ChevronRight
                  className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${
                    expandedDay === day.day ? "rotate-90" : ""
                  }`}
                />
              </button>

              {expandedDay === day.day && (
                <div className="border-t border-border px-5 pb-5">
                  <div className="space-y-6 pt-5">
                    {day.activities.map((activity, idx) => {
                      const TransportIcon = activity.transport ? transportIcons[activity.transport] : Footprints

                      return (
                        <div key={idx} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                              <TransportIcon className="h-4 w-4" />
                            </div>
                            {idx < day.activities.length - 1 && <div className="my-2 h-full w-px bg-border" />}
                          </div>

                          <div className="flex-1 pb-6">
                            <div className="mb-1 text-sm font-medium text-muted-foreground">{activity.time}</div>
                            <h4 className="mb-2 font-semibold">{activity.title}</h4>
                            <p className="mb-2 text-sm text-muted-foreground leading-relaxed">{activity.description}</p>

                            {activity.distance && (
                              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-primary">
                                <TransportIcon className="h-3.5 w-3.5" />
                                {activity.distance}
                              </div>
                            )}

                            <button
                              onClick={() => handleAddressClick(activity.coordinates, activity.address)}
                              className="group flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                            >
                              <MapPin className="h-3.5 w-3.5" />
                              <span className="underline decoration-dotted underline-offset-2">
                                {activity.location}
                              </span>
                              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>

                            {activity.tips && (
                              <div className="mt-3 rounded-lg bg-primary/5 p-3 text-sm text-primary">
                                💡 {activity.tips}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
          <Button
            size="lg"
            className="flex-1 transition-all hover:scale-105"
            onClick={() => router.push(`/guide/${mockTrip.id}`)}
          >
            <MessageSquare className="mr-2 h-5 w-5" />
            Открыть ИИ-гида
          </Button>
          <Button variant="outline" size="lg" asChild className="transition-all hover:scale-105 bg-transparent">
            <Link href="/results">Выбрать другой маршрут</Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
