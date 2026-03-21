"use client"

import { Plane, Clock, Luggage, Package, Users, Calendar, ArrowRight, ExternalLink, Circle, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

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
    departureTime?: string
    arrivalDate?: string
    arrivalTime?: string

    // Flight info
    airline: string
    flightNumber?: string
    duration?: string

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

    // Fallback flag (no real data, just booking link)
    isFallback?: boolean

    // Approximate price (no exact date flights available)
    isApproximate?: boolean
    approximateNote?: string

    className?: string
}

function formatDate(dateStr: string, locale: string): string {
    try {
        const date = new Date(dateStr)
        return date.toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", { day: "numeric", month: "short" })
    } catch {
        return dateStr
    }
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
    isFallback,
    isApproximate,
    approximateNote,
    className
}: FlightCardProps) {
    const t = useTranslations("flight")
    const tCurr = useTranslations("currency")
    const locale = tCurr("code") === "RUB" ? "ru" : "en"

    function getTransferInfo(xfer: FlightTransfer | string | null | undefined): { isDirect: boolean; label: string; detail?: FlightTransfer } {
        if (!xfer) return { isDirect: true, label: t("direct") }
        if (typeof xfer === "string") {
            const lower = xfer.toLowerCase()
            if (lower === "direct" || lower === "прямой" || lower === "без пересадок") {
                return { isDirect: true, label: t("direct") }
            }
            return { isDirect: false, label: xfer }
        }
        return { isDirect: false, label: t("transferAt", { city: xfer.city }), detail: xfer }
    }

    const transferInfo = getTransferInfo(transfer)

    // Calculate per-person price if passengers > 1 and no explicit pricePerPerson
    const perPerson = pricePerPerson || (passengers && passengers > 1 ? Math.round(price / passengers) : undefined)

    // Build booking URL if not provided
    const buyUrl = bookingUrl || "https://www.aviasales.ru/"

    // Detect if we have real time data
    const hasTimeData = !!(departureTime && departureTime.trim())
    const hasPriceData = price > 0

    return (
        <Card className={cn(
            "relative overflow-hidden border-2 border-blue-500/30 bg-gradient-to-br from-blue-50/80 via-white to-sky-50/50 dark:from-blue-950/30 dark:via-card dark:to-sky-950/20 shadow-lg shadow-blue-500/5 hover:shadow-md md:shadow-xl hover:shadow-blue-500/10 hover:border-blue-500/50 transition-all duration-300 w-full max-w-full",
            className
        )}>
            {/* Blue accent stripe */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-blue-500 to-sky-400" />

            {/* ===== MOBILE COMPACT LAYOUT ===== */}
            <div className="sm:hidden p-2.5 space-y-1.5 overflow-hidden max-w-full">
                {/* Row 1: Airline + Date + Transfer badge */}
                <div className="flex items-center justify-between gap-1 overflow-hidden">
                    <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                        <Plane className="w-3 h-3 text-blue-500 shrink-0" />
                        <span className="text-[11px] font-bold truncate">{airline}</span>
                        {flightNumber && (
                            <span className="text-[9px] text-muted-foreground font-mono truncate">{flightNumber}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-1">
                        {departureDate && (
                            <span className="text-[9px] text-muted-foreground">
                                {formatDate(departureDate, locale)}
                            </span>
                        )}
                        <Badge className={cn(
                            "rounded border-0 font-bold text-[8px] px-1 py-0 h-3.5 leading-none",
                            transferInfo.isDirect
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        )}>
                            {transferInfo.isDirect ? t("direct") : t("transfer")}
                        </Badge>
                    </div>
                </div>

                {/* Row 2: Compact route */}
                <div className="flex items-center gap-1 bg-white/60 dark:bg-white/5 rounded-lg px-2 py-1.5 border border-blue-100/50 dark:border-blue-900/30 overflow-hidden">
                    {/* Departure */}
                    <div className="text-center shrink-0 w-10">
                        <div className="text-xs font-black leading-none">
                            {hasTimeData ? departureTime : "—"}
                        </div>
                        {departureCode && (
                            <div className="text-[9px] font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                                {departureCode}
                            </div>
                        )}
                        {departureCity && (
                            <div className="text-[8px] text-muted-foreground truncate">
                                {departureCity}
                            </div>
                        )}
                    </div>

                    {/* Route line */}
                    <div className="flex-1 flex flex-col items-center gap-0.5 min-w-0 overflow-hidden">
                        {duration && duration !== "—" && (
                            <div className="text-[8px] text-muted-foreground flex items-center gap-0.5">
                                <Clock className="w-2 h-2 shrink-0" />
                                <span className="truncate">{duration}</span>
                            </div>
                        )}
                        <div className="w-full flex items-center gap-0.5">
                            <div className="w-1 h-1 rounded-full bg-blue-400 shrink-0" />
                            <div className="flex-1 h-px bg-gradient-to-r from-blue-400 to-sky-400 relative">
                                <Plane className="w-2.5 h-2.5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500 rotate-90" />
                            </div>
                            <div className="w-1 h-1 rounded-full bg-sky-400 shrink-0" />
                        </div>
                    </div>

                    {/* Arrival */}
                    <div className="text-center shrink-0 w-10">
                        <div className="text-xs font-black leading-none">
                            {hasTimeData ? (arrivalTime || "—") : "—"}
                        </div>
                        {arrivalCode && (
                            <div className="text-[9px] font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                                {arrivalCode}
                            </div>
                        )}
                        {arrivalCity && (
                            <div className="text-[8px] text-muted-foreground truncate">
                                {arrivalCity}
                            </div>
                        )}
                    </div>
                </div>

                {/* Row 3: Price + Buy */}
                <div className="flex items-center justify-between">
                    <div className="min-w-0">
                        {hasPriceData ? (
                            <>
                                <span className={cn(
                                    "text-sm font-black leading-none",
                                    isApproximate ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"
                                )}>
                                    <span className="text-[9px] font-bold">{isApproximate ? t("approx") : t("priceFrom")} </span>
                                    {price.toLocaleString("ru-RU")} ₽
                                </span>
                                {isApproximate && (
                                    <div className="flex items-center gap-0.5 text-[8px] text-amber-600 dark:text-amber-400">
                                        <AlertTriangle className="w-2 h-2" />
                                        <span>{t("noFlightsDate")}</span>
                                    </div>
                                )}
                                {!isApproximate && perPerson && passengers && passengers > 1 && (
                                    <div className="text-[8px] text-muted-foreground">
                                        {t("perPerson", { price: perPerson.toLocaleString("ru-RU") })}
                                    </div>
                                )}
                            </>
                        ) : (
                            <span className="text-[10px] text-muted-foreground font-medium">{t("checkPrices")}</span>
                        )}
                    </div>
                    <Button
                        size="sm"
                        className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[9px] px-2.5 h-6 shadow-md shadow-blue-500/20 shrink-0"
                        onClick={() => window.open(buyUrl, "_blank")}
                    >
                        {hasPriceData ? t("buy") : t("find")}
                        <ExternalLink className="w-2 h-2 ml-0.5" />
                    </Button>
                </div>
            </div>


            {/* ===== DESKTOP LAYOUT ===== */}
            <div className="hidden sm:block p-3 sm:p-5 space-y-3 sm:space-y-4 overflow-hidden max-w-full">
                {/* Header: Airline + Date */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2.5 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl border border-blue-500/20 shrink-0">
                            <Plane className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="min-w-0">
                            <div className="font-bold text-base truncate">{airline}</div>
                            {flightNumber && (
                                <div className="text-xs text-muted-foreground font-mono truncate">{flightNumber}</div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {departureDate && (
                            <Badge variant="outline" className="rounded-lg border-blue-500/20 bg-blue-500/5 text-blue-700 dark:text-blue-300 font-medium text-xs px-2.5">
                                <Calendar className="w-3 h-3 mr-1" />
                                {formatDate(departureDate, locale)}
                            </Badge>
                        )}
                        <Badge className={cn(
                            "rounded-lg border-0 font-bold text-xs px-2.5",
                            transferInfo.isDirect
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        )}>
                            {transferInfo.isDirect ? t("direct") : t("withTransfer")}
                        </Badge>
                    </div>
                </div>

                {/* Route visualization */}
                <div className="bg-white/60 dark:bg-white/5 rounded-2xl p-3 sm:p-4 border border-blue-100/50 dark:border-blue-900/30 overflow-hidden w-full">
                    {!hasTimeData ? (
                        /* Fallback: no time data, show simplified route */
                        <div className="flex items-center justify-between gap-2 sm:gap-4 overflow-hidden">
                            <div className="text-center min-w-0 shrink-0 w-16 sm:w-20">
                                {departureCode && (
                                    <div className="text-sm font-bold text-blue-600 dark:text-blue-400">{departureCode}</div>
                                )}
                                {departureCity && (
                                    <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[100px]">{departureCity}</div>
                                )}
                            </div>
                            <div className="flex-1 flex flex-col items-center gap-1.5 px-2">
                                {duration && duration !== "—" && (
                                    <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {duration}
                                    </div>
                                )}
                                <div className="w-full flex items-center gap-1">
                                    <Circle className="w-2 h-2 text-blue-400 fill-blue-400 shrink-0" />
                                    <div className="flex-1 h-[2px] bg-gradient-to-r from-blue-400 to-sky-400 relative">
                                        <Plane className="w-4 h-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500 rotate-90" />
                                    </div>
                                    <Circle className="w-2 h-2 text-sky-400 fill-sky-400 shrink-0" />
                                </div>
                            </div>
                            <div className="text-center min-w-0 shrink-0 w-16 sm:w-20">
                                {arrivalCode && (
                                    <div className="text-sm font-bold text-blue-600 dark:text-blue-400">{arrivalCode}</div>
                                )}
                                {arrivalCity && (
                                    <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[100px]">{arrivalCity}</div>
                                )}
                            </div>
                        </div>
                    ) : transferInfo.isDirect ? (
                        /* Direct flight */
                        <div className="flex items-center justify-between gap-2 sm:gap-4 overflow-hidden">
                            {/* Departure */}
                            <div className="text-center min-w-0 shrink-0 w-16 sm:w-20">
                                <div className="text-lg sm:text-2xl font-black tracking-tight">{departureTime}</div>
                                {departureCode && (
                                    <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5">{departureCode}</div>
                                )}
                                {departureCity && (
                                    <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[100px]">{departureCity}</div>
                                )}
                                {terminal && <div className="text-[10px] text-muted-foreground/60">{t("terminal", { n: terminal })}</div>}
                            </div>

                            {/* Route line */}
                            <div className="flex-1 flex flex-col items-center gap-1.5 px-2">
                                {duration && duration !== "—" && (
                                    <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {duration}
                                    </div>
                                )}
                                <div className="w-full flex items-center gap-1">
                                    <Circle className="w-2 h-2 text-blue-400 fill-blue-400 shrink-0" />
                                    <div className="flex-1 h-[2px] bg-gradient-to-r from-blue-400 to-sky-400 relative">
                                        <Plane className="w-4 h-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500 rotate-90" />
                                    </div>
                                    <Circle className="w-2 h-2 text-sky-400 fill-sky-400 shrink-0" />
                                </div>
                            </div>

                            {/* Arrival */}
                            <div className="text-center min-w-0 shrink-0 w-16 sm:w-20">
                                <div className="text-lg sm:text-2xl font-black tracking-tight">{arrivalTime || "—"}</div>
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
                        <div className="space-y-3 overflow-hidden">
                            <div className="flex items-center justify-between gap-1 sm:gap-2 overflow-hidden">
                                {/* Departure */}
                                <div className="text-center min-w-0 shrink-0 w-14 sm:w-16">
                                    <div className="text-base sm:text-xl font-black tracking-tight">{departureTime}</div>
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
                                <div className="text-center px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/30 min-w-0 shrink-0 w-16 sm:w-auto">
                                    <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">{t("transfer")}</div>
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
                                <div className="text-center min-w-0 shrink-0 w-14 sm:w-16">
                                    <div className="text-base sm:text-xl font-black tracking-tight">{arrivalTime || "—"}</div>
                                    {arrivalCode && <div className="text-xs font-bold text-blue-600 dark:text-blue-400">{arrivalCode}</div>}
                                    {arrivalCity && <div className="text-[10px] text-muted-foreground truncate max-w-[80px]">{arrivalCity}</div>}
                                </div>
                            </div>

                            {duration && duration !== "—" && (
                                <div className="text-center">
                                    <span className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {t("totalDuration", { duration })}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer: Baggage, Passengers, Price */}
                <div className="flex flex-wrap sm:flex-nowrap items-end justify-between gap-2 sm:gap-4 pt-1 overflow-hidden">
                    <div className="space-y-2">
                        {/* Baggage */}
                        <div className="flex flex-wrap gap-2">
                            {baggage?.handLuggage && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 dark:bg-white/5 px-2.5 py-1.5 rounded-lg">
                                    <Luggage className="w-3.5 h-3.5 text-blue-500/70" />
                                    <span>{t("handLuggage", { size: baggage.handLuggage })}</span>
                                </div>
                            )}
                            {baggage?.checked && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 dark:bg-white/5 px-2.5 py-1.5 rounded-lg">
                                    <Package className="w-3.5 h-3.5 text-blue-500/70" />
                                    <span>{t("baggage", { size: baggage.checked })}</span>
                                </div>
                            )}
                            {!baggage?.handLuggage && !baggage?.checked && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 dark:bg-white/5 px-2.5 py-1.5 rounded-lg">
                                    <Luggage className="w-3.5 h-3.5 text-blue-500/70" />
                                    <span>{t("defaultBaggage")}</span>
                                </div>
                            )}
                        </div>

                        {/* Passengers */}
                        {passengers && passengers > 0 && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Users className="w-3.5 h-3.5 text-blue-500/70" />
                                <span>{t("passengers", { count: passengers })}</span>
                            </div>
                        )}
                    </div>

                    {/* Price & Buy */}
                    <div className="flex flex-col items-end gap-2">
                        {hasPriceData ? (
                            <div className="text-right">
                                <div className={cn(
                                    "text-2xl font-black tracking-tight",
                                    isApproximate ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"
                                )}>
                                    <span className="text-base font-bold">{isApproximate ? t("approx") : t("priceFrom")} </span>{price.toLocaleString("ru-RU")} ₽
                                </div>
                                {isApproximate ? (
                                    <div className="flex items-center justify-end gap-1 text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                                        <AlertTriangle className="w-3 h-3" />
                                        <span>{t("noFlightsDateFull")}</span>
                                    </div>
                                ) : perPerson && perPerson > 0 && passengers && passengers > 1 ? (
                                    <div className="text-[10px] text-muted-foreground/70">
                                        {t("perPerson", { price: perPerson.toLocaleString("ru-RU") })}
                                    </div>
                                ) : null}
                            </div>
                        ) : (
                            <div className="text-right">
                                <div className="text-sm font-medium text-muted-foreground">
                                    {t("checkPrices")}
                                </div>
                            </div>
                        )}
                        <Button
                            size="sm"
                            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 h-9 shadow-md shadow-blue-500/20"
                            onClick={() => window.open(buyUrl, "_blank")}
                        >
                            {hasPriceData ? t("buy") : t("findTickets")}
                            <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                    </div>

                </div>
            </div>
        </Card>
    )
}
