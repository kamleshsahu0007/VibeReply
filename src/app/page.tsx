import Link from "next/link";
import Playground from "@/app/components/Playground";
import Starfield from "@/app/components/Starfield";
import Footer from "@/app/components/Footer";
import VibeReplyLogo from "@/app/components/VibeReplyLogo";

export const dynamic = "force-dynamic";

export default async function Home() {
  const chromeUrl = process.env.NEXT_PUBLIC_CHROME_STORE_URL || "https://chromewebstore.google.com/";
  const edgeUrl = process.env.NEXT_PUBLIC_EDGE_STORE_URL || "https://microsoftedge.microsoft.com/addons/";

  return (
    <div className="container">
      <Starfield />

      {/* Header with Iconic Brandmark & Extension Buttons */}
      <header>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem" }}>
          <VibeReplyLogo size={46} showText={false} />
        </div>
        <div className="badge-featured">
          <span className="pulse-dot" />
          Neural Core v2.50
        </div>
        <h1>VibeReply Assistant</h1>
        <p className="subtitle">
          A universal contextual AI assistant running next to your messaging editors.
          Optimized for WhatsApp Web, LinkedIn, and standard text environments.
        </p>

        {/* Extension Buttons for Chrome and Edge */}
        <div className="extension-cta-group">
          <a
            href={chromeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ext-btn ext-chrome"
            title="Add VibeReply to Google Chrome"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="#4285F4"/>
              <circle cx="12" cy="12" r="4" fill="#FFFFFF"/>
              <path d="M12 2A10 10 0 0 1 20.66 7H12v5h10A10 10 0 0 1 2 12c0-1.84.5-3.56 1.37-5.04L8 15h4v-3l-4.5-7.79A9.95 9.95 0 0 1 12 2z" fill="#EA4335" opacity="0.9"/>
              <path d="M12 22a10 10 0 0 1-8.66-5L8 9v3h-4a10 10 0 0 1 18 0l-4.5 7.79A9.95 9.95 0 0 1 12 22z" fill="#34A853" opacity="0.9"/>
              <path d="M22 12a10 10 0 0 1-5 8.66L12 12h5l3.66-6.34c.87 1.48 1.34 3.2 1.34 5.34z" fill="#FBBC05" opacity="0.9"/>
              <circle cx="12" cy="12" r="4.5" fill="#1A73E8"/>
            </svg>
            <span>Add to Chrome</span>
          </a>

          <a
            href={edgeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ext-btn ext-edge"
            title="Add VibeReply to Microsoft Edge"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M20.9 14.8c-.3 3.6-3.2 6.5-7 6.5-4.1 0-7.4-3.4-7.4-7.6 0-3.9 2.9-7.1 6.8-7.5.5 1.5 1.7 2.6 3.3 2.8 2.2.3 4.1-1.3 4.3-3.4.1-1.3-.5-2.5-1.5-3.3C17.7 1.4 15.6 1 13.5 1 6.6 1 1 6.7 1 13.7 1 20.8 6.7 23 13.8 23c6.1 0 11.2-4.5 11.2-10.2 0-.7-.1-1.4-.2-2h-3.9v4z" fill="#0078D7"/>
              <path d="M16.6 5.6c-.2 2.1-2.1 3.7-4.3 3.4-1.6-.2-2.8-1.3-3.3-2.8 3.9.4 6.8 3.6 6.8 7.5 0 1.2-.3 2.4-.8 3.4 3.8-.5 6.8-3.7 6.8-7.6 0-1.4-.4-2.7-1.1-3.9h-4.1z" fill="#00BCF2"/>
            </svg>
            <span>Add to Edge</span>
          </a>
        </div>
      </header>

      {/* Live Neural Playground */}
      <Playground />

      {/* SEO Feature Pillars: High-Intent Keyword Architecture */}
      <section style={{ margin: "4.5rem 0 2rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div className="vr-card-badge" style={{ marginBottom: "0.75rem" }}>Next-Gen Intelligence</div>
          <h2 style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: "2rem", fontWeight: 700, color: "#ffffff", marginBottom: "0.75rem" }}>
            Why VibeReply is the #1 AI Reply Generator
          </h2>
          <p style={{ color: "var(--fg-muted)", maxWidth: "680px", margin: "0 auto", fontSize: "1rem", lineHeight: 1.6 }}>
            Supercharge your communication with contextual AI responses, automated language translation, and customizable tones inside WhatsApp Web, LinkedIn, and Gmail.
          </p>
        </div>

        <div className="vr-about-grid" style={{ margin: "0 0 2rem" }}>
          <div className="vr-about-card">
            <span className="vr-card-badge">Universal Integration</span>
            <h3 style={{ color: "#ffffff", marginBottom: "0.6rem" }}>WhatsApp Web, LinkedIn & Gmail AI</h3>
            <p style={{ color: "var(--fg-muted)", fontSize: "0.92rem", lineHeight: 1.6 }}>
              VibeReply runs directly alongside your active chat inputs. Click the floating prompt or tap hotkeys to instantly draft contextual replies without switching tabs or copying messages to external apps.
            </p>
          </div>

          <div className="vr-about-card">
            <span className="vr-card-badge">Precision Tones</span>
            <h3 style={{ color: "#ffffff", marginBottom: "0.6rem" }}>Custom Tone Calibration</h3>
            <p style={{ color: "var(--fg-muted)", fontSize: "0.92rem", lineHeight: 1.6 }}>
              Calibrate Formality, Warmth, Conciseness, and Directness to match your exact personal or brand voice. Switch seamlessly between Executive, Friendly, Persuasive, and Concise styles.
            </p>
          </div>

          <div className="vr-about-card">
            <span className="vr-card-badge">Global Polyglot</span>
            <h3 style={{ color: "#ffffff", marginBottom: "0.6rem" }}>180+ Languages Auto-Translation</h3>
            <p style={{ color: "var(--fg-muted)", fontSize: "0.92rem", lineHeight: 1.6 }}>
              Communicate effortlessly with international clients. VibeReply detects incoming messages in Spanish, German, French, Chinese, Japanese, Hindi, and 180+ languages, showing you meaning and drafting native-level replies.
            </p>
          </div>

          <div className="vr-about-card">
            <span className="vr-card-badge">Privacy First</span>
            <h3 style={{ color: "#ffffff", marginBottom: "0.6rem" }}>Client-Side Zero Data Retention</h3>
            <p style={{ color: "var(--fg-muted)", fontSize: "0.92rem", lineHeight: 1.6 }}>
              Your private conversations stay private. VibeReply strips sensitive personal data (phones, emails, credit cards) client-side before generation and never stores your conversation logs on cloud servers.
            </p>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions: Rich Google Search Snippet Alignment */}
      <section className="vr-faq-section" style={{ margin: "2rem 0 3.5rem" }}>
        <h3>Frequently Asked Questions</h3>
        <div className="vr-faq-grid">
          <div className="vr-faq-card">
            <h4>What is VibeReply and how does it work?</h4>
            <p>
              VibeReply is an AI-powered smart reply assistant available as a Google Chrome and Microsoft Edge extension. It analyzes the message you are replying to and generates high-impact, context-aware responses in seconds.
            </p>
          </div>

          <div className="vr-faq-card">
            <h4>Can I use VibeReply on WhatsApp Web and LinkedIn?</h4>
            <p>
              Yes! VibeReply has native deep integrations for WhatsApp Web, LinkedIn Messaging, Gmail, Slack, and Microsoft Teams, as well as a universal floating mode that works in any web input field.
            </p>
          </div>

          <div className="vr-faq-card">
            <h4>How is VibeReply different from Grammarly or ChatGPT?</h4>
            <p>
              While Grammarly fixes spelling and ChatGPT requires copying text back and forth, VibeReply reads conversational context directly inside your chat, applies your custom tones, and translates across 180+ languages in real time.
            </p>
          </div>

          <div className="vr-faq-card">
            <h4>Is VibeReply free to try in the US and worldwide?</h4>
            <p>
              Yes. You can start instantly with a 30-day Free Trial with zero credit card required. Free tier accounts receive complimentary AI replies every day forever.
            </p>
          </div>
        </div>
      </section>

      {/* Sleek Plans & Pricing Preview Banner */}
      <div className="vr-pricing-banner">
        <div className="vr-banner-content">
          <h3>
            <span>Flexible Plans for High-Impact Messaging</span>
            <span className="vr-banner-pill">30-Day Free Trial</span>
          </h3>
          <p>
            Start free with zero credit card required. Upgrade anytime for unlimited replies, custom tones & GPT-5 intelligence.
          </p>
        </div>
        <Link href="/pricing" className="vr-banner-btn">
          <span>View Plans & Pricing</span>
          <span>→</span>
        </Link>
      </div>

      {/* Enterprise Multi-Column Footer */}
      <Footer />
    </div>
  );
}
