import { fetchWithTimeout } from "./fetch-with-timeout.ts"
import { getAiConnection, type AiConnectionMode } from "./server/ai-connection.ts"
import { isAiProviderEnabled } from "./proxy-config.ts"
// Proxy configuration

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";

// Current API names; legacy export names remain compatible with callers.
export const DEEPSEEK_CHAT = "deepseek-flash";
export const DEEPSEEK_REASONER = "deepseek-v4-pro";

// Peak pricing, October 2026; off-peak is half. Usage costs are estimates.
// https://api-docs.deepseek.com/quick_start/pricing/
const PRICING = {
    [DEEPSEEK_CHAT]: {
        input: 0.30 / 1_000_000,
        inputCached: 0.006 / 1_000_000,
        output: 1.20 / 1_000_000,
    },
    [DEEPSEEK_REASONER]: {
        input: 1.32 / 1_000_000,
        inputCached: 0.044 / 1_000_000,
        output: 3.96 / 1_000_000,
    },
} as const;

interface DeepSeekMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

interface DeepSeekOptions {
    connectionMode?: AiConnectionMode;
    trackSession?: boolean;
    model?: typeof DEEPSEEK_CHAT | typeof DEEPSEEK_REASONER;
    thinking?: boolean;
    signal?: AbortSignal;
    maxTokens?: number;
    temperature?: number;
    tripDays?: number;
    responseFormat?: "json_object" | "text";
}

// Token usage statistics
export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    promptCacheHitTokens?: number;
    promptCacheMissTokens?: number;
    model: string;
    costUsd: number;
    costRub: number; // Approximate at ~80 RUB/USD
    generationTimeMs?: number; // Time taken for API call
}

export interface DeepSeekInferenceResult {
    content: string;
    usage: TokenUsage | null;
}

// Global accumulator for session usage
let sessionUsage: TokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    promptCacheHitTokens: 0,
    promptCacheMissTokens: 0,
    model: "mixed",
    costUsd: 0,
    costRub: 0,
    generationTimeMs: 0,
};

export function getSessionUsage(): TokenUsage {
    return { ...sessionUsage };
}

export function resetSessionUsage(): void {
    sessionUsage = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        promptCacheHitTokens: 0,
        promptCacheMissTokens: 0,
        model: "mixed",
        costUsd: 0,
        costRub: 0,
        generationTimeMs: 0,
    };
}

function buildCallUsage(rawUsage: any, model: string, generationTimeMs = 0): TokenUsage | null {
    if (!rawUsage) return null;

    const pricing = PRICING[model as keyof typeof PRICING];
    const promptTokens = rawUsage.prompt_tokens || 0;
    const completionTokens = rawUsage.completion_tokens || 0;
    const totalTokens = rawUsage.total_tokens || 0;
    const cacheHit = rawUsage.prompt_cache_hit_tokens || 0;
    const cacheMiss = rawUsage.prompt_cache_miss_tokens ?? Math.max(0, promptTokens - cacheHit);

    const inputCost = cacheHit * pricing.inputCached + cacheMiss * pricing.input;
    const outputCost = completionTokens * pricing.output;
    const now = new Date();
    const weekday = now.getUTCDay() >= 1 && now.getUTCDay() <= 5;
    const hour = now.getUTCHours();
    const peak = weekday && ((hour >= 1 && hour < 4) || (hour >= 6 && hour < 10));
    const totalCostUsd = (inputCost + outputCost) * (peak ? 1 : 0.5);

    return {
        promptTokens,
        completionTokens,
        totalTokens,
        promptCacheHitTokens: cacheHit,
        promptCacheMissTokens: cacheMiss,
        model,
        costUsd: totalCostUsd,
        costRub: totalCostUsd * 80,
        generationTimeMs,
    };
}

function applyUsageToSession(callUsage: TokenUsage): void {
    sessionUsage.model = sessionUsage.totalTokens === 0 ? callUsage.model :
        sessionUsage.model === callUsage.model ? callUsage.model : "deepseek-mixed";
    sessionUsage.promptTokens += callUsage.promptTokens || 0;
    sessionUsage.completionTokens += callUsage.completionTokens || 0;
    sessionUsage.totalTokens += callUsage.totalTokens || 0;
    sessionUsage.promptCacheHitTokens = (sessionUsage.promptCacheHitTokens || 0) + (callUsage.promptCacheHitTokens || 0);
    sessionUsage.promptCacheMissTokens = (sessionUsage.promptCacheMissTokens || 0) + (callUsage.promptCacheMissTokens || 0);
    sessionUsage.costUsd += callUsage.costUsd || 0;
    sessionUsage.costRub += callUsage.costRub || 0;
    sessionUsage.generationTimeMs = (sessionUsage.generationTimeMs || 0) + (callUsage.generationTimeMs || 0);
}

