"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Send, Sparkles, Plane, Hotel as HotelIcon, ExternalLink, ImagePlus, X, MessageCircle, Layers } from "lucide-react"
import { ChatAssistantMarkdown } from "@/components/chat-assistant-markdown"
import { resizeImageFileToJpeg } from "@/lib/chat-image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useChat } from "@/lib/context/chat-context"
import { useTranslations, useLocale } from "next-intl"
import { motion, AnimatePresence } from "framer-motion"

type Message = {
  role: "user" | "assistant"
  content: string
  isModification?: boolean
  imageCount?: number
  bookingData?: {
    type: "flight" | "hotel"
    query?: string
    destination?: string
  }
}

interface ItineraryChatWidgetProps {
  itinerary: any
  tripDetails?: any
  onItineraryUpdate?: (newItinerary: any) => void
  onModifying?: (isModifying: boolean) => void
  tripId?: string
  mode?: "planning" | "guide"
  /** Inline panel without FAB (e.g. embedded in another shell) */
  embedded?: boolean
  /** `fab` = floating button bottom-right (default); `embedded` = fill parent */
  layout?: "fab" | "embedded"
  completedActivities?: string[]
  userLocation?: { lat: number; lng: number }
  /** Открытый день маршрута в UI — для контекста «остаток с этого дня» и классификатора. */
  activeDay?: number
}

