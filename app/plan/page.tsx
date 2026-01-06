"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sparkles } from "lucide-react"

export default function PlanPage() {
  const router = useRouter()
  const [destination, setDestination] = useState<"russia" | "abroad">("abroad")
  const [budget, setBudget] = useState("comfort")
  const [customBudget, setCustomBudget] = useState("")
  const [duration, setDuration] = useState("7")
  const [customDuration, setCustomDuration] = useState("")
  const [travelStyle, setTravelStyle] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    setTimeout(() => {
      router.push("/results")
    }, 2000)
  }

  const toggleStyle = (style: string) => {
    setTravelStyle((prev) => (prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]))
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-4xl px-4 py-12 md:py-20">
        <div className="mb-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-balance md:text-5xl">
            Спланируем вашу идеальную поездку
          </h1>
          <p className="text-lg text-muted-foreground text-balance">
            ИИ-ассистент с учётом ваших предпочтений, культуры и потребностей
          </p>
        </div>

        <Card className="p-6 md:p-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Destination */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Куда планируете поехать?</Label>
              <RadioGroup
                value={destination}
                onValueChange={(v) => setDestination(v as "russia" | "abroad")}
                className="grid gap-4 sm:grid-cols-2"
              >
                <Label
                  htmlFor="russia"
                  className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-border p-4 transition-all hover:bg-muted hover:shadow-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:shadow-md"
                >
                  <RadioGroupItem value="russia" id="russia" />
                  <span>По России</span>
                </Label>
                <Label
                  htmlFor="abroad"
                  className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-border p-4 transition-all hover:bg-muted hover:shadow-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:shadow-md"
                >
                  <RadioGroupItem value="abroad" id="abroad" />
                  <span>За границу</span>
                </Label>
              </RadioGroup>
            </div>

            <div className="space-y-4">
              <Label className="text-base font-semibold">Бюджет</Label>
              <RadioGroup value={budget} onValueChange={setBudget} className="grid gap-4 sm:grid-cols-3">
                <Label
                  htmlFor="economy"
                  className="flex cursor-pointer flex-col gap-1 rounded-lg border-2 border-border p-4 transition-all hover:bg-muted hover:shadow-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="economy" id="economy" />
                    <span className="font-medium">Эконом</span>
                  </div>
                  <span className="ml-7 text-sm text-muted-foreground">До ₽30к/неделя</span>
                </Label>
                <Label
                  htmlFor="comfort"
                  className="flex cursor-pointer flex-col gap-1 rounded-lg border-2 border-border p-4 transition-all hover:bg-muted hover:shadow-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="comfort" id="comfort" />
                    <span className="font-medium">Комфорт</span>
                  </div>
                  <span className="ml-7 text-sm text-muted-foreground">₽30-70к/неделя</span>
                </Label>
                <Label
                  htmlFor="premium"
                  className="flex cursor-pointer flex-col gap-1 rounded-lg border-2 border-border p-4 transition-all hover:bg-muted hover:shadow-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="premium" id="premium" />
                    <span className="font-medium">Премиум</span>
                  </div>
                  <span className="ml-7 text-sm text-muted-foreground">От ₽70к/неделя</span>
                </Label>
              </RadioGroup>

              <div className="space-y-2">
                <Label htmlFor="custom-budget" className="text-sm text-muted-foreground">
                  Или укажите свой бюджет
                </Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="custom-budget"
                    type="number"
                    placeholder="50000"
                    value={customBudget}
                    onChange={(e) => {
                      setCustomBudget(e.target.value)
                      if (e.target.value) setBudget("custom")
                    }}
                    className="transition-all focus:scale-105"
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">₽ за поездку</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-base font-semibold">Длительность поездки</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="transition-all hover:shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 дня</SelectItem>
                  <SelectItem value="5">5 дней</SelectItem>
                  <SelectItem value="7">7 дней</SelectItem>
                  <SelectItem value="10">10 дней</SelectItem>
                  <SelectItem value="14">14 дней</SelectItem>
                  <SelectItem value="custom">Другое</SelectItem>
                </SelectContent>
              </Select>

              {duration === "custom" && (
                <div className="space-y-2">
                  <Label htmlFor="custom-duration" className="text-sm text-muted-foreground">
                    Укажите количество дней
                  </Label>
                  <Input
                    id="custom-duration"
                    type="number"
                    placeholder="12"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(e.target.value)}
                    min="1"
                    max="90"
                    className="transition-all focus:scale-105"
                  />
                </div>
              )}
            </div>

            {/* Travel Style */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Стиль путешествия</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { id: "culture", label: "Культура и история" },
                  { id: "nature", label: "Природа и активность" },
                  { id: "food", label: "Гастрономия" },
                  { id: "relax", label: "Отдых и релакс" },
                  { id: "adventure", label: "Приключения" },
                  { id: "shopping", label: "Шоппинг" },
                ].map((style) => (
                  <Label
                    key={style.id}
                    htmlFor={style.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-all hover:bg-muted hover:shadow-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:shadow-md"
                  >
                    <Checkbox
                      id={style.id}
                      checked={travelStyle.includes(style.id)}
                      onCheckedChange={() => toggleStyle(style.id)}
                    />
                    <span className="text-sm">{style.label}</span>
                  </Label>
                ))}
              </div>
            </div>

            {/* Companions */}
            <div className="space-y-4">
              <Label htmlFor="companions" className="text-base font-semibold">
                С кем едете?
              </Label>
              <Select defaultValue="couple">
                <SelectTrigger id="companions" className="transition-all hover:shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solo">Один/одна</SelectItem>
                  <SelectItem value="couple">Вдвоём</SelectItem>
                  <SelectItem value="family">Семья с детьми</SelectItem>
                  <SelectItem value="friends">С друзьями</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              size="lg"
              className="w-full transition-all hover:scale-105"
              disabled={loading || travelStyle.length === 0}
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  <span>Генерируем маршруты...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  <span>Создать маршруты</span>
                </>
              )}
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground animate-in fade-in duration-1000">
          Бесплатно доступно 3 генерации маршрутов
        </p>
      </main>
    </div>
  )
}
