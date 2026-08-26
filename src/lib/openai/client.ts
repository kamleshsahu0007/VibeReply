import OpenAI from "openai";

let cachedClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured. Set it in your environment before calling the API."
    );
  }

  const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS ?? 20_000);
  const maxRetries = Number(process.env.OPENAI_MAX_RETRIES ?? 2);
  const baseURL = process.env.OPENAI_BASE_URL || undefined;

  cachedClient = new OpenAI({
    apiKey,
    timeout: timeoutMs,
    maxRetries,
    baseURL,
  });

  return cachedClient;
}

export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

