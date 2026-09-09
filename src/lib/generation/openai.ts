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

/**
 * Token usage of one call, written to the server log as one line:
 *   [usage] chapter gpt-5.6-sol in=1234 cached=0 out=2345
 * The only way to know what a book really costs is to add these up
 * against OpenAI's price list; nothing is estimated here.
 */
export function logUsage(
  kind: string,
  model: string,
  usage:
    | {
        prompt_tokens?: number;
        completion_tokens?: number;
        prompt_tokens_details?: { cached_tokens?: number } | null;
        input_tokens?: number;
        output_tokens?: number;
        input_tokens_details?: { cached_tokens?: number; image_tokens?: number; text_tokens?: number } | null;
        output_tokens_details?: { image_tokens?: number; text_tokens?: number } | null;
      }
    | null
    | undefined,
): void {
  if (!usage) {
    console.log(`[usage] ${kind} ${model} (no usage reported)`);
    return;
  }
  const input = usage.prompt_tokens ?? usage.input_tokens ?? 0;
  const output = usage.completion_tokens ?? usage.output_tokens ?? 0;
  const cached = usage.prompt_tokens_details?.cached_tokens ?? usage.input_tokens_details?.cached_tokens ?? 0;
  const imageOut = usage.output_tokens_details?.image_tokens;
  console.log(
    `[usage] ${kind} ${model} in=${input} cached=${cached} out=${output}${imageOut != null ? ` image_out=${imageOut}` : ""}`,
  );
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
