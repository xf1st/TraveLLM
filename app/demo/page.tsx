"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  MapPin,
  Clock,
  Shield,
  MessageSquare,
  Send,
  Navigation,
  Users,
  Download,
  Cloud,
  CloudOff,
  Layers,
  AlertCircle,
  RefreshCw,
  Star,
  Edit2,
  CheckCircle,
  Heart,
  Camera,
  Utensils,
  Church,
  CreditCard,
  Volume2,
} from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

const mockTrip = {
  id: "demo-1",
  title: "Санкт-Петербург: Культура и Белые ночи",
  destination: "Россия, Санкт-Петербург",
  day: 1,
  activities: [
    {
      time: "10:00",
      title: "Эрмитаж",
      description: "Один из крупнейших музеев мира с коллекцией более 3 млн произведений",
      location: "Дворцовая площадь, 2",
      tags: ["#тихо", "#искусство", "#культура"],
      safety: "Безопасно",
      tips: "Купите билет онлайн заранее, очереди большие. Фотографировать можно без вспышки.",
      coordinates: { lat: 59.9398, lng: 30.3146 },
      userMark: "visited",
    },
    {
      time: "13:00",
      title: 'Обед в "Теремок"',
      description: "Традиционная русская кухня: блины, каши, пироги",
      location: "Невский проспект, 60",
      tags: ["#уютно", "#бюджетно", "#русскаякухня"],
      safety: "Безопасно",
      tips: "Принимают карты МИР. Средний чек ₽500.",
      coordinates: { lat: 59.9343, lng: 30.3351 },
      dietary: ["веган-опции", "детское меню"],
    },
    {
      time: "15:00",
      title: "Прогулка по Невскому проспекту",
      description: "Главная улица города с архитектурой XVIII-XIX веков",
      location: "Невский проспект",
      tags: ["#фотографии", "#архитектура", "#прогулка"],
      safety: "Безопасно",
      coordinates: { lat: 59.9311, lng: 30.3609 },
      userMark: "want",
    },
    {
      time: "17:00",
      title: "Храм Спаса на Крови",
      description: "Православный храм с уникальными мозаиками",
      location: "набережная канала Грибоедова, 2Б",
      tags: ["#православие", "#история", "#красота"],
      safety: "Безопасно",
      tips: "Вход платный, но можно просто полюбоваться снаружи.",
      coordinates: { lat: 59.9401, lng: 30.3289 },
      userMark: "want",
    },
  ],
}

