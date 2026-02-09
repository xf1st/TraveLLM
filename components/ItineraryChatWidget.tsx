"use client"

import { useState, useEffect, useRef } from "react"
import { Send, Sparkles, MessageSquare, Plus, ChevronDown, ChevronUp, Loader2, Plane, Hotel as HotelIcon, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface Message {
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
    tripDetails?: any // Full trip object for context (budget, preferences, etc)
    onItineraryUpdate?: (newItinerary: any) => void
    onModifying?: (isModifying: boolean) => void
    tripId?: string
    mode?: "planning" | "guide"
    embedded?: boolean
    completedActivities?: string[]
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
    className
}: ItineraryChatWidgetProps & { className?: string }) {
    const [isOpen, setIsOpen] = useState(embedded) // If embedded, start open
    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", content: "Привет! Я ваш AI-помощник по маршруту.\n\nЗадайте вопрос или попросите изменить маршрут:\n• \"Какая погода будет?\"​\n• \"Замени музей на кафе в день 2\"​\n• \"Нужна ли виза?\"" }
    ])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    // Auto-scroll to bottom
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
        }
    }, [messages, isOpen])

    // Update embedded open state if prop changes
    useEffect(() => {
        if (embedded) setIsOpen(true)
    }, [embedded])

    const handleSend = async () => {
        if (!input.trim() || isLoading) return

        const userMessage = input
        setInput("")
        setMessages(prev => [...prev, { role: "user", content: userMessage }])
        setIsLoading(true)
        onModifying?.(true)

        try {
            // Use unified trip-assistant API
            const response = await fetch("/api/trip-assistant", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tripData: tripDetails || { itinerary }, // Send full trip object or fallback
                    userMessage,
                    tripId
                })
            })

            if (!response.ok) {
                throw new Error(`Ошибка сервера (${response.status})`)
            }

            const data = await response.json()

            if (data.error) {
                setMessages(prev => [...prev, {
                    role: "assistant",
                    content: `❌ Ошибка: ${data.error}`
                }])
            } else if (data.type === "modification" && data.modifications?.length > 0 && onItineraryUpdate) {
                // Handle modification response
                applyModifications(data.modifications, data.metadataUpdates)
                setMessages(prev => [...prev, {
                    role: "assistant",
                    content: data.reply,
                    isModification: true
                }])
            } else {
                // Handle regular message/question response
                setMessages(prev => [...prev, {
                    role: "assistant",
                    content: data.reply || "Не удалось обработать запрос."
                }])
            }
        } catch (error: any) {
            console.error("Chat widget error:", error)
            setMessages(prev => [...prev, {
                role: "assistant",
                content: `❌ Произошла ошибка: ${error.message || "Попробуйте позже."}`
            }])
        } finally {
            setIsLoading(false)
            onModifying?.(false)
        }
    }

    const applyModifications = (modifications: any[], metadataUpdates?: any) => {
        // Get itinerary array safely - itinerary prop could be object or array
        const itineraryArray = Array.isArray(itinerary)
            ? itinerary
            : (itinerary?.itinerary || [])

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
        <Card className={cn(
            "border-0 bg-transparent flex flex-col relative overflow-visible z-40",
            embedded ? "h-full" : "",
            className
        )}>
            {/* Floating Header - Desktop: expands panel, Mobile: opens chat directly */}
            {!embedded && (
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between p-2.5 sm:p-3 bg-card/90 dark:bg-white/5 backdrop-blur-xl rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group border border-border/50 dark:border-white/10"
                >
                    <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-md">
                            <Sparkles className="h-4 w-4 text-white" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-foreground dark:text-white text-xs sm:text-sm tracking-tight">
                                AI-Помощник
                            </h3>
                            <p className="text-[9px] sm:text-[10px] text-muted-foreground dark:text-white/60">Вопросы • Изменения</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        <ChevronDown className={cn(
                            "h-4 w-4 text-muted-foreground dark:text-white/60 transition-transform duration-300",
                            isOpen && "rotate-180"
                        )} />
                    </div>
                </button>
            )}

            {/* Chat Panel */}
            <div className={cn(
                "transition-all duration-300 ease-out flex flex-col rounded-2xl overflow-hidden",
                "bg-gradient-to-b from-neutral-900/95 via-neutral-900/98 to-black/95 backdrop-blur-2xl",
                "border border-white/10 shadow-2xl shadow-black/50",
                embedded ? "h-full" : (isOpen ? "mt-3 opacity-100 scale-100" : "hidden opacity-0 scale-95 pointer-events-none")
            )}>
                {/* Chat Header Bar */}
                <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-medium text-white/50 uppercase tracking-wider">Онлайн</span>
                    </div>
                    <span className="text-[9px] text-white/30">DeepSeek</span>
                </div>

                {/* Messages - More compact */}
                <div
                    ref={scrollContainerRef}
                    className={cn(
                        "overflow-y-auto px-3 py-3 space-y-3",
                        embedded ? "flex-1" : "h-[280px] sm:h-[320px]"
                    )}>
                    {messages.map((msg, i) => (
                        <div
                            key={i}
                            className={cn(
                                "flex gap-3",
                                msg.role === "user" && "flex-row-reverse"
                            )}
                        >
                            {/* Avatar - smaller */}
                            <div className={cn(
                                "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                                msg.role === "user"
                                    ? "bg-gradient-to-br from-violet-500 to-indigo-600 text-white"
                                    : "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
                            )}>
                                {msg.role === "user" ? "Я" : "AI"}
                            </div>

                            {/* Message Bubble - more compact */}
                            <div className={cn(
                                "max-w-[85%] rounded-xl px-3 py-2",
                                msg.role === "user"
                                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-br-sm"
                                    : "bg-white/[0.06] border border-white/10 text-white/90 rounded-bl-sm"
                            )}>
                                <div className={cn(
                                    "text-[12px] leading-relaxed whitespace-pre-wrap",
                                    msg.role === "assistant" && "font-normal"
                                )}>{msg.content}</div>

                                {msg.isModification && (
                                    <div className="mt-2 pt-2 border-t border-white/10">
                                        <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                                            Маршрут обновлён
                                        </span>
                                    </div>
                                )}

                                {msg.bookingData && (
                                    <div className="mt-3 p-3 rounded-xl bg-black/30 border border-white/10 space-y-2">
                                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/50">
                                            {msg.bookingData.type === 'flight' ? <Plane className="h-3 w-3 text-sky-400" /> : <HotelIcon className="h-3 w-3 text-emerald-400" />}
                                            {msg.bookingData.type === 'flight' ? 'Авиабилеты' : 'Отели'}
                                        </div>
                                        <Button
                                            size="sm"
                                            className="w-full text-[10px] h-8 font-bold uppercase tracking-wide bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/10"
                                            onClick={() => {
                                                const url = msg.bookingData!.type === 'flight'
                                                    ? `https://www.aviasales.ru/search?destination=${encodeURIComponent(msg.bookingData!.destination || "")}`
                                                    : `https://ostrovok.ru/search/?q=${encodeURIComponent(msg.bookingData!.destination || "")}`
                                                window.open(url, '_blank')
                                            }}
                                        >
                                            Открыть {msg.bookingData.type === 'flight' ? 'Aviasales' : 'Ostrovok'}
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
                            <div className="bg-white/[0.06] border border-white/10 rounded-2xl rounded-bl-md px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                    <span className="text-xs text-white/50">Думаю...</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area - more compact */}
                <div className="p-3 border-t border-white/5 bg-black/30">
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
                                className="w-full bg-white/5 border-white/10 rounded-lg h-9 sm:h-10 pl-3 pr-10 text-xs sm:text-sm text-white placeholder:text-white/30 focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50"
                                disabled={isLoading}
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            size="sm"
                            className="h-9 sm:h-10 px-3 sm:px-4 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium shadow-md disabled:opacity-40 transition-all"
                        >
                            <Send className="h-3.5 w-3.5" />
                        </Button>
                    </form>
                </div>
            </div>
        </Card>
    )
}
