"use client"

import { useState, useEffect, useRef } from "react"
import { Send, Sparkles, ChevronDown, Plane, Hotel as HotelIcon, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useChat } from "@/lib/context/chat-context"
import { useRouter } from "next/navigation"

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
  const [isOpen, setIsOpen] = useState(embedded)
  
  const { sessions, createSession, updateSession, addMessage, setActiveSessionId } = useChat()
  const router = useRouter()
  
  const tripTitle = tripDetails?.title || itinerary?.title || "Мой маршрут (планирование)"
  const existingSession = sessions.find(s => s.draftTrip?.title === tripTitle || s.title === tripTitle || s.tripId === tripId)
  
  const messages: Message[] = existingSession ? existingSession.messages.map(m => ({
    role: m.role as "user" | "assistant",
    content: m.content,
    isModification: m.metadata?.isModification,
    bookingData: m.metadata?.bookingData
  })) : [
    {
      role: "assistant",
      content:
        "Привет! Я ваш AI-помощник по маршруту.\n\nЗадайте вопрос или попросите изменить маршрут:\n• \"Какая погода будет?\"\n• \"Замени музей на кафе в день 2\"\n• \"Нужна ли виза?\"",
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
        throw new Error(`Ошибка сервера (${response.status})`)
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
              <h3 className="font-bold text-foreground dark:text-white text-xs sm:text-sm tracking-tight">AI-помощник</h3>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground dark:text-white/60">Вопросы и изменения</p>
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
          "transition-all duration-300 ease-out flex flex-col rounded-2xl overflow-hidden",
          "bg-white/90 dark:bg-[#060b1a]/90 backdrop-blur-md md:backdrop-blur-2xl",
          "border border-slate-200/80 dark:border-white/10 shadow-md md:shadow-2xl",
          embedded ? "h-full min-h-0" : isOpen ? "mt-3 opacity-100 scale-100" : "hidden opacity-0 scale-95 pointer-events-none"
        )}
      >
        <div className="px-3 py-2 border-b border-slate-200/70 dark:border-white/10 flex items-center justify-between bg-slate-50/80 dark:bg-white/[0.02]">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-medium text-slate-500 dark:text-white/50 uppercase tracking-wider">Онлайн</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-slate-400 dark:text-white/30">DeepSeek</span>
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className={cn(
            "overflow-y-auto px-3 py-3 space-y-3",
            embedded ? "flex-1 min-h-0 max-h-[60vh]" : "h-[420px] sm:h-[500px]"
          )}
        >
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex gap-3", msg.role === "user" && "flex-row-reverse")}>
              <div
                className={cn(
                  "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                  msg.role === "user"
                    ? "bg-gradient-to-br from-sky-500 to-indigo-600 text-white"
                    : "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
                )}
              >
                {msg.role === "user" ? "Я" : "AI"}
              </div>

              <div
                className={cn(
                  "max-w-[85%] rounded-xl px-3 py-2",
                  msg.role === "user"
                    ? "bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-br-sm"
                    : "bg-slate-100 border border-slate-200 text-slate-800 dark:bg-white/[0.06] dark:border-white/10 dark:text-white/90 rounded-bl-sm"
                )}
              >
                <div className={cn("text-[12px] leading-relaxed whitespace-pre-wrap", msg.role === "assistant" && "font-normal")}>{msg.content}</div>

                {msg.isModification && (
                  <div className="mt-2 pt-2 border-t border-slate-300/60 dark:border-white/10">
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                      Маршрут обновлён
                    </span>
                  </div>
                )}

                {msg.bookingData && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-200/70 dark:bg-black/30 border border-slate-300/60 dark:border-white/10 space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">
                      {msg.bookingData.type === "flight" ? (
                        <Plane className="h-3 w-3 text-sky-500 dark:text-sky-300" />
                      ) : (
                        <HotelIcon className="h-3 w-3 text-emerald-500 dark:text-emerald-300" />
                      )}
                      {msg.bookingData.type === "flight" ? "Авиабилеты" : "Отели"}
                    </div>
                    <Button
                      size="sm"
                      className="w-full text-[10px] h-8 font-bold uppercase tracking-wide bg-white/70 hover:bg-white dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white rounded-lg border border-slate-300/70 dark:border-white/10"
                      onClick={() => {
                        const url =
                          msg.bookingData!.type === "flight"
                            ? `https://www.aviasales.ru/search/${encodeURIComponent(msg.bookingData!.destination || "")}`
                            : `https://search.hotellook.com/?q=${encodeURIComponent(msg.bookingData!.destination || "")}`
                        window.open(url, "_blank")
                      }}
                    >
                      Открыть {msg.bookingData.type === "flight" ? "Aviasales" : "Ostrovok"}
                      <ExternalLink className="ml-2 h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xs font-bold text-white">
                AI
              </div>
              <div className="bg-slate-100 dark:bg-white/[0.06] border border-slate-300/70 dark:border-white/10 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-xs text-slate-500 dark:text-white/50">Думаю...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-slate-200/70 dark:border-white/10 bg-slate-50/80 dark:bg-black/30">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex gap-2"
          >
            <div className="flex-1 relative">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Спросите что-нибудь..."
                className="w-full bg-white/90 dark:bg-white/5 border-slate-300/70 dark:border-white/10 rounded-lg h-10 pl-3 pr-10 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:ring-1 focus:ring-sky-500/50 focus:border-sky-500/50"
                disabled={isLoading}
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              size="sm"
              className="h-10 px-4 rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-medium shadow-md disabled:opacity-40 transition-all"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      </div>
    </Card>
  )
}
