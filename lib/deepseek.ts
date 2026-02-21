// DeepSeek API Client
// https://api.deepseek.com

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";

// Models with different token limits
export const DEEPSEEK_CHAT = "deepseek-chat";        // 8k output
export const DEEPSEEK_REASONER = "deepseek-reasoner"; // 16k output

// DeepSeek pricing (Jan 2026) - prices per 1M tokens
// deepseek-chat: $0.14 input, $0.28 output (cache hit: $0.014 input)
// deepseek-reasoner: $0.55 input, $2.19 output (cache hit: $0.055 input)
const PRICING = {
    [DEEPSEEK_CHAT]: {
        input: 0.14 / 1_000_000,
        inputCached: 0.014 / 1_000_000,
        output: 0.28 / 1_000_000,
    },
    [DEEPSEEK_REASONER]: {
        input: 0.55 / 1_000_000,
        inputCached: 0.055 / 1_000_000,
        output: 2.19 / 1_000_000,
    },
} as const;

interface DeepSeekMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

interface DeepSeekOptions {
    maxTokens?: number;
    temperature?: number;
    tripDays?: number; // Smart model selection based on trip length
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
    };
}

function buildCallUsage(rawUsage: any, model: string): TokenUsage | null {
    if (!rawUsage) return null;

    const pricing = PRICING[model as keyof typeof PRICING];
    const promptTokens = rawUsage.prompt_tokens || 0;
    const completionTokens = rawUsage.completion_tokens || 0;
    const totalTokens = rawUsage.total_tokens || 0;
    const cacheHit = rawUsage.prompt_cache_hit_tokens || 0;
    const cacheMiss = rawUsage.prompt_cache_miss_tokens || promptTokens || 0;

    const inputCost = cacheHit * pricing.inputCached + cacheMiss * pricing.input;
    const outputCost = completionTokens * pricing.output;
    const totalCostUsd = inputCost + outputCost;

    return {
        promptTokens,
        completionTokens,
        totalTokens,
        promptCacheHitTokens: cacheHit,
        promptCacheMissTokens: cacheMiss,
        model,
        costUsd: totalCostUsd,
        costRub: totalCostUsd * 80,
    };
}

function applyUsageToSession(callUsage: TokenUsage): void {
    sessionUsage.promptTokens += callUsage.promptTokens || 0;
    sessionUsage.completionTokens += callUsage.completionTokens || 0;
    sessionUsage.totalTokens += callUsage.totalTokens || 0;
    sessionUsage.promptCacheHitTokens = (sessionUsage.promptCacheHitTokens || 0) + (callUsage.promptCacheHitTokens || 0);
    sessionUsage.promptCacheMissTokens = (sessionUsage.promptCacheMissTokens || 0) + (callUsage.promptCacheMissTokens || 0);
    sessionUsage.costUsd += callUsage.costUsd || 0;
    sessionUsage.costRub += callUsage.costRub || 0;
}

async function runDeepseekInference(
    messages: DeepSeekMessage[],
    options: DeepSeekOptions = {}
): Promise<DeepSeekInferenceResult> {
    if (!DEEPSEEK_API_KEY) {
        throw new Error("DEEPSEEK_API_KEY is not configured");
    }

    const { maxTokens = 8192, temperature = 0.6, tripDays = 5 } = options;

    // Smart model selection:
    // - Short trips (<=7 days): use deepseek-chat (faster, 8k limit)
    // - Long trips (8+ days): use deepseek-reasoner (16k limit)
    const isLongTrip = tripDays > 7;
    const model = isLongTrip ? DEEPSEEK_REASONER : DEEPSEEK_CHAT;
    const tokenLimit = isLongTrip ? 16384 : 8192;
    const cappedMaxTokens = Math.min(maxTokens, tokenLimit);

    console.log(`DeepSeek: Using ${model} for ${tripDays} days trip (max ${cappedMaxTokens} tokens)`);

    const bodyPayload: any = {
        model,
        messages,
        max_tokens: cappedMaxTokens,
        temperature,
        stream: false,
    };

    if (options.responseFormat === "json_object") {
        bodyPayload.response_format = { type: "json_object" };
    }

    const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify(bodyPayload),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("DeepSeek API Error:", response.status, errorText);
        throw new Error(`DeepSeek Error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    const callUsage = buildCallUsage(result?.usage, model);

    if (callUsage) {
        applyUsageToSession(callUsage);

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
