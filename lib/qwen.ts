// Qwen API Client via HuggingFace Router
// https://router.huggingface.co

const HF_TOKEN = process.env.HUGGING_FACE_TOKEN || "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";
if (!process.env.HUGGING_FACE_TOKEN) {
    console.warn("[SECURITY] HUGGING_FACE_TOKEN is not set (qwen.ts) — using hardcoded fallback. Set env variable in production!");
}
export const QWEN_MODEL = "Qwen/Qwen3-32B:novita";

interface QwenMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

interface QwenOptions {
    maxTokens?: number;
    temperature?: number;
}

export async function qwenInference(
    messages: QwenMessage[],
    options: QwenOptions = {}
): Promise<string> {
    const { maxTokens = 16384, temperature = 0.6 } = options;

    console.log("Qwen: Starting inference with model:", QWEN_MODEL);

    const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${HF_TOKEN}`,
        },
        body: JSON.stringify({
            model: QWEN_MODEL,
            messages,
            max_tokens: maxTokens,
            temperature,
            stream: false,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Qwen API Error:", response.status, errorText);
        throw new Error(`Qwen Error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    console.log("Qwen: Response received successfully");

    const content = result.choices?.[0]?.message?.content;

    if (!content) {
        console.error("Qwen: Empty response", JSON.stringify(result));
        throw new Error("Empty response from Qwen API");
    }

    return content.trim();
}
