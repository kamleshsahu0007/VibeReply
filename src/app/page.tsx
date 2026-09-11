import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import PricingSection from "@/app/components/PricingSection";
import FeaturesSection from "@/app/components/FeaturesSection";
import FAQSection from "@/app/components/FAQSection";
import Playground from "@/app/components/Playground";

export const dynamic = "force-dynamic";

export default async function Home() {
  const chromeUrl = process.env.NEXT_PUBLIC_CHROME_STORE_URL || "https://chromewebstore.google.com/";
  const edgeUrl = process.env.NEXT_PUBLIC_EDGE_STORE_URL || "https://microsoftedge.microsoft.com/addons/";

  return (
    <div className="vr-app-root">
      {/* 1. Navbar matching the reference image */}
      <Navbar />

      <main className="vr-main-content">
        {/* 2. Hero Section */}
        <section className="vr-hero-section">
          <div className="vr-hero-badge">
            <span className="pulse-dot" />
            <span>AI Reply Assistant for Chrome & Edge</span>
          </div>

          <h1 className="vr-hero-title">
            Smart, Contextual AI Replies for{" "}
            <span className="gradient-text">X, LinkedIn & Messaging</span>
          </h1>

          <p className="vr-hero-subtitle">
            Never struggle with message writer&apos;s block again. Generate perfect replies, adapt tones,
            and translate across 180+ languages right inside WhatsApp Web, LinkedIn, X, and Gmail.
          </p>

          <div className="vr-hero-actions">
            <a
              href={chromeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="vr-hero-btn chrome-cta"
            >
              <svg className="browser-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#4285F4"/>
                <circle cx="12" cy="12" r="4" fill="#FFFFFF"/>
                <path d="M12 2A10 10 0 0 1 20.66 7H12v5h10A10 10 0 0 1 2 12c0-1.84.5-3.56 1.37-5.04L8 15h4v-3l-4.5-7.79A9.95 9.95 0 0 1 12 2z" fill="#EA4335" opacity="0.9"/>
                <path d="M12 22a10 10 0 0 1-8.66-5L8 9v3h-4a10 10 0 0 1 18 0l-4.5 7.79A9.95 9.95 0 0 1 12 22z" fill="#34A853" opacity="0.9"/>
                <path d="M22 12a10 10 0 0 1-5 8.66L12 12h5l3.66-6.34c.87 1.48 1.34 3.2 1.34 5.34z" fill="#FBBC05" opacity="0.9"/>
                <circle cx="12" cy="12" r="4.5" fill="#1A73E8"/>
              </svg>
              <span>Add to Chrome (Free)</span>
            </a>

            <a
              href={edgeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="vr-hero-btn edge-cta"
            >
              <svg className="browser-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M20.9 14.8c-.3 3.6-3.2 6.5-7 6.5-4.1 0-7.4-3.4-7.4-7.6 0-3.9 2.9-7.1 6.8-7.5.5 1.5 1.7 2.6 3.3 2.8 2.2.3 4.1-1.3 4.3-3.4.1-1.3-.5-2.5-1.5-3.3C17.7 1.4 15.6 1 13.5 1 6.6 1 1 6.7 1 13.7 1 20.8 6.7 23 13.8 23c6.1 0 11.2-4.5 11.2-10.2 0-.7-.1-1.4-.2-2h-3.9v4z" fill="#0078D7"/>
                <path d="M16.6 5.6c-.2 2.1-2.1 3.7-4.3 3.4-1.6-.2-2.8-1.3-3.3-2.8 3.9.4 6.8 3.6 6.8 7.5 0 1.2-.3 2.4-.8 3.4 3.8-.5 6.8-3.7 6.8-7.6 0-1.4-.4-2.7-1.1-3.9h-4.1z" fill="#00BCF2"/>
              </svg>
              <span>Add to Edge (Free)</span>
            </a>

            <a href="#pricing" className="vr-hero-btn outline-cta">
              <span>View Plans & Pricing →</span>
            </a>
          </div>

          <div className="vr-hero-trust">
            <span>✓ 7-Day Free Trial</span>
            <span className="dot">•</span>
            <span>✓ No credit card required</span>
            <span className="dot">•</span>
            <span>✓ Works directly inside web apps</span>
          </div>
        </section>

        {/* 3. Multi-Tier Pricing Section matching image */}
        <PricingSection />

        {/* 4. Core Features Section */}
        <FeaturesSection />

        {/* 5. Live Interactive Web Playground */}
        <section className="vr-playground-section" id="playground">
          <div className="vr-section-header">
            <span className="section-tag">Interactive Preview</span>
            <h2>Try The Neural Reply Engine</h2>
            <p>Experience how VibeReply crafts nuanced replies with customized tone sliders.</p>
          </div>
          <Playground />
        </section>

        {/* 6. FAQ Section */}
        <FAQSection />
      </main>

      {/* 7. Footer */}
      <footer className="vr-footer">
        <div className="vr-footer-content">
          <div className="vr-footer-brand">
            <span className="vr-logo-text">
              <span className="vr-logo-vibe">Vibe</span>
              <span className="vr-logo-reply">Reply</span>
            </span>
            <p>The universal AI companion for modern social and professional messaging.</p>
          </div>
          <div className="vr-footer-links">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
            <Link href="/privacy">Privacy Policy</Link>
          </div>
        </div>
        <div className="vr-footer-bottom">
          <p>© {new Date().getFullYear()} VibeReply. Global billing powered by Lemon Squeezy (Merchant of Record).</p>
        </div>
      </footer>
    </div>
  );
}
