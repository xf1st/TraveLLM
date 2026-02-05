"use client"

import { Plane, Luggage, Clock, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface FlightCardProps {
    airline: string
    flightNumber: string
    departureTime: string
    arrivalTime: string
    duration: string
    price: number
    terminal?: string
    transfer?: string
    className?: string
}

export function FlightCard({
    airline,
    flightNumber,
    departureTime,
    arrivalTime,
    duration,
    price,
    terminal,
    transfer,
    className
}: FlightCardProps) {
    return (
        <Card className={cn("p-4 border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/10 hover:shadow-md transition-all", className)}>
            <div className="flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                            <Plane className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h4 className="font-bold text-sm">{airline}</h4>
                            <p className="text-xs text-muted-foreground">{flightNumber}</p>
                        </div>
                    </div>
                    <Badge variant="secondary" className="bg-blue-100/50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-0">
                        {transfer || "Прямой"}
                    </Badge>
                </div>

                {/* Route & Times */}
                <div className="flex items-center justify-between px-2">
                    <div className="text-center">
                        <div className="text-xl font-bold">{departureTime}</div>
                        {terminal && <div className="text-xs text-muted-foreground">Терминал {terminal}</div>}
                    </div>

                    <div className="flex-1 px-4 flex flex-col items-center">
                        <div className="text-xs text-muted-foreground mb-1">{duration}</div>
                        <div className="w-full h-px bg-border relative">
                            <Plane className="w-3 h-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90 text-muted-foreground/50" />
                        </div>
                    </div>

                    <div className="text-center">
                        <div className="text-xl font-bold">{arrivalTime}</div>
                    </div>
                </div>

                <Separator className="bg-blue-200/50 dark:bg-blue-800/50" />

                {/* Footer: Price & Action */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Luggage className="w-3 h-3" />
                        <span>Включено: 23 кг</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {price.toLocaleString('ru-RU')} ₽
                        </div>
                        <a
                            href={`https://www.aviasales.ru/search?origin=MOW&destination=IST`} // TODO: Dynamic link based on props
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-4 py-2 rounded-full transition-colors"
                        >
                            Купить
                        </a>
                    </div>
                </div>
            </div>
        </Card>
    )
}
