import type { Metadata } from "next";
import Link from "next/link";
import Starfield from "@/app/components/Starfield";
import Footer from "@/app/components/Footer";

export const metadata: Metadata = {
  title: "About Us — VibeReply",
  description: "The story, privacy architecture, and contextual neural intelligence behind VibeReply.",
  alternates: {
    canonical: "https://vibe-reply-seven.vercel.app/about",
  },
};

export const dynamic = "force-dynamic";

export default function AboutPage() {
  return (
    <div className="vr-subpage-container">
      <Starfield />

      {/* Top Navigation */}
      <div className="vr-top-nav-bar">
        <Link href="/" className="vr-back-link">
          <span>←</span>
          <span>Back to Neural Assistant</span>
        </Link>
        <span className="vr-trust-chip">⚡ Neural Core v2.50 Active</span>
      </div>

      {/* Page Header */}
      <div className="vr-page-header">
        <div className="badge-featured">
          <span className="pulse-dot" />
          The Contextual Intelligence Engine
        </div>
        <h1>Engineered for Modern Communication</h1>
        <p className="subtitle">
          VibeReply was built to eliminate message writer's block, bridge global linguistic divides, and keep humans in complete control of their digital voice.
        </p>
      </div>

      {/* Core Mission & Story */}
      <section className="vr-story-section">
        <h2>The Vision Behind VibeReply</h2>
        <p>
          Every day, millions of professionals, founders, and creators spend hours typing replies across WhatsApp Web, LinkedIn, X, Slack, and email. The biggest friction isn't typing speed — it's <strong>cognitive fatigue</strong>: finding the right words, calibrating tone, responding across languages, and managing conversational momentum.
        </p>
        <p>
          Generic AI chatbots force you to copy-paste back and forth between tabs and churn out verbose, artificial-sounding text. We asked: <em>What if AI lived directly next to your input field, understood the immediate context, matched your exact emotional wavelength, and let you reply with a single click?</em>
        </p>
        <p>
          That vision became <strong>VibeReply</strong>: a lightweight, privacy-first companion with sub-second response times and support for 180+ languages.
        </p>
      </section>

      {/* 4 Core Architectural Pillars */}
      <section className="vr-about-section" id="architecture">
        <div className="vr-page-header" style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "2rem", color: "#ffffff", fontFamily: "var(--font-space-grotesk)" }}>
            Four Pillars of Architectural Excellence
          </h2>
        </div>

        <div className="vr-about-grid">
          {/* Pillar 1 */}
          <div className="vr-about-card">
            <span className="vr-card-badge">Pillar 01</span>
            <h3>Zero-Friction In-Context Injection</h3>
            <p>
              Just like Grammarly revolutionized spell-checking by sitting right in the text box, VibeReply's floating capsule widget docks beside any input field. It detects incoming message context automatically with zero tab-switching required.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="vr-about-card">
            <span className="vr-card-badge">Pillar 02</span>
            <h3>Privacy by Architecture</h3>
            <p>
              Your conversations belong exclusively to you. VibeReply performs client-side PII redaction (removing phone numbers, emails, and payment cards) before sending requests and enforces a strict zero-server-logging policy for all message content.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="vr-about-card">
            <span className="vr-card-badge">Pillar 03</span>
            <h3>180+ Languages Multilingual Synthesis</h3>
            <p>
              Global communication requires more than word-for-word translation. Our neural pipeline analyzes cultural context, humor, and formality to produce authentic, native-sounding replies in over 180 languages seamlessly.
            </p>
          </div>

          {/* Pillar 4 */}
          <div className="vr-about-card">
            <span className="vr-card-badge">Pillar 04</span>
            <h3>Multi-Model Orchestration & Global MoR</h3>
            <p>
              Built on Next.js 15, Neon Serverless Postgres, and OpenAI GPT-4o with automated fallback chains. Our global billing is powered by Lemon Squeezy (Merchant of Record), enabling frictionless subscription processing across 180+ countries.
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action Card */}
      <div className="vr-pricing-banner" style={{ margin: "4rem auto 0" }}>
        <div className="vr-banner-content">
          <h3>
            <span>Ready to Experience VibeReply?</span>
            <span className="vr-banner-pill">Free Trial Available</span>
          </h3>
          <p>
            Try the live interactive playground or install the browser extension for Chrome & Edge today.
          </p>
        </div>
        <Link href="/pricing" className="vr-banner-btn">
          <span>Explore Plans & Pricing</span>
          <span>→</span>
        </Link>
      </div>

      {/* Enterprise Multi-Column Footer */}
      <Footer />
    </div>
  );
}
