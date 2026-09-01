import OpenAI from "openai";

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNonNegativeInt(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

let cachedClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured. Set it in your environment before calling the API."
    );
  }

  // `??` only falls back on null/undefined, not on an empty string — an env
  // var present-but-blank would silently become `Number("") === 0` (a
  // zero-millisecond timeout aborts every call instantly). Same bug class
  // as the rate limiter; guard the same way.
  const timeoutMs = parsePositiveInt(process.env.OPENAI_TIMEOUT_MS, 20_000);
  const maxRetries = parseNonNegativeInt(process.env.OPENAI_MAX_RETRIES, 2);
  const baseURL = process.env.OPENAI_BASE_URL || undefined;

  cachedClient = new OpenAI({
    apiKey,
    timeout: timeoutMs,
    maxRetries,
    baseURL,
  });

  return cachedClient;
}

// `||` (not `??`) so an empty-but-present env var also falls back, rather
// than sending an empty model name to the API.
export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

// Comma-separated extra models to retry, in order, if the primary model's
// call fails (rate-limited, deprecated, temporarily unavailable, etc.) — all
// still go through the same OPENAI_BASE_URL/OPENAI_API_KEY, since a single
// key only ever authenticates against one provider. Empty by default: no
// fallback chain unless explicitly configured, so behavior doesn't change
// for anyone who hasn't set this.
export const OPENAI_MODEL_FALLBACKS = (process.env.OPENAI_MODEL_FALLBACKS || "")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

// The full try-in-order list: primary model first, then each configured
// fallback, with duplicates removed.
export const OPENAI_MODEL_CHAIN = Array.from(
  new Set([OPENAI_MODEL, ...OPENAI_MODEL_FALLBACKS])
);

