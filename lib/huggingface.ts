export const HUGGINGFACE_MODEL = "microsoft/WizardLM-2-8x22B:ovhcloud";

export async function hfInference(prompt: string, systemPrompt: string) {
    const token = process.env.HUGGING_FACE_TOKEN;

    console.log("Starting HF Chat Inference with model:", HUGGINGFACE_MODEL);

    if (!token) {
        console.error("HF Token is missing!");
        throw new Error("HUGGING_FACE_TOKEN is not defined");
    }

    // Set timeout for HF request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout for complex requests

    try {
        const response = await fetch(
            `https://router.huggingface.co/v1/chat/completions`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                method: "POST",
                signal: controller.signal,
                body: JSON.stringify({
                    model: HUGGINGFACE_MODEL,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: prompt }
                    ],
                    max_tokens: 8192, // Increased for better route generation
                    temperature: 0.7,
                    stream: false // Disabled for now, can enable later
                }),
            }
        );

        clearTimeout(timeoutId);

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
    } catch (error: any) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
            console.error("HF Request timed out after 90 seconds");
            throw new Error("HF request timeout - server took too long to respond");
        }
        
        console.error("HF Inference Chat Exception:", error);
        throw error;
    }
}
