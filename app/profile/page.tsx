"use client"

import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { MapPin, Star, Calendar, Globe, Heart, Award, TrendingUp, MessageCircle, ThumbsUp } from "lucide-react"
import Image from "next/image"
import { useState } from "react"

const userProfile = {
  name: "Александра Петрова",
  avatar: "/lone-traveler-mountain-path.png",
  level: "Опытный путешественник",
  memberSince: "Январь 2023",
  stats: {
    countriesVisited: 12,
    tripsCompleted: 18,
    photosShared: 247,
    reviewsWritten: 32,
  },
  badges: [
    { id: 1, name: "Первая поездка", icon: "🎒", unlocked: true },
    { id: 2, name: "10 стран", icon: "🌍", unlocked: true },
    { id: 3, name: "Фотограф", icon: "📸", unlocked: true },
    { id: 4, name: "Гуру отзывов", icon: "⭐", unlocked: true },
    { id: 5, name: "50 стран", icon: "✈️", unlocked: false },
    { id: 6, name: "Экстремал", icon: "🏔️", unlocked: false },
  ],
  visitedPlaces: [
    {
      id: "1",
      name: "Тбилиси",
      country: "Грузия",
      date: "Январь 2024",
      rating: 5,
      image: "/tbilisi-old-town-colorful-balconies.jpg",
      review: "Потрясающий город с невероятной атмосферой! Обязательно попробуйте хинкали и посетите серные бани.",
      likes: 24,
      comments: 8,
    },
    {
      id: "2",
      name: "Золотое кольцо",
      country: "Россия",
      date: "Февраль 2024",
      rating: 5,
      image: "/-----------------------------.jpg",
      review: "Восхитительное путешествие по истории России. Особенно впечатлили древние храмы и монастыри.",
      likes: 18,
      comments: 5,
    },
    {
      id: "3",
      name: "Стамбул",
      country: "Турция",
      date: "Ноябрь 2023",
      rating: 4,
      image: "/istanbul-blue-mosque-architecture.jpg",
      review: "Город контрастов, где Европа встречается с Азией. Голубая мечеть просто великолепна!",
      likes: 31,
      comments: 12,
    },
    {
      id: "4",
      name: "Алтай",
      country: "Россия",
      date: "Август 2023",
      rating: 5,
      image: "/------------------------.jpg",
      review: "Невероятная природа! Треккинг к горе Белуха был незабываемым приключением.",
      likes: 42,
      comments: 15,
    },
  ],
  travelPreferences: {
    favoriteDestination: "Горы",
    travelStyle: "Активный отдых",
    budget: "Комфорт",
    languages: ["Русский", "Английский", "Грузинский"],
    dietary: "Без ограничений",
  },
}

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("visited")

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-6xl px-4 py-12">
        {/* Profile Header */}
        <Card className="mb-8 p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <Avatar className="h-24 w-24 border-4 border-primary/20">
              <AvatarImage src={userProfile.avatar || "/placeholder.svg"} alt={userProfile.name} />
              <AvatarFallback className="text-2xl">{userProfile.name[0]}</AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold">{userProfile.name}</h1>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Award className="h-3 w-3" />
                  {userProfile.level}
                </Badge>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">Путешествует с {userProfile.memberSince}</p>

              <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="text-center">
                  <div className="mb-1 text-2xl font-bold text-primary">{userProfile.stats.countriesVisited}</div>
                  <div className="text-xs text-muted-foreground">Стран</div>
                </div>
                <div className="text-center">
                  <div className="mb-1 text-2xl font-bold text-primary">{userProfile.stats.tripsCompleted}</div>
                  <div className="text-xs text-muted-foreground">Поездок</div>
                </div>
                <div className="text-center">
                  <div className="mb-1 text-2xl font-bold text-primary">{userProfile.stats.photosShared}</div>
                  <div className="text-xs text-muted-foreground">Фото</div>
                </div>
                <div className="text-center">
                  <div className="mb-1 text-2xl font-bold text-primary">{userProfile.stats.reviewsWritten}</div>
                  <div className="text-xs text-muted-foreground">Отзывов</div>
                </div>
              </div>

              <Progress value={65} className="h-2" />
              <p className="mt-2 text-xs text-muted-foreground">До следующего уровня: 35%</p>
            </div>
          </div>
        </Card>

        {/* Achievements */}
        <Card className="mb-8 p-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Award className="h-5 w-5 text-primary" />
            Достижения
          </h2>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
            {userProfile.badges.map((badge, i) => (
              <div
                key={badge.id}
                className={`flex flex-col items-center gap-2 rounded-lg p-3 transition-all hover:scale-110 animate-in fade-in zoom-in duration-500 ${
                  badge.unlocked ? "bg-primary/10" : "bg-muted/50 opacity-50"
                }`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="text-3xl">{badge.icon}</div>
                <div className="text-center text-xs font-medium">{badge.name}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Content Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="visited">Посещенные места</TabsTrigger>
            <TabsTrigger value="preferences">Предпочтения</TabsTrigger>
          </TabsList>

          <TabsContent value="visited" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              {userProfile.visitedPlaces.map((place, i) => (
                <Card
                  key={place.id}
                  className="overflow-hidden transition-all hover:shadow-xl hover:-translate-y-2 animate-in fade-in slide-in-from-bottom-8 duration-700"
                  style={{ animationDelay: `${i * 150}ms` }}
                >
                  <div className="relative aspect-video overflow-hidden">
                    <Image
                      src={place.image || "/placeholder.svg"}
                      alt={place.name}
                      fill
                      className="object-cover transition-transform hover:scale-110 duration-500"
                    />
                  </div>
                  <div className="p-5">
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <h3 className="mb-1 font-semibold">{place.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {place.country}
                          <span>•</span>
                          <Calendar className="h-3.5 w-3.5" />
                          {place.date}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i < place.rating ? "fill-primary text-primary" : "text-muted"}`}
                          />
                        ))}
                      </div>
                    </div>

                    <p className="mb-4 text-sm text-muted-foreground line-clamp-3">{place.review}</p>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <button className="flex items-center gap-1 transition-colors hover:text-primary">
                        <ThumbsUp className="h-4 w-4" />
                        {place.likes}
                      </button>
                      <button className="flex items-center gap-1 transition-colors hover:text-primary">
                        <MessageCircle className="h-4 w-4" />
                        {place.comments}
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="preferences" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="p-6 animate-in fade-in slide-in-from-left duration-700">
                <h3 className="mb-4 flex items-center gap-2 font-semibold">
                  <Heart className="h-5 w-5 text-primary" />
                  Предпочтения путешествий
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="mb-1 text-sm font-medium">Любимое направление</div>
                    <div className="text-sm text-muted-foreground">
                      {userProfile.travelPreferences.favoriteDestination}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 text-sm font-medium">Стиль путешествий</div>
                    <div className="text-sm text-muted-foreground">{userProfile.travelPreferences.travelStyle}</div>
                  </div>
                  <div>
                    <div className="mb-1 text-sm font-medium">Бюджет</div>
                    <div className="text-sm text-muted-foreground">{userProfile.travelPreferences.budget}</div>
                  </div>
                  <div>
                    <div className="mb-1 text-sm font-medium">Питание</div>
                    <div className="text-sm text-muted-foreground">{userProfile.travelPreferences.dietary}</div>
                  </div>
                </div>
              </Card>

              <Card className="p-6 animate-in fade-in slide-in-from-right duration-700">
                <h3 className="mb-4 flex items-center gap-2 font-semibold">
                  <Globe className="h-5 w-5 text-primary" />
                  Языки и навыки
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="mb-2 text-sm font-medium">Языки</div>
                    <div className="flex flex-wrap gap-2">
                      {userProfile.travelPreferences.languages.map((lang) => (
                        <Badge key={lang} variant="secondary">
                          {lang}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 text-sm font-medium">Интересы</div>
                    <div className="flex flex-wrap gap-2">
                      {["Фотография", "Треккинг", "История", "Гастрономия"].map((interest) => (
                        <Badge key={interest} variant="outline">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="mt-6 p-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
              <h3 className="mb-4 flex items-center gap-2 font-semibold">
                <TrendingUp className="h-5 w-5 text-primary" />
                Ваша активность
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span>Отзывы написаны</span>
                    <span className="font-medium">32 / 50</span>
                  </div>
                  <Progress value={64} className="h-2" />
                </div>
                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span>Фотографии загружены</span>
                    <span className="font-medium">247 / 500</span>
                  </div>
                  <Progress value={49} className="h-2" />
                </div>
                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span>Полезность отзывов</span>
                    <span className="font-medium">85%</span>
                  </div>
                  <Progress value={85} className="h-2" />
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