const familyMembers = [
  { name: "Анна", avatar: "👩", preferences: "культура, фото" },
  { name: "Дмитрий", avatar: "👨", preferences: "история, еда" },
  { name: "София (8 лет)", avatar: "👧", preferences: "парки, интерактив" },
]

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState<"plan" | "map">("plan")
  const [mapLayers, setMapLayers] = useState({
    safety: true,
    payment: true,
    religion: true,
    food: true,
    photo: true,
  })
  const [isOffline, setIsOffline] = useState(false)
  const [showProAlert, setShowProAlert] = useState(false)
  const [chatMessages, setChatMessages] = useState([
    { role: "assistant" as const, content: "Добрый день! Я ваш ИИ-помощник. Задайте любой вопрос о маршруте!" },
  ])
  const [chatInput, setChatInput] = useState("")
  const [navActive, setNavActive] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)

  const handleLayerToggle = (layer: keyof typeof mapLayers) => {
    setMapLayers((prev) => ({ ...prev, [layer]: !prev[layer] }))
  }

  const handleSendMessage = () => {
    if (!chatInput.trim()) return
    setChatMessages((prev) => [...prev, { role: "user" as const, content: chatInput }])
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant" as const,
          content:
            'Отличный вопрос! В районе Эрмитажа есть кафе "Буше" на Большой Морской — там принимают карты МИР и есть детское меню. Также рекомендую "Пышечную" на Большой Конюшенной — традиционные русские пончики!',
        },
      ])
    }, 1000)
    setChatInput("")
  }

  const handleReplaceActivity = (index: number) => {
    setShowProAlert(true)
    setTimeout(() => setShowProAlert(false), 3000)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      {/* Demo Banner */}
      <div className="border-b border-primary/20 bg-primary/5 px-4 py-3">
        <div className="container flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-3">
            <Badge variant="default" className="animate-pulse">
              ДЕМО-РЕЖИМ
            </Badge>
            <span className="text-muted-foreground">Все функции разблокированы: Стандарт + Плюс + Про</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOffline(!isOffline)}
              className="flex items-center gap-2"
            >
              {isOffline ? <CloudOff className="h-4 w-4" /> : <Cloud className="h-4 w-4" />}
              {isOffline ? "Офлайн" : "Онлайн"}
            </Button>
            <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
              <Download className="h-4 w-4" />
              Скачать PWA
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container flex-1">
        <div className="grid gap-6 py-6 lg:grid-cols-2">
          {/* LEFT COLUMN: Trip Plan (STANDARD - Free) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Badge variant="secondary" className="mb-2">
                  СТАНДАРТ (Бесплатно)
                </Badge>
                <h1 className="text-2xl font-bold">{mockTrip.title}</h1>
                <p className="text-sm text-muted-foreground">{mockTrip.destination} • День 1</p>
              </div>
              <Button variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Редактировать
              </Button>
            </div>

            {/* Context Block */}
            <Card className="p-4">
              <h3 className="mb-3 font-semibold">Контекст поездки</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-600" />
                  <span>Обстановка спокойная (данные МИД РФ)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span>Карты МИР принимаются повсеместно</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span>Сегодня +18°C, возможен дождь вечером</span>
                </div>
              </div>
            </Card>

            {/* Timeline */}
            <div className="space-y-3">
              {mockTrip.activities.map((activity, idx) => (
                <Card
                  key={idx}
                  className="group relative overflow-hidden p-4 transition-all hover:shadow-lg hover:scale-[1.02]"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">{activity.time}</div>
                        <h3 className="font-semibold">{activity.title}</h3>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReplaceActivity(idx)}
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <p className="mb-3 text-sm text-muted-foreground leading-relaxed">{activity.description}</p>

                  <div className="mb-3 flex flex-wrap gap-2">
                    {activity.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    <Badge variant="default" className="text-xs">
                      <Shield className="mr-1 h-3 w-3" />
                      {activity.safety}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {activity.location}
                  </div>

                  {activity.tips && (
                    <div className="mt-3 rounded-lg bg-primary/5 p-3 text-xs text-primary">💡 {activity.tips}</div>
                  )}

                  {activity.dietary && (
                    <div className="mt-2 flex gap-2 text-xs">
                      {activity.dietary.map((diet) => (
                        <span key={diet} className="text-muted-foreground">
                          ✓ {diet}
                        </span>
                      ))}
                    </div>
                  )}

                  {activity.userMark && (
                    <div className="absolute right-2 top-2">
                      {activity.userMark === "visited" ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <Heart className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  )}

                  {/* Feedback */}
                  <div className="mt-3 flex gap-2 border-t border-border pt-3">
                    <Button variant="ghost" size="sm" className="h-7 text-xs">
                      <Star className="mr-1 h-3 w-3" />
                      Оценить
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {/* AI Chat (STANDARD - Basic) */}
            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">Базовый ИИ-чат</h3>
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <div className="mb-3 max-h-40 space-y-2 overflow-y-auto">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`rounded-lg p-2 text-xs ${
                      msg.role === "user" ? "ml-8 bg-primary text-primary-foreground" : "mr-8 bg-muted"
                    }`}
                  >
                    {msg.content}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Где здесь туалет? Есть веган-меню?"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  className="text-sm"
                />
                <Button size="sm" onClick={handleSendMessage}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </div>

          {/* RIGHT COLUMN: Interactive Map (PLUS - Subscription) */}
          <div className="space-y-4">
            <div>
              <Badge variant="default" className="mb-2">
                ПЛЮС (Подписка)
              </Badge>
              <h2 className="text-xl font-semibold">Интерактивная карта</h2>
            </div>

            {/* Map Placeholder */}
            <Card className="relative aspect-square overflow-hidden">
              <div className="flex h-full items-center justify-center bg-muted/20">
                <div className="text-center">
                  <MapPin className="mx-auto mb-3 h-12 w-12 text-primary animate-bounce" />
                  <p className="text-sm text-muted-foreground">Интерактивная карта с маршрутом</p>
                </div>
              </div>

              {/* Map Layers Panel (PLUS) */}
              <div className="absolute left-4 top-4 rounded-lg border border-border bg-background/95 p-3 shadow-lg backdrop-blur">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
                  <Layers className="h-4 w-4" />
                  Слои карты
                </div>
                <div className="space-y-2">
                  {[
                    { key: "safety" as const, label: "Зоны безопасности", icon: Shield },
                    { key: "payment" as const, label: "Оплата МИР", icon: CreditCard },
                    { key: "religion" as const, label: "Храмы", icon: Church },
                    { key: "food" as const, label: "Еда", icon: Utensils },
                    { key: "photo" as const, label: "Фото-точки", icon: Camera },
                  ].map((layer) => (
                    <div key={layer.key} className="flex items-center gap-2">
                      <Switch
                        id={layer.key}
                        checked={mapLayers[layer.key]}
                        onCheckedChange={() => handleLayerToggle(layer.key)}
                      />
                      <Label htmlFor={layer.key} className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <layer.icon className="h-3 w-3" />
                        {layer.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Proactive AI Alert (PLUS) */}
              {showProAlert && (
                <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-primary bg-background/95 p-3 shadow-lg backdrop-blur animate-in slide-in-from-bottom-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-primary mt-0.5" />
                    <div className="text-xs">
                      <p className="font-semibold">ПРО-активный ИИ</p>
                      <p className="text-muted-foreground">
                        В 17:00 на Невском пробки 9 баллов. Предлагаю маршрут через дворы (экономия 15 мин).
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Personal Markers (PLUS) */}
              <div className="absolute right-4 top-4 rounded-lg border border-border bg-background/95 p-3 shadow-lg backdrop-blur">
                <div className="mb-2 text-xs font-semibold">Личные метки</div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span>Был (1)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className="h-3 w-3 text-red-500" />
                    <span>Хочу (2)</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* PRO Features */}
            <div className="space-y-3">
              <div>
                <Badge className="mb-2">ПРО (Премиум)</Badge>
                <h3 className="text-lg font-semibold">Навигация и Семья</h3>
              </div>

              {/* Navigation (PRO) */}
              <Card className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="font-semibold">Встроенный навигатор</h4>
                  <Button
                    size="sm"
                    variant={navActive ? "default" : "outline"}
                    onClick={() => setNavActive(!navActive)}
                  >
                    <Navigation className="mr-2 h-4 w-4" />
                    {navActive ? "Остановить" : "Начать"}
                  </Button>
                </div>
                {navActive && (
                  <div className="rounded-lg bg-primary/5 p-3 animate-in fade-in">
                    <div className="mb-2 flex items-center gap-2">
                      <Volume2 className="h-4 w-4 text-primary animate-pulse" />
                      <span className="text-sm font-medium">Через 200м поверните направо</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      До Эрмитажа 5 минут пешком. Голосовые подсказки включены.
                    </p>
                  </div>
                )}
              </Card>

              {/* Family Profile (PRO) */}
              <Card className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="font-semibold">Семейный профиль</h4>
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-2">
                  {familyMembers.map((member, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm">
                      <span className="text-2xl">{member.avatar}</span>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.preferences}</p>
                      </div>
                    </div>
                  ))}
                  <div className="mt-3 rounded-lg bg-primary/5 p-2 text-xs text-primary">
                    ✓ Маршрут адаптирован для семьи с ребёнком
                  </div>
                </div>
              </Card>

              {/* Partner Bonuses (PRO) */}
              <Card className="border-primary/50 bg-primary/5 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Star className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold">Партнёрские бонусы</h4>
                </div>
                <p className="mb-2 text-sm">Скидка 15% на билеты в Эрмитаж для PRO-подписчиков</p>
                <Button size="sm" variant="default" className="w-full">
                  Получить промокод
                </Button>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
