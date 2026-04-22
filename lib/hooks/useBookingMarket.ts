"use client"

import { useSyncExternalStore } from "react"
import { getBookingMarketFromHost, type BookingMarket } from "@/lib/booking-market"

function subscribeToStaticHost() {
  return () => {}
}

/** Client: market from current hostname (travellm.ru vs travellm.world, etc.). */
export function useBookingMarket(): BookingMarket {
  return useSyncExternalStore(
    subscribeToStaticHost,
    () =>
      getBookingMarketFromHost(
        typeof window !== "undefined" ? window.location.host : null
      ),
    () => "ru"
  )
}
