"use client"

import { useState } from "react"
import { Star, MapPin, Wifi, Check, Calendar, Users, ExternalLink, ChevronLeft, ChevronRight, UtensilsCrossed, Waves, Dumbbell, Car, Coffee, Sparkles, ShieldCheck, Wind, Tv } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TripImage } from "@/components/TripImage"
import { cn } from "@/lib/utils"

// Amenity icon mapping
const AMENITY_ICONS: Record<string, any> = {
    "wifi": Wifi,
    "wi-fi": Wifi,
    "вай-фай": Wifi,
    "интернет": Wifi,
    "завтрак": UtensilsCrossed,
    "еда": UtensilsCrossed,
    "питание": UtensilsCrossed,
    "ресторан": UtensilsCrossed,
    "all inclusive": UtensilsCrossed,
    "всё включено": UtensilsCrossed,
    "бассейн": Waves,
    "pool": Waves,
    "спа": Sparkles,
    "spa": Sparkles,
    "сауна": Sparkles,
    "фитнес": Dumbbell,
    "тренажёр": Dumbbell,
    "тренажер": Dumbbell,
    "gym": Dumbbell,
    "парковка": Car,
    "parking": Car,
    "кондиционер": Wind,
    "кофе": Coffee,
    "тв": Tv,
    "телевизор": Tv,
    "страховка": ShieldCheck,
}

function getAmenityIcon(amenity: string) {
    const lower = amenity.toLowerCase()
    for (const [key, Icon] of Object.entries(AMENITY_ICONS)) {
        if (lower.includes(key)) return Icon
    }
    return Check
}

interface HotelCardProps {
    hotelName: string
    stars: number
    rating: number
    reviewsCount: number

    // Stay details
    checkIn?: string
    checkOut?: string
    nights?: number
    guests?: number
    rooms?: number

    // Pricing
    pricePerNight: number
    totalPrice?: number

    // Location
    address: string

    // Media
    photos?: string[]
    photoQuery?: string

    // Amenities
    amenities: string[]

    // Link
    bookingUrl?: string

