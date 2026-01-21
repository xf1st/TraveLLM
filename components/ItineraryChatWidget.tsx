"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { MessageSquare, Send, Sparkles, ChevronDown, ChevronUp, Loader2, CheckCircle, Save } from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"

interface Message {
    role: "user" | "assistant"
    content: string
    isModification?: boolean
}

interface ItineraryChatWidgetProps {
    itinerary: any
    tripDetails?: any // Full trip object for context (budget, preferences, etc)
    onItineraryUpdate: (newItinerary: any) => void
    onModifying?: (isModifying: boolean) => void
    tripId?: string
}

export function ItineraryChatWidget({ itinerary, tripDetails, onItineraryUpdate, onModifying, tripId }: ItineraryChatWidgetProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", content: "Привет! Я помогу изменить маршрут. Например:\n• \"Замени Хельсинки на Рим\"\n• \"В день 3 хочу ресторан вместо музея\"\n• \"Сократи Анапу до 2 дней\"" }
    ])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    const applyModifications = (modifications: any[], metadataUpdates?: any) => {
        if (!modifications || modifications.length === 0) return

        let updatedItinerary = { ...itinerary }

        for (const mod of modifications) {
            if (mod.type === "replace_all_days" && mod.newItinerary) {
                // Full restructure - replace entire itinerary
                updatedItinerary.itinerary = mod.newItinerary
            } else if (mod.type === "remove_days" && mod.dayNumbers) {
                // Smart edit - remove specific days
                updatedItinerary.itinerary = updatedItinerary.itinerary?.filter(
                    (d: any) => !mod.dayNumbers.includes(d.day)
                )
            } else if (mod.type === "reorder_days" && mod.mapping) {
                // Smart edit - renumber days according to mapping
                updatedItinerary.itinerary = updatedItinerary.itinerary?.map((d: any) => ({
                    ...d,
                    day: mod.mapping[String(d.day)] || d.day
                })).sort((a: any, b: any) => a.day - b.day)
            } else if (mod.type === "add_new_days" && mod.newDays) {
                // Insert new days at specified position
                const insertAfter = mod.insertAfterDay || 0
                const newDays = mod.newDays.map((day: any, idx: number) => ({
                    ...day,
                    day: insertAfter + idx + 1
                }))
                // Find insert position and add new days
                if (updatedItinerary.itinerary) {
                    const beforeDays = updatedItinerary.itinerary.filter((d: any) => d.day <= insertAfter)
                    const afterDays = updatedItinerary.itinerary
                        .filter((d: any) => d.day > insertAfter)
                        .map((d: any) => ({ ...d, day: d.day + newDays.length }))
                    updatedItinerary.itinerary = [...beforeDays, ...newDays, ...afterDays]
                        .sort((a, b) => a.day - b.day)
                }
            } else if (mod.type === "replace_day" && mod.newContent) {
                const dayIndex = updatedItinerary.itinerary?.findIndex((d: any) => d.day === mod.dayNumber)
                if (dayIndex !== -1 && updatedItinerary.itinerary) {
                    updatedItinerary.itinerary[dayIndex] = mod.newContent
                }
            } else if (mod.type === "replace_activity" && mod.newActivity) {
                const dayIndex = updatedItinerary.itinerary?.findIndex((d: any) => d.day === mod.dayNumber)
                if (dayIndex !== -1 && updatedItinerary.itinerary) {
                    const actIndex = updatedItinerary.itinerary[dayIndex].activities?.findIndex(
                        (a: any) => a.time === mod.timeSlot
                    )
                    if (actIndex !== -1) {
                        updatedItinerary.itinerary[dayIndex].activities[actIndex] = mod.newActivity
                    }
                }
            }
        }

        // Apply metadata updates if provided
        if (metadataUpdates) {
            if (metadataUpdates.countries) updatedItinerary.countries = metadataUpdates.countries
            if (metadataUpdates.visaAdvice) updatedItinerary.visaAdvice = metadataUpdates.visaAdvice
            if (metadataUpdates.paymentAdvice) updatedItinerary.paymentAdvice = metadataUpdates.paymentAdvice
            if (metadataUpdates.safetyInfo) updatedItinerary.safetyInfo = metadataUpdates.safetyInfo
            if (metadataUpdates.totalBudget) updatedItinerary.totalBudget = metadataUpdates.totalBudget
            if (metadataUpdates.budgetAnalysis) updatedItinerary.budgetAnalysis = metadataUpdates.budgetAnalysis
            if (metadataUpdates.importantInfo) updatedItinerary.importantInfo = metadataUpdates.importantInfo
        }

        // FIX: Always ensure sequential day numbering (1, 2, 3, 4...)
        if (updatedItinerary.itinerary && updatedItinerary.itinerary.length > 0) {
            updatedItinerary.itinerary = updatedItinerary.itinerary
                .sort((a: any, b: any) => a.day - b.day)
                .map((day: any, index: number) => ({
                    ...day,
                    day: index + 1
                }))
        }

        onItineraryUpdate(updatedItinerary)
        setHasUnsavedChanges(true) // Mark that we have unsaved changes
    }

    // Save changes to Supabase
    const saveChanges = async () => {
        if (!tripId || !hasUnsavedChanges) return

        setIsSaving(true)
        try {
            const { error } = await supabase
                .from('trips')
                .update({
                    route_data: itinerary,
                    updated_at: new Date().toISOString()
                })
                .eq('id', tripId)

            if (error) throw error

            setHasUnsavedChanges(false)
            setMessages(prev => [...prev, {
                role: "assistant",
                content: "💾 Изменения сохранены в базу данных!"
            }])
        } catch (error: any) {
            console.error("Save error:", error)
            setMessages(prev => [...prev, {
                role: "assistant",
                content: `❌ Ошибка сохранения: ${error.message}`
            }])
        } finally {
            setIsSaving(false)
        }
    }

    const handleSend = async () => {
        if (!input.trim() || isLoading) return

        const userMessage = input.trim()
        setInput("")
        setMessages(prev => [...prev, { role: "user", content: userMessage }])
        setIsLoading(true)
        onModifying?.(true) // Notify parent that modification started

        try {
            const response = await fetch("/api/modify-itinerary", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentItinerary: itinerary,
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
            } else {
                // Apply modifications
                if (data.modifications && data.modifications.length > 0) {
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

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-background to-muted/30">
            {/* Header - always visible */}
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
                            Изменить маршрут
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

            {/* Chat body - collapsible */}
            <div className={cn(
                "transition-all duration-300 ease-in-out overflow-hidden",
                isOpen ? "max-h-[400px]" : "max-h-0"
            )}>
                {/* Messages */}
                <div className="h-[280px] overflow-y-auto p-4 space-y-3 border-t border-border/50">
                    {messages.map((msg, i) => (
                        <div
                            key={i}
                            className={cn(
                                "text-sm rounded-lg p-3 max-w-[85%]",
                                msg.role === "user"
                                    ? "ml-auto bg-primary text-primary-foreground"
                                    : msg.isModification
                                        ? "bg-emerald-500/10 text-foreground border border-emerald-500/30"
                                        : "bg-muted text-foreground"
                            )}
                        >
                            {msg.isModification && (
                                <CheckCircle className="h-4 w-4 text-emerald-500 inline mr-1" />
                            )}
                            <span className="whitespace-pre-line">{msg.content}</span>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="bg-muted text-foreground text-sm rounded-lg p-3 max-w-[85%] flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Изменяю маршрут...</span>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-3 border-t border-border/50 flex gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Что изменить в маршруте?"
                        disabled={isLoading || isSaving}
                        className="flex-1 bg-background/50"
                    />
                    <Button
                        size="icon"
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading || isSaving}
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>

                {/* Save Button - appears when there are unsaved changes */}
                {hasUnsavedChanges && (
                    <div className="p-3 border-t border-amber-500/30 bg-amber-500/5">
                        <Button
                            onClick={saveChanges}
                            disabled={isSaving}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Сохранение...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Сохранить изменения
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </div>
        </Card>
    )
}
