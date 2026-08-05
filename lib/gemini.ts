// Gemini via OpenRouter (Primary AI Provider)
// https://openrouter.ai
import { ProxyAgent } from "undici";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const httpProxy = process.env.TRAVELLM_HTTP_PROXY || process.env.HTTP_PROXY || process.env.http_proxy

export const GEMINI_FLASH = "google/gemini-3.1-flash-lite";

// Static import is intentional: Next standalone must include undici in the
// production image. A dynamic eval(require()) could fail silently and bypass
// the proxy, exposing the Timeweb egress IP to OpenRouter.
let proxyDispatcher: ProxyAgent | undefined;
let proxyConfigurationError = false;
if (typeof window === "undefined" && httpProxy) {
    try {
        proxyDispatcher = new ProxyAgent(httpProxy);
    } catch {
        proxyConfigurationError = true;
    }
}

export function getGeminiProxyStatus() {
    return {
        configured: Boolean(httpProxy),
        active: Boolean(proxyDispatcher),
        configurationError: proxyConfigurationError,
    };
}

// OpenRouter pricing (Aug 2026) — $0.25 input / $1.50 output per 1M tokens
const PRICING = {
    [GEMINI_FLASH]: {
        input:  0.25 / 1_000_000,
        output: 1.50 / 1_000_000,
    },
} as const;

// ─── Types (compatible with deepseek.ts TokenUsage) ──────────────────────────

export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    promptCacheHitTokens?: number;
    promptCacheMissTokens?: number;
    model: string;
    costUsd: number;
    costRub: number;
    generationTimeMs?: number;
}

export interface GeminiInferenceResult {
    content: string;
    usage: TokenUsage | null;
}

interface GeminiOptions {
    maxTokens?: number;
    temperature?: number;
    tripDays?: number;
    responseFormat?: "json_object" | "text";
    reasoningEffort?: "minimal" | "low" | "medium" | "high";
}

/** OpenRouter multimodal parts (vision). */
export type GeminiContentPart =
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } };

export type GeminiMessageContent = string | GeminiContentPart[];

export interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: GeminiMessageContent;
}

// ─── Session usage accumulator ────────────────────────────────────────────────

let sessionUsage: TokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    promptCacheHitTokens: 0,
    promptCacheMissTokens: 0,
    model: "gemini-mixed",
    costUsd: 0,
    costRub: 0,
};

export function getGeminiSessionUsage(): TokenUsage {
    return { ...sessionUsage };
}

export function resetGeminiSessionUsage(): void {
    sessionUsage = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        promptCacheHitTokens: 0,
        promptCacheMissTokens: 0,
        model: "gemini-mixed",
        costUsd: 0,
        costRub: 0,
    };
}

function applyUsageToSession(usage: TokenUsage): void {
    sessionUsage.promptTokens     += usage.promptTokens;
    sessionUsage.completionTokens += usage.completionTokens;
    sessionUsage.totalTokens      += usage.totalTokens;
    sessionUsage.costUsd          += usage.costUsd;
    sessionUsage.costRub          += usage.costRub;
}

// ─── Core inference ───────────────────────────────────────────────────────────

async function runGeminiInference(
    messages: ChatMessage[],
    options: GeminiOptions = {}
): Promise<GeminiInferenceResult> {
    if (!OPENROUTER_API_KEY) {
        throw new Error("OPENROUTER_API_KEY is not configured");
    }

    const { maxTokens = 16000, temperature = 0.6, tripDays = 5 } = options;

    const model = GEMINI_FLASH;

    console.log(`Gemini (OR): ${model} | ${tripDays}d trip | max ${maxTokens} tokens`);

    const bodyPayload: any = {
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
    };

    if (options.reasoningEffort) {
        bodyPayload.reasoning = {
            effort: options.reasoningEffort,
            exclude: true,
        };
    }

    // json_object mode is not reliably supported with multimodal user messages on some providers
    const hasMultimodal = messages.some(
        (m) => Array.isArray(m.content)
    );
    if (options.responseFormat === "json_object" && !hasMultimodal) {
        bodyPayload.response_format = { type: "json_object" };
    }

    const fetchOptions: any = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "HTTP-Referer": "https://travellm.ai",
            "X-Title": "TraveLLM",
        },
        body: JSON.stringify(bodyPayload),
    };

    if (proxyDispatcher) {
        fetchOptions.dispatcher = proxyDispatcher;
    }

    const response = await fetch(OPENROUTER_URL, fetchOptions);

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini/OpenRouter Error:", response.status, errorText);
        throw new Error(`Gemini/OpenRouter Error (${response.status}): ${errorText}`);
    }

    const result = await response.json();

    // ── Token usage ──
    const raw = result.usage;
    let usage: TokenUsage | null = null;

    if (raw) {
        const promptTokens     = raw.prompt_tokens     || 0;
        const completionTokens = raw.completion_tokens || 0;
        const totalTokens      = raw.total_tokens      || 0;

        const pricing = PRICING[GEMINI_FLASH];
        const costUsd = (promptTokens * pricing.input) + (completionTokens * pricing.output);

        usage = {
            promptTokens,
            completionTokens,
            totalTokens,
            promptCacheHitTokens: 0,
            promptCacheMissTokens: promptTokens,
            model,
            costUsd,
            costRub: costUsd * 90,
            generationTimeMs: result.generation_time_ms || 0
        };

        applyUsageToSession(usage);

        console.log(
            `Gemini (OR): prompt=${promptTokens} completion=${completionTokens} ` +
            `| $${costUsd.toFixed(4)} (~${usage.costRub.toFixed(2)} RUB) ` +
            `| session $${sessionUsage.costUsd.toFixed(4)}`
        );
    }

    // ── Truncation check ──
    const finishReason = result.choices?.[0]?.finish_reason
    if (finishReason === 'length') {
        console.warn('[Gemini] Response truncated by token limit (finish_reason=length) — JSON may be incomplete')
    }

    // ── Content ──
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
        console.error("Gemini (OR): Empty response", JSON.stringify(result));
        throw new Error("Empty response from Gemini via OpenRouter");
    }

    return { content: content.trim(), usage };
}

// ─── Public exports (same interface as deepseek.ts) ──────────────────────────

export async function geminiInference(
    messages: ChatMessage[],
    options: GeminiOptions = {}
): Promise<string> {
    const result = await runGeminiInference(messages, options);
    return result.content;
}

export async function geminiInferenceWithUsage(
    messages: ChatMessage[],
    options: GeminiOptions = {}
): Promise<GeminiInferenceResult> {
    return runGeminiInference(messages, options);
}
