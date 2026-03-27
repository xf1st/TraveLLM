"use client"

import { useState, useEffect } from "react"
import { getBookingMarketFromHost, type BookingMarket } from "@/lib/booking-market"

/** Client: market from current hostname (travellm.ru vs travellm.world, etc.). */
export function useBookingMarket(): BookingMarket {
  const [market, setMarket] = useState<BookingMarket>("ru")
  useEffect(() => {
    setMarket(getBookingMarketFromHost(typeof window !== "undefined" ? window.location.host : null))
  }, [])
  return market
}
