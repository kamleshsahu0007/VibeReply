import OpenAI from "openai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ToneProfile } from "@/types";

const createMock = vi.fn();

vi.mock("@/lib/openai/client", () => ({
  getOpenAIClient: () => ({ chat: { completions: { create: createMock } } }),
  OPENAI_MODEL: "gpt-4.1-mini",
}));

// Imported after the mock so the module under test picks up the mocked client.
const { generateReplies, translateText } = await import("./reply.service");
const { InvalidModelOutputError, UpstreamError, UpstreamTimeoutError } = await import("@/lib/errors");

function completion(content: unknown, model = "gpt-4.1-mini") {
  return {
    model,
    choices: [{ message: { content: JSON.stringify(content) } }],
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
  };
}

const TONES: ToneProfile[] = [
  {
    id: "t-mature",
    key: "mature",
    name: "Mature",
    description: "Calm and grounded.",
    formality: 65,
    warmth: 55,
    conciseness: 55,
    directness: 70,
    vocabularyStyle: "neutral",
    emojiPreference: "none",
    sentenceStyle: "balanced",
    customInstructions: null,
    isCustom: false,
    isActive: true,
    sortOrder: 0,
  },
  {
    id: "t-casual",
    key: "casual",
    name: "Casual",
    description: "Chill and low-effort.",
    formality: 10,
    warmth: 50,
    conciseness: 70,
    directness: 40,
    vocabularyStyle: "simple",
    emojiPreference: "none",
    sentenceStyle: "short",
    customInstructions: null,
    isCustom: false,
    isActive: true,
    sortOrder: 1,
  },
];

beforeEach(() => {
  createMock.mockReset();
});

describe("generateReplies", () => {
  it("omits translated fields and detectedLanguage when userLanguage === partnerLanguage", async () => {
    createMock.mockResolvedValueOnce(
      completion({
        mature: { text: "Sounds good." },
        casual: { text: "kk sounds good" },
        detectedPartnerTone: "friendly",
      })
    );

    const result = await generateReplies({
      task: "reply",
      messages: [{ sender: "Them", text: "Are we still on for tomorrow?", type: "incoming" }],
      tones: TONES,
      userLanguage: "en",
      partnerLanguage: "en",
    });

    expect(result.replies.mature.translated).toBeUndefined();
    expect(result.replies.casual.text).toBe("kk sounds good");
    expect(result.meta.detectedLanguage).toBeUndefined();
    expect(result.meta.userLanguage).toBe("en");
    expect(result.meta.partnerLanguage).toBe("en");

    const [params] = createMock.mock.calls[0];
    expect(params.response_format.json_schema.schema.properties.mature.required).toEqual(["text"]);
  });

  it("requires translated text + detectedLanguage when partnerLanguage is auto-detected", async () => {
    createMock.mockResolvedValueOnce(
      completion({
        mature: { text: "Yes, I reviewed it and will share feedback shortly.", translated: "Так, я переглянув документ і незабаром поділюся відгуками." },
        casual: { text: "yep checked it, will send feedback soon", translated: "так, перевірив, скоро надішлю відгук" },
        detectedPartnerTone: "friendly",
        detectedLanguage: { language: "Ukrainian", languageCode: "uk", confidence: 0.97 },
      })
    );

    const result = await generateReplies({
      task: "reply",
      messages: [{ sender: "Sasha", text: "Привіт! Ти вже переглянув документ?", type: "incoming" }],
      tones: TONES,
      userLanguage: "en",
    });

    expect(result.replies.mature.text).toMatch(/reviewed/);
    expect(result.replies.mature.translated).toMatch(/переглянув/);
    expect(result.meta.detectedLanguage).toEqual({ language: "Ukrainian", languageCode: "uk", confidence: 0.97 });

    const [params] = createMock.mock.calls[0];
    expect(params.response_format.json_schema.schema.properties.mature.required).toEqual(["text", "translated"]);
    expect(params.response_format.json_schema.schema.required).toContain("detectedLanguage");
  });

  it("requires translated text when an explicit partnerLanguage differs from userLanguage", async () => {
    createMock.mockResolvedValueOnce(
      completion({
        mature: { text: "Sounds good.", translated: "Звучить добре." },
        casual: { text: "kk", translated: "ок" },
        detectedPartnerTone: "friendly",
      })
    );

    const result = await generateReplies({
      task: "reply",
      messages: [{ sender: "Them", text: "hey", type: "incoming" }],
      tones: TONES,
      userLanguage: "en",
      partnerLanguage: "uk",
    });

    expect(result.replies.mature.translated).toBe("Звучить добре.");
    expect(result.meta.detectedLanguage).toBeUndefined();
    const [params] = createMock.mock.calls[0];
    expect(params.response_format.json_schema.schema.required).not.toContain("detectedLanguage");
  });

  it("uses a lower temperature for rewrite than reply", async () => {
    createMock.mockResolvedValue(
      completion({ mature: { text: "ok" }, casual: { text: "ok" }, detectedPartnerTone: "neutral" })
    );

    await generateReplies({
      task: "rewrite",
      messages: [],
      draft: "I checked the document.",
      tones: TONES,
      userLanguage: "en",
      partnerLanguage: "en",
    });
    const rewriteTemp = createMock.mock.calls[0][0].temperature;

    await generateReplies({
      task: "reply",
      messages: [{ sender: "Them", text: "hi", type: "incoming" }],
      tones: TONES,
      userLanguage: "en",
      partnerLanguage: "en",
    });
    const replyTemp = createMock.mock.calls[1][0].temperature;

    expect(rewriteTemp).toBeLessThan(replyTemp);
  });

  it("throws InvalidModelOutputError when a tone's translated field is missing but required", async () => {
    createMock.mockResolvedValueOnce(
      completion({
        mature: { text: "Sounds good." },
        casual: { text: "kk" },
        detectedPartnerTone: "friendly",
      })
    );

    await expect(
      generateReplies({
        task: "reply",
        messages: [{ sender: "Them", text: "hey", type: "incoming" }],
        tones: TONES,
        userLanguage: "en",
        partnerLanguage: "uk",
      })
    ).rejects.toThrow(InvalidModelOutputError);
  });

  it("throws InvalidModelOutputError on non-JSON model output", async () => {
    createMock.mockResolvedValueOnce({
      model: "gpt-4.1-mini",
      choices: [{ message: { content: "not json" } }],
      usage: {},
    });

    await expect(
      generateReplies({
        task: "reply",
        messages: [{ sender: "Them", text: "hey", type: "incoming" }],
        tones: TONES,
        userLanguage: "en",
        partnerLanguage: "en",
      })
    ).rejects.toThrow(InvalidModelOutputError);
  });

  it("throws InvalidModelOutputError on empty content", async () => {
    createMock.mockResolvedValueOnce({
      model: "gpt-4.1-mini",
      choices: [{ message: { content: "" } }],
      usage: {},
    });

    await expect(
      generateReplies({
        task: "reply",
        messages: [{ sender: "Them", text: "hey", type: "incoming" }],
        tones: TONES,
        userLanguage: "en",
        partnerLanguage: "en",
      })
    ).rejects.toThrow(InvalidModelOutputError);
  });

  it("maps OpenAI.APIConnectionTimeoutError to UpstreamTimeoutError", async () => {
    createMock.mockRejectedValueOnce(new OpenAI.APIConnectionTimeoutError());

    await expect(
      generateReplies({
        task: "reply",
        messages: [{ sender: "Them", text: "hey", type: "incoming" }],
        tones: TONES,
        userLanguage: "en",
        partnerLanguage: "en",
      })
    ).rejects.toThrow(UpstreamTimeoutError);
  });

  it("maps OpenAI.APIError to UpstreamError", async () => {
    createMock.mockRejectedValueOnce(new OpenAI.APIError(500, { message: "boom" }, "boom", {}));

    await expect(
      generateReplies({
        task: "reply",
        messages: [{ sender: "Them", text: "hey", type: "incoming" }],
        tones: TONES,
        userLanguage: "en",
        partnerLanguage: "en",
      })
    ).rejects.toThrow(UpstreamError);
  });

  it("falls back detectedPartnerTone to neutral on an invalid value", async () => {
    createMock.mockResolvedValueOnce(
      completion({
        mature: { text: "ok" },
        casual: { text: "ok" },
        detectedPartnerTone: "not-a-real-tone",
      })
    );

    const result = await generateReplies({
      task: "reply",
      messages: [{ sender: "Them", text: "hey", type: "incoming" }],
      tones: TONES,
      userLanguage: "en",
      partnerLanguage: "en",
    });

    expect(result.meta.detectedPartnerTone).toBe("neutral");
  });
});

