// OpenRouter API Client
// https://openrouter.ai/api/v1

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
export const OPENROUTER_MODEL = "google/gemini-2.0-flash-001";

interface OpenRouterMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

interface OpenRouterOptions {
    maxTokens?: number;
    temperature?: number;
    model?: string; // Allow overriding model per request
    reasoning?: {
        enabled: boolean;
    };
}

export async function openrouterInference(
    messages: OpenRouterMessage[],
    options: OpenRouterOptions = {}
): Promise<string> {
    if (!OPENROUTER_API_KEY) {
        throw new Error("OPENROUTER_API_KEY is not configured");
    }

    const { maxTokens = 30000, temperature = 0.6, model = OPENROUTER_MODEL, reasoning } = options;

    console.log("OpenRouter: Starting inference with model:", model);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
            model: model,
            messages,
            max_tokens: maxTokens,
            temperature,
            ...(reasoning ? { reasoning } : {}),
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenRouter API Error:", response.status, errorText);
        throw new Error(`OpenRouter Error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    console.log("OpenRouter: Response received successfully");

    const content = result.choices?.[0]?.message?.content;

    if (!content) {
        console.error("OpenRouter: Empty response", JSON.stringify(result));
        throw new Error("Empty response from OpenRouter API");
    }

    return content.trim();
}
