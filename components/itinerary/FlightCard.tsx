"use client"

import { Plane, Clock, Luggage, Package, Users, Calendar, ArrowRight, ExternalLink, Circle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface FlightTransfer {
    city: string
    duration: string
    airport?: string
}

interface FlightCardProps {
    // Route
    departureCity?: string
    departureCode?: string
    arrivalCity?: string
    arrivalCode?: string

    // Times
    departureDate?: string
    departureTime: string
    arrivalDate?: string
    arrivalTime: string

    // Flight info
    airline: string
    flightNumber?: string
    duration: string

    // Transfer - supports both string ("Direct"/"1 stop") and object
    transfer?: FlightTransfer | string | null

    // Passengers & price
    passengers?: number
    price: number
    pricePerPerson?: number

    // Baggage
    baggage?: {
        handLuggage?: string
        checked?: string
    }

    // Legacy props (backward compat)
    terminal?: string

    // Link
    bookingUrl?: string

    className?: string
}

function formatDate(dateStr: string): string {
    try {
        const date = new Date(dateStr)
        return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
    } catch {
        return dateStr
    }
}

function getTransferInfo(transfer: FlightTransfer | string | null | undefined): { isDirect: boolean; label: string; detail?: FlightTransfer } {
    if (!transfer) return { isDirect: true, label: "Прямой" }
    if (typeof transfer === "string") {
        const lower = transfer.toLowerCase()
        if (lower === "direct" || lower === "прямой" || lower === "без пересадок") {
            return { isDirect: true, label: "Прямой" }
        }
        return { isDirect: false, label: transfer }
    }
    return { isDirect: false, label: `Пересадка в ${transfer.city}`, detail: transfer }
}

export function FlightCard({
    departureCity,
    departureCode,
    arrivalCity,
    arrivalCode,
    departureDate,
    departureTime,
    arrivalDate,
    arrivalTime,
    airline,
    flightNumber,
    duration,
    transfer,
    passengers,
    price,
    pricePerPerson,
    baggage,
    terminal,
    bookingUrl,
    className
}: FlightCardProps) {
    const transferInfo = getTransferInfo(transfer)

    // Calculate per-person price if passengers > 1 and no explicit pricePerPerson
    const perPerson = pricePerPerson || (passengers && passengers > 1 ? Math.round(price / passengers) : undefined)

    // Build booking URL if not provided
    const buyUrl = bookingUrl || "https://www.aviasales.ru/"

    return (
        <Card className={cn(
            "relative overflow-hidden border-2 border-blue-500/30 bg-gradient-to-br from-blue-50/80 via-white to-sky-50/50 dark:from-blue-950/30 dark:via-card dark:to-sky-950/20 shadow-lg shadow-blue-500/5 hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-500/50 transition-all duration-300",
            className
        )}>
            {/* Blue accent stripe */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-blue-500 to-sky-400" />

            <div className="p-5 space-y-4">
                {/* Header: Airline + Date */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl border border-blue-500/20">
                            <Plane className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <div className="font-bold text-base">{airline}</div>
                            {flightNumber && (
                                <div className="text-xs text-muted-foreground font-mono">{flightNumber}</div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {departureDate && (
                            <Badge variant="outline" className="rounded-lg border-blue-500/20 bg-blue-500/5 text-blue-700 dark:text-blue-300 font-medium">
                                <Calendar className="w-3 h-3 mr-1.5" />
                                {formatDate(departureDate)}
                            </Badge>
                        )}
                        <Badge className={cn(
                            "rounded-lg border-0 font-bold text-xs",
                            transferInfo.isDirect
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        )}>
                            {transferInfo.isDirect ? "Прямой" : "С пересадкой"}
                        </Badge>
                    </div>
                </div>

                {/* Route visualization */}
                <div className="bg-white/60 dark:bg-white/5 rounded-2xl p-4 border border-blue-100/50 dark:border-blue-900/30">
                    {transferInfo.isDirect ? (
                        /* Direct flight */
                        <div className="flex items-center justify-between gap-4">
                            {/* Departure */}
                            <div className="text-center min-w-[80px]">
                                <div className="text-2xl font-black tracking-tight">{departureTime}</div>
                                {departureCode && (
                                    <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5">{departureCode}</div>
                                )}
                                {departureCity && (
                                    <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[100px]">{departureCity}</div>
                                )}
                                {terminal && <div className="text-[10px] text-muted-foreground/60">Терм. {terminal}</div>}
                            </div>

                            {/* Route line */}
                            <div className="flex-1 flex flex-col items-center gap-1.5 px-2">
                                <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {duration}
                                </div>
                                <div className="w-full flex items-center gap-1">
                                    <Circle className="w-2 h-2 text-blue-400 fill-blue-400 shrink-0" />
                                    <div className="flex-1 h-[2px] bg-gradient-to-r from-blue-400 to-sky-400 relative">
                                        <Plane className="w-4 h-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500 rotate-90" />
                                    </div>
                                    <Circle className="w-2 h-2 text-sky-400 fill-sky-400 shrink-0" />
                                </div>
                            </div>

                            {/* Arrival */}
                            <div className="text-center min-w-[80px]">
                                <div className="text-2xl font-black tracking-tight">{arrivalTime}</div>
                                {arrivalCode && (
                                    <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5">{arrivalCode}</div>
                                )}
                                {arrivalCity && (
                                    <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[100px]">{arrivalCity}</div>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Flight with transfer */
                        <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                                {/* Departure */}
                                <div className="text-center min-w-[70px]">
                                    <div className="text-xl font-black tracking-tight">{departureTime}</div>
                                    {departureCode && <div className="text-xs font-bold text-blue-600 dark:text-blue-400">{departureCode}</div>}
                                    {departureCity && <div className="text-[10px] text-muted-foreground truncate max-w-[80px]">{departureCity}</div>}
                                </div>

                                {/* First leg line */}
                                <div className="flex-1 flex items-center gap-0.5">
                                    <Circle className="w-1.5 h-1.5 text-blue-400 fill-blue-400 shrink-0" />
                                    <div className="flex-1 h-[2px] bg-blue-400" />
                                    <Plane className="w-3 h-3 text-blue-500 rotate-90 shrink-0" />
                                </div>

                                {/* Transfer point */}
                                <div className="text-center px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/30 min-w-[90px]">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Пересадка</div>
                                    {transferInfo.detail?.city && (
                                        <div className="text-xs font-bold mt-0.5">{transferInfo.detail.city}</div>
                                    )}
                                    {transferInfo.detail?.duration && (
                                        <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
                                            <Clock className="w-2.5 h-2.5" /> {transferInfo.detail.duration}
                                        </div>
                                    )}
                                </div>

                                {/* Second leg line */}
                                <div className="flex-1 flex items-center gap-0.5">
                                    <Plane className="w-3 h-3 text-sky-500 rotate-90 shrink-0" />
                                    <div className="flex-1 h-[2px] bg-sky-400" />
                                    <Circle className="w-1.5 h-1.5 text-sky-400 fill-sky-400 shrink-0" />
                                </div>

                                {/* Arrival */}
                                <div className="text-center min-w-[70px]">
                                    <div className="text-xl font-black tracking-tight">{arrivalTime}</div>
                                    {arrivalCode && <div className="text-xs font-bold text-blue-600 dark:text-blue-400">{arrivalCode}</div>}
                                    {arrivalCity && <div className="text-[10px] text-muted-foreground truncate max-w-[80px]">{arrivalCity}</div>}
                                </div>
                            </div>

                            <div className="text-center">
                                <span className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Общее время: {duration}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer: Baggage, Passengers, Price */}
                <div className="flex items-end justify-between gap-4 pt-1">
                    <div className="space-y-2">
                        {/* Baggage */}
                        <div className="flex flex-wrap gap-2">
                            {baggage?.handLuggage && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 dark:bg-white/5 px-2.5 py-1.5 rounded-lg">
                                    <Luggage className="w-3.5 h-3.5 text-blue-500/70" />
                                    <span>Ручная: {baggage.handLuggage}</span>
                                </div>
                            )}
                            {baggage?.checked && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 dark:bg-white/5 px-2.5 py-1.5 rounded-lg">
                                    <Package className="w-3.5 h-3.5 text-blue-500/70" />
                                    <span>Багаж: {baggage.checked}</span>
                                </div>
                            )}
                            {!baggage?.handLuggage && !baggage?.checked && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 dark:bg-white/5 px-2.5 py-1.5 rounded-lg">
                                    <Luggage className="w-3.5 h-3.5 text-blue-500/70" />
                                    <span>Багаж: 23 кг</span>
                                </div>
                            )}
                        </div>

                        {/* Passengers */}
                        {passengers && passengers > 0 && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Users className="w-3.5 h-3.5 text-blue-500/70" />
                                <span>{passengers} {passengers === 1 ? "пассажир" : passengers < 5 ? "пассажира" : "пассажиров"}</span>
                            </div>
                        )}
                    </div>

                    {/* Price & Buy */}
                    <div className="flex flex-col items-end gap-2">
                        <div className="text-right">
                            <div className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
                                {price.toLocaleString("ru-RU")} ₽
                            </div>
                            {perPerson && (
                                <div className="text-[10px] text-muted-foreground/70">
                                    {perPerson.toLocaleString("ru-RU")} ₽ за чел.
                                </div>
                            )}
                        </div>
                        <Button
                            size="sm"
                            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 h-9 shadow-md shadow-blue-500/20"
                            onClick={() => window.open(buyUrl, "_blank")}
                        >
                            Купить билеты
                            <ExternalLink className="w-3 h-3 ml-1.5" />
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    )
}
