"use client";

import { useState, useEffect } from "react";
import type { ToneProfile } from "@/types";

interface ReplyVariant {
  text: string;
  translated?: string;
}

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "uk", name: "Ukrainian" },
  { code: "hi", name: "Hindi" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
];

const TONE_COLORS: Record<string, string> = {
  funny: "#eab308",
  soft: "#3b82f6",
  flirty: "#ec4899",
  mature: "#a855f7",
  casual: "#10b981",
};

function getToneColor(key: string): string {
  if (TONE_COLORS[key]) return TONE_COLORS[key];
  const colors = ["#14b8a6", "#f97316", "#ef4444", "#06b6d4", "#6366f1", "#8b5cf6", "#ec4899"];
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export default function Playground() {
  const [inputText, setInputText] = useState("");
  const [userLanguage, setUserLanguage] = useState("en");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [replies, setReplies] = useState<Record<string, ReplyVariant> | null>(null);
  
  const [detectedLang, setDetectedLang] = useState<{ name: string; code: string } | null>(null);
  const [incomingTranslation, setIncomingTranslation] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [tones, setTones] = useState<ToneProfile[]>([]);
  const [loadingTones, setLoadingTones] = useState(true);

  // Custom tone form state
  const [isAdding, setIsAdding] = useState(false);
  const [newToneName, setNewToneName] = useState("");
  const [newToneDesc, setNewToneDesc] = useState("");
  const [formality, setFormality] = useState(50);
  const [warmth, setWarmth] = useState(50);
  const [conciseness, setConciseness] = useState(50);
  const [directness, setDirectness] = useState(50);
  const [vocabularyStyle, setVocabularyStyle] = useState<"simple" | "neutral" | "advanced">("neutral");
  const [emojiPreference, setEmojiPreference] = useState<"none" | "minimal" | "frequent">("none");
  const [sentenceStyle, setSentenceStyle] = useState<"short" | "balanced" | "flowing">("balanced");
  const [customInstructions, setCustomInstructions] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [addingError, setAddingError] = useState("");
  const [savingTone, setSavingTone] = useState(false);

  useEffect(() => {
    async function fetchTones() {
      try {
        const res = await fetch("/api/tones", {
          headers: {
            "X-Device-Id": "web-sandbox-user",
          },
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setTones(data.tones);
        }
      } catch (err) {
        console.error("Failed to fetch tones:", err);
      } finally {
        setLoadingTones(false);
      }
    }
    fetchTones();
  }, []);

  async function handleToggleActive(toneKey: string, currentActive: boolean) {
    const targetTone = tones.find((t) => t.key === toneKey);
    if (!targetTone) return;

    // Optimistic update
    setTones((prev) =>
      prev.map((t) => (t.key === toneKey ? { ...t, isActive: !currentActive } : t))
    );

    try {
      const res = await fetch("/api/tones", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-Id": "web-sandbox-user",
        },
        body: JSON.stringify({
          key: toneKey,
          name: targetTone.name,
          description: targetTone.description,
          formality: targetTone.formality,
          warmth: targetTone.warmth,
          conciseness: targetTone.conciseness,
          directness: targetTone.directness,
          vocabularyStyle: targetTone.vocabularyStyle,
          emojiPreference: targetTone.emojiPreference,
          sentenceStyle: targetTone.sentenceStyle,
          customInstructions: targetTone.customInstructions,
          isActive: !currentActive,
          sortOrder: targetTone.sortOrder,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to update tone status.");
      }
    } catch (err) {
      console.error("Failed to update tone status:", err);
      // Rollback
      setTones((prev) =>
        prev.map((t) => (t.key === toneKey ? { ...t, isActive: currentActive } : t))
      );
    }
  }

  async function handleDeleteTone(toneKey: string) {
    if (!confirm("Are you sure you want to delete this custom tone?")) {
      return;
    }
    // Optimistic update
    const originalTones = [...tones];
    setTones((prev) => prev.filter((t) => t.key !== toneKey));

    try {
      const res = await fetch(`/api/tones/${encodeURIComponent(toneKey)}`, {
        method: "DELETE",
        headers: {
          "X-Device-Id": "web-sandbox-user",
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to delete tone.");
      }
    } catch (err) {
      console.error("Failed to delete tone:", err);
      // Rollback
      setTones(originalTones);
      alert((err as Error).message);
    }
  }

  async function handleAddTone(e: React.FormEvent) {
    e.preventDefault();
    if (!newToneName.trim() || !newToneDesc.trim()) {
      setAddingError("Please fill out both Name and Description.");
      return;
    }
    setSavingTone(true);
    setAddingError("");
    try {
      const res = await fetch("/api/tones", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-Id": "web-sandbox-user",
        },
        body: JSON.stringify({
          name: newToneName.trim(),
          description: newToneDesc.trim(),
          formality,
          warmth,
          conciseness,
          directness,
          vocabularyStyle,
          emojiPreference,
          sentenceStyle,
          customInstructions: customInstructions.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to create tone.");
      }

      setTones((prev) => {
        const filtered = prev.filter((t) => t.key !== data.tone.key);
        return [...filtered, data.tone].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
      });

      // Reset Form
      setNewToneName("");
      setNewToneDesc("");
      setFormality(50);
      setWarmth(50);
      setConciseness(50);
      setDirectness(50);
      setVocabularyStyle("neutral");
      setEmojiPreference("none");
      setSentenceStyle("balanced");
      setCustomInstructions("");
      setShowAdvanced(false);
      setIsAdding(false);
    } catch (err) {
      setAddingError((err as Error).message);
    } finally {
      setSavingTone(false);
    }
  }

  async function handleGenerate() {
    if (!inputText.trim()) {
      setError("Please paste a message first.");
      return;
    }

    const activeToneKeys = tones.filter((t) => t.isActive).map((t) => t.key);
    if (activeToneKeys.length === 0) {
      setError("Please enable at least one tone profile first.");
      return;
    }

    setLoading(true);
    setError("");
    setReplies(null);
    setDetectedLang(null);
    setIncomingTranslation(null);

    try {
      // 1. Call generate-replies endpoint
      const res = await fetch("/api/generate-replies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-Id": "web-sandbox-user",
        },
        body: JSON.stringify({
          task: "reply",
          messages: [{ sender: "partner", text: inputText.trim(), type: "incoming" }],
          userLanguage: userLanguage,
          toneKeys: activeToneKeys,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to generate suggestions.");
      }

      setReplies(data.replies);

      // Check if language was detected and needs translation
      const detected = data.meta?.detectedLanguage;
      if (detected && detected.languageCode !== userLanguage) {
        setDetectedLang({
          name: detected.language || "Unknown",
          code: detected.languageCode,
        });

        // 2. Fetch translation of the incoming message into the user's native language
        const transRes = await fetch("/api/generate-replies", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Device-Id": "web-sandbox-user",
          },
          body: JSON.stringify({
            task: "translate",
            text: inputText.trim(),
            targetLanguage: userLanguage,
          }),
        });

        const transData = await transRes.json();
        if (transRes.ok && transData.success) {
          setIncomingTranslation(transData.translatedText);
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(text: string, toneKey: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(toneKey);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  return (
    <section className="card" style={{ gridColumn: "span 2", marginTop: "2rem" }}>
      <h2 className="card-title">
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
        AI Response Sandbox
      </h2>

      <div className="playground-layout">
        {/* Left Column: Input and Results */}
        <div className="sandbox-panel">
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Input Textarea */}
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", color: "var(--fg-muted)" }}>
                Paste Incoming Message
              </label>
              <textarea
                style={{
                  width: "100%",
                  height: "120px",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "1rem",
                  color: "#fff",
                  fontSize: "0.95rem",
                  fontFamily: "inherit",
                  resize: "vertical",
                  outline: "none",
                }}
                placeholder="Type or paste the message you received here (e.g. 'Як твої справи?' or 'movie chalein kal?')..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
            </div>

            {/* Controls: Language Selection & Action Button */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "0.95rem", color: "var(--fg-muted)" }}>My Native Language:</span>
                <select
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    color: "#fff",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    padding: "0.5rem 1rem",
                    outline: "none",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                  }}
                  value={userLanguage}
                  onChange={(e) => setUserLanguage(e.target.value)}
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code} style={{ background: "#0b0f19" }}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="btn btn-primary"
                style={{
                  padding: "0.75rem 2rem",
                  fontSize: "0.95rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  minWidth: "180px",
                  justifyContent: "center",
                }}
              >
                {loading ? (
                  <>
                    <span
                      style={{
                        width: "16px",
                        height: "16px",
                        border: "2px solid rgba(255, 255, 255, 0.2)",
                        borderTopColor: "#fff",
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                        display: "inline-block",
                      }}
                    />
                    Generating...
                  </>
                ) : (
                  "Generate Suggestions"
                )}
              </button>
            </div>

            {/* Error message */}
            {error && <div className="badge badge-danger" style={{ width: "100%", justifyContent: "center" }}>{error}</div>}

            {/* Translation of incoming message */}
            {detectedLang && (
              <div
                style={{
                  background: "rgba(6, 182, 212, 0.08)",
                  border: "1px solid rgba(6, 182, 212, 0.2)",
                  borderRadius: "12px",
                  padding: "1.25rem",
                  animation: "fadeIn 0.5s ease",
                }}
              >
                <div style={{ fontWeight: "700", color: "var(--accent-secondary)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                  Detected Language: {detectedLang.name}
                </div>
                <div style={{ color: "#fff", fontSize: "1rem", fontStyle: "italic", lineHeight: "1.5" }}>
                  &ldquo;{incomingTranslation || "Translating incoming message..."}&rdquo;
                </div>
              </div>
            )}

            {/* Results grid */}
            {replies && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "1.5rem",
                  animation: "fadeIn 0.6s ease",
                }}
              >
                {tones.map((tone) => {
                  if (!tone.isActive) return null;
                  const reply = replies[tone.key];
                  if (!reply) return null;

                  const isTranslated = !!reply.translated;
                  const copyText = reply.translated || reply.text;
                  const meaningText = isTranslated ? reply.text : null;
                  const toneColor = getToneColor(tone.key);

                  return (
                    <div
                      key={tone.key}
                      style={{
                        background: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid var(--border)",
                        borderRadius: "12px",
                        padding: "1.25rem",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        gap: "1rem",
                        transition: "border-color 0.2s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = toneColor)}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                    >
                      <div>
                        {/* Header */}
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "0.75rem" }}>
                          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: toneColor }} />
                          <span style={{ fontSize: "0.8rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fg-muted)" }}>
                            {tone.name}
                          </span>
                        </div>

                        {/* Output Text */}
                        <div style={{ fontSize: "1.05rem", color: "#fff", fontWeight: "500", lineHeight: "1.5", marginBottom: "0.5rem" }}>
                          {copyText}
                        </div>

                        {/* Meaning in Native Language */}
                        {meaningText && (
                          <div
                            style={{
                              fontSize: "0.85rem",
                              color: "var(--fg-muted)",
                              borderTop: "1px dashed var(--border)",
                              paddingTop: "0.5rem",
                              marginTop: "0.5rem",
                            }}
                          >
                            <span style={{ fontWeight: "600" }}>Meaning:</span> {meaningText}
                          </div>
                        )}
                      </div>

                      {/* Copy Button */}
                      <button
                        onClick={() => handleCopy(copyText, tone.key)}
                        className="btn btn-secondary"
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          fontSize: "0.85rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          borderColor: copiedKey === tone.key ? "var(--success)" : "var(--border)",
                          color: copiedKey === tone.key ? "var(--success)" : "#fff",
                        }}
                      >
                        {copiedKey === tone.key ? (
                          <>
                            <svg
                              viewBox="0 0 24 24"
                              width="14"
                              height="14"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Copied!
                          </>
                        ) : (
                          <>
                            <svg
                              viewBox="0 0 24 24"
                              width="14"
                              height="14"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                            Copy suggestion
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Tone Profiles Management */}
        <div className="tones-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: "600", color: "#fff" }}>Tone Profiles</h3>
            {!isAdding && (
              <button
                onClick={() => setIsAdding(true)}
                className="btn btn-primary"
                style={{
                  padding: "0.4rem 0.8rem",
                  fontSize: "0.8rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Custom
              </button>
            )}
          </div>

          {loadingTones ? (
            <div style={{ color: "var(--fg-muted)", fontSize: "0.9rem", textAlign: "center", padding: "2rem" }}>
              Loading tone profiles...
            </div>
          ) : (
            <>
              {/* Add Custom Tone Form */}
              {isAdding && (
                <form onSubmit={handleAddTone} className="tone-form-container">
                  <h4 style={{ fontSize: "0.95rem", fontWeight: "700", color: "#fff", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem", marginBottom: "0.5rem" }}>
                    Create Custom Tone
                  </h4>

                  {addingError && (
                    <div className="badge badge-danger" style={{ width: "100%", justifyContent: "center", marginBottom: "0.5rem" }}>
                      {addingError}
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Sarcastic"
                      value={newToneName}
                      onChange={(e) => setNewToneName(e.target.value)}
                      maxLength={60}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-textarea"
                      placeholder="e.g. Biting humor, wit, and subtle irony..."
                      value={newToneDesc}
                      onChange={(e) => setNewToneDesc(e.target.value)}
                      rows={2}
                      maxLength={300}
                      required
                    />
                  </div>

                  {/* Advanced Settings Accordion */}
                  <div>
                    <div className="advanced-header" onClick={() => setShowAdvanced(!showAdvanced)}>
                      <span>{showAdvanced ? "Hide Advanced Settings" : "Show Advanced Settings"}</span>
                      <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ transform: showAdvanced ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>

                    {showAdvanced && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.5rem", borderTop: "1px dashed var(--border)", paddingTop: "0.75rem" }}>
                        <div className="slider-group">
                          <div className="slider-header">
                            <span>Formality</span>
                            <span>{formality}%</span>
                          </div>
                          <input type="range" className="range-slider" min="0" max="100" value={formality} onChange={(e) => setFormality(Number(e.target.value))} />
                        </div>

                        <div className="slider-group">
                          <div className="slider-header">
                            <span>Warmth</span>
                            <span>{warmth}%</span>
                          </div>
                          <input type="range" className="range-slider" min="0" max="100" value={warmth} onChange={(e) => setWarmth(Number(e.target.value))} />
                        </div>

                        <div className="slider-group">
                          <div className="slider-header">
                            <span>Conciseness</span>
                            <span>{conciseness}%</span>
                          </div>
                          <input type="range" className="range-slider" min="0" max="100" value={conciseness} onChange={(e) => setConciseness(Number(e.target.value))} />
                        </div>

                        <div className="slider-group">
                          <div className="slider-header">
                            <span>Directness</span>
                            <span>{directness}%</span>
                          </div>
                          <input type="range" className="range-slider" min="0" max="100" value={directness} onChange={(e) => setDirectness(Number(e.target.value))} />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Vocabulary Style</label>
                          <select className="form-select" value={vocabularyStyle} onChange={(e) => setVocabularyStyle(e.target.value as any)}>
                            <option value="simple" style={{ background: "#0b0f19" }}>Simple</option>
                            <option value="neutral" style={{ background: "#0b0f19" }}>Neutral</option>
                            <option value="advanced" style={{ background: "#0b0f19" }}>Advanced</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Emoji Preference</label>
                          <select className="form-select" value={emojiPreference} onChange={(e) => setEmojiPreference(e.target.value as any)}>
                            <option value="none" style={{ background: "#0b0f19" }}>None</option>
                            <option value="minimal" style={{ background: "#0b0f19" }}>Minimal</option>
                            <option value="frequent" style={{ background: "#0b0f19" }}>Frequent</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Sentence Style</label>
                          <select className="form-select" value={sentenceStyle} onChange={(e) => setSentenceStyle(e.target.value as any)}>
                            <option value="short" style={{ background: "#0b0f19" }}>Short</option>
                            <option value="balanced" style={{ background: "#0b0f19" }}>Balanced</option>
                            <option value="flowing" style={{ background: "#0b0f19" }}>Flowing</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Custom Instructions (Optional)</label>
                          <textarea
                            className="form-textarea"
                            placeholder="e.g. Speak with light self-deprecation..."
                            value={customInstructions}
                            onChange={(e) => setCustomInstructions(e.target.value)}
                            rows={2}
                            maxLength={500}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "10px", marginTop: "0.5rem" }}>
                    <button
                      type="submit"
                      disabled={savingTone}
                      className="btn btn-primary"
                      style={{ flex: 1, padding: "0.5rem", fontSize: "0.85rem" }}
                    >
                      {savingTone ? "Saving..." : "Save Tone"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdding(false);
                        setAddingError("");
                      }}
                      className="btn btn-secondary"
                      style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Tones List */}
              <div className="tone-list">
                {tones.length === 0 ? (
                  <div style={{ color: "var(--fg-muted)", fontSize: "0.85rem", textAlign: "center", padding: "1.5rem" }}>
                    No tones found.
                  </div>
                ) : (
                  tones.map((tone) => {
                    const toneColor = getToneColor(tone.key);
                    return (
                      <div key={tone.key} className="tone-item">
                        <div className="tone-info">
                          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: toneColor, marginTop: "6px" }} />
                          <div className="tone-meta">
                            <div className="tone-name-badge">
                              <span className="tone-name-text">{tone.name}</span>
                              {tone.isCustom ? (
                                <span style={{ fontSize: "0.65rem", padding: "2px 6px", background: "rgba(6, 182, 212, 0.15)", color: "var(--accent-secondary)", borderRadius: "4px", fontWeight: "700", textTransform: "uppercase" }}>
                                  Custom
                                </span>
                              ) : (
                                <span style={{ fontSize: "0.65rem", padding: "2px 6px", background: "rgba(255, 255, 255, 0.08)", color: "var(--fg-muted)", borderRadius: "4px", fontWeight: "700", textTransform: "uppercase" }}>
                                  Default
                                </span>
                              )}
                            </div>
                            <span className="tone-desc-text">{tone.description}</span>
                          </div>
                        </div>

                        <div className="tone-actions">
                          {/* Active Toggle Switch */}
                          <label className="switch" title={tone.isActive ? "Disable Tone" : "Enable Tone"}>
                            <input
                              type="checkbox"
                              checked={tone.isActive}
                              onChange={() => handleToggleActive(tone.key, tone.isActive)}
                            />
                            <span className="slider"></span>
                          </label>

                          {/* Delete button (only for custom tones) */}
                          {tone.isCustom && (
                            <button
                              onClick={() => handleDeleteTone(tone.key)}
                              className="delete-btn"
                              title="Delete custom tone"
                            >
                              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                <line x1="10" y1="11" x2="10" y2="17" />
                                <line x1="14" y1="11" x2="14" y2="17" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        .playground-layout {
          display: grid;
          grid-template-columns: 1.6fr 1.4fr;
          gap: 2.5rem;
          align-items: start;
        }
        @media (max-width: 900px) {
          .playground-layout {
            grid-template-columns: 1fr;
            gap: 2rem;
          }
        }
        .sandbox-panel {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .tones-panel {
          border-left: 1px solid var(--border);
          padding-left: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        @media (max-width: 900px) {
          .tones-panel {
            border-left: none;
            padding-left: 0;
            border-top: 1px solid var(--border);
            padding-top: 2rem;
          }
        }
        .tone-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 450px;
          overflow-y: auto;
          padding-right: 0.5rem;
        }
        .tone-list::-webkit-scrollbar {
          width: 6px;
        }
        .tone-list::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 3px;
        }
        .tone-list::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        .tone-list::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        .tone-item {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 0.75rem 1rem;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          transition: var(--transition);
        }
        .tone-item:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.15);
        }
        .tone-info {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          flex: 1;
        }
        .tone-meta {
          display: flex;
          flex-direction: column;
        }
        .tone-name-badge {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .tone-name-text {
          font-weight: 600;
          color: #fff;
          font-size: 0.95rem;
        }
        .tone-desc-text {
          font-size: 0.8rem;
          color: var(--fg-muted);
          margin-top: 4px;
          line-height: 1.4;
        }
        .tone-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .switch {
          position: relative;
          display: inline-block;
          width: 34px;
          height: 20px;
        }
        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(255, 255, 255, 0.1);
          transition: .3s;
          border-radius: 20px;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 14px;
          width: 14px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .3s;
          border-radius: 50%;
        }
        input:checked + .slider {
          background-color: var(--success);
        }
        input:checked + .slider:before {
          transform: translateX(14px);
        }
        .delete-btn {
          background: transparent;
          border: none;
          color: var(--fg-muted);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: var(--transition);
        }
        .delete-btn:hover {
          color: var(--danger);
          background: rgba(244, 63, 94, 0.1);
        }
        .tone-form-container {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          animation: fadeIn 0.4s ease;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--fg-muted);
        }
        .form-input, .form-select, .form-textarea {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 0.6rem 0.8rem;
          color: #fff;
          font-size: 0.9rem;
          font-family: inherit;
          outline: none;
          transition: var(--transition);
        }
        .form-input:focus, .form-select:focus, .form-textarea:focus {
          border-color: var(--accent);
          background: rgba(255, 255, 255, 0.08);
        }
        .advanced-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          padding: 0.5rem 0;
          color: var(--accent-secondary);
          font-size: 0.85rem;
          font-weight: 700;
          user-select: none;
        }
        .slider-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 0.75rem;
        }
        .slider-header {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          color: var(--fg-muted);
        }
        .range-slider {
          width: 100%;
          accent-color: var(--accent);
          background: rgba(255, 255, 255, 0.1);
          height: 6px;
          border-radius: 3px;
          outline: none;
        }
      `}</style>
    </section>
  );
}
