import type { Metadata } from "next";
import Link from "next/link";
import Starfield from "@/app/components/Starfield";
import PricingSection from "@/app/components/PricingSection";
import Footer from "@/app/components/Footer";

export const metadata: Metadata = {
  title: "Plans & Pricing — VibeReply",
  description: "Transparent pricing for contextual AI replies and multilingual communication. Start your 30-day free trial with zero credit card required.",
  alternates: {
    canonical: "https://vibe-reply-seven.vercel.app/pricing",
  },
};

export const dynamic = "force-dynamic";

export default function PricingPage() {
  return (
    <div className="vr-subpage-container">
      <Starfield />

      {/* Top Navigation */}
      <div className="vr-top-nav-bar">
        <Link href="/" className="vr-back-link">
          <span>←</span>
          <span>Back to Neural Assistant</span>
        </Link>
        <span className="vr-trust-chip">⚡ Global Merchant of Record (Lemon Squeezy)</span>
      </div>

      {/* Page Header */}
      <div className="vr-page-header">
        <div className="badge-featured">
          <span className="pulse-dot" />
          Transparent Global Plans
        </div>
        <h1>Choose Your Neural Plan</h1>
        <p className="subtitle">
          Start free with no credit card required. Upgrade anytime for unlimited replies, custom writing personalities, and next-gen GPT-5 intelligence.
        </p>
      </div>

      {/* 3-Tier Dark Cyber Pricing Cards */}
      <PricingSection showHeader={false} />

      {/* Feature Comparison Matrix */}
      <section className="vr-comparison-section">
        <h3>Feature Comparison Matrix</h3>
        <div className="vr-table-wrapper">
          <table className="vr-comparison-table">
            <thead>
              <tr>
                <th>Capability / Feature</th>
                <th>Free Trial</th>
                <th>Standard ($4.99/mo)</th>
                <th>Premium ($7.99/mo)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Trial Duration</td>
                <td>30 Days (Full Pro Access)</td>
                <td>Immediate Full Access</td>
                <td>Immediate Full Access</td>
              </tr>
              <tr>
                <td>Post-Trial Daily Cap</td>
                <td>5 Free Replies Daily</td>
                <td>Unlimited (No Limits)</td>
                <td>Unlimited (No Limits)</td>
              </tr>
              <tr>
                <td>AI Intelligence Engine</td>
                <td>gpt-4o-mini</td>
                <td>gpt-4o (Contextual)</td>
                <td>gpt-5 (Next-Gen Frontier)</td>
              </tr>
              <tr>
                <td>WhatsApp Web & LinkedIn</td>
                <td>✓ Included</td>
                <td>✓ Included</td>
                <td>✓ Included</td>
              </tr>
              <tr>
                <td>180+ Languages Translation</td>
                <td>✓ Included</td>
                <td>✓ Included</td>
                <td>✓ Included</td>
              </tr>
              <tr>
                <td>Built-in Writing Tones</td>
                <td>5 Core Presets</td>
                <td>All Extended Presets</td>
                <td>All Extended Presets</td>
              </tr>
              <tr>
                <td>Custom Tone Personality Creation</td>
                <td>—</td>
                <td>Standard Custom Tones</td>
                <td>Unlimited Tone Personas</td>
              </tr>
              <tr>
                <td>AI Meme & Viral Post Generator</td>
                <td>—</td>
                <td>—</td>
                <td>Early Access Included</td>
              </tr>
              <tr>
                <td>Support Level</td>
                <td>Community & Docs</td>
                <td>Priority Email Support</td>
                <td>Dedicated 1-on-1 Support</td>
              </tr>
              <tr>
                <td>Payment & Tax Compliance</td>
                <td>No Card Required</td>
                <td>Lemon Squeezy MoR</td>
                <td>Lemon Squeezy MoR</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="vr-faq-section">
        <h3>Frequently Asked Questions</h3>
        <div className="vr-faq-grid">
          <div className="vr-faq-card">
            <h4>How does the 30-Day Free Trial work?</h4>
            <p>
              When you add VibeReply to Chrome or Edge, your 30-day Pro Trial begins instantly with zero credit card required. After 30 days, you retain 5 free AI replies every single day forever on the Free tier.
            </p>
          </div>

          <div className="vr-faq-card">
            <h4>How are global payments processed?</h4>
            <p>
              We partner with Lemon Squeezy as our Merchant of Record. They handle all international credit/debit card processing, Apple Pay, Google Pay, currency conversion, and global VAT/GST compliance seamlessly across 180+ countries.
            </p>
          </div>

          <div className="vr-faq-card">
            <h4>Can I cancel or switch tiers anytime?</h4>
            <p>
              Yes, absolutely. You can upgrade, downgrade, or cancel your subscription at any time with a single click via your Lemon Squeezy customer portal or the extension options page.
            </p>
          </div>

          <div className="vr-faq-card">
            <h4>Does VibeReply store my private messages?</h4>
            <p>
              Never. VibeReply is built on a privacy-first architecture. It performs local PII redaction (phones, emails, card numbers) on your device and does not store conversation histories on any server.
            </p>
          </div>
        </div>
      </section>

      {/* Enterprise Multi-Column Footer */}
      <Footer />
    </div>
  );
}
