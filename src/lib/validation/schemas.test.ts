import { describe, expect, it } from "vitest";
import { generateRepliesSchema } from "./schemas";

describe("generateRepliesSchema", () => {
  it("defaults task to reply and userLanguage to en", () => {
    const parsed = generateRepliesSchema.parse({
      messages: [{ sender: "Them", text: "hey", type: "incoming" }],
    });
    expect(parsed.task).toBe("reply");
    expect(parsed.userLanguage).toBe("en");
  });

  it("accepts an explicit partnerLanguage and message language/timestamp", () => {
    const parsed = generateRepliesSchema.parse({
      task: "reply",
      userLanguage: "en",
      partnerLanguage: "uk",
      messages: [
        { sender: "Them", text: "Привіт", type: "incoming", language: "uk", timestamp: 1700000000000 },
      ],
    });
    expect(parsed.partnerLanguage).toBe("uk");
    expect(parsed.messages[0].language).toBe("uk");
  });

  it("rejects task=reply with no messages", () => {
    expect(() => generateRepliesSchema.parse({ task: "reply", messages: [] })).toThrow();
  });

  it("rejects task=rewrite with no draft", () => {
    expect(() => generateRepliesSchema.parse({ task: "rewrite" })).toThrow();
  });

  it("accepts task=rewrite with a draft", () => {
    const parsed = generateRepliesSchema.parse({ task: "rewrite", draft: "hello there" });
    expect(parsed.draft).toBe("hello there");
  });

  it("rejects task=translate with no text", () => {
    expect(() => generateRepliesSchema.parse({ task: "translate", targetLanguage: "uk" })).toThrow();
  });

  it("rejects task=translate with no targetLanguage", () => {
    expect(() => generateRepliesSchema.parse({ task: "translate", text: "hi" })).toThrow();
  });

  it("accepts a valid translate payload", () => {
    const parsed = generateRepliesSchema.parse({
      task: "translate",
      text: "Hi there",
      sourceLanguage: "en",
      targetLanguage: "uk",
    });
    expect(parsed.text).toBe("Hi there");
    expect(parsed.targetLanguage).toBe("uk");
  });

  it("rejects an unknown task", () => {
    expect(() => generateRepliesSchema.parse({ task: "summarize", draft: "x" })).toThrow();
  });
});
