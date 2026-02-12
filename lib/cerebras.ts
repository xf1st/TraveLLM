// AI Providers via HuggingFace Router
// Primary: GLM-4.7 on Cerebras, Fallback: Llama-3.3-70B on Cerebras

const HF_TOKEN = process.env.HUGGING_FACE_TOKEN || "";

// Models available via Cerebras backend
export const GLM_MODEL = "zai-org/GLM-4.7:cerebras";
export const LLAMA_MODEL = "meta-llama/Llama-3.3-70B-Instruct:cerebras";

interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

interface InferenceOptions {
    maxTokens?: number;
    temperature?: number;
}

function requireToken() {
    if (!HF_TOKEN) {
        throw new Error("HUGGING_FACE_TOKEN is not configured");
    }
}

// GLM-4.7 via Cerebras (Primary - newest, 358B)
export async function glmInference(
    messages: ChatMessage[],
    options: InferenceOptions = {}
): Promise<string> {
    requireToken();
    const { maxTokens = 65536, temperature = 0.6 } = options;

    console.log("GLM-4.7 (via Cerebras): Starting inference...");

    const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${HF_TOKEN}`,
        },
        body: JSON.stringify({
            model: GLM_MODEL,
            messages,
            max_tokens: maxTokens,
            temperature,
            stream: false,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("GLM-4.7 Error:", response.status, errorText);
        throw new Error(`GLM-4.7 Error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    console.log("GLM-4.7: Response received successfully");

    const content = result.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty response from GLM-4.7");

    return content.trim();
}

// Llama-3.3-70B via Cerebras (Secondary fallback)
export async function llamaInference(
    messages: ChatMessage[],
    options: InferenceOptions = {}
): Promise<string> {
    requireToken();
    const { maxTokens = 65536, temperature = 0.6 } = options;

    console.log("Llama-3.3-70B (via Cerebras): Starting inference...");

    const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${HF_TOKEN}`,
        },
        body: JSON.stringify({
            model: LLAMA_MODEL,
            messages,
            max_tokens: maxTokens,
            temperature,
            stream: false,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Llama-3.3-70B Error:", response.status, errorText);
        throw new Error(`Llama-3.3-70B Error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    console.log("Llama-3.3-70B: Response received successfully");

    const content = result.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty response from Llama-3.3-70B");

    return content.trim();
}
