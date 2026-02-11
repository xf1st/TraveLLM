"use client"

import { useState, useEffect, useRef } from "react"
import { Send, Sparkles, X } from "lucide-react"
import { Drawer } from "vaul"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/lib/hooks/use-media-query"

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
        <div className="mx-3 mt-3 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10">
          <div className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold">День {currentDay || 1} • Контекст активности</div>
          <div className="text-sm text-white font-semibold mt-1">{activityTitle}</div>
          {currentActivity?.time && <div className="text-xs text-emerald-200/80 mt-1">{currentActivity.time}</div>}
        </div>
      )}

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
      >
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex w-full", msg.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-emerald-600 text-white rounded-br-sm"
                  : "bg-white/10 text-white/90 rounded-bl-sm backdrop-blur-md border border-white/5",
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/5 rounded-2xl px-4 py-3 rounded-bl-sm flex gap-1">
              <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>

      <div className="p-3 bg-black/20 border-t border-white/5">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="relative flex items-center"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Спросите о месте..."
            className="bg-white/5 border-white/10 rounded-xl pr-10 focus:ring-emerald-500/50 text-white placeholder:text-white/30"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-1.5 bg-emerald-500 rounded-lg text-white hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Привет! Я ваш гид. Спрашивайте по текущему месту или активности." },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input
    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: userMessage }])
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
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || "Извините, сейчас не могу ответить.",
        },
      ])
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Ошибка связи. Попробуйте ещё раз.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const chatInner = (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium text-sm text-white">AI Гид</span>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-lg text-white/60 transition-colors">
          <X className="w-4 h-4" />
        </button>
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
        "w-full md:w-[380px] h-[50vh] md:h-[500px]",
        "bg-black/40 backdrop-blur-2xl border-t md:border border-white/10",
        "shadow-2xl md:rounded-2xl rounded-t-2xl flex flex-col",
      )}
    >
      {chatInner}
    </Card>
  )

  if (isDesktop) {
    return <div className={cn("fixed z-50 bottom-0 right-0 md:bottom-8 md:right-8", className)}>{chatPanel}</div>
  }

  return (
    <Drawer.Root open onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" />
        <Drawer.Content className="bg-zinc-950/95 border-t border-white/10 flex flex-col rounded-t-[20px] h-[85vh] fixed bottom-0 left-0 right-0 z-50 outline-none pb-[env(safe-area-inset-bottom)]">
          <Drawer.Title className="sr-only">AI Гид</Drawer.Title>
          <Drawer.Description className="sr-only">Чат-помощник по маршруту и текущим активностям.</Drawer.Description>

          <div className="p-2 flex-1 flex flex-col min-h-0">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-zinc-800 mb-2 mt-1" />
            <div className="px-2 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-semibold">AI Гид</span>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-zinc-400 hover:text-white">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 rounded-t-2xl overflow-hidden bg-black/40 backdrop-blur-2xl border-t border-white/10 flex flex-col">
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
