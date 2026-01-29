"use client"

import { useState, useEffect } from "react"
import { Plane, Loader2, TrendingDown, Calendar, ExternalLink, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getFlightSearchLink, getIataCode } from "@/lib/travelpayouts"

interface Ticket {
  transfers: number
  price: number
  priceFormatted: string
  airline: string
  departureAt: string
  returnAt: string
}

interface FlightPricesData {
  success: boolean
  origin: string
  destination: string
  currency: string
  tickets: Ticket[]
  cheapest: Ticket | null
  message?: string
}

interface FlightPricesProps {
  origin?: string          // Город вылета (название или IATA)
  destination: string      // Город прилёта (название или IATA)
  departDate?: string      // Дата вылета YYYY-MM-DD
  returnDate?: string      // Дата возврата YYYY-MM-DD
  className?: string
  compact?: boolean        // Компактный режим
  showBookButton?: boolean // Показывать кнопку бронирования
}

export function FlightPrices({
  origin,
  destination,
  departDate,
  returnDate,
  className,
  compact = false,
  showBookButton = true
}: FlightPricesProps) {
  const [data, setData] = useState<FlightPricesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPrices() {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()
        if (origin) params.set("origin", origin)
        params.set("destination", destination)
        if (departDate) params.set("date", departDate)
        if (returnDate) params.set("return", returnDate)

        const response = await fetch(`/api/flights/prices?${params.toString()}`)

        if (!response.ok) {
          if (response.status === 503) {
            setError("API не настроен")
            return
          }
          throw new Error("Failed to fetch prices")
        }

        const result = await response.json()
        setData(result)
      } catch (e) {
        console.error("FlightPrices error:", e)
        setError("Не удалось загрузить цены")
      } finally {
        setLoading(false)
      }
    }

    if (destination) {
      fetchPrices()
    }
  }, [origin, destination, departDate, returnDate])

  // Получаем ссылку на поиск
  const getBookingLink = () => {
    return getFlightSearchLink({
      origin,
      destination,
      departDate,
      returnDate,
      subId: "price_widget"
    })
  }

  // Компактный вид - только минимальная цена
  if (compact) {
    if (loading) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
        </div>
      )
    }

    if (error || !data?.cheapest) {
      return null
    }

    return (
      <a
        href={getBookingLink()}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium",
          "text-emerald-500 hover:text-emerald-400 transition-colors",
          className
        )}
      >
        <Plane className="h-3.5 w-3.5" />
        <span>от {data.cheapest.priceFormatted}</span>
        {data.cheapest.transfers === 0 && (
          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
            прямой
          </Badge>
        )}
      </a>
    )
  }

  // Полный вид
  if (loading) {
    return (
      <div className={cn("flex items-center justify-center p-4", className)}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Поиск цен...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("flex items-center gap-2 p-3 text-sm text-muted-foreground bg-muted/30 rounded-lg", className)}>
        <AlertCircle className="h-4 w-4" />
        <span>{error}</span>
      </div>
    )
  }

  if (!data || data.tickets.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg", className)}>
        Цены на билеты не найдены
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Заголовок с минимальной ценой */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-500/10 rounded-md">
            <TrendingDown className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">
              {data.origin} → {data.destination}
            </div>
            <div className="font-bold text-lg text-emerald-500">
              от {data.cheapest?.priceFormatted}
            </div>
          </div>
        </div>
        {showBookButton && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            asChild
          >
            <a href={getBookingLink()} target="_blank" rel="noopener noreferrer">
              <Plane className="h-3.5 w-3.5" />
              Найти билеты
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        )}
      </div>

      {/* Список вариантов */}
      <div className="space-y-2">
        {data.tickets.slice(0, 3).map((ticket, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg text-sm"
          >
            <div className="flex items-center gap-3">
              <div className="text-xs font-medium px-2 py-0.5 rounded bg-primary/10">
                {ticket.airline}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {ticket.transfers === 0 ? (
                  <Badge variant="secondary" className="text-[10px]">Прямой</Badge>
                ) : (
                  <span>{ticket.transfers} пересад{ticket.transfers === 1 ? "ка" : "ки"}</span>
                )}
              </div>
            </div>
            <div className="font-semibold">
              {ticket.priceFormatted}
            </div>
          </div>
        ))}
      </div>

      {/* Даты */}
      {data.cheapest && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>
            {new Date(data.cheapest.departureAt).toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "short"
            })}
            {data.cheapest.returnAt && (
              <>
                {" → "}
                {new Date(data.cheapest.returnAt).toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "short"
                })}
              </>
            )}
          </span>
        </div>
      )}
    </div>
  )
}

/**
 * Компактный виджет цены для карточек
 */
export function FlightPriceTag({
  origin,
  destination,
  className
}: {
  origin?: string
  destination: string
  className?: string
}) {
  return (
    <FlightPrices
      origin={origin}
      destination={destination}
      compact
      showBookButton={false}
      className={className}
    />
  )
}
