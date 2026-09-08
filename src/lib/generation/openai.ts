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

/** Text model for outlines, chapters, rewrites and cover briefs.
 *  gpt-5.6-sol: on the Cameroonian-cookbook test it produced a plan with
 *  zero out-of-scope elements where gpt-4o-mini borrowed four, at about
 *  $0.46 per ten-chapter book. Overridable per environment
 *  (OPENAI_GENERATION_MODEL). */
export const GENERATION_MODEL =
  process.env.OPENAI_GENERATION_MODEL?.trim() || "gpt-5.6-sol";

/**
 * The GPT-5, GPT-6 and o-series models accept only the default sampling
 * temperature and reject any other value with a 400. Spread this into a
 * request instead of writing `temperature` directly, so switching models
 * through the environment never breaks a call.
 */
export function sampling(model: string, temperature: number): { temperature?: number } {
  return /^(gpt-5|gpt-6|o[1-9])/i.test(model) ? {} : { temperature };
}
