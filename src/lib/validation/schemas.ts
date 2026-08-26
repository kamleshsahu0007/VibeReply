import { z } from "zod";
import { PARTNER_TONES } from "@/types";

// A free-form language tag ("en", "en-US", "Ukrainian" are all accepted — the
// model handles either an ISO code or a plain language name). Kept loose
// deliberately: there is no fixed language list to validate against.
const languageTagSchema = z.string().trim().min(2).max(35);

export const messageSchema = z.object({
  sender: z.string().trim().min(1, "sender is required").max(120),
  text: z.string().trim().min(1, "text is required").max(2000),
  type: z.enum(["incoming", "outgoing"]),
  language: languageTagSchema.optional(),
  timestamp: z.number().int().nonnegative().optional(),
});

export const generateRepliesSchema = z
  .object({
    task: z.enum(["reply", "rewrite", "translate"]).default("reply"),
    messages: z
      .array(messageSchema)
      .max(50, "Conversation too long (max 50 messages)")
      .default([]),
    draft: z.string().trim().min(1).max(2000).optional(),
    partnerTone: z.enum(PARTNER_TONES).optional(),
    toneKeys: z.array(z.string().min(1).max(60)).min(1).max(20).optional(),
    userLanguage: languageTagSchema.default("en"),
    partnerLanguage: languageTagSchema.optional(),
    text: z.string().trim().min(1).max(2000).optional(),
    targetLanguage: languageTagSchema.optional(),
    sourceLanguage: languageTagSchema.optional(),
  })
  .refine((data) => data.task !== "reply" || data.messages.length > 0, {
    message: "At least one message is required for task=reply",
    path: ["messages"],
  })
  .refine((data) => data.task !== "rewrite" || !!data.draft, {
    message: "draft is required for task=rewrite",
    path: ["draft"],
  })
  .refine((data) => data.task !== "translate" || !!data.text, {
    message: "text is required for task=translate",
    path: ["text"],
  })
  .refine((data) => data.task !== "translate" || !!data.targetLanguage, {
    message: "targetLanguage is required for task=translate",
    path: ["targetLanguage"],
  });

export type GenerateRepliesInput = z.infer<typeof generateRepliesSchema>;
export type MessageInput = z.infer<typeof messageSchema>;

export const toneProfileInputSchema = z.object({
  key: z.string().trim().min(1).max(60).optional(),
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().min(1).max(300),
  formality: z.number().int().min(0).max(100).optional(),
  warmth: z.number().int().min(0).max(100).optional(),
  conciseness: z.number().int().min(0).max(100).optional(),
  directness: z.number().int().min(0).max(100).optional(),
  vocabularyStyle: z.enum(["simple", "neutral", "advanced"]).optional(),
  emojiPreference: z.enum(["none", "minimal", "frequent"]).optional(),
  sentenceStyle: z.enum(["short", "balanced", "flowing"]).optional(),
  customInstructions: z.string().trim().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export type ToneProfileInputData = z.infer<typeof toneProfileInputSchema>;
