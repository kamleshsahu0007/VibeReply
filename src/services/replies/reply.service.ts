import OpenAI from "openai";
import { getOpenAIClient, OPENAI_MODEL_CHAIN } from "@/lib/openai/client";
import { logger } from "@/lib/logger";
import { InvalidModelOutputError, UpstreamError, UpstreamTimeoutError } from "@/lib/errors";
import {
  PARTNER_TONES,
  type ConversationMessage,
  type GenerateRepliesResponse,
  type LanguageDetection,
  type PartnerTone,
  type ReplyBundle,
  type TaskType,
  type ToneProfile,
  type TranslateResponse,
} from "@/types";
import { buildPrompt, buildTranslatePrompt } from "./prompt.builder";

function buildJsonSchema(tones: ToneProfile[], needsTranslation: boolean, autoDetectLanguage: boolean) {
  const replyProps: Record<string, unknown> = { text: { type: "string", minLength: 1, maxLength: 500 } };
  const replyRequired = ["text"];
  if (needsTranslation) {
    replyProps.translated = { type: "string", minLength: 1, maxLength: 500 };
    replyRequired.push("translated");
  }

  const properties: Record<string, unknown> = {
    detectedPartnerTone: { type: "string", enum: [...PARTNER_TONES] },
  };
  for (const t of tones) {
    properties[t.key] = {
      type: "object",
      additionalProperties: false,
      required: replyRequired,
      properties: replyProps,
    };
  }

  const required = [...tones.map((t) => t.key), "detectedPartnerTone"];
  if (autoDetectLanguage) {
    properties.detectedLanguage = {
      type: "object",
      additionalProperties: false,
      required: ["language", "languageCode", "confidence"],
      properties: {
        language: { type: "string", minLength: 1, maxLength: 60 },
        languageCode: { type: "string", minLength: 1, maxLength: 10 },
        confidence: { type: "number" },
      },
    };
    required.push("detectedLanguage");
  }

  return {
    name: "vibereply_output",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required,
      properties,
    },
  } as const;
}

function buildTranslateJsonSchema(autoDetect: boolean) {
  const properties: Record<string, unknown> = {
    translatedText: { type: "string", minLength: 1, maxLength: 2000 },
  };
  const required = ["translatedText"];
  if (autoDetect) {
    properties.detectedLanguage = {
      type: "object",
      additionalProperties: false,
      required: ["language", "languageCode", "confidence"],
      properties: {
        language: { type: "string", minLength: 1, maxLength: 60 },
        languageCode: { type: "string", minLength: 1, maxLength: 10 },
        confidence: { type: "number" },
      },
    };
    required.push("detectedLanguage");
  }

  return {
    name: "vibereply_translate_output",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required,
      properties,
    },
  } as const;
}

interface ParsedOutput {
  replies: ReplyBundle;
  detectedPartnerTone: PartnerTone;
  detectedLanguage?: LanguageDetection;
}

function parseLanguageDetection(value: unknown): LanguageDetection | undefined {
  if (!value || typeof value !== "object") return undefined;
  const obj = value as Record<string, unknown>;
  if (typeof obj.language !== "string" || typeof obj.languageCode !== "string") return undefined;
  const confidence = typeof obj.confidence === "number" ? obj.confidence : 0;
  return { language: obj.language, languageCode: obj.languageCode, confidence };
}

function parseAndValidate(raw: string, tones: ToneProfile[], needsTranslation: boolean): ParsedOutput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new InvalidModelOutputError("Model returned non-JSON output", {
      raw: raw.slice(0, 500),
      cause: (err as Error).message,
    });
  }

  if (!parsed || typeof parsed !== "object") {
    throw new InvalidModelOutputError("Model output is not an object", { raw: raw.slice(0, 500) });
  }

  const obj = parsed as Record<string, unknown>;
  const replies = {} as ReplyBundle;
  const missing: string[] = [];

  for (const t of tones) {
    const value = obj[t.key];
    const variant = value && typeof value === "object" ? (value as Record<string, unknown>) : null;
    const text = variant && typeof variant.text === "string" ? variant.text.trim() : "";
    if (!text) {
      missing.push(t.key);
      continue;
    }
    const translatedRaw = variant && typeof variant.translated === "string" ? variant.translated.trim() : "";
    if (needsTranslation && !translatedRaw) {
      missing.push(`${t.key}.translated`);
      continue;
    }
    replies[t.key] = translatedRaw ? { text, translated: translatedRaw } : { text };
  }

  if (missing.length > 0) {
    throw new InvalidModelOutputError("Model output missing one or more requested tones", { missing });
  }

  const rawTone = obj.detectedPartnerTone;
  const detectedPartnerTone: PartnerTone = PARTNER_TONES.includes(rawTone as PartnerTone)
    ? (rawTone as PartnerTone)
    : "neutral";

  const detectedLanguage = parseLanguageDetection(obj.detectedLanguage);

  return { replies, detectedPartnerTone, detectedLanguage };
}

export interface GenerateRepliesInput {
  task: Exclude<TaskType, "translate">;
  messages: ConversationMessage[];
  draft?: string;
  partnerTone?: PartnerTone;
  tones: ToneProfile[];
  userLanguage: string;
  partnerLanguage?: string;
}

export interface GenerateRepliesOptions {
  signal?: AbortSignal;
}

