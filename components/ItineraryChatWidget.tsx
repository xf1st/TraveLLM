"use client"

import { useState, useEffect, useRef } from "react"
import { Send, Sparkles, ChevronDown, Plane, Hotel as HotelIcon, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useChat } from "@/lib/context/chat-context"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"

type Message = {
  role: "user" | "assistant"
  content: string
  isModification?: boolean
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
  embedded?: boolean
  completedActivities?: string[]
  userLocation?: { lat: number; lng: number }
}

export function ItineraryChatWidget({
  itinerary,
  tripDetails,
  onItineraryUpdate,
  onModifying,
  tripId,
  mode = "planning",
  embedded = false,
  completedActivities = [],
  userLocation,
  className,
}: ItineraryChatWidgetProps & { className?: string }) {
  const t = useTranslations("chat")
  const tCommon = useTranslations("common")

  const QUICK_ACTIONS = [
    { id: "flight", label: t("findTickets"), icon: Plane, prompt: t("promptFlight") },
    { id: "hotel", label: t("hotels"), icon: HotelIcon, prompt: t("promptHotel") },
    { id: "weather", label: t("weather"), icon: Sparkles, prompt: t("promptWeather") },
    { id: "visa", label: t("visa"), icon: ExternalLink, prompt: t("promptVisa") },
    { id: "add_day", label: t("addDay"), icon: Sparkles, prompt: t("promptAddDay") },
  ]

  const [isOpen, setIsOpen] = useState(embedded)

  const { sessions, createSession, updateSession, addMessage, setActiveSessionId } = useChat()
  const router = useRouter()

  const tripTitle = tripDetails?.title || itinerary?.title || t("myItinerary")
  const existingSession = sessions.find(s => s.draftTrip?.title === tripTitle || s.title === tripTitle || s.tripId === tripId)
  
  const messages: Message[] = existingSession ? existingSession.messages.map(m => ({
    role: m.role as "user" | "assistant",
    content: m.content,
    isModification: m.metadata?.isModification,
    bookingData: m.metadata?.bookingData
  })) : [
    {
      role: "assistant",
      content: t("welcomeMessage"),
    },
  ]

  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }

  useEffect(() => {
    // Small delay to let DOM render new messages before scrolling
    const t = setTimeout(scrollToBottom, 50)
    return () => clearTimeout(t)
  }, [messages, isOpen, isLoading])

  useEffect(() => {
    if (embedded) setIsOpen(true)
  }, [embedded])

  useEffect(() => {
    const handlePrefill = (event: Event) => {
      const customEvent = event as CustomEvent<{ text?: string }>
      const text = customEvent.detail?.text
      if (text && typeof text === "string") {
        setIsOpen(true)
        setInput(text)
      }
    }

    window.addEventListener("trip-ai-prefill", handlePrefill)
    return () => window.removeEventListener("trip-ai-prefill", handlePrefill)
  }, [])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    let sessionId = existingSession?.id
    if (!sessionId) {
        sessionId = createSession(input)
        updateSession(sessionId, { title: tripTitle, draftTrip: tripDetails || { itinerary }, tripId })
    }
    
    setActiveSessionId(sessionId)

    const userMessage = input
    setInput("")
    
    if (sessionId) {
      addMessage(sessionId, { role: "user", content: userMessage })
    }
    
    setIsLoading(true)
    onModifying?.(true)

    try {
      const response = await fetch("/api/trip-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripData: tripDetails || { itinerary },
          userMessage,
          tripId,
          userLocation,
        }),
      })

      if (!response.ok) {
        throw new Error(`${t("serverError")} (${response.status})`)
      }

      const data = await response.json()

      if (data.error) {
        if (sessionId) {
          addMessage(sessionId, { role: "assistant", content: `Ошибка: ${data.error}` })
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
            content: data.reply || "Не удалось обработать запрос.",
            metadata: { bookingData: data.bookingData },
          })
        }
      }
    } catch (error: any) {
      console.error("Chat widget error:", error)
      if (sessionId) {
        addMessage(sessionId, {
          role: "assistant",
          content: `Произошла ошибка: ${error.message || "Попробуйте позже."}`,
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

  return (
    <Card
      className={cn(
        "border-0 bg-transparent flex flex-col relative overflow-visible z-40",
        embedded ? "h-full min-h-0" : "",
        className
      )}
    >
      {!embedded && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-2.5 sm:p-3 bg-card/90 dark:bg-white/5 backdrop-blur-md md:backdrop-blur-xl rounded-xl shadow-lg hover:shadow-md md:shadow-xl transition-all duration-300 group border border-border/50 dark:border-white/10"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-500 flex items-center justify-center shadow-md">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-foreground dark:text-white text-xs sm:text-sm tracking-tight">{t("aiAssistant")}</h3>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground dark:text-white/60">{t("questionsAndChanges")}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground dark:text-white/60 transition-transform duration-300",
                isOpen && "rotate-180"
              )}
            />
          </div>
        </button>
      )}

      <div
        className={cn(
          "transition-all duration-300 ease-out flex flex-col overflow-hidden",
          embedded
            ? "h-full min-h-0 rounded-[2rem] bg-[#07101f] border border-white/[0.08] shadow-2xl"
            : cn(
                "rounded-2xl bg-white/90 dark:bg-[#060b1a]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-md md:shadow-2xl",
                isOpen ? "mt-3 opacity-100 scale-100" : "hidden opacity-0 scale-95 pointer-events-none"
              )
        )}
      >
        {/* Header */}
        <div className={cn(
          "flex items-center justify-between px-4 py-3",
          embedded
            ? "border-b border-white/[0.07]"
            : "border-b border-slate-200/70 dark:border-white/[0.06] bg-gradient-to-r from-slate-50/90 to-white/60 dark:from-white/[0.03] dark:to-white/[0.01]"
        )}>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-widest",
              embedded ? "text-white/50" : "text-slate-500 dark:text-white/50"
            )}>{tCommon("online")}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: "rgba(99,102,241,0.12)" }}>
            <Sparkles className="h-3 w-3 text-indigo-400" />
            <span className="text-[10px] font-bold text-indigo-400">DeepSeek</span>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollContainerRef}
          className={cn(
            "overflow-y-auto px-4 py-4 space-y-3",
            embedded ? "flex-1 min-h-0 max-h-[55vh]" : "h-[420px] sm:h-[500px]"
          )}
        >
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex gap-2", msg.role === "user" && "flex-row-reverse")}>
              {/* Avatar */}
              <div className={cn(
                "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5",
                msg.role === "user"
                  ? "bg-gradient-to-br from-sky-500 to-indigo-600 text-white"
                  : "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
              )}>
                {msg.role === "user" ? t("you") : "AI"}
              </div>

              {/* Bubble */}
              <div className={cn(
                "max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                msg.role === "user"
                  ? "bg-gradient-to-br from-sky-600 to-indigo-700 text-white rounded-tr-sm shadow-lg shadow-sky-900/30"
                  : embedded
                    ? "bg-white/[0.06] border border-white/[0.08] text-white/90 rounded-tl-sm"
                    : "bg-slate-100 border border-slate-200/80 text-slate-800 dark:bg-white/[0.05] dark:border-white/[0.07] dark:text-white/90 rounded-tl-sm"
              )}>
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {msg.isModification && (
                  <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                    <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide">{t("itineraryUpdated")}</span>
                  </div>
                )}

                {msg.bookingData && (
                  <div className="mt-3 p-3 rounded-xl bg-black/20 border border-white/10 space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/50">
                      {msg.bookingData.type === "flight"
                        ? <Plane className="h-3 w-3 text-sky-400" />
                        : <HotelIcon className="h-3 w-3 text-emerald-400" />}
                      {msg.bookingData.type === "flight" ? t("flights") : t("hotels")}
                    </div>
                    <Button
                      size="sm"
                      className="w-full text-[11px] h-8 font-bold bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/10"
                      onClick={() => {
                        const url =
                          msg.bookingData!.type === "flight"
                            ? `https://www.aviasales.ru/search/${encodeURIComponent(msg.bookingData!.destination || "")}`
                            : `https://search.hotellook.com/?q=${encodeURIComponent(msg.bookingData!.destination || "")}`
                        window.open(url, "_blank")
                      }}
                    >
                      {msg.bookingData.type === "flight" ? t("openService", { service: "Aviasales" }) : t("openService", { service: "Ostrovok" })}
                      <ExternalLink className="ml-2 h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-[10px] font-bold text-white mt-0.5">
                AI
              </div>
              <div className={cn(
                "rounded-2xl rounded-tl-sm px-4 py-3",
                embedded ? "bg-white/[0.06] border border-white/[0.08]" : "bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.07]"
              )}>
                <div className="flex items-center gap-2">
                  {[0, 150, 300].map(delay => (
                    <span key={delay} className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                  ))}
                  <span className={cn("text-[11px] font-medium ml-1", embedded ? "text-white/40" : "text-slate-400 dark:text-white/40")}>{t("thinking")}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        {!isLoading && messages.length < 4 && (
          <div className="px-3 pb-2">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  onClick={() => {
                    setInput(action.prompt)
                    // We use a timeout to ensure state is updated before sending
                    setTimeout(() => {
                      const sendBtn = document.getElementById("chat-send-btn")
                      sendBtn?.click()
                    }, 50)
                  }}
                  className={cn(
                    "shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold transition-all border",
                    embedded
                      ? "bg-white/[0.05] border-white/[0.08] text-white/70 hover:bg-white/[0.1] hover:text-white"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:bg-white/[0.03] dark:border-white/[0.06] dark:text-white/60"
                  )}
                >
                  <action.icon className="h-3 w-3 text-primary" />
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className={cn(
          "p-3",
          embedded
            ? "border-t border-white/[0.07]"
            : "border-t border-slate-200/70 dark:border-white/[0.06] bg-gradient-to-r from-slate-50/90 to-white/60 dark:from-white/[0.02] dark:to-transparent"
        )}>
          <form onSubmit={(e) => { e.preventDefault(); handleSend() }} className="flex gap-2 items-center">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("askPlaceholder")}
              className={cn(
                "flex-1 h-10 rounded-full px-4 text-[13px] border transition-all",
                embedded
                  ? "bg-white/[0.07] border-white/[0.10] text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-sky-500/50 focus-visible:border-sky-500/40"
                  : "bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/25 focus-visible:ring-sky-500/30"
              )}
              disabled={isLoading}
            />
            <Button
              id="chat-send-btn"
              type="submit"
              disabled={isLoading || !input.trim()}
              size="sm"
              className="h-10 w-10 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-lg shadow-sky-600/30 disabled:opacity-30 disabled:shadow-none transition-all flex-shrink-0 p-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </Card>
  )
}
