"use client";

import React from "react";
import Link from "next/link";

export default function Footer() {
  const chromeUrl = process.env.NEXT_PUBLIC_CHROME_STORE_URL || "https://chromewebstore.google.com/";
  const edgeUrl = process.env.NEXT_PUBLIC_EDGE_STORE_URL || "https://microsoftedge.microsoft.com/addons/";

  return (
    <footer className="vr-footer-container">
      <div className="vr-footer-grid">
        {/* Brand & Systems Column */}
        <div className="vr-footer-col vr-footer-brand-col">
          <div className="vr-footer-logo-row">
            <span className="vr-footer-logo">VibeReply</span>
            <span className="vr-footer-status-pill">
              <span className="pulse-dot" />
              SYSTEMS ACTIVE • v2.50
            </span>
          </div>
          <p className="vr-footer-desc">
            The universal contextual AI companion running directly in your messaging editors across 180+ languages. Engineered for privacy, nuance, and zero latency.
          </p>
          <div className="vr-footer-trust-badges">
            <span className="vr-trust-chip">🔒 On-Device PII Redaction</span>
            <span className="vr-trust-chip">⚡ Zero-Message Logging</span>
          </div>
        </div>

        {/* Product Column */}
        <div className="vr-footer-col">
          <h4 className="vr-footer-heading">Product</h4>
          <ul className="vr-footer-links">
            <li>
              <Link href="/#playground" className="vr-footer-link">
                Neural Sandbox
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="vr-footer-link vr-highlight-link">
                Pricing & Plans <span className="vr-link-pill">Free Trial</span>
              </Link>
            </li>
            <li>
              <a
                href={chromeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="vr-footer-link"
              >
                Chrome Extension
              </a>
            </li>
            <li>
              <a
                href={edgeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="vr-footer-link"
              >
                Edge Addon
              </a>
            </li>
            <li>
              <span className="vr-footer-muted-item">180+ Languages</span>
            </li>
          </ul>
        </div>

        {/* Company Column */}
        <div className="vr-footer-col">
          <h4 className="vr-footer-heading">Company</h4>
          <ul className="vr-footer-links">
            <li>
              <Link href="/about" className="vr-footer-link vr-highlight-link">
                About Us
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="vr-footer-link">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/about#architecture" className="vr-footer-link">
                Architecture & Security
              </Link>
            </li>
            <li>
              <a
                href="https://github.com/kamleshsahu0007/VibeReply"
                target="_blank"
                rel="noopener noreferrer"
                className="vr-footer-link"
              >
                GitHub Repository
              </a>
            </li>
          </ul>
        </div>

        {/* Global Billing Column */}
        <div className="vr-footer-col">
          <h4 className="vr-footer-heading">Global Billing</h4>
          <p className="vr-footer-billing-note">
            Worldwide card processing and subscriptions powered by{" "}
            <strong>Lemon Squeezy</strong> (Merchant of Record).
          </p>
          <div className="vr-payment-methods">
            <span className="vr-pay-pill">Visa</span>
            <span className="vr-pay-pill">Mastercard</span>
            <span className="vr-pay-pill">Amex</span>
            <span className="vr-pay-pill">Apple Pay</span>
            <span className="vr-pay-pill">Google Pay</span>
          </div>
          <p className="vr-footer-compliance-text">
            Compliant global tax, VAT, GST & currency handling across 180+ countries with instant device activation.
          </p>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="vr-footer-bottom-bar">
        <div className="vr-footer-copy">
          © {new Date().getFullYear()} VibeReply Inc. All systems nominal.
        </div>
        <div className="vr-footer-bottom-links">
          <Link href="/privacy">Privacy</Link>
          <span className="vr-sep">•</span>
          <Link href="/about">About</Link>
          <span className="vr-sep">•</span>
          <Link href="/pricing">Pricing</Link>
          <span className="vr-sep">•</span>
          <a
            href="https://github.com/kamleshsahu0007/VibeReply"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
