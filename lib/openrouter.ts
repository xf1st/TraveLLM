// OpenRouter API Client
// https://openrouter.ai/api/v1
import { ProxyAgent } from "undici";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const PROXY_URL = process.env.TRAVELLM_HTTP_PROXY || process.env.HTTP_PROXY || process.env.http_proxy || "";
const proxyDispatcher = typeof window === "undefined" && PROXY_URL
    ? new ProxyAgent(PROXY_URL)
    : undefined;

export const OPENROUTER_MODEL = "google/gemini-3.1-flash-lite";

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

    const fetchOptions: any = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "HTTP-Referer": "https://travellm.ru",
            "X-Title": "TraveLLM",
        },
        body: JSON.stringify({
            model: model,
            messages,
            max_tokens: maxTokens,
            temperature,
            ...(reasoning ? { reasoning } : {}),
        }),
    };

    if (proxyDispatcher) fetchOptions.dispatcher = proxyDispatcher;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", fetchOptions);

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
