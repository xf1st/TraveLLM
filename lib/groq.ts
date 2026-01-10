import { Groq } from "groq-sdk";

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
  throw new Error("GROQ_API_KEY is not defined");
}

export const groq = new Groq({
  apiKey: apiKey,
  dangerouslyAllowBrowser: false,
});

export const GROQ_MODEL = "llama-3.3-70b-versatile";