export function ItineraryChatWidget({
  itinerary,
  tripDetails,
  onItineraryUpdate,
  onModifying,
  tripId,
  mode = "planning",
  embedded = false,
  layout: layoutProp,
  completedActivities = [],
  userLocation,
  activeDay,
  className,
}: ItineraryChatWidgetProps & { className?: string }) {
  const t = useTranslations("chat")
  const tCommon = useTranslations("common")
  const locale = useLocale()

  const layout = layoutProp ?? (embedded ? "embedded" : "fab")

  const tripDaysCount = useMemo(() => {
    const arr = Array.isArray(itinerary) ? itinerary : itinerary?.itinerary
    return Array.isArray(arr) ? arr.length : 0
  }, [itinerary])

  const QUICK_ACTIONS = useMemo(() => {
    const base: {
      id: string
      label: string
      icon: typeof Plane
      prompt: string
    }[] = [
      { id: "flight", label: t("findTickets"), icon: Plane, prompt: t("promptFlight") },
      { id: "hotel", label: t("hotels"), icon: HotelIcon, prompt: t("promptHotel") },
      { id: "weather", label: t("weather"), icon: Sparkles, prompt: t("promptWeather") },
      { id: "visa", label: t("visa"), icon: ExternalLink, prompt: t("promptVisa") },
      { id: "add_day", label: t("addDay"), icon: Sparkles, prompt: t("promptAddDay") },
    ]
    const d =
      typeof activeDay === "number" && Number.isFinite(activeDay)
        ? Math.max(1, Math.floor(activeDay))
        : null
    if (d != null && tripDaysCount > 1 && d < tripDaysCount) {
      base.push({
        id: "rewrite_tail",
        label: t("rewriteTail"),
        icon: Layers,
        prompt: t("promptRewriteTail", { day: d }),
      })
    }
    return base
  }, [t, tripDaysCount, activeDay])

  const [isOpen, setIsOpen] = useState(layout === "embedded")

  const { sessions, createSession, updateSession, addMessage, setActiveSessionId } = useChat()

  const tripTitle = tripDetails?.title || itinerary?.title || t("myItinerary")
  const existingSession = sessions.find(
    (s) => s.draftTrip?.title === tripTitle || s.title === tripTitle || s.tripId === tripId
  )

  const messages: Message[] = existingSession
    ? existingSession.messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
        isModification: m.metadata?.isModification,
        imageCount: m.metadata?.imageCount,
        bookingData: m.metadata?.bookingData,
      }))
    : [
        {
          role: "assistant",
          content: t("welcomeMessage"),
        },
      ]

  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [, setHasUnsavedChanges] = useState(false)
  const [pendingImages, setPendingImages] = useState<File[]>([])

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }

  useEffect(() => {
    const tmr = setTimeout(scrollToBottom, 50)
    return () => clearTimeout(tmr)
  }, [messages, isOpen, isLoading])

  useEffect(() => {
    if (layout === "embedded") setIsOpen(true)
  }, [layout])

  useEffect(() => {
    const handlePrefill = (event: Event) => {
      const customEvent = event as CustomEvent<{ text?: string }>
      const text = customEvent.detail?.text
      if (text && typeof text === "string") {
        setIsOpen(true)
        setInput(text)
      }
    }
    const handleOpen = () => setIsOpen(true)

    window.addEventListener("trip-ai-prefill", handlePrefill)
    window.addEventListener("trip-ai-open", handleOpen)
    return () => {
      window.removeEventListener("trip-ai-prefill", handlePrefill)
      window.removeEventListener("trip-ai-open", handleOpen)
    }
  }, [])

  const handlePickImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"))
    if (files.length === 0) return
    const max = 3
    setPendingImages((prev) => [...prev, ...files].slice(0, max))
    e.target.value = ""
  }

  const removePendingImage = (idx: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== idx))
  }

  const apiLocale = locale === "en" ? "en" : "ru"

  /** История до текущего сообщения — для API (без нового user turn). */
  const buildConversationHistoryPayload = (): { role: "user" | "assistant"; content: string }[] => {
    const raw = existingSession?.messages ?? []
    const out: { role: "user" | "assistant"; content: string }[] = []
    for (const m of raw) {
      if (m.role !== "user" && m.role !== "assistant") continue
      out.push({ role: m.role, content: String(m.content || "").slice(0, 1800) })
    }
    return out.slice(-16)
  }

  const handleSend = async () => {
    if ((!input.trim() && pendingImages.length === 0) || isLoading) return

    let sessionId = existingSession?.id
    if (!sessionId) {
      sessionId = createSession(input || t("photoMessageFallback"))
      updateSession(sessionId, { title: tripTitle, draftTrip: tripDetails || { itinerary }, tripId })
    }

    setActiveSessionId(sessionId)

    const conversationHistory = buildConversationHistoryPayload()

    const userMessage = input.trim() || (pendingImages.length ? t("photoMessageFallback") : "")
    const imagesToSend = [...pendingImages]
    setInput("")
    setPendingImages([])

    if (sessionId) {
      addMessage(sessionId, {
        role: "user",
        content: userMessage,
        ...(imagesToSend.length ? { metadata: { imageCount: imagesToSend.length } } : {}),
      })
    }

    setIsLoading(true)
    onModifying?.(true)

    try {
      const tripPayload = tripDetails || { itinerary }
      let response: Response

      if (imagesToSend.length > 0) {
        const form = new FormData()
        form.append("tripData", JSON.stringify(tripPayload))
        form.append("userMessage", userMessage)
        form.append("locale", apiLocale)
        if (tripId) form.append("tripId", tripId)
        if (userLocation) form.append("userLocation", JSON.stringify(userLocation))
        if (typeof activeDay === "number" && Number.isFinite(activeDay)) {
          form.append("contextDay", String(Math.floor(activeDay)))
        }
        if (conversationHistory.length > 0) {
          form.append("conversationHistory", JSON.stringify(conversationHistory))
        }
        for (let i = 0; i < imagesToSend.length; i++) {
          const blob = await resizeImageFileToJpeg(imagesToSend[i])
          form.append("images", blob, `photo-${i}.jpg`)
        }
        response = await fetch("/api/trip-assistant", {
          method: "POST",
          body: form,
        })
      } else {
        response = await fetch("/api/trip-assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tripData: tripPayload,
            userMessage,
            tripId,
            userLocation,
            locale: apiLocale,
            ...(conversationHistory.length > 0 ? { conversationHistory } : {}),
            ...(typeof activeDay === "number" && Number.isFinite(activeDay)
              ? { contextDay: Math.floor(activeDay) }
              : {}),
          }),
        })
      }

      if (response.status === 429) {
        const errBody = await response.json().catch(() => ({} as Record<string, unknown>))
        const sec =
          typeof errBody.retryAfterSec === "number"
            ? errBody.retryAfterSec
            : Math.ceil(Number(response.headers.get("Retry-After")) || 60)
        if (sessionId) {
          addMessage(sessionId, {
            role: "assistant",
            content: t("rateLimit", { seconds: sec }),
          })
        }
        return
      }

      if (!response.ok) {
        throw new Error(`${t("serverError")} (${response.status})`)
      }

      const data = await response.json()

      if (data.error) {
        if (sessionId) {
          addMessage(sessionId, { role: "assistant", content: `${t("errorPrefix")}: ${data.error}` })
        }
      } else if (data.type === "modification" && data.modifications?.length > 0 && onItineraryUpdate) {
        applyModifications(data.modifications, data.metadataUpdates)
        if (sessionId) {
          addMessage(sessionId, {
            role: "assistant",
            content: data.reply,
            metadata: { isModification: true },
          })
        }
      } else {
        if (sessionId) {
          addMessage(sessionId, {
            role: "assistant",
            content: data.reply || t("couldNotProcess"),
            metadata: { bookingData: data.bookingData },
          })
        }
      }
    } catch (error: any) {
      console.error("Chat widget error:", error)
      if (sessionId) {
        addMessage(sessionId, {
          role: "assistant",
          content: t("genericError", { message: error.message || "" }),
        })
      }
    } finally {
      setIsLoading(false)
      onModifying?.(false)
    }
  }

  const applyModifications = (modifications: any[], metadataUpdates?: any) => {
    const itineraryArray = Array.isArray(itinerary) ? itinerary : itinerary?.itinerary || []

    let updatedItinerary = [...itineraryArray]

    for (const mod of modifications) {
      if (mod.type === "replace_all_days") {
        updatedItinerary = mod.newItinerary
      }
    }

    onItineraryUpdate?.(updatedItinerary)
    setHasUnsavedChanges(true)
  }

  const renderChatPanel = () => (
      <div
        className={cn(
          "flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card text-card-foreground shadow-2xl",
          layout === "embedded" ? "h-full min-h-0" : "h-[min(72vh,600px)] w-[min(100vw-1rem,420px)] sm:h-[min(75vh,640px)]"
        )}
      >
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border/60 bg-muted/30">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-md">
              <MessageCircle className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight truncate">{t("aiAssistant")}</p>
              <p className="text-[10px] text-muted-foreground truncate">{t("questionsAndChanges")}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground hidden sm:inline">
              {tCommon("online")}
            </span>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {t("providerModel")}
            </span>
            {layout === "fab" && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setIsOpen(false)}
                aria-label={t("closeChat")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3"
        >
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex gap-2", msg.role === "user" && "flex-row-reverse")}>
              <div
                className={cn(
                  "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold",
                  msg.role === "user"
                    ? "bg-gradient-to-br from-sky-500 to-indigo-600 text-white"
                    : "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
                )}
              >
                {msg.role === "user" ? t("you") : "AI"}
              </div>
              <div
                className={cn(
                  "max-w-[88%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed",
                  msg.role === "user"
                    ? "bg-gradient-to-br from-sky-600 to-indigo-700 text-white rounded-tr-sm"
                    : "bg-muted/90 text-foreground rounded-tl-sm border border-border/50"
                )}
              >
                {msg.role === "assistant" ? (
                  <ChatAssistantMarkdown content={msg.content} />
                ) : (
                  <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                )}
                {msg.role === "user" && (msg.imageCount ?? 0) > 0 && (
                  <div className="mt-1 text-[10px] opacity-80">
                    {t("chatPhotosAttached", { count: msg.imageCount! })}
                  </div>
                )}
                {msg.isModification && (
                  <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                      {t("itineraryUpdated")}
                    </span>
                  </div>
                )}
                {msg.bookingData && (
                  <div className="mt-3 p-3 rounded-xl bg-background/80 border border-border space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {msg.bookingData.type === "flight" ? (
                        <Plane className="h-3 w-3 text-sky-500" />
                      ) : (
                        <HotelIcon className="h-3 w-3 text-emerald-500" />
                      )}
                      {msg.bookingData.type === "flight" ? t("flights") : t("hotels")}
                    </div>
                    <Button
                      size="sm"
                      className="w-full text-[11px] h-8"
                      onClick={() => {
                        const url =
                          msg.bookingData!.type === "flight"
                            ? `https://www.aviasales.ru/search/${encodeURIComponent(msg.bookingData!.destination || "")}`
                            : `https://search.hotellook.com/?q=${encodeURIComponent(msg.bookingData!.destination || "")}`
                        window.open(url, "_blank")
                      }}
                    >
                      {msg.bookingData.type === "flight"
                        ? t("openService", { service: "Aviasales" })
                        : t("openService", { service: "Ostrovok" })}
                      <ExternalLink className="ml-2 h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-[9px] font-bold text-white">
                AI
              </div>
              <div className="rounded-2xl rounded-tl-sm px-3 py-2 bg-muted/80 border border-border/50">
                <div className="flex items-center gap-2">
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                  <span className="text-[11px] font-medium text-muted-foreground">{t("thinking")}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {!isLoading && messages.length < 4 && (
          <div className="px-2 pb-1">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => {
                    setInput(action.prompt)
                    setTimeout(() => {
                      document.getElementById("chat-send-btn")?.click()
                    }, 50)
                  }}
                  className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border border-border/60 bg-muted/40 hover:bg-muted/70 transition-colors"
                >
                  <action.icon className="h-3 w-3 text-primary" />
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="p-2.5 border-t border-border/60 bg-muted/20">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handlePickImages}
          />
          {pendingImages.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {pendingImages.map((file, idx) => (
                <div
                  key={`${file.name}-${idx}`}
                  className="relative flex items-center gap-1 pl-2 pr-6 py-1 rounded-md text-[10px] border border-border bg-background"
                >
                  <span className="truncate max-w-[100px]">{file.name}</span>
                  <button
                    type="button"
                    className="absolute right-0.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted"
                    onClick={() => removePendingImage(idx)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex gap-2 items-end"
          >
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={isLoading || pendingImages.length >= 3}
              className="h-10 w-10 shrink-0 rounded-xl"
              onClick={() => fileInputRef.current?.click()}
              title={t("attachPhoto")}
            >
              <ImagePlus className="h-4 w-4" />
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("askPlaceholder")}
              className="flex-1 min-h-10 rounded-xl text-[13px]"
              disabled={isLoading}
            />
            <Button
              id="chat-send-btn"
              type="submit"
              disabled={isLoading || (!input.trim() && pendingImages.length === 0)}
              size="icon"
              className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
  )

  if (layout === "embedded") {
    return (
      <div className={cn("flex flex-col h-full min-h-0", className)}>{renderChatPanel()}</div>
    )
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="trip-ai-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90] flex flex-col justify-end sm:justify-end sm:items-end pointer-events-none p-0"
          >
            <button
              type="button"
              aria-label={t("closeChat")}
              className="absolute inset-0 bg-background/65 backdrop-blur-sm pointer-events-auto"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 32, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="relative z-[95] w-full max-w-[100vw] sm:max-w-[min(100vw-1rem,420px)] mx-auto sm:mx-0 sm:mr-4 mb-[5.25rem] sm:mb-28 pointer-events-auto px-2 sm:px-0 max-h-[min(88dvh,640px)]"
            >
              {renderChatPanel()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={cn(
          "fixed bottom-4 right-4 z-[100] pointer-events-auto pb-[env(safe-area-inset-bottom,0px)] pr-[env(safe-area-inset-right,0px)]",
          className
        )}
      >
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen((o) => !o)}
          className={cn(
            "h-14 w-14 rounded-full shadow-xl flex items-center justify-center text-white border-2 border-white/25",
            "bg-gradient-to-br from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
          )}
          aria-expanded={isOpen}
          aria-label={isOpen ? t("closeChat") : t("openChat")}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
        </motion.button>
      </div>
    </>
  )
}
