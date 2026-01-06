"use client"

import { useState, useRef, useEffect } from "react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Send,
  MapPin,
  Compass,
  MessageCircle,
  Layers,
  Shield,
  CreditCard,
  Church,
  Utensils,
  Camera,
} from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
}

const mockResponses: Record<string, string> = {
  "где поесть халяль":
    'В Тбилиси много халяльных заведений! Рекомендую ресторан "Samikitno" на проспекте Руставели — там отличные грузинские блюда с халяль-сертификацией. Также загляните в "Machakhela" возле станции метро Руставели.',
  "где обменять деньги":
    "Лучший курс в обменниках TBC Bank и Bank of Georgia. Они на каждом углу в центре. Карта МИР работает в большинстве банкоматов TBC и BOG. Избегайте обменников в аэропорту — курс там хуже.",
  "что посмотреть вечером":
    "Вечером советую подняться на фуникулёре к крепости Нарикала — оттуда открывается потрясающий вид на подсвеченный город. После можно спуститься пешком через Ботанический сад и поужинать на набережной.",
  "безопасно ли гулять":
    "Тбилиси очень безопасный город, особенно центр. Можно спокойно гулять до позднего вечера. Районы Старого города, Руставели, Ваке — всё безопасно. Избегайте только окраинных районов типа Дидубе поздно ночью.",
  "где веганское кафе":
    'Рекомендую кафе "Kiwi Vegan Café" на улице Котэ Абхази — большой выбор растительных блюд и отличные десерты. Также "Organique" на Руставели предлагает органическую еду и много веганских опций.',
  "какие музеи":
    "В воскресенье работают: Национальный музей Грузии (10:00-18:00), Музей искусств (11:00-17:00), Этнографический музей под открытым небом (10:00-17:00). Понедельник — выходной в большинстве музеев.",
  храм: "Ближайший к центру — собор Сиони (VI век), он в 10 минутах пешком от вашей локации. Также рекомендую Анчисхати (VI век) — старейшая церковь Тбилиси. Службы обычно утром и вечером.",
  "что попробовать":
    "Обязательно попробуйте: хинкали (сочные пельмени), хачапури (сырный хлеб), харчо (пряный суп), чахохбили (курица в томатах), сациви (курица в ореховом соусе). И обязательно грузинское вино!",
}

const quickQuestions = [
  "Где поесть халяль?",
  "Где обменять деньги?",
  "Что посмотреть вечером?",
  "Безопасно ли гулять ночью?",
  "Где найти веганское кафе?",
  "Какие музеи работают?",
]

export default function GuidePage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Привет! Я ваш персональный ИИ-гид по Тбилиси. Я знаю всё о городе: от халяльных ресторанов до православных храмов, от безопасных районов до лучших мест для фото. Задавайте любые вопросы! 🗺️",
      timestamp: new Date().toISOString(),
    },
  ])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [mapLayers, setMapLayers] = useState({
    safety: true,
    payment: true,
    religion: true,
    food: true,
    photo: true,
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = (text?: string) => {
    const messageText = text || input
    if (!messageText.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsTyping(true)

    setTimeout(() => {
      const lowerText = messageText.toLowerCase()
      let response =
        "Хороший вопрос! Я постараюсь помочь. В Тбилиси большинство местных говорят по-русски, поэтому легко спросить дорогу или совет у прохожих. Что ещё вас интересует?"

      for (const [key, value] of Object.entries(mockResponses)) {
        if (lowerText.includes(key)) {
          response = value
          break
        }
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, assistantMessage])
      setIsTyping(false)
    }, 1200)
  }

  const handleLayerToggle = (layer: keyof typeof mapLayers) => {
    setMapLayers((prev) => ({ ...prev, [layer]: !prev[layer] }))
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* Chat */}
        <div className="flex flex-1 flex-col">
          <div className="border-b border-border bg-muted/30 px-4 py-4">
            <div className="container max-w-3xl flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">ИИ-гид по Тбилиси</h2>
                <p className="text-xs text-muted-foreground">Всегда на связи • Отвечает мгновенно</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="container max-w-3xl space-y-6">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex animate-in fade-in slide-in-from-bottom-4 duration-500 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <Card
                    className={`max-w-[85%] p-4 transition-all hover:shadow-md ${
                      message.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border-border/50"
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-line">{message.content}</p>
                    <p
                      className={`mt-2 text-xs ${
                        message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                      }`}
                    >
                      {new Date(message.timestamp).toLocaleTimeString("ru-RU", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </Card>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start animate-in fade-in duration-300">
                  <Card className="max-w-[85%] p-4 border-border/50">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                        <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                        <div className="h-2 w-2 animate-bounce rounded-full bg-primary" />
                      </div>
                      <span className="text-xs text-muted-foreground">Набираю ответ...</span>
                    </div>
                  </Card>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Quick Questions */}
          {messages.length <= 1 && (
            <div className="border-t border-border px-4 py-4 bg-muted/20 animate-in fade-in duration-700">
              <div className="container max-w-3xl">
                <p className="mb-3 text-sm font-medium flex items-center gap-2">
                  <Compass className="h-4 w-4 text-primary" />
                  Популярные вопросы:
                </p>
                <div className="flex flex-wrap gap-2">
                  {quickQuestions.map((question, i) => (
                    <Button
                      key={question}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSend(question)}
                      className="text-xs transition-all hover:scale-105 hover:shadow-sm bg-background animate-in fade-in duration-500"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-border p-4 bg-background">
            <div className="container max-w-3xl">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSend()
                }}
                className="flex gap-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Спросите что угодно о вашей поездке..."
                  className="flex-1 transition-all focus:scale-[1.02]"
                  disabled={isTyping}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={isTyping || !input.trim()}
                  className="transition-all hover:scale-110"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>

        {/* Map with Layers */}
        <div className="hidden w-96 border-l border-border bg-muted/30 lg:block">
          <div className="flex h-full flex-col">
            <div className="border-b border-border bg-background p-4">
              <h3 className="font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Интерактивная карта
              </h3>
            </div>

            <div className="p-4 border-b border-border bg-background/50">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Layers className="h-4 w-4 text-primary" />
                Слои карты
              </div>
              <div className="space-y-3">
                {[
                  { key: "safety" as const, label: "Безопасность", icon: Shield },
                  { key: "payment" as const, label: "Оплата МИР", icon: CreditCard },
                  { key: "religion" as const, label: "Храмы", icon: Church },
                  { key: "food" as const, label: "Еда", icon: Utensils },
                  { key: "photo" as const, label: "Фото-точки", icon: Camera },
                ].map((layer) => (
                  <div key={layer.key} className="flex items-center justify-between">
                    <Label htmlFor={layer.key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <layer.icon className="h-3.5 w-3.5 text-muted-foreground" />
                      {layer.label}
                    </Label>
                    <Switch
                      id={layer.key}
                      checked={mapLayers[layer.key]}
                      onCheckedChange={() => handleLayerToggle(layer.key)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 animate-pulse">
                <MapPin className="h-10 w-10 text-primary" />
              </div>
              <h4 className="mb-2 font-semibold">Ваш маршрут на карте</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Все точки из маршрута, навигация и рекомендации поблизости
              </p>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span>Ваше текущее местоположение</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-accent" />
                  <span>Точки интереса из маршрута</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                  <span>Рекомендации рядом с вами</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
