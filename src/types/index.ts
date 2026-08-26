export type MessageType = "incoming" | "outgoing";

export interface ConversationMessage {
  sender: string;
  text: string;
  type: MessageType;
  /** ISO 639-1-ish language code of this message, when known (e.g. from client-side detection). */
  language?: string;
  /** Unix ms timestamp, when the platform exposes one. */
  timestamp?: number;
}

// Reported by the model when the partner's language wasn't supplied by the caller.
export interface LanguageDetection {
  language: string;
  languageCode: string;
  confidence: number;
}

// A tone is identified by a free-form key now (device-customizable), not a
// fixed union. DEFAULT_TONE_KEYS below is only the *default* set.
export type ToneKey = string;

// `text` is always in the user's language. `translated` is the same reply
// translated into the partner's language (same generation, not a second
// independent call) — present only when a partner language is known and
// differs from the user's language.
export interface ReplyVariant {
  text: string;
  translated?: string;
}

export type ReplyBundle = Record<ToneKey, ReplyVariant>;

export interface ToneProfile {
  id: string;
  key: ToneKey;
  name: string;
  description: string;
  formality: number; // 0-100
  warmth: number; // 0-100
  conciseness: number; // 0-100
  directness: number; // 0-100
  vocabularyStyle: "simple" | "neutral" | "advanced";
  emojiPreference: "none" | "minimal" | "frequent";
  sentenceStyle: "short" | "balanced" | "flowing";
  customInstructions: string | null;
  isCustom: boolean;
  isActive: boolean;
  sortOrder: number;
}

// What task the reply engine should perform.
// REPLY: generate a fresh response to the other person's last message.
// REWRITE: restyle the user's own draft without changing its meaning.
// TRANSLATE: translate a piece of text between two languages, preserving tone.
export type TaskType = "reply" | "rewrite" | "translate";

// How the other party in the conversation is communicating. Auto-detected
// from context by default; the user can override it per-conversation.
export const PARTNER_TONES = [
  "formal",
  "friendly",
  "angry",
  "frustrated",
  "urgent",
  "casual",
  "direct",
  "confused",
  "professional",
  "neutral",
] as const;
export type PartnerTone = (typeof PARTNER_TONES)[number];

export interface GenerateRepliesRequest {
  task: TaskType;
  messages: ConversationMessage[];
  /** Required when task === "rewrite": the user's own draft to restyle. */
  draft?: string;
  /** Manual override for the detected partner tone. Omit to let the model infer it. */
  partnerTone?: PartnerTone;
  /** Restrict generation to a subset of the device's active tone keys. Omit for all active tones. */
  toneKeys?: ToneKey[];
  /** Language the user writes/reads in. Defaults to "en". */
  userLanguage?: string;
  /** Language the conversation partner writes in. Omit to let the model detect it. */
  partnerLanguage?: string;
  /** task === "translate" only: the text to translate. */
  text?: string;
  /** task === "translate" only: language to translate into. */
  targetLanguage?: string;
  /** task === "translate" only: source language. Omit to let the model detect it. */
  sourceLanguage?: string;
}

export interface GenerateRepliesResponse {
  success: true;
  replies: ReplyBundle;
  meta: {
    model: string;
    latencyMs: number;
    task: TaskType;
    detectedPartnerTone: PartnerTone;
    usedPartnerTone: PartnerTone;
    userLanguage: string;
    partnerLanguage?: string;
    /** Only present when partnerLanguage wasn't supplied and the model detected it. */
    detectedLanguage?: LanguageDetection;
  };
}

export interface TranslateResponse {
  success: true;
  translatedText: string;
  meta: {
    model: string;
    latencyMs: number;
    task: "translate";
    sourceLanguage?: string;
    targetLanguage: string;
    detectedLanguage?: LanguageDetection;
  };
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export const DEFAULT_TONE_KEYS: readonly ToneKey[] = [
  "funny",
  "soft",
  "flirty",
  "mature",
  "casual",
] as const;
