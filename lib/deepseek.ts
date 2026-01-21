// DeepSeek API Client
// https://api.deepseek.com

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "sk-e39ffbfd729047febe166ac950a5a68a";
export const DEEPSEEK_MODEL = "deepseek-chat";

interface DeepSeekMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

interface DeepSeekOptions {
    maxTokens?: number;
    temperature?: number;
}

export async function deepseekInference(
    messages: DeepSeekMessage[],
    options: DeepSeekOptions = {}
): Promise<string> {
    const { maxTokens = 16384, temperature = 0.6 } = options;

    console.log("DeepSeek: Starting inference with model:", DEEPSEEK_MODEL);

    const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
            model: DEEPSEEK_MODEL,
            messages,
            max_tokens: maxTokens,
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
