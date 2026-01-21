"use client"

import { useState, useEffect, useRef } from "react"
import { Send, Sparkles, MessageSquare, Plus, ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface Message {
    role: "user" | "assistant"
    content: string
    isModification?: boolean
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
    completedActivities = []
}: ItineraryChatWidgetProps) {
    const [isOpen, setIsOpen] = useState(embedded) // If embedded, start open
    const [messages, setMessages] = useState<Message[]>([
        mode === "planning"
            ? { role: "assistant", content: "Привет! Я помогу изменить маршрут. Например:\n• \"Замени Хельсинки на Рим\"\n• \"В день 3 хочу ресторан вместо музея\"" }
            : { role: "assistant", content: "Привет! Я ваш ИИ-гид. Я знаю ваш маршрут и могу подсказать, куда идти, где поесть или как вызвать такси. Спрашивайте!" }
    ])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
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
        onModifying?.(true) // Notify parent that modification started

        try {
            const endpoint = mode === "planning" ? "/api/modify-itinerary" : "/api/guide-chat"
            const body = mode === "planning"
                ? { currentItinerary: itinerary, userMessage, tripId }
                : {
                    tripData: itinerary,
                    userMessage,
                    tripId,
                    completedActivities,
                    bookings: tripDetails?.bookings
                }

            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            })

            const data = await response.json()

            if (data.error) {
                setMessages(prev => [...prev, {
                    role: "assistant",
                    content: `❌ Ошибка: ${data.error}`
                }])
            } else {
                if (mode === "planning") {
                    // Planning Mode Logic
                    if (data.modifications && data.modifications.length > 0 && onItineraryUpdate) {
                        applyModifications(data.modifications, data.metadataUpdates)
                        setMessages(prev => [...prev, {
                            role: "assistant",
                            content: `✅ ${data.explanation}`,
                            isModification: true
                        }])
                    } else {
                        setMessages(prev => [...prev, {
                            role: "assistant",
                            content: data.explanation || "Не удалось понять запрос. Попробуйте уточнить."
                        }])
                    }
                } else {
                    // Guide Mode Logic (Just chat for now)
                    setMessages(prev => [...prev, {
                        role: "assistant",
                        content: data.reply || "Я не знаю, что ответить."
                    }])
                }
            }
        } catch (error: any) {
            setMessages(prev => [...prev, {
                role: "assistant",
                content: "❌ Произошла ошибка. Попробуйте позже."
            }])
        } finally {
            setIsLoading(false)
            onModifying?.(false) // Notify parent that modification ended
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
            "overflow-hidden border-primary/20 bg-gradient-to-br from-background to-muted/30 flex flex-col",
            embedded ? "h-full rounded-none border-0 bg-transparent shadow-none" : ""
        )}>
            {/* Header - conditional visibility based on 'embedded' */}
            {!embedded && (
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <MessageSquare className="h-5 w-5 text-primary" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-semibold flex items-center gap-2">
                                {mode === "planning" ? "Изменить маршрут" : "Чат с гидом"}
                                <Sparkles className="h-4 w-4 text-primary" />
                            </h3>
                            <p className="text-xs text-muted-foreground">AI-ассистент</p>
                        </div>
                    </div>
                    {isOpen ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                </button>
            )}

            {/* Chat body - collapsible if not embedded */}
            <div className={cn(
                "transition-all duration-300 ease-in-out overflow-hidden flex flex-col",
                embedded ? "h-full" : (isOpen ? "max-h-[500px]" : "max-h-0")
            )}>
                {/* Messages */}
                <div className={cn(
                    "overflow-y-auto p-4 space-y-3",
                    embedded ? "flex-1" : "h-[280px] border-t border-border/50"
                )}>
                    {messages.map((msg, i) => (
                        <div
                            key={i}
                            className={cn(
                                "flex w-max max-w-[85%] flex-col gap-2 rounded-lg px-3 py-2 text-sm",
                                msg.role === "user"
                                    ? "ml-auto bg-primary text-primary-foreground"
                                    : "bg-muted"
                            )}
                        >
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-center gap-2 text-muted-foreground text-xs p-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Думаю...</span>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-3 bg-background/50 border-t border-border/50">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault()
                            handleSend()
                        }}
                        className="flex gap-2"
                    >
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={mode === "planning" ? "Что изменить?" : "Задай вопрос гиду..."}
                            className="flex-1 bg-background"
                            disabled={isLoading}
                        />
                        <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                            <Send className="h-4 w-4" />
                            <span className="sr-only">Отправить</span>
                        </Button>
                    </form>
                </div>
            </div>
        </Card>
    )
}
