"use client"

import { useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const DEFAULT_DEBOUNCE_MS = 1800

/**
 * Persists `trips.itinerary` after local edits (AI chat, inline modify).
 * Only for UUID trips in the URL, owner, logged in, and when loaded row id matches URL
 * (avoids writing stale state while navigating between trips).
 */
export function useDebouncedTripItinerarySave(params: {
  tripId: string | undefined
  /** DB trip id currently shown — must equal `tripId` from the URL */
  loadedTripId: string | undefined
  itinerary: unknown
  isOwner: boolean
  userId: string | undefined
  loading: boolean
  debounceMs?: number
  onSaveError?: (message: string) => void
}) {
  const {
    tripId,
    loadedTripId,
    itinerary,
    isOwner,
    userId,
    loading,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    onSaveError,
  } = params

  const baselineRef = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveKeyRef = useRef<string>("")
  const onSaveErrorRef = useRef(onSaveError)

  const isUuid = Boolean(tripId && UUID_RE.test(tripId))
  const routeMatchesUrl =
    !loading &&
    isUuid &&
    Boolean(loadedTripId && tripId && loadedTripId === tripId)

  useEffect(() => {
    onSaveErrorRef.current = onSaveError
  }, [onSaveError])

  useEffect(() => {
    baselineRef.current = null
    saveKeyRef.current = ""
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [tripId])

  useEffect(() => {
    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }

    if (!routeMatchesUrl || !isOwner || !userId) {
      clearTimer()
      return
    }

    const serialized = JSON.stringify(itinerary ?? [])

    if (baselineRef.current === null || saveKeyRef.current !== tripId) {
      baselineRef.current = serialized
      saveKeyRef.current = tripId!
      return
    }

    if (serialized === baselineRef.current) {
      return
    }

    clearTimer()

    timerRef.current = setTimeout(async () => {
      timerRef.current = null
      const latest = JSON.stringify(itinerary ?? [])
      if (latest === baselineRef.current) return

      const { error } = await supabase
        .from("trips")
        .update({ itinerary })
        .eq("id", tripId!)
        .eq("user_id", userId)

      if (error) {
        console.error("[debounced trip itinerary save]", error)
        onSaveErrorRef.current?.(error.message)
        return
      }

      baselineRef.current = latest
    }, debounceMs)

    return clearTimer
  }, [
    itinerary,
    routeMatchesUrl,
    isOwner,
    userId,
    tripId,
    debounceMs,
    loading,
    loadedTripId,
  ])
}
