"use client";

import React from "react";

const FEATURES = [
  {
    icon: "⚡",
    title: "1-Click Contextual Replies",
    desc: "VibeReply reads the conversation context and proposes 3 tailored tone responses in under 500ms."
  },
  {
    icon: "🌐",
    title: "180+ Languages Auto-Translate",
    desc: "Chat effortlessly with global clients or friends. Auto-detects input language and writes native-fluent replies."
  },
  {
    icon: "🎯",
    title: "Multi-Platform Compatibility",
    desc: "Verified on WhatsApp Web, LinkedIn Messaging, X (Twitter), Facebook, Gmail, Slack, and Teams."
  },
  {
    icon: "🎭",
    title: "Tone Customization",
    desc: "Adjust formality, warmth, conciseness, and directness sliders to match your personal brand voice perfectly."
  },
  {
    icon: "🔒",
    title: "Privacy First & Anonymous",
    desc: "Zero tracking, no invasive logins required. Your messages are processed securely in real-time."
  },
  {
    icon: "🚀",
    title: "Lightweight Extension",
    desc: "Blazing fast Manifest V3 browser extension with minimal memory footprint and zero browser lag."
  }
];

export default function FeaturesSection() {
  return (
    <section className="vr-features-section" id="features">
      <div className="vr-section-header">
        <span className="section-tag">Core Capabilities</span>
        <h2>Supercharge Your Social & Work Messaging</h2>
        <p>Craft thoughtful, witty, and professional replies without writing fatigue.</p>
      </div>

      <div className="vr-features-grid">
        {FEATURES.map((item, idx) => (
          <div key={idx} className="vr-feature-card">
            <div className="feature-icon">{item.icon}</div>
            <h3>{item.title}</h3>
            <p>{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
