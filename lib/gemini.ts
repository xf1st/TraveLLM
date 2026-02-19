// Gemini via OpenRouter (Primary AI Provider)
// https://openrouter.ai
//
// Uses existing OPENROUTER_API_KEY — no separate Gemini key needed.
//
// Model: google/gemini-2.0-flash-001 для всех маршрутов ($0.10 / $0.40 per 1M tokens)

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export const GEMINI_FLASH = "google/gemini-2.0-flash-001";

// Pricing (Feb 2026) — per 1M tokens
const PRICING = {
    [GEMINI_FLASH]: {
        input:  0.10 / 1_000_000,
        output: 0.40 / 1_000_000,
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
}

export interface GeminiInferenceResult {
    content: string;
    usage: TokenUsage | null;
}

interface GeminiOptions {
    maxTokens?: number;
    temperature?: number;
    tripDays?: number;
}

interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
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

    const { maxTokens = 8192, temperature = 0.6, tripDays = 5 } = options;

    const model = GEMINI_FLASH;
    const cappedMaxTokens = Math.min(maxTokens, 8192);

    console.log(`Gemini (OR): ${model} | ${tripDays}d trip | max ${cappedMaxTokens} tokens`);

    const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
            model,
            messages,
            max_tokens: cappedMaxTokens,
            temperature,
        }),
    });

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
        const costUsd = promptTokens * pricing.input + completionTokens * pricing.output;

        usage = {
            promptTokens,
            completionTokens,
            totalTokens,
            promptCacheHitTokens: 0,
            promptCacheMissTokens: promptTokens,
            model,
            costUsd,
            costRub: costUsd * 90,
        };

        applyUsageToSession(usage);

        console.log(
            `Gemini (OR): prompt=${promptTokens} completion=${completionTokens} ` +
            `| $${costUsd.toFixed(4)} (~${usage.costRub.toFixed(2)} RUB) ` +
            `| session $${sessionUsage.costUsd.toFixed(4)}`
        );
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
