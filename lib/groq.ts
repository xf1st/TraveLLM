import { Groq } from "groq-sdk";

const apiKey = process.env.GROQ_API_KEY || "";

export const groq = new Groq({
  apiKey: apiKey,
  dangerouslyAllowBrowser: false,
});

export const GROQ_MODEL = "llama-3.3-70b-versatile";

// Helper function for quick inference
export async function groqInference(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  const response = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages,
    max_tokens: options?.maxTokens || 2000,
    temperature: options?.temperature || 0.7,
  });

  return response.choices[0]?.message?.content || "";
}
