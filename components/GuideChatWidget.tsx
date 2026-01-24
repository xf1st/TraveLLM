"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send, Bot, User, MapPin, Sparkles } from "lucide-react"
import { Card } from "@/components/ui/card"

interface Message {
    role: "user" | "assistant"
    content: string
}

interface GuideChatWidgetProps {
    tripContext: {
        title: string
        currentLocation?: string
        currentDay?: number
        completedSteps?: string[]
        upcomingSteps?: string[]
    }
}

export function GuideChatWidget({ tripContext }: GuideChatWidgetProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content: `Привет! Я твой ИИ-гид по маршруту "${tripContext.title}". \n\nМы сейчас на ${tripContext.currentDay || 1}-м дне. ${tripContext.currentLocation ? `Вы находитесь в районе: ${tripContext.currentLocation}.` : ""} \n\nСпрашивай что угодно: где поесть, исторические факты или как добраться до следующей точки!`
        }
    ])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    const [mode, setMode] = useState<'local' | 'global'>('local')

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const handleSend = async () => {
        if (!input.trim() || isLoading) return

        const userMsg = input
        setInput("")
        setMessages(prev => [...prev, { role: "user", content: userMsg }])
        setIsLoading(true)

        try {
            const response = await fetch("/api/guide-chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userMsg,
                    context: tripContext,
                    mode // Pass mode to API
                })
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || "Failed to get response")
            }

            const data = await response.json()
            setMessages(prev => [...prev, { role: "assistant", content: data.reply }])
        } catch (error) {
            console.error(error)
            setMessages(prev => [...prev, { role: "assistant", content: "Прости, я немного потерялся. Спроси еще раз, пожалуйста!" }])
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card className="flex flex-col h-full shadow-none border-0 bg-transparent">
            <div className="p-4 border-b border-border/50 bg-background/50 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        <div>
                            <h3 className="font-semibold text-sm">Чат с Гидом</h3>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {mode === 'local' ? (tripContext.currentLocation || "В пути") : "Весь маршрут"}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex p-1 bg-muted/50 rounded-lg">
                    <button
                        onClick={() => setMode('local')}
                        className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${mode === 'local' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        О месте
                    </button>
                    <button
                        onClick={() => setMode('global')}
                        className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${mode === 'global' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        О маршруте
                    </button>
                </div>
            </div>

            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-4">
                    {messages.map((m, i) => (
                        <div
                            key={i}
                            className={`flex gap-3 ${m.role === "assistant" ? "justify-start" : "justify-end"}`}
                        >
                            {m.role === "assistant" && (
                                <Avatar className="h-8 w-8 mt-1 border border-primary/20">
                                    <AvatarFallback className="bg-primary/10 text-primary"><Bot size={14} /></AvatarFallback>
                                </Avatar>
                            )}
                            <div
                                className={`rounded-2xl px-4 py-2.5 max-w-[85%] text-sm leading-relaxed shadow-sm ${m.role === "assistant"
                                    ? "bg-card border border-border/50 text-foreground rounded-tl-none"
                                    : "bg-primary text-primary-foreground rounded-tr-none"
                                    }`}
                            >
                                {m.content}
                            </div>
                            {m.role === "user" && (
                                <Avatar className="h-8 w-8 mt-1">
                                    <AvatarFallback className="bg-muted"><User size={14} /></AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex gap-3 justify-start">
                            <Avatar className="h-8 w-8 mt-1 border border-primary/20">
                                <AvatarFallback className="bg-primary/10 text-primary"><Bot size={14} /></AvatarFallback>
                            </Avatar>
                            <div className="rounded-2xl px-4 py-2 bg-card border border-border/50 text-muted-foreground text-sm rounded-tl-none flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" />
                                <span className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce delay-150" />
                                <span className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce delay-300" />
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>

            <div className="p-3 border-t border-border/50 bg-background/50">
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
                        placeholder="Спроси о месте, еде или истории..."
                        className="flex-1 bg-background"
                    />
                    <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>
        </Card>
    )
}
