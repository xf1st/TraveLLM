import { Groq } from "groq-sdk";

const apiKey = process.env.GROQ_API_KEY || "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";

export const groq = new Groq({
  apiKey: apiKey,
  dangerouslyAllowBrowser: false,
});

export const GROQ_MODEL = "llama-3.3-70b-versatile";
