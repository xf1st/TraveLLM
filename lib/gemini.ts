// Gemini 3 Flash via OpenRouter with Reasoning
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

export const GEMINI_MODEL = "google/gemini-3-flash-preview"

interface GeminiMessage {
    role: "user" | "assistant" | "system"
    content: string
    reasoning_details?: any
}

interface GeminiOptions {
    maxTokens?: number
    temperature?: number
    enableReasoning?: boolean
}

export async function geminiInference(
    messages: GeminiMessage[],
    options: GeminiOptions = {}
): Promise<string> {
    const { maxTokens = 8000, temperature = 0.7, enableReasoning = true } = options

    if (!OPENROUTER_API_KEY) {
        throw new Error("OPENROUTER_API_KEY is not set")
    }

    // Convert system message to user message (Gemini prefers this)
    const formattedMessages = messages.map(msg => {
        if (msg.role === "system") {
            return { role: "user" as const, content: `[System Instructions]\n${msg.content}` }
        }
        return msg
    })

    const body: any = {
        model: GEMINI_MODEL,
        messages: formattedMessages,
        max_tokens: maxTokens,
        temperature: temperature
    }

    // Enable reasoning for better output quality
    if (enableReasoning) {
        body.reasoning = { enabled: true }
    }

    console.log(`[Gemini 3 Flash] Sending request with ${messages.length} messages...`)
    const startTime = Date.now()

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://travelmind.ai",
            "X-Title": "TravelMind AI"
        },
        body: JSON.stringify(body)
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("[Gemini 3 Flash] Error:", errorData)
        throw new Error(`Gemini API Error: ${response.status} - ${errorData.error?.message || "Unknown error"}`)
    }

    const result = await response.json()
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

    if (!result.choices?.[0]?.message?.content) {
        throw new Error("Empty response from Gemini")
    }

    const content = result.choices[0].message.content
    console.log(`[Gemini 3 Flash] Response received in ${elapsed}s (${content.length} chars)`)

    return content
}
