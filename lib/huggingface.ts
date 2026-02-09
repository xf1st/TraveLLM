export const HUGGINGFACE_MODEL = "meta-llama/Llama-3.1-8B-Instruct:ovhcloud";

export async function hfInference(prompt: string, systemPrompt: string) {
    const token = process.env.HUGGING_FACE_TOKEN || "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";
    if (!process.env.HUGGING_FACE_TOKEN) {
        console.warn("[SECURITY] HUGGING_FACE_TOKEN is not set — using hardcoded fallback. Set env variable in production!");
    }

    console.log("Starting HF Chat Inference with model:", HUGGINGFACE_MODEL);

    if (!token) {
        console.error("HF Token is missing!");
        throw new Error("HUGGING_FACE_TOKEN is not defined");
    }

    try {
        const response = await fetch(
            `https://router.huggingface.co/v1/chat/completions`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                method: "POST",
                body: JSON.stringify({
                    model: HUGGINGFACE_MODEL,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: prompt }
                    ],
                    max_tokens: 16384,
                    temperature: 0.7,
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error("HF Response Error Status:", response.status);
            console.error("HF Response Error Body:", errorText);
            throw new Error(`HF Error (${response.status}): ${errorText}`);
        }

        const result = await response.json();
        console.log("HF Chat Result received successfully");

        const text = result.choices?.[0]?.message?.content;

        if (!text) {
            console.error("HF Result is empty or malformed:", JSON.stringify(result));
            throw new Error("Empty response from HF Chat API");
        }

        return text.trim();
    } catch (error) {
        console.error("HF Inference Chat Exception:", error);
        throw error;
    }
}
