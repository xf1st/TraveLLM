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
                    tripData: itinerary,
                    userMessage,
                    tripId
                })
            })

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
            setMessages(prev => [...prev, {
                role: "assistant",
                content: "❌ Произошла ошибка. Попробуйте позже."
            }])
        } finally {
            setIsLoading(false)
            onModifying?.(false)
        }
    }

    // Proactive Booking Suggestion - called after successful response, not in finally
    const maybeAddBookingSuggestion = (userMessage: string, currentMessages: Message[]) => {
        const lowerMsg = userMessage.toLowerCase()
        const hasBookingSuggestion = currentMessages.some(m => m.bookingData)

        // Don't add if there's already a booking suggestion in recent messages
        if (hasBookingSuggestion) return

        if (lowerMsg.includes('билет') || lowerMsg.includes('перелет') || lowerMsg.includes('летим')) {
            setMessages(prev => [...prev, {
                role: "assistant",
                content: "Я могу помочь подобрать билеты! Хотите посмотреть рейсы?",
                bookingData: { type: "flight", destination: itinerary?.countries?.[0]?.name || itinerary?.destination || "" }
            }])
        } else if (lowerMsg.includes('отель') || lowerMsg.includes('жилье') || lowerMsg.includes('где жить')) {
            setMessages(prev => [...prev, {
                role: "assistant",
                content: "Нашел несколько вариантов жилья по вашему бюджету. Посмотрим?",
                bookingData: { type: "hotel", destination: itinerary?.countries?.[0]?.name || itinerary?.destination || "" }
            }])
        }
    }

    const applyModifications = (modifications: any[], metadataUpdates?: any) => {
        // ... (Logic from previous implementation)
        // For now, assuming replace_all_days is the main one used by smart backend
        let updatedItinerary = [...itinerary]

        for (const mod of modifications) {
            if (mod.type === "replace_all_days") {
                updatedItinerary = mod.newItinerary
            }
            // Add other types if needed
        }

        // Handle metadata updates if present (needs to be passed up)
        // logic to merge metadataUpdates into tripDetails
        if (metadataUpdates && tripDetails) {
            // This is a bit tricky since itinerary prop is just the array
            // Ideally onItineraryUpdate should accept (newItinerary, newMetadata)
            // For now, we just update the itinerary array.
            // In a real app, we'd want to update the full trip object.
            updatedItinerary = updatedItinerary.map(day => ({
                ...day,
                // If the modification didn't include dayTotal updates but metadata did, we might want to merge
            }))
        }

        onItineraryUpdate?.(updatedItinerary)
        setHasUnsavedChanges(true) // Mark that we have unsaved changes
    }

    const handleSave = async () => {
        // This is handled by the parent Save button usually, 
        // but we can offer a "Quick Save" here if needed.
        // For now, we assume parent handles persistence via onItineraryUpdate bubbling up.
    }

    return (
        <Card className={cn(
            "border-0 bg-transparent flex flex-col relative overflow-visible z-40",
            embedded ? "h-full" : "",
            className
        )}>
            {/* Floating Header */}
            {!embedded && (
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-violet-600/90 via-indigo-600/90 to-purple-600/90 backdrop-blur-xl rounded-2xl shadow-xl shadow-violet-500/20 hover:shadow-violet-500/30 transition-all duration-300 group border border-white/20"
                >
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                            <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-white text-sm tracking-tight">
                                AI-Помощник
                            </h3>
                            <p className="text-[10px] text-white/70 font-medium">Вопросы • Изменения • Советы</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                        <ChevronDown className={cn(
                            "h-5 w-5 text-white/80 transition-transform duration-300",
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
                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Онлайн</span>
                    </div>
                    <span className="text-[10px] text-white/40">Powered by DeepSeek</span>
                </div>

                {/* Messages */}
                <div
                    ref={scrollContainerRef}
                    className={cn(
                        "overflow-y-auto px-4 py-5 space-y-5",
                        embedded ? "flex-1" : "h-[360px]"
                    )}>
                    {messages.map((msg, i) => (
                        <div
                            key={i}
                            className={cn(
                                "flex gap-3",
                                msg.role === "user" && "flex-row-reverse"
                            )}
                        >
                            {/* Avatar */}
                            <div className={cn(
                                "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                                msg.role === "user"
                                    ? "bg-gradient-to-br from-violet-500 to-indigo-600 text-white"
                                    : "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
                            )}>
                                {msg.role === "user" ? "Я" : "AI"}
                            </div>

                            {/* Message Bubble */}
                            <div className={cn(
                                "max-w-[80%] rounded-2xl px-4 py-3",
                                msg.role === "user"
                                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-br-md"
                                    : "bg-white/[0.06] border border-white/10 text-white/90 rounded-bl-md"
                            )}>
                                <div className={cn(
                                    "text-[13px] leading-relaxed whitespace-pre-wrap",
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

                {/* Input Area */}
                <div className="p-4 border-t border-white/5 bg-black/30">
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
                                placeholder="Напишите сообщение..."
                                className="w-full bg-white/5 border-white/10 rounded-xl h-12 pl-4 pr-12 text-sm text-white placeholder:text-white/30 focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50"
                                disabled={isLoading}
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className="h-12 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-violet-500/25 disabled:opacity-40 disabled:shadow-none transition-all"
                        >
                            <Send className="h-4 w-4 mr-2" />
                            <span className="hidden sm:inline">Отправить</span>
                        </Button>
                    </form>
                    <p className="text-[10px] text-white/30 text-center mt-2">
                        Спросите про маршрут или попросите изменить
                    </p>
                </div>
            </div>
        </Card>
    )
}
