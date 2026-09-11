"use client";

import React, { useState } from "react";
import Link from "next/link";
import ExtensionModal from "./ExtensionModal";

export default function Navbar() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const chromeUrl = process.env.NEXT_PUBLIC_CHROME_STORE_URL || "https://chromewebstore.google.com/";
  const edgeUrl = process.env.NEXT_PUBLIC_EDGE_STORE_URL || "https://microsoftedge.microsoft.com/addons/";

  return (
    <>
      <nav className="vr-nav">
        <div className="vr-nav-container">
          {/* Logo */}
          <Link href="/" className="vr-logo">
            <div className="vr-logo-icon">
              <svg width="34" height="34" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Chat Bubble */}
                <path
                  d="M18 4C10.268 4 4 9.82 4 17C4 20.35 5.373 23.4 7.68 25.68L6.2 31.2C6.01 31.9 6.7 32.5 7.35 32.2L13.4 29.5C14.86 29.83 16.4 30 18 30C25.732 30 32 24.18 32 17C32 9.82 25.732 4 18 4Z"
                  fill="#0EA5E9"
                />
                {/* Sparkle / Lightning inside */}
                <path
                  d="M19.5 9.5L13 18.5H18L16.5 25.5L24 16.5H19L20.5 9.5H19.5Z"
                  fill="#FBBF24"
                />
              </svg>
            </div>
            <span className="vr-logo-text">
              <span className="vr-logo-vibe">Vibe</span>
              <span className="vr-logo-reply">Reply</span>
            </span>
          </Link>

          {/* Nav Links */}
          <div className={`vr-nav-links ${mobileMenuOpen ? "open" : ""}`}>
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>Subscription</a>
          </div>

          {/* Right Action Buttons */}
          <div className="vr-nav-actions">
            {/* Chrome Store Button */}
            <a
              href={chromeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="vr-store-btn chrome-btn"
              title="Add VibeReply to Google Chrome"
            >
              <svg className="browser-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#4285F4"/>
                <circle cx="12" cy="12" r="4" fill="#FFFFFF"/>
                <path d="M12 2A10 10 0 0 1 20.66 7H12v5h10A10 10 0 0 1 2 12c0-1.84.5-3.56 1.37-5.04L8 15h4v-3l-4.5-7.79A9.95 9.95 0 0 1 12 2z" fill="#EA4335" opacity="0.9"/>
                <path d="M12 22a10 10 0 0 1-8.66-5L8 9v3h-4a10 10 0 0 1 18 0l-4.5 7.79A9.95 9.95 0 0 1 12 22z" fill="#34A853" opacity="0.9"/>
                <path d="M22 12a10 10 0 0 1-5 8.66L12 12h5l3.66-6.34c.87 1.48 1.34 3.2 1.34 5.34z" fill="#FBBC05" opacity="0.9"/>
                <circle cx="12" cy="12" r="4.5" fill="#1A73E8"/>
              </svg>
              <span>Add to Chrome</span>
            </a>

            {/* Edge Store Button */}
            <a
              href={edgeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="vr-store-btn edge-btn"
              title="Add VibeReply to Microsoft Edge"
            >
              <svg className="browser-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M20.9 14.8c-.3 3.6-3.2 6.5-7 6.5-4.1 0-7.4-3.4-7.4-7.6 0-3.9 2.9-7.1 6.8-7.5.5 1.5 1.7 2.6 3.3 2.8 2.2.3 4.1-1.3 4.3-3.4.1-1.3-.5-2.5-1.5-3.3C17.7 1.4 15.6 1 13.5 1 6.6 1 1 6.7 1 13.7 1 20.8 6.7 23 13.8 23c6.1 0 11.2-4.5 11.2-10.2 0-.7-.1-1.4-.2-2h-3.9v4z" fill="#0078D7"/>
                <path d="M16.6 5.6c-.2 2.1-2.1 3.7-4.3 3.4-1.6-.2-2.8-1.3-3.3-2.8 3.9.4 6.8 3.6 6.8 7.5 0 1.2-.3 2.4-.8 3.4 3.8-.5 6.8-3.7 6.8-7.6 0-1.4-.4-2.7-1.1-3.9h-4.1z" fill="#00BCF2"/>
              </svg>
              <span>Add to Edge</span>
            </a>

            {/* Try Free Button */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="vr-try-free-btn"
              id="nav-try-free-btn"
            >
              Try Free
            </button>

            {/* Mobile Hamburger */}
            <button
              className="vr-mobile-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              <span className={`bar ${mobileMenuOpen ? "open" : ""}`} />
              <span className={`bar ${mobileMenuOpen ? "open" : ""}`} />
              <span className={`bar ${mobileMenuOpen ? "open" : ""}`} />
            </button>
          </div>
        </div>
      </nav>

      {/* Extension Install Modal */}
      <ExtensionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