// Tries each model in OPENAI_MODEL_CHAIN in order, falling through to the
// next on failure (rate-limited, deprecated, temporarily down, etc.) instead
// of failing the whole request over one model's outage. With no fallbacks
// configured, this is just a single attempt on the primary model — same
// behavior as before.
async function callOpenAI(
  params: Omit<OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming, "model">,
  signal: AbortSignal | undefined,
  startedAt: number
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const client = getOpenAIClient();
  let lastErr: unknown;

  for (let i = 0; i < OPENAI_MODEL_CHAIN.length; i++) {
    const model = OPENAI_MODEL_CHAIN[i];
    const isLastModel = i === OPENAI_MODEL_CHAIN.length - 1;
    try {
      return await client.chat.completions.create({ ...params, model }, { signal });
    } catch (err) {
      lastErr = err;
      const elapsed = Date.now() - startedAt;

      if (signal?.aborted) break; // client disconnected — no point trying more models

      if (!isLastModel) {
        logger.warn("openai.model_failed_trying_next", {
          model,
          nextModel: OPENAI_MODEL_CHAIN[i + 1],
          elapsed,
          message: (err as Error).message,
        });
        continue;
      }

      if (err instanceof OpenAI.APIConnectionTimeoutError) {
        logger.error("openai.timeout", { model, elapsed });
        throw new UpstreamTimeoutError();
      }
      if (err instanceof OpenAI.APIError) {
        logger.error("openai.api_error", {
          model,
          elapsed,
          status: err.status,
          type: err.type,
          message: err.message,
        });
        throw new UpstreamError(`OpenAI API error: ${err.message}`, {
          status: err.status,
          type: err.type,
        });
      }
      logger.error("openai.unknown_error", { model, elapsed, message: (err as Error).message });
      throw new UpstreamError("Unexpected error talking to OpenAI", {
        message: (err as Error).message,
      });
    }
  }

  // Unreachable unless OPENAI_MODEL_CHAIN is empty, which it never is
  // (OPENAI_MODEL always seeds it) — but keep TypeScript and a client
  // abort mid-loop happy rather than falling off the end silently.
  throw lastErr instanceof Error ? lastErr : new UpstreamError("No model available");
}

export async function generateReplies(
  input: GenerateRepliesInput,
  options: GenerateRepliesOptions = {}
): Promise<Omit<GenerateRepliesResponse, "success">> {
  const { system, user, needsTranslation, autoDetectLanguage } = buildPrompt(input);
  const jsonSchema = buildJsonSchema(input.tones, needsTranslation, autoDetectLanguage);

  const startedAt = Date.now();
  const completion = await callOpenAI(
    {
      temperature: input.task === "rewrite" ? 0.6 : 0.9,
      top_p: 0.95,
      max_tokens: Math.max(800, 450 * input.tones.length + 300),
      response_format: {
        type: "json_schema",
        json_schema: jsonSchema,
      },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    },
    options.signal,
    startedAt
  );

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new InvalidModelOutputError("Model returned an empty response");
  }

  const { replies, detectedPartnerTone, detectedLanguage } = parseAndValidate(
    content,
    input.tones,
    needsTranslation
  );
  const latencyMs = Date.now() - startedAt;

  logger.info("openai.completion", {
    model: completion.model,
    elapsed: latencyMs,
    task: input.task,
    promptTokens: completion.usage?.prompt_tokens,
    completionTokens: completion.usage?.completion_tokens,
    totalTokens: completion.usage?.total_tokens,
  });

  return {
    replies,
    meta: {
      model: completion.model || OPENAI_MODEL_CHAIN[0],
      latencyMs,
      task: input.task,
      detectedPartnerTone,
      usedPartnerTone: input.partnerTone ?? detectedPartnerTone,
      userLanguage: input.userLanguage,
      partnerLanguage: input.partnerLanguage,
      detectedLanguage,
    },
  };
}

export interface TranslateInput {
  text: string;
  sourceLanguage?: string;
  targetLanguage: string;
}

export async function translateText(
  input: TranslateInput,
  options: GenerateRepliesOptions = {}
): Promise<Omit<TranslateResponse, "success">> {
  const autoDetect = !input.sourceLanguage;
  const { system, user } = buildTranslatePrompt(input);
  const jsonSchema = buildTranslateJsonSchema(autoDetect);

  const startedAt = Date.now();
  const completion = await callOpenAI(
    {
      temperature: 0.3,
      top_p: 0.95,
      max_tokens: 800,
      response_format: {
        type: "json_schema",
        json_schema: jsonSchema,
      },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    },
    options.signal,
    startedAt
  );

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new InvalidModelOutputError("Model returned an empty response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    throw new InvalidModelOutputError("Model returned non-JSON output", {
      raw: content.slice(0, 500),
      cause: (err as Error).message,
    });
  }

  const parsedObj = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  const translatedText =
    typeof parsedObj.translatedText === "string" ? parsedObj.translatedText.trim() : "";

  if (!translatedText) {
    throw new InvalidModelOutputError("Model output missing translatedText");
  }

  const detectedLanguage = autoDetect ? parseLanguageDetection(parsedObj.detectedLanguage) : undefined;

  const latencyMs = Date.now() - startedAt;
  logger.info("openai.translate_completion", {
    model: completion.model,
    elapsed: latencyMs,
    promptTokens: completion.usage?.prompt_tokens,
    completionTokens: completion.usage?.completion_tokens,
    totalTokens: completion.usage?.total_tokens,
  });

  return {
    translatedText,
    meta: {
      model: completion.model || OPENAI_MODEL_CHAIN[0],
      latencyMs,
      task: "translate",
      sourceLanguage: input.sourceLanguage,
      targetLanguage: input.targetLanguage,
      detectedLanguage,
    },
  };
}
