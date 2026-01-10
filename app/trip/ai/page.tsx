"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, MapPin, Calendar, Wallet, Shield, Sparkles, Clock, Utensils, House } from "lucide-react"

export default function AIDetailPage() {
    const router = useRouter()
    const [route, setRoute] = useState<any>(null)

    useEffect(() => {
        const stored = localStorage.getItem("lastGeneratedRoute")
        if (stored) {
            setRoute(JSON.parse(stored))
        }
    }, [])

    if (!route) {
        return (
            <div className="min-h-screen bg-background">
                <Header />
                <main className="container flex h-[60vh] items-center justify-center">
                    <div className="text-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
                        <p className="text-muted-foreground">Загрузка вашего маршрута...</p>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background pb-12">
            <Header />

            <main className="container max-w-5xl px-4 py-8">
                <Button variant="ghost" onClick={() => router.back()} className="mb-6 gap-2">
                    <ArrowLeft className="h-4 w-4" /> Назад
                </Button>

                <div className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 md:p-12 relative">
                    <div className="absolute top-6 right-6">
                        <Sparkles className="h-12 w-12 text-primary/20" />
                    </div>
                    <div className="relative z-10">
                        <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">{route.title}</h1>
                        <p className="mb-6 text-xl text-muted-foreground max-w-2xl">{route.description}</p>
                        <div className="flex flex-wrap gap-4">
                            <div className="flex items-center gap-2 rounded-full bg-background/50 px-4 py-2 backdrop-blur">
                                <Calendar className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium">{route.itinerary?.length} дней</span>
                            </div>
                            <div className="flex items-center gap-2 rounded-full bg-background/50 px-4 py-2 backdrop-blur">
                                <Wallet className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium">{route.totalBudget}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid gap-8 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-8">
                        <h2 className="text-2xl font-bold">Ваш маршрут по дням</h2>

                        <div className="space-y-6 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-0.5 before:bg-primary/20">
                            {route.itinerary?.map((day: any, idx: number) => (
                                <div key={idx} className="relative pl-12">
                                    <div className="absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-sm">
                                        {day.day}
                                    </div>
                                    <Card className="p-6 transition-all hover:shadow-md">
                                        <div className="space-y-4">
                                            <div className="flex items-start gap-4">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1 text-primary">
                                                    <SunIcon />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Утро</p>
                                                    <p className="text-sm leading-relaxed">{day.morning}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-4">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1 text-primary">
                                                    <CoffeeIcon />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold uppercase text-muted-foreground mb-1">День</p>
                                                    <p className="text-sm leading-relaxed">{day.daytime}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-4">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1 text-primary">
                                                    <MoonIcon />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Вечер</p>
                                                    <p className="text-sm leading-relaxed">{day.night}</p>
                                                </div>
                                            </div>

                                            {day.tips && (
                                                <div className="mt-4 rounded-lg bg-primary/5 p-4 flex gap-3 items-start border border-primary/10">
                                                    <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                                    <p className="text-xs text-muted-foreground italic leading-relaxed">{day.tips}</p>
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-8">
                        <Card className="p-6">
                            <h3 className="mb-4 text-lg font-bold">Страны и города</h3>
                            <div className="space-y-4">
                                {route.countries?.map((country: any, cIdx: number) => (
                                    <div key={cIdx} className="space-y-2">
                                        <div className="flex items-center gap-2 font-semibold">
                                            <MapPin className="h-4 w-4 text-primary" />
                                            {country.name}
                                        </div>
                                        <ul className="pl-6 space-y-1">
                                            {country.cities?.map((city: any, cityIdx: number) => (
                                                <li key={cityIdx} className="text-sm text-muted-foreground list-disc">
                                                    {city.name}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card className="p-6">
                            <h3 className="mb-4 text-lg font-bold">Стиль и теги</h3>
                            <div className="flex flex-wrap gap-2">
                                {route.tags?.map((tag: string) => (
                                    <Badge key={tag} variant="secondary">{tag}</Badge>
                                ))}
                            </div>
                        </Card>

                        {(route.visaAdvice || route.paymentAdvice) && (
                            <Card className="p-6 bg-primary/5 border-primary/20">
                                <h3 className="mb-4 text-lg font-bold flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-primary" />
                                    Важная информация
                                </h3>
                                <div className="space-y-4">
                                    {route.visaAdvice && (
                                        <div>
                                            <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Виза и документы</p>
                                            <p className="text-sm leading-relaxed">{route.visaAdvice}</p>
                                        </div>
                                    )}
                                    {route.paymentAdvice && (
                                        <div>
                                            <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Оплата и деньги</p>
                                            <p className="text-sm leading-relaxed">{route.paymentAdvice}</p>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        )}

                        <Card className="p-6 bg-primary text-primary-foreground">
                            <h3 className="mb-2 text-lg font-bold">ИИ-ассистент</h3>
                            <p className="mb-4 text-sm opacity-90">
                                Я готов ответить на ваши вопросы по этому маршруту во время поездки!
                            </p>
                            <Button variant="secondary" className="w-full">
                                Задать вопрос
                            </Button>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    )
}

function SunIcon() { return <Clock className="h-4 w-4" /> }
function CoffeeIcon() { return <Utensils className="h-4 w-4" /> }
function MoonIcon() { return <House className="h-4 w-4" /> }
