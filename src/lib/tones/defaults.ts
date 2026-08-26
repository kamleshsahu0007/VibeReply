export interface ToneProfileDefaults {
  key: string;
  name: string;
  description: string;
  formality: number;
  warmth: number;
  conciseness: number;
  directness: number;
  vocabularyStyle: "simple" | "neutral" | "advanced";
  emojiPreference: "none" | "minimal" | "frequent";
  sentenceStyle: "short" | "balanced" | "flowing";
  customInstructions: string;
  sortOrder: number;
}

// The 5 tones VibeReply has always shipped with. Kept as-is (not renamed to a
// business-tone set like Professional/Friendly/...) because this product
// generates replies for personal chat (WhatsApp/Instagram DMs), not customer
// support. `customInstructions` preserves the original per-tone guidance
// verbatim so existing generation behavior doesn't regress.
export const DEFAULT_TONE_PROFILES: ToneProfileDefaults[] = [
  {
    key: "funny",
    name: "Funny",
    description: "Playful and witty, light teasing welcome. No forced jokes, no emoji spam.",
    formality: 15,
    warmth: 60,
    conciseness: 60,
    directness: 50,
    vocabularyStyle: "simple",
    emojiPreference: "minimal",
    sentenceStyle: "short",
    customInstructions:
      "playful and witty, light teasing is welcome, no forced jokes, no dad-humor, no emojis spam",
    sortOrder: 0,
  },
  {
    key: "soft",
    name: "Soft",
    description: "Warm, gentle, emotionally tuned-in. Validates the other person without being clingy.",
    formality: 30,
    warmth: 90,
    conciseness: 40,
    directness: 30,
    vocabularyStyle: "simple",
    emojiPreference: "minimal",
    sentenceStyle: "balanced",
    customInstructions:
      "warm, gentle, emotionally tuned-in, validates the other person without being clingy or saccharine",
    sortOrder: 1,
  },
  {
    key: "flirty",
    name: "Flirty",
    description: "Subtle, confident flirt with a smirk. Never thirsty, never creepy, never explicit.",
    formality: 20,
    warmth: 70,
    conciseness: 55,
    directness: 60,
    vocabularyStyle: "simple",
    emojiPreference: "minimal",
    sentenceStyle: "short",
    customInstructions:
      "subtle, confident flirt with a smirk — never thirsty, never creepy, never explicit",
    sortOrder: 2,
  },
  {
    key: "mature",
    name: "Mature",
    description: "Calm, grounded, emotionally intelligent. Handles tension or conflict like an adult.",
    formality: 65,
    warmth: 55,
    conciseness: 55,
    directness: 70,
    vocabularyStyle: "neutral",
    emojiPreference: "none",
    sentenceStyle: "balanced",
    customInstructions:
      "calm, grounded, emotionally intelligent, respectful — handles tension or conflict like an adult",
    sortOrder: 3,
  },
  {
    key: "casual",
    name: "Casual",
    description: "Chill, low-effort vibe like texting a close friend. Can be slightly lazy/short.",
    formality: 10,
    warmth: 50,
    conciseness: 70,
    directness: 40,
    vocabularyStyle: "simple",
    emojiPreference: "none",
    sentenceStyle: "short",
    customInstructions:
      "chill, low-effort vibe like texting a close friend, can be slightly lazy/short, very natural",
    sortOrder: 4,
  },
];