async function runDeepseekInference(
    messages: DeepSeekMessage[],
    options: DeepSeekOptions = {}
): Promise<DeepSeekInferenceResult> {
    if (options.connectionMode === undefined && !(await isAiProviderEnabled("deepseek"))) {
        throw Object.assign(new Error("DeepSeek disabled by administrator"), { code: "PROVIDER_DISABLED" });
    }
    if (!DEEPSEEK_API_KEY) {
        throw new Error("DEEPSEEK_API_KEY is not configured");
    }

    const { maxTokens = 8192, temperature = 0.6, tripDays = 5 } = options;

    // Long itineraries need more output, not an automatic slower reasoning mode.
    const model = options.model ?? DEEPSEEK_CHAT;
    const tokenLimit = 393216;
    const cappedMaxTokens = Math.min(maxTokens, tokenLimit);

    console.log(`DeepSeek: Using ${model} for ${tripDays} days trip (max ${cappedMaxTokens} tokens)`);

    const bodyPayload: any = {
        model,
        messages,
        max_tokens: cappedMaxTokens,
        temperature,
        stream: false,
        thinking: { type: options.thinking ? "enabled" : "disabled" },
    };

    if (options.responseFormat === "json_object") {
        bodyPayload.response_format = { type: "json_object" };
    }

    const startTime = Date.now();

    const fetchOptions: RequestInit & { dispatcher?: any } = {
        signal: options.signal,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify(bodyPayload),
    };

    const connection = await getAiConnection(options.connectionMode);
    if (connection.dispatcher) {
        fetchOptions.dispatcher = connection.dispatcher;
    }

    const response = await fetchWithTimeout("https://api.deepseek.com/chat/completions", fetchOptions, 120000);

    if (!response.ok) {
        const errorText = await response.text();
        console.error("DeepSeek API Error:", response.status, errorText);
        throw new Error(`DeepSeek Error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    const generationTimeMs = Date.now() - startTime;
    const callUsage = buildCallUsage(result?.usage, model, generationTimeMs);

    if (callUsage) {
        if (options.trackSession !== false) applyUsageToSession(callUsage);

        console.log(
            `DeepSeek: Tokens used - prompt: ${callUsage.promptTokens}, completion: ${callUsage.completionTokens}, total: ${callUsage.totalTokens}`
        );

        if ((callUsage.promptCacheHitTokens || 0) > 0) {
            const pricing = PRICING[model as keyof typeof PRICING];
            const cacheHit = callUsage.promptCacheHitTokens || 0;
            const saved = cacheHit * (pricing.input - pricing.inputCached);
            console.log(`DeepSeek: Cache hit: ${cacheHit} tokens (saved ${(saved * 100).toFixed(4)}c)`);
        }

        console.log(`DeepSeek: Cost this call: $${callUsage.costUsd.toFixed(4)} (~${callUsage.costRub.toFixed(2)} RUB)`);
        console.log(
            `DeepSeek: Session total: ${sessionUsage.totalTokens} tokens, $${sessionUsage.costUsd.toFixed(4)} (~${sessionUsage.costRub.toFixed(2)} RUB)`
        );
    }

    const content = result?.choices?.[0]?.message?.content;
    if (!content) {
        console.error("DeepSeek: Empty response", JSON.stringify(result));
        throw new Error("Empty response from DeepSeek API");
    }

    return {
        content: String(content).trim(),
        usage: callUsage,
    };
}

export async function deepseekInference(
    messages: DeepSeekMessage[],
    options: DeepSeekOptions = {}
): Promise<string> {
    const result = await runDeepseekInference(messages, options);
    return result.content;
}

export async function deepseekInferenceWithUsage(
    messages: DeepSeekMessage[],
    options: DeepSeekOptions = {}
): Promise<DeepSeekInferenceResult> {
    return runDeepseekInference(messages, options);
}
