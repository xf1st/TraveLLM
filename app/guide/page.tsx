"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/app-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Sparkles,
    MapPin,
    Calendar,
    MessageCircle,
    ArrowRight,
    Bot,
    Compass,
    Utensils,
    Camera,
    Shield,
    Languages,
    Clock
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { supabase } from "@/lib/supabase"

export default function GuidePage() {
    const [trips, setTrips] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadTrips()
    }, [])

    const loadTrips = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data } = await supabase
                .from('trips')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(10)
            if (data) setTrips(data)
        }
        setLoading(false)
    }

    const features = [
        {
            icon: Languages,
            title: "Переводчик",
            description: "Мгновенный перевод меню, вывесок и разговоров"
        },
        {
            icon: Utensils,
            title: "Рестораны",
            description: "Найдёт лучшие места рядом с учётом ваших предпочтений"
        },
        {
            icon: Camera,
            title: "Фото-гид",
            description: "Подскажет лучшие ракурсы и время для съёмки"
        },
        {
            icon: Shield,
            title: "Безопасность",
            description: "Информация о районах, экстренные контакты"
        },
        {
            icon: Clock,
            title: "Расписание",
            description: "Актуальные часы работы, выходные дни"
        },
        {
            icon: Compass,
            title: "Навигация",
            description: "Как добраться, общественный транспорт"
        }
    ]

    return (
        <AppLayout title="ИИ-гид" description="Ваш персональный консьерж в любом путешествии">
            <div className="max-w-5xl mx-auto">
                {/* Hero Section */}
                <Card className="relative overflow-hidden mb-8 bg-gradient-to-br from-primary/20 via-primary/10 to-background border-primary/20">
                    <div className="absolute inset-0 bg-grid-white/5" />
                    <div className="relative p-8 md:p-12">
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="flex-shrink-0">
                                <div className="relative w-32 h-32 rounded-3xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-2xl shadow-primary/30">
                                    <Bot className="h-16 w-16 text-white" />
                                    <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                        AI
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h2 className="text-3xl font-bold mb-3">Привет! Я ваш ИИ-гид</h2>
                                <p className="text-lg text-muted-foreground mb-4">
                                    Я помогу вам во время путешествия: переведу меню, найду ближайшую аптеку,
                                    забронирую столик или просто расскажу интересные факты о месте.
                                </p>
                                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                                    <Badge variant="secondary" className="gap-1">
                                        <MessageCircle className="h-3 w-3" /> Чат 24/7
                                    </Badge>
                                    <Badge variant="secondary" className="gap-1">
                                        <Languages className="h-3 w-3" /> 50+ языков
                                    </Badge>
                                    <Badge variant="secondary" className="gap-1">
                                        <MapPin className="h-3 w-3" /> Геолокация
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Features Grid */}
                <div className="mb-12">
                    <h3 className="text-xl font-bold mb-6">Чем могу помочь?</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {features.map((feature, idx) => (
                            <Card
                                key={idx}
                                className="p-5 hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer group"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                        <feature.icon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold mb-1">{feature.title}</h4>
                                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* My Trips - Select to chat */}
                <div className="mb-12">
                    <h3 className="text-xl font-bold mb-2">Выберите маршрут</h3>
                    <p className="text-muted-foreground mb-6">
                        Для персонализированных рекомендаций выберите маршрут, о котором хотите узнать больше
                    </p>

                    {loading ? (
                        <div className="flex justify-center p-12">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        </div>
                    ) : trips.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2">
                            {trips.map((trip) => (
                                <Link key={trip.id} href={`/guide/${trip.id}`}>
                                    <Card className="p-4 hover:shadow-lg hover:border-primary/30 transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                                                <Image
                                                    src={`https://loremflickr.com/200/200/travel,${encodeURIComponent(trip.destination || 'city')}`}
                                                    alt={trip.title}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold truncate group-hover:text-primary transition-colors">
                                                    {trip.title || trip.destination}
                                                </h4>
                                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" />
                                                        {trip.destination}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {trip.itinerary?.length || 0} дней
                                                    </span>
                                                </div>
                                            </div>
                                            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <Card className="p-8 text-center border-dashed">
                            <Compass className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                            <h4 className="font-semibold mb-2">Нет сохранённых маршрутов</h4>
                            <p className="text-sm text-muted-foreground mb-4">
                                Создайте свой первый маршрут, чтобы получить персонального ИИ-гида
                            </p>
                            <Button asChild>
                                <Link href="/plan">Создать маршрут</Link>
                            </Button>
                        </Card>
                    )}
                </div>

                {/* Quick Chat (coming soon) */}
                <Card className="p-8 bg-muted/30 text-center">
                    <Sparkles className="h-10 w-10 text-primary/40 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">Быстрый чат (скоро)</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        Скоро вы сможете задавать вопросы прямо здесь, без привязки к конкретному маршруту.
                        ИИ-гид поможет с любыми вопросами о путешествиях.
                    </p>
                </Card>
            </div>
        </AppLayout>
    )
}
