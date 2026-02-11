"use client"

import { useState } from "react"

export function useAIConnector() {
    const [loading, setLoading] = useState(false)
    const [aiPoints, setAiPoints] = useState<any[]>([])
    const [aiArcs, setAiArcs] = useState<any[]>([])

    const askAI = async (query: string, tripContext: any, userLocation?: { lat: number, lng: number }) => {
        setLoading(true)
        try {
            const response = await fetch('/api/trip-assistant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userMessage: query,
                    tripData: tripContext,
                    userLocation: userLocation,
                    timestamp: new Date().toISOString()
                })
            })

            const data = await response.json()
            
            if (data.points) setAiPoints(data.points)
            if (data.arcs) setAiArcs(data.arcs)
            
            setLoading(false)
            return data.reply || "Извините, не могу ответить сейчас."
        } catch (error) {
            console.error("AI Error:", error)
            setLoading(false)
            return "Произошла ошибка при связи с AI гидом."
        }
    }

    return {
        askAI,
        loading,
        aiPoints,
        aiArcs
    }
}
