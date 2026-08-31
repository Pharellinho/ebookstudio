import "server-only";
import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  if (!client) {
    client = new OpenAI({ apiKey: key });
  }
  return client;
}

export function openaiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

/** Fast model for outline + lead-magnet chapters. */
export const GENERATION_MODEL = "gpt-4o-mini";
