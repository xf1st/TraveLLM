// DeepSeek API Client
// https://api.deepseek.com

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "sk-e39ffbfd729047febe166ac950a5a68a";

// Models with different token limits
export const DEEPSEEK_CHAT = "deepseek-chat";        // 8k output
export const DEEPSEEK_REASONER = "deepseek-reasoner"; // 16k output

interface DeepSeekMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

interface DeepSeekOptions {
    maxTokens?: number;
    temperature?: number;
    tripDays?: number; // Smart model selection based on trip length
}

export async function deepseekInference(
    messages: DeepSeekMessage[],
    options: DeepSeekOptions = {}
): Promise<string> {
    const { maxTokens = 8192, temperature = 0.6, tripDays = 5 } = options;

    // Smart model selection:
    // - Short trips (≤7 days): use deepseek-chat (faster, 8k limit)
    // - Long trips (8+ days): use deepseek-reasoner (16k limit)
    const isLongTrip = tripDays > 7;
    const model = isLongTrip ? DEEPSEEK_REASONER : DEEPSEEK_CHAT;
    const tokenLimit = isLongTrip ? 16384 : 8192;
    const cappedMaxTokens = Math.min(maxTokens, tokenLimit);

    console.log(`DeepSeek: Using ${model} for ${tripDays} days trip (max ${cappedMaxTokens} tokens)`);

    const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
            model,
            messages,
            max_tokens: cappedMaxTokens,
            temperature,
            stream: false,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("DeepSeek API Error:", response.status, errorText);
        throw new Error(`DeepSeek Error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    console.log("DeepSeek: Response received successfully");

    const content = result.choices?.[0]?.message?.content;

    if (!content) {
        console.error("DeepSeek: Empty response", JSON.stringify(result));
        throw new Error("Empty response from DeepSeek API");
    }

    return content.trim();
}
