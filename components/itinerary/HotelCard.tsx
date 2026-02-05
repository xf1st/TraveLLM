"use client"

import { Star, MapPin, Wifi, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TripImage } from "@/components/TripImage"
import { cn } from "@/lib/utils"

interface HotelCardProps {
    hotelName: string
    stars: number
    rating: number
    reviewsCount: number
    pricePerNight: number
    amenities: string[]
    address: string
    photoQuery: string
    className?: string
}

export function HotelCard({
    hotelName,
    stars,
    rating,
    reviewsCount,
    pricePerNight,
    amenities,
    address,
    photoQuery,
    className
}: HotelCardProps) {
    return (
        <Card className={cn("group overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300", className)}>
            <div className="grid md:grid-cols-[2fr_3fr] gap-0 h-full min-h-[220px]">
                {/* Image Section */}
                <div className="relative h-48 md:h-full overflow-hidden">
                    <TripImage
                        query={photoQuery || hotelName}
                        alt={hotelName}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute top-3 left-3 flex gap-1">
                        <Badge className="bg-yellow-400/90 text-black hover:bg-yellow-500 border-none shadow-sm backdrop-blur-sm">
                            {stars} <Star className="w-3 h-3 ml-1 fill-current" />
                        </Badge>
                    </div>
                    <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
                </div>

                {/* Content Section */}
                <div className="p-5 flex flex-col justify-between bg-card">
                    <div>
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className="font-bold text-lg leading-tight mb-1">{hotelName}</h3>
                                <div className="flex items-center text-muted-foreground text-xs">
                                    <MapPin className="w-3 h-3 mr-1" />
                                    {address}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="bg-emerald-600 text-white text-xs font-bold px-2 py-1 rounded inline-block mb-1">
                                    {rating} / 10
                                </div>
                                <div className="text-[10px] text-muted-foreground">{reviewsCount} отзывов</div>
                            </div>
                        </div>

                        {/* Amenities */}
                        <div className="flex flex-wrap gap-2 mt-4">
                            {amenities?.slice(0, 4).map((amenity, i) => (
                                <div key={i} className="flex items-center text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                                    <Check className="w-3 h-3 mr-1 text-emerald-500" />
                                    {amenity}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
                        <div>
                            <span className="text-2xl font-bold">{pricePerNight.toLocaleString('ru-RU')} ₽</span>
                            <span className="text-xs text-muted-foreground ml-1">/ за ночь</span>
                        </div>
                        <Button size="sm" className="rounded-full px-6">
                            Забронировать
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    )
}