describe("translateText", () => {
  it("returns the translated text and meta", async () => {
    createMock.mockResolvedValueOnce(
      completion({ translatedText: "Я перевірю це завтра і повідомлю вам." })
    );

    const result = await translateText({
      text: "I'll check it tomorrow and let you know.",
      sourceLanguage: "en",
      targetLanguage: "uk",
    });

    expect(result.translatedText).toBe("Я перевірю це завтра і повідомлю вам.");
    expect(result.meta.task).toBe("translate");
    expect(result.meta.targetLanguage).toBe("uk");

    const [params] = createMock.mock.calls[0];
    expect(params.temperature).toBe(0.3);
    expect(params.response_format.json_schema.schema.required).toEqual(["translatedText"]);
  });

  it("also detects the source language when sourceLanguage is omitted", async () => {
    createMock.mockResolvedValueOnce(
      completion({
        translatedText: "Hi! How are you?",
        detectedLanguage: { language: "Ukrainian", languageCode: "uk", confidence: 0.92 },
      })
    );

    const result = await translateText({ text: "Привіт! Як твої справи?", targetLanguage: "en" });

    expect(result.translatedText).toBe("Hi! How are you?");
    expect(result.meta.detectedLanguage).toEqual({ language: "Ukrainian", languageCode: "uk", confidence: 0.92 });

    const [params] = createMock.mock.calls[0];
    expect(params.response_format.json_schema.schema.required).toContain("detectedLanguage");
  });

  it("throws InvalidModelOutputError when translatedText is missing", async () => {
    createMock.mockResolvedValueOnce(completion({ oops: "wrong shape" }));

    await expect(
      translateText({ text: "hi", targetLanguage: "uk" })
    ).rejects.toThrow(InvalidModelOutputError);
  });
});
