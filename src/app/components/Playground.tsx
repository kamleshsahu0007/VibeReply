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
    <section className="card" style={{ gridColumn: "span 2", marginTop: "1rem" }}>
      <h2 className="card-title">
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
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
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Input Textarea */}
            <div className="form-group">
              <label className="form-label" style={{ textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.8rem", color: "var(--accent)" }}>
                Incoming Message Buffer
              </label>
              <textarea
                style={{ width: "100%" }}
                className="form-textarea"
                placeholder="Paste incoming message context here..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                rows={4}
              />
            </div>

            {/* Controls: Language Selection & Action Button */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--fg-muted)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.03em" }}>Language Matrix:</span>
                <select
                  className="form-select"
                  value={userLanguage}
                  onChange={(e) => setUserLanguage(e.target.value)}
                  style={{ padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}
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
                  padding: "0.6rem 1.8rem",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  minWidth: "160px",
                  justifyContent: "center",
                }}
              >
                {loading ? (
                  <>
                    <span
                      style={{
                        width: "12px",
                        height: "12px",
                        border: "2px solid rgba(0, 242, 254, 0.2)",
                        borderTopColor: "var(--accent)",
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                        display: "inline-block",
                      }}
                    />
                    Computing...
                  </>
                ) : (
                  "Execute Synthesis"
                )}
              </button>
            </div>

            {/* Error message */}
            {error && <div className="badge badge-danger" style={{ width: "100%", justifyContent: "center" }}>{error}</div>}

            {/* Translation of incoming message */}
            {detectedLang && (
              <div
                style={{
                  background: "rgba(0, 242, 254, 0.04)",
                  border: "1px solid rgba(0, 242, 254, 0.15)",
                  borderRadius: "6px",
                  padding: "1rem",
                  animation: "fadeIn 0.5s ease",
                }}
              >
                <div style={{ fontWeight: "700", color: "var(--accent)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
                  Detected Language: {detectedLang.name}
                </div>
                <div style={{ color: "#fff", fontSize: "0.95rem", fontStyle: "italic", lineHeight: "1.4" }}>
                  &ldquo;{incomingTranslation || "Translating incoming message..."}&rdquo;
                </div>
              </div>
            )}

            {/* Results grid */}
            {replies && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  animation: "fadeIn 0.5s ease",
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
                        background: "rgba(255, 255, 255, 0.01)",
                        border: "1px solid rgba(255, 255, 255, 0.04)",
                        borderLeft: `3px solid ${toneColor}`,
                        borderRadius: "4px",
                        padding: "1rem 1.25rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.75rem",
                        transition: "border-color 0.2s",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                        <div style={{ flex: 1 }}>
                          {/* Header */}
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "0.5rem" }}>
                            <span style={{ fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", color: toneColor }}>
                              {tone.name}
                            </span>
                          </div>

                          {/* Output Text */}
                          <div style={{ fontSize: "1rem", color: "#fff", fontWeight: "500", lineHeight: "1.4" }}>
                            {copyText}
                          </div>

                          {/* Meaning in Native Language */}
                          {meaningText && (
                            <div
                              style={{
                                fontSize: "0.8rem",
                                color: "var(--fg-muted)",
                                borderTop: "1px dashed rgba(255, 255, 255, 0.05)",
                                paddingTop: "0.4rem",
                                marginTop: "0.4rem",
                              }}
                            >
                              <span style={{ fontWeight: "600" }}>Source Translation:</span> {meaningText}
                            </div>
                          )}
                        </div>

                        {/* Copy Button */}
                        <button
                          onClick={() => handleCopy(copyText, tone.key)}
                          className="btn"
                          style={{
                            padding: "0.4rem 0.8rem",
                            fontSize: "0.75rem",
                            borderColor: copiedKey === tone.key ? "var(--success)" : "rgba(255, 255, 255, 0.08)",
                            color: copiedKey === tone.key ? "var(--success)" : "#fff",
                            background: "transparent",
                            minWidth: "70px",
                          }}
                        >
                          {copiedKey === tone.key ? "Copied" : "Copy"}
                        </button>
                      </div>
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
            <h3 style={{ fontSize: "1.1rem", fontWeight: "600", color: "#fff", textTransform: "uppercase", letterSpacing: "0.05em" }}>Tones Index</h3>
            {!isAdding && (
              <button
                onClick={() => setIsAdding(true)}
                className="btn btn-primary"
                style={{
                  padding: "0.3rem 0.75rem",
                  fontSize: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Insert custom
              </button>
            )}
          </div>

          {loadingTones ? (
            <div style={{ color: "var(--fg-muted)", fontSize: "0.85rem", textAlign: "center", padding: "2rem" }}>
              Loading registers...
            </div>
          ) : (
            <>
              {/* Add Custom Tone Form */}
              {isAdding && (
                <form onSubmit={handleAddTone} className="tone-form-container">
                  <h4 style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--accent)", borderBottom: "1px solid rgba(0, 242, 254, 0.15)", paddingBottom: "0.4rem", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Configure registry
                  </h4>

                  {addingError && (
                    <div className="badge badge-danger" style={{ width: "100%", justifyContent: "center", marginBottom: "0.5rem" }}>
                      {addingError}
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Key Name</label>
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
                    <label className="form-label">Registry Description</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Specify how this tone should modify output streams..."
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
                      <span>{showAdvanced ? "Collapse Settings" : "Expand Tuning Metrics"}</span>
                      <svg
                        viewBox="0 0 24 24"
                        width="14"
                        height="14"
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
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.5rem", borderTop: "1px dashed rgba(255, 255, 255, 0.05)", paddingTop: "0.75rem" }}>
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
                          <label className="form-label">Custom Rules</label>
                          <textarea
                            className="form-textarea"
                            placeholder="Add specific instructions for reply generation..."
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
                      style={{ flex: 1, padding: "0.4rem", fontSize: "0.8rem" }}
                    >
                      {savingTone ? "Writing..." : "Write Registry"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdding(false);
                        setAddingError("");
                      }}
                      className="btn btn-secondary"
                      style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Tones List */}
              <div className="tone-list">
                {tones.length === 0 ? (
                  <div style={{ color: "var(--fg-muted)", fontSize: "0.8rem", textAlign: "center", padding: "1.5rem" }}>
                    No registries configured.
                  </div>
                ) : (
                  tones.map((tone) => {
                    const toneColor = getToneColor(tone.key);
                    return (
                      <div key={tone.key} className="tone-item" style={{ padding: "0.6rem 0.85rem", gap: "8px" }}>
                        <div className="tone-info">
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: toneColor, marginTop: "6px" }} />
                          <div className="tone-meta">
                            <div className="tone-name-badge">
                              <span className="tone-name-text" style={{ fontSize: "0.85rem" }}>{tone.name}</span>
                              {tone.isCustom ? (
                                <span style={{ fontSize: "0.6rem", padding: "1px 4px", background: "rgba(0, 242, 254, 0.1)", color: "var(--accent)", borderRadius: "2px", fontWeight: "700" }}>
                                  Custom
                                </span>
                              ) : (
                                <span style={{ fontSize: "0.6rem", padding: "1px 4px", background: "rgba(255, 255, 255, 0.05)", color: "var(--fg-muted)", borderRadius: "2px", fontWeight: "700" }}>
                                  Default
                                </span>
                              )}
                            </div>
                            <span className="tone-desc-text" style={{ fontSize: "0.75rem", marginTop: "2px" }}>{tone.description}</span>
                          </div>
                        </div>

                        <div className="tone-actions">
                          {/* Active Toggle Switch */}
                          <label className="switch" title={tone.isActive ? "Deactivate registry" : "Activate registry"}>
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
                              title="Purge custom registry"
                            >
                              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          gap: 2rem;
          align-items: start;
        }
        @media (max-width: 900px) {
          .playground-layout {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
        }
        .sandbox-panel {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .tones-panel {
          border-left: 1px solid rgba(255, 255, 255, 0.04);
          padding-left: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        @media (max-width: 900px) {
          .tones-panel {
            border-left: none;
            padding-left: 0;
            border-top: 1px solid rgba(255, 255, 255, 0.04);
            padding-top: 1.5rem;
          }
        }
        .tone-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 400px;
          overflow-y: auto;
          padding-right: 0.25rem;
        }
        .tone-list::-webkit-scrollbar {
          width: 4px;
        }
        .tone-list::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.01);
        }
        .tone-list::-webkit-scrollbar-thumb {
          background: rgba(0, 242, 254, 0.1);
          border-radius: 2px;
        }
        .tone-list::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 242, 254, 0.25);
        }
        .tone-item {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: var(--radius-sm);
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          transition: var(--transition);
        }
        .tone-item:hover {
          background: rgba(0, 242, 254, 0.01);
          border-color: rgba(0, 242, 254, 0.15);
        }
        .tone-info {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          flex: 1;
        }
        .tone-meta {
          display: flex;
          flex-direction: column;
        }
        .tone-name-badge {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .tone-name-text {
          font-weight: 600;
          color: #fff;
        }
        .tone-desc-text {
          color: var(--fg-muted);
          line-height: 1.35;
        }
        .tone-actions {
          display: flex;
          align-items: center;
          gap: 8px;
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
          border-radius: 3px;
          transition: var(--transition);
        }
        .delete-btn:hover {
          color: var(--danger);
          background: rgba(244, 63, 94, 0.08);
        }
        .tone-form-container {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid rgba(0, 242, 254, 0.15);
          border-radius: var(--radius-sm);
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          animation: fadeIn 0.3s ease;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .form-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--fg-muted);
        }
        .advanced-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          padding: 0.4rem 0;
          color: var(--accent);
          font-size: 0.8rem;
          font-weight: 700;
          user-select: none;
          font-family: 'Space Grotesk', sans-serif;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .slider-group {
          display: flex;
          flex-direction: column;
          gap: 2px;
          margin-bottom: 0.5rem;
        }
        .slider-header {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: var(--fg-muted);
        }
      `}</style>
    </section>
  );
}
