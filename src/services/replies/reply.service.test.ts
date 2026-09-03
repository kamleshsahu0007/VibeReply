import OpenAI from "openai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ToneProfile } from "@/types";

const createMock = vi.fn();

vi.mock("@/lib/openai/client", () => ({
  getOpenAIClient: () => ({ chat: { completions: { create: createMock } } }),
  OPENAI_MODEL: "gpt-4.1-mini",
  OPENAI_MODEL_CHAIN: ["gpt-4.1-mini"],
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

// generateReplies now makes one parallel call per tone rather than one
// combined call — queue a mock response per tone, in the same order as the
// `tones` array passed in (Promise.all issues them in that order).
function queueToneResponses(...contents: unknown[]) {
  for (const c of contents) createMock.mockResolvedValueOnce(completion(c));
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
  it("makes one parallel call per tone instead of one combined call", async () => {
    queueToneResponses(
      { mature: { text: "Sounds good." }, detectedPartnerTone: "friendly" },
      { casual: { text: "kk sounds good" }, detectedPartnerTone: "friendly" }
    );

    await generateReplies({
      task: "reply",
      messages: [{ sender: "Them", text: "Are we still on for tomorrow?", type: "incoming" }],
      tones: TONES,
      userLanguage: "en",
      partnerLanguage: "en",
    });

    expect(createMock).toHaveBeenCalledTimes(2);
    // Each call's schema should only require the ONE tone it's asking for.
    expect(createMock.mock.calls[0][0].response_format.json_schema.schema.required).toEqual([
      "mature",
      "detectedPartnerTone",
    ]);
    expect(createMock.mock.calls[1][0].response_format.json_schema.schema.required).toEqual([
      "casual",
      "detectedPartnerTone",
    ]);
  });

  it("omits translated fields and detectedLanguage when userLanguage === partnerLanguage", async () => {
    queueToneResponses(
      { mature: { text: "Sounds good." }, detectedPartnerTone: "friendly" },
      { casual: { text: "kk sounds good" }, detectedPartnerTone: "friendly" }
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
    queueToneResponses(
      {
        mature: { text: "Yes, I reviewed it and will share feedback shortly.", translated: "Так, я переглянув документ і незабаром поділюся відгуками." },
        detectedPartnerTone: "friendly",
        detectedLanguage: { language: "Ukrainian", languageCode: "uk", confidence: 0.97 },
      },
      {
        casual: { text: "yep checked it, will send feedback soon", translated: "так, перевірив, скоро надішлю відгук" },
        detectedPartnerTone: "friendly",
        detectedLanguage: { language: "Ukrainian", languageCode: "uk", confidence: 0.97 },
      }
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
    queueToneResponses(
      { mature: { text: "Sounds good.", translated: "Звучить добре." }, detectedPartnerTone: "friendly" },
      { casual: { text: "kk", translated: "ок" }, detectedPartnerTone: "friendly" }
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
    createMock.mockResolvedValue(completion({ mature: { text: "ok" }, casual: { text: "ok" }, detectedPartnerTone: "neutral" }));

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
    const replyTemp = createMock.mock.calls[2][0].temperature; // calls 0-1 were the rewrite's two tones

    expect(rewriteTemp).toBeLessThan(replyTemp);
  });

  it("throws InvalidModelOutputError when a tone's translated field is missing but required", async () => {
    queueToneResponses(
      { mature: { text: "Sounds good." }, detectedPartnerTone: "friendly" }, // missing .translated
      { casual: { text: "kk", translated: "ок" }, detectedPartnerTone: "friendly" }
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

  it("falls through to the next model in OPENAI_MODEL_CHAIN when the first one fails", async () => {
    vi.resetModules();
    const localCreateMock = vi.fn();
    vi.doMock("@/lib/openai/client", () => ({
      getOpenAIClient: () => ({ chat: { completions: { create: localCreateMock } } }),
      OPENAI_MODEL: "gpt-4.1-mini",
      OPENAI_MODEL_CHAIN: ["gpt-4.1-mini", "gpt-4o-mini"],
    }));

    // Single-tone request: one model failure, one fallback success.
    localCreateMock
      .mockRejectedValueOnce(new OpenAI.APIError(500, { message: "primary model down" }, "down", {}))
      .mockResolvedValueOnce(completion({ mature: { text: "ok" }, detectedPartnerTone: "neutral" }, "gpt-4o-mini"));

    const { generateReplies: generateRepliesIsolated } = await import("./reply.service");

    const result = await generateRepliesIsolated({
      task: "reply",
      messages: [{ sender: "Them", text: "hey", type: "incoming" }],
      tones: [TONES[0]],
      userLanguage: "en",
      partnerLanguage: "en",
    });

    expect(localCreateMock).toHaveBeenCalledTimes(2);
    expect(localCreateMock.mock.calls[0][0].model).toBe("gpt-4.1-mini");
    expect(localCreateMock.mock.calls[1][0].model).toBe("gpt-4o-mini");
    expect(result.meta.model).toBe("gpt-4o-mini");

    vi.doUnmock("@/lib/openai/client");
    vi.resetModules();
  });

  it("falls back detectedPartnerTone to neutral on an invalid value", async () => {
    queueToneResponses(
      { mature: { text: "ok" }, detectedPartnerTone: "not-a-real-tone" },
      { casual: { text: "ok" }, detectedPartnerTone: "not-a-real-tone" }
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
