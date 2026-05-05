"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { GeneratingModal } from "@/components/GeneratingModal"
import { ErrorModal } from "@/components/ErrorModal"
import { streamTripGeneration } from "@/lib/trip-generation-stream"
import { saveGeneratedTripAndNavigate } from "@/lib/save-generated-trip-client"

type TripGenerationOptions = {
  autoFavorites: boolean
  defaultTripTitle: string
  defaultDestination: string
}

type TripGenerationContextValue = {
  isGenerating: boolean
  startGeneration: (
    payload: Record<string, unknown>,
    options: TripGenerationOptions
  ) => Promise<void>
  cancelGeneration: () => void
}

const TripGenerationContext = createContext<TripGenerationContextValue | null>(null)

export function useTripGeneration() {
  const context = useContext(TripGenerationContext)
  if (!context) {
    throw new Error("useTripGeneration must be used inside TripGenerationProvider")
  }
  return context
}

export function TripGenerationProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const t = useTranslations("plan")
  const [isGenerating, setIsGenerating] = useState(false)
  const [errorModal, setErrorModal] = useState<{
    open: boolean
    title?: string
    message: string
    details?: string
  }>({ open: false, message: "" })
  const abortControllerRef = useRef<AbortController | null>(null)

  const cancelGeneration = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setIsGenerating(false)
  }, [])

  const startGeneration = useCallback(
    async (payload: Record<string, unknown>, options: TripGenerationOptions) => {
      if (abortControllerRef.current) abortControllerRef.current.abort()

      const controller = new AbortController()
      abortControllerRef.current = controller
      setErrorModal((current) => ({ ...current, open: false }))
      setIsGenerating(true)

      const { autoFavorites, ...apiBody } = payload

      try {
        const { routeData } = await streamTripGeneration(apiBody, controller.signal)
        await saveGeneratedTripAndNavigate(routeData as Record<string, unknown>, payload, {
          autoFavorites: Boolean(autoFavorites ?? options.autoFavorites),
          defaultTripTitle: options.defaultTripTitle,
          defaultDestination: options.defaultDestination,
          router,
        })
      } catch (error: unknown) {
        const err = error as {
          name?: string
          message?: string
          stack?: string
          limitExceeded?: boolean
          code?: string
          limit?: number
          resetAt?: string
          retryAfterSec?: number
        }

        if (err.name === "AbortError") return

        let title = t("generationError")
        let message = err.message || t("generationErrorMessage")
        if (err.limitExceeded && err.resetAt) {
          title = t("monthlyLimitTitle")
          message = t("monthlyLimitBody", {
            limit: err.limit ?? 10,
            date: new Date(err.resetAt).toLocaleDateString(undefined, {
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
          })
        } else if (err.code === "RATE_LIMIT") {
          message = t("rateLimitGeneration", {
            seconds: err.retryAfterSec ?? 60,
          })
        }

        setErrorModal({
          open: true,
          title,
          message,
          details: err.stack,
        })
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null
          setIsGenerating(false)
        }
      }
    },
    [router, t]
  )

  const value = useMemo(
    () => ({
      isGenerating,
      startGeneration,
      cancelGeneration,
    }),
    [isGenerating, startGeneration, cancelGeneration]
  )

  return (
    <TripGenerationContext.Provider value={value}>
      {children}
      <GeneratingModal open={isGenerating} onCancel={cancelGeneration} />
      <ErrorModal
        open={errorModal.open}
        onClose={() => setErrorModal((current) => ({ ...current, open: false }))}
        title={errorModal.title}
        message={errorModal.message}
        details={errorModal.details}
      />
    </TripGenerationContext.Provider>
  )
}