    // Fallback flag (no real data, just booking link)
    isFallback?: boolean

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

function getRatingLabel(rating: number): string {
    if (rating >= 9) return "Превосходно"
    if (rating >= 8) return "Отлично"
    if (rating >= 7) return "Хорошо"
    if (rating >= 6) return "Нормально"
    return "Средне"
}

function getRatingColor(rating: number): string {
    if (rating >= 9) return "bg-emerald-500"
    if (rating >= 8) return "bg-emerald-600"
    if (rating >= 7) return "bg-sky-600"
    if (rating >= 6) return "bg-amber-500"
    return "bg-orange-500"
}

export function HotelCard({
    hotelName,
    stars,
    rating,
    reviewsCount,
    checkIn,
    checkOut,
    nights,
    guests,
    rooms,
    pricePerNight,
    totalPrice,
    address,
    photos,
    photoQuery,
    amenities,
    bookingUrl,
    isFallback,
    className
}: HotelCardProps) {
    const [currentPhoto, setCurrentPhoto] = useState(0)

    const hasPhotos = photos && photos.length > 0
    const photoCount = hasPhotos ? photos!.length : 0

    // Calculate total price if not provided
    const calculatedTotal = totalPrice || (nights ? pricePerNight * nights : pricePerNight)

    // Build booking URL
    const buyUrl = bookingUrl || "https://ostrovok.ru/"

    // Detect if we have real price/rating data
    const hasPriceData = pricePerNight > 0
    const hasRatingData = rating > 0

    return (
        <Card className={cn(
            "relative overflow-hidden border-2 border-amber-500/30 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/50 dark:from-amber-950/20 dark:via-card dark:to-orange-950/10 shadow-lg shadow-amber-500/5 hover:shadow-xl hover:shadow-amber-500/10 hover:border-amber-500/50 transition-all duration-300",
            className
        )}>
            {/* Amber accent stripe */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />

            <div className="grid md:grid-cols-[280px_1fr] gap-0">
                {/* Photo section */}
                <div className="relative h-44 sm:h-56 md:h-full min-h-[180px] sm:min-h-[220px] overflow-hidden bg-muted/20">
                    {hasPhotos ? (
                        <>
                            <img
                                src={photos![currentPhoto]}
                                alt={hotelName}
                                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                            />
                            {/* Photo navigation */}
                            {photoCount > 1 && (
                                <>
                                    <button
                                        onClick={() => setCurrentPhoto(prev => prev === 0 ? photoCount - 1 : prev - 1)}
                                        className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setCurrentPhoto(prev => prev === photoCount - 1 ? 0 : prev + 1)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 transition-colors"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                    {/* Photo dots */}
                                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                                        {photos!.map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setCurrentPhoto(i)}
                                                className={cn(
                                                    "w-1.5 h-1.5 rounded-full transition-all",
                                                    i === currentPhoto ? "bg-white w-3" : "bg-white/50"
                                                )}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </>
                    ) : (
                        <TripImage
                            query={photoQuery || `${hotelName} hotel exterior`}
                            alt={hotelName}
                            className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                        />
                    )}

                    {/* Star badge */}
                    <div className="absolute top-3 left-3">
                        <Badge className="bg-amber-400/90 text-black hover:bg-amber-500 border-none shadow-md backdrop-blur-sm font-bold text-xs px-2.5 py-1">
                            {stars} <Star className="w-3 h-3 ml-1 fill-current" />
                        </Badge>
                    </div>

                    {/* Gradient overlay */}
                    <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />
                </div>

                {/* Content section */}
                <div className="p-3 sm:p-5 flex flex-col justify-between gap-3 sm:gap-4">
                    {/* Header: Name, Address, Rating */}
                    <div>
                        <div className="flex justify-between items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-base sm:text-lg leading-tight mb-1 sm:mb-1.5 truncate">{hotelName}</h3>
                                <div className="flex items-center text-muted-foreground text-[10px] sm:text-xs">
                                    <MapPin className="w-3 h-3 mr-1 shrink-0 text-amber-500/70" />
                                    <span className="truncate">{address}</span>
                                </div>
                            </div>

                            {/* Rating block */}
                            {hasRatingData && (
                                <div className="text-right shrink-0">
                                    <div className={cn(
                                        "text-white text-sm font-black px-2.5 py-1.5 rounded-lg inline-block mb-1",
                                        getRatingColor(rating)
                                    )}>
                                        {rating}
                                    </div>
                                    <div className="text-[10px] font-medium text-muted-foreground">
                                        {getRatingLabel(rating)}
                                    </div>
                                    {reviewsCount > 0 && (
                                        <div className="text-[10px] text-muted-foreground/60">
                                            {reviewsCount.toLocaleString("ru-RU")} отзывов
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Amenities */}
                        <div className="flex flex-wrap gap-1.5 mt-3">
                            {amenities?.map((amenity, i) => {
                                const Icon = getAmenityIcon(amenity)
                                return (
                                    <div key={i} className="flex items-center gap-1 text-xs text-muted-foreground bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/10 px-2 py-1 rounded-lg">
                                        <Icon className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                        <span>{amenity}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Stay details */}
                    <div className="flex flex-wrap gap-1.5 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground">
                        {checkIn && checkOut && (
                            <div className="flex items-center gap-1 sm:gap-1.5 bg-muted/50 dark:bg-white/5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg">
                                <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500/70" />
                                <span>{formatDate(checkIn)} — {formatDate(checkOut)}</span>
                            </div>
                        )}
                        {nights && (
                            <div className="flex items-center gap-1 sm:gap-1.5 bg-muted/50 dark:bg-white/5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg">
                                <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500/70" />
                                <span>{nights} {nights === 1 ? "ночь" : nights < 5 ? "ночи" : "ночей"}</span>
                            </div>
                        )}
                        {guests && (
                            <div className="flex items-center gap-1 sm:gap-1.5 bg-muted/50 dark:bg-white/5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg">
                                <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500/70" />
                                <span>{guests} {guests === 1 ? "гость" : guests < 5 ? "гостя" : "гостей"}</span>
                            </div>
                        )}
                    </div>

                    {/* Price & Book */}
                    <div className="flex items-end justify-between gap-2 pt-3 border-t border-amber-200/30 dark:border-amber-900/20">
                        <div className="min-w-0">
                            {hasPriceData ? (
                                <>
                                    <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                                        <span className="text-sm font-bold">от </span>{pricePerNight.toLocaleString("ru-RU")} ₽
                                        <span className="text-xs sm:text-sm font-medium text-muted-foreground ml-1">/ ночь</span>
                                    </div>
                                    {nights && nights > 1 && (
                                        <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                                            Итого: <span className="font-bold text-foreground">{calculatedTotal.toLocaleString("ru-RU")} ₽</span>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-xs sm:text-sm font-medium text-muted-foreground">
                                    Смотреть цены
                                </div>
                            )}
                        </div>
                        <Button
                            size="sm"
                            className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] sm:text-xs px-3 sm:px-5 h-8 sm:h-9 shadow-md shadow-amber-500/20 shrink-0"
                            onClick={() => window.open(buyUrl, "_blank")}
                        >
                            {hasPriceData ? "Забронировать" : "Найти отели"}
                            <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    )
}
