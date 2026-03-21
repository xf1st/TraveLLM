"use client"

import { useState, useEffect, useRef } from "react"
import { Send, Sparkles, X, ExternalLink } from "lucide-react"
import { Drawer } from "vaul"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/lib/hooks/use-media-query"
import { useChat } from "@/lib/context/chat-context"
import { useRouter } from "next/navigation"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface MapChatWidgetProps {
  onClose: () => void
  userLocation?: { lat: number; lng: number }
  currentActivity?: any | null
  currentDay?: number | null
  tripContext?: any
  className?: string
}

function ChatBody({
  messages,
  isLoading,
  input,
  setInput,
  handleSend,
  currentActivity,
  currentDay,
}: {
  messages: Message[]
  isLoading: boolean
  input: string
  setInput: (v: string) => void
  handleSend: () => void
  currentActivity?: any | null
  currentDay?: number | null
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [messages])

  const activityTitle = currentActivity?.title || currentActivity?.placeName || currentActivity?.place_name

  return (
    <>
      {activityTitle && (
        <div className="mx-4 mt-4 p-4 rounded-2xl relative overflow-hidden group smooth-transition hover-lift shadow-lg border border-white/20 bg-emerald-500/10 backdrop-blur-md md:backdrop-blur-3xl">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-transparent to-transparent opacity-60 pointer-events-none" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shrink-0">
               <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <div className="text-[10px] uppercase tracking-widest text-emerald-300 font-bold">Текущая локация (День {currentDay || 1})</div>
              </div>
              <div className="text-[15px] text-white font-bold leading-tight truncate">{activityTitle}</div>
              {currentActivity?.time && (
                <div className="text-[11px] text-white/60 mt-1 flex items-center gap-1">
                  <span className="opacity-70">🕒</span> {currentActivity.time}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
      >
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex w-full", msg.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm transition-all duration-300",
                msg.role === "user"
                  ? "bg-emerald-600 text-white rounded-br-none shadow-emerald-900/20"
                  : "bg-white/10 text-white/90 rounded-bl-none backdrop-blur-md border border-white/10 hover:bg-white/15",
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/5 rounded-2xl px-4 py-3 rounded-bl-none flex gap-1.5 items-center border border-white/5 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 bg-emerald-400/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-emerald-400/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-emerald-400/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-black/40 border-t border-white/10 flex flex-col gap-4 backdrop-blur-md md:backdrop-blur-3xl">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {["Где поесть рядом?", "Интересный факт", "Где лучшие фото?", "Что тут кроется?"].map((action) => (
                <button
                    key={action}
                    onClick={() => {
                        setInput(action);
                        setTimeout(() => handleSend(), 50);
                    }}
                    disabled={isLoading}
                    className="shrink-0 px-4 py-2 text-[11px] font-bold uppercase tracking-wider rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/15 hover:text-white transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
                >
                    {action}
                </button>
            ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="relative flex items-center group"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Спросите меня о локации..."
            className="h-12 bg-white/5 border-white/10 rounded-2xl pl-4 pr-12 focus:ring-emerald-500/50 text-white placeholder:text-white/30 transition-all group-hover:bg-white/10"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 w-8 h-8 flex items-center justify-center bg-emerald-500 rounded-xl text-white hover:bg-emerald-400 focus:scale-95 disabled:opacity-30 disabled:grayscale transition-all shadow-lg shadow-emerald-500/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </>
  )
}

export function MapChatWidget({ onClose, userLocation, currentActivity, currentDay, tripContext, className }: MapChatWidgetProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  
  const { sessions, createSession, updateSession, addMessage, setActiveSessionId } = useChat()
  const router = useRouter()
  
  const tripTitle = tripContext?.title || "Мой маршрут (карта)"
  const existingSession = sessions.find(s => s.draftTrip?.title === tripTitle || s.title === tripTitle)
  
  const messages: Message[] = existingSession ? existingSession.messages.map(m => ({
    role: m.role as "user" | "assistant",
    content: m.content
  })) : [
    { role: "assistant", content: "Привет! 👋 Я твой локальный ассистент. Спрашивай что угодно про место, где мы сейчас, или жми быстрые вопросы внизу!" },
  ]

  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    
    let sessionId = existingSession?.id
    if (!sessionId) {
      sessionId = createSession(input)
      updateSession(sessionId, { title: tripTitle, draftTrip: tripContext })
    }
    setActiveSessionId(sessionId)

    const userMessage = input
    setInput("")
    
    if (sessionId) {
        addMessage(sessionId, { role: "user", content: userMessage })
    }
    
    setIsLoading(true)

    try {
      const recentHistory = messages.slice(-8)

      let response: Response
      if (currentActivity) {
        response = await fetch("/api/trip-assistant/activity-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            activity: currentActivity,
            day: currentDay,
            destination: tripContext?.destination,
            userMessage,
            history: recentHistory,
          }),
        })
      } else {
        response = await fetch("/api/trip-assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tripData: tripContext || { itinerary: [] },
            userMessage,
            userLocation,
          }),
        })
      }

      if (!response.ok) throw new Error("Network error")

      const data = await response.json()
      if (sessionId) {
         addMessage(sessionId, {
           role: "assistant",
           content: data.reply || "Извините, сейчас не могу ответить.",
         })
      }
    } catch (error) {
      if (sessionId) {
         addMessage(sessionId, {
           role: "assistant",
           content: "Ошибка связи. Попробуйте ещё раз.",
         })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const chatInner = (
    <>
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/5 backdrop-blur-md md:backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
            <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping opacity-20" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white uppercase opacity-90">AI Ассистент</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-xl text-white/60 hover:text-white transition-all" 
            title="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <ChatBody
        messages={messages}
        isLoading={isLoading}
        input={input}
        setInput={setInput}
        handleSend={handleSend}
        currentActivity={currentActivity}
        currentDay={currentDay}
      />
    </>
  )

  const chatPanel = (
    <Card
      className={cn(
        "w-full md:w-[420px] h-[50vh] md:h-[620px]",
        "bg-black/60 backdrop-blur-md md:backdrop-blur-3xl border-t md:border border-white/20",
        "shadow-[0_20px_50px_rgba(0,0,0,0.5)] md:rounded-[2.5rem] rounded-t-[2rem] flex flex-col overflow-hidden",
      )}
    >
      {chatInner}
    </Card>
  )

  if (isDesktop) {
    return <div className={cn("fixed z-50 bottom-0 right-0 md:bottom-10 md:right-10", className)}>{chatPanel}</div>
  }

  return (
    <Drawer.Root open onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/80 z-50 backdrop-blur-md" />
        <Drawer.Content className="bg-zinc-950/98 border-t border-white/20 flex flex-col rounded-t-[2.5rem] h-[88vh] fixed bottom-0 left-0 right-0 z-50 outline-none pb-[env(safe-area-inset-bottom)]">
          <Drawer.Title className="sr-only">AI Ассистент</Drawer.Title>
          <Drawer.Description className="sr-only">Чат-помощник по маршруту и текущим активностям.</Drawer.Description>

          <div className="p-4 flex-1 flex flex-col min-h-0">
            <div className="mx-auto w-16 h-1.5 flex-shrink-0 rounded-full bg-zinc-800 mb-6 mt-1" />
            <div className="px-2 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3 text-white">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                </div>
                <span className="text-lg font-bold tracking-tight">AI AI Ассистент</span>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/5 text-zinc-400 hover:text-red-400" title="Закрыть">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 rounded-[2rem] overflow-hidden bg-black/40 backdrop-blur-md md:backdrop-blur-2xl border border-white/10 flex flex-col shadow-md md:shadow-2xl overflow-hidden min-h-0">
              <ChatBody
                messages={messages}
                isLoading={isLoading}
                input={input}
                setInput={setInput}
                handleSend={handleSend}
                currentActivity={currentActivity}
                currentDay={currentDay}
              />
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
