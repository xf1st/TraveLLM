"use client"

import Link from "next/link"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, MapPin, Plus, Sparkles, Crown, Clock } from "lucide-react"
import Image from "next/image"

const pastTrips = [
  {
    id: "1",
    title: "Тбилиси и винные долины",
    destination: "Грузия",
    date: "15 января 2024",
    duration: "7 дней",
    status: "завершена",
    image: "/tbilisi-old-town-colorful-balconies.jpg",
  },
  {
    id: "7",
    title: "Золотое кольцо России",
    destination: "Россия",
    date: "3 февраля 2024",
    duration: "5 дней",
    status: "завершена",
    image: "/-----------------------------.jpg",
  },
]

export default function MyTripsPage() {
  const generationsLeft = 2

  return (
    <AppLayout title="Мои поездки" description="История ваших путешествий и планов">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Action Button */}
        <div className="flex justify-end">
          <Button asChild size="lg" className="transition-all hover:scale-105">
            <Link href="/plan">
              <Plus className="h-5 w-5" />
              Новая поездка
            </Link>
          </Button>
        </div>

        {/* Generations Card */}
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-background border-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="mb-1 font-semibold">Бесплатные генерации</h3>
                <p className="text-sm text-muted-foreground">
                  У вас осталось <span className="font-semibold text-primary">{generationsLeft} из 3</span> бесплатных
                  генераций
                </p>
              </div>
            </div>
            <Button variant="outline" className="transition-all hover:scale-105 bg-background">
              <Crown className="h-4 w-4" />
              Подписка Pro
            </Button>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-1000 ease-out"
              style={{ width: `${(generationsLeft / 3) * 100}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Получите безлимитные генерации и доступ ко всем функциям с подпиской Pro
          </p>
        </Card>

        {/* Trips */}
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          <h2 className="mb-4 text-xl font-semibold">Завершённые поездки ({pastTrips.length})</h2>
          {pastTrips.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <MapPin className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mb-2 text-lg font-medium">У вас пока нет завершённых поездок</p>
              <p className="mb-6 text-sm text-muted-foreground">
                Создайте свой первый маршрут и начните путешествие с TraveLM
              </p>
              <Button asChild className="transition-all hover:scale-105">
                <Link href="/plan">
                  <Sparkles className="h-4 w-4" />
                  Создать маршрут
                </Link>
              </Button>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {pastTrips.map((trip, i) => (
                <Card
                  key={trip.id}
                  className="overflow-hidden transition-all hover:shadow-xl hover:-translate-y-2 animate-in fade-in slide-in-from-bottom-8 duration-700"
                  style={{ animationDelay: `${i * 150}ms` }}
                >
                  <div className="relative aspect-video overflow-hidden">
                    <Image
                      src={trip.image || "/placeholder.svg"}
                      alt={trip.title}
                      fill
                      className="object-cover transition-transform hover:scale-110 duration-500"
                    />
                    <Badge className="absolute right-3 top-3 bg-background/90 backdrop-blur">{trip.status}</Badge>
                  </div>
                  <div className="p-5">
                    <h3 className="mb-2 font-semibold text-balance">{trip.title}</h3>
                    <div className="mb-4 flex flex-col gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        {trip.destination}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        {trip.duration}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        {trip.date}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="w-full bg-transparent transition-all hover:scale-105"
                    >
                      <Link href={`/trip/${trip.id}`}>Посмотреть маршрут</Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
