import { Groq } from "groq-sdk";

const apiKey = process.env.GROQ_API_KEY || "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";

export const groq = new Groq({
  apiKey: apiKey,
  dangerouslyAllowBrowser: false,
});

export const GROQ_MODEL = "llama-3.3-70b-versatile";
