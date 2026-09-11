"use client";

import React from "react";

interface ExtensionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExtensionModal({ isOpen, onClose }: ExtensionModalProps) {
  if (!isOpen) return null;

  const chromeUrl = process.env.NEXT_PUBLIC_CHROME_STORE_URL || "https://chromewebstore.google.com/";
  const edgeUrl = process.env.NEXT_PUBLIC_EDGE_STORE_URL || "https://microsoftedge.microsoft.com/addons/";

  return (
    <div className="vr-modal-overlay" onClick={onClose}>
      <div className="vr-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="vr-modal-close" onClick={onClose} aria-label="Close dialog">
          ✕
        </button>

        <div className="vr-modal-header">
          <div className="vr-modal-badge">Instant Browser Setup</div>
          <h2>Get VibeReply for your Browser</h2>
          <p>
            Start your <strong>7-Day Free Trial</strong> today. Choose your browser to add the extension
            and start generating smart AI replies inside WhatsApp, LinkedIn, X, and Gmail.
          </p>
        </div>

        <div className="vr-modal-options">
          {/* Chrome Option */}
          <a
            href={chromeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="vr-browser-card chrome-card"
          >
            <div className="browser-card-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#4285F4"/>
                <circle cx="12" cy="12" r="4" fill="#FFFFFF"/>
                <path d="M12 2A10 10 0 0 1 20.66 7H12v5h10A10 10 0 0 1 2 12c0-1.84.5-3.56 1.37-5.04L8 15h4v-3l-4.5-7.79A9.95 9.95 0 0 1 12 2z" fill="#EA4335" opacity="0.9"/>
                <path d="M12 22a10 10 0 0 1-8.66-5L8 9v3h-4a10 10 0 0 1 18 0l-4.5 7.79A9.95 9.95 0 0 1 12 22z" fill="#34A853" opacity="0.9"/>
                <path d="M22 12a10 10 0 0 1-5 8.66L12 12h5l3.66-6.34c.87 1.48 1.34 3.2 1.34 5.34z" fill="#FBBC05" opacity="0.9"/>
                <circle cx="12" cy="12" r="4.5" fill="#1A73E8"/>
              </svg>
            </div>
            <div className="browser-card-info">
              <h3>Google Chrome</h3>
              <span>Chrome Web Store • 1-Click Install</span>
            </div>
            <div className="browser-card-action">
              <span>Add to Chrome →</span>
            </div>
          </a>

          {/* Edge Option */}
          <a
            href={edgeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="vr-browser-card edge-card"
          >
            <div className="browser-card-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path d="M20.9 14.8c-.3 3.6-3.2 6.5-7 6.5-4.1 0-7.4-3.4-7.4-7.6 0-3.9 2.9-7.1 6.8-7.5.5 1.5 1.7 2.6 3.3 2.8 2.2.3 4.1-1.3 4.3-3.4.1-1.3-.5-2.5-1.5-3.3C17.7 1.4 15.6 1 13.5 1 6.6 1 1 6.7 1 13.7 1 20.8 6.7 23 13.8 23c6.1 0 11.2-4.5 11.2-10.2 0-.7-.1-1.4-.2-2h-3.9v4z" fill="#0078D7"/>
                <path d="M16.6 5.6c-.2 2.1-2.1 3.7-4.3 3.4-1.6-.2-2.8-1.3-3.3-2.8 3.9.4 6.8 3.6 6.8 7.5 0 1.2-.3 2.4-.8 3.4 3.8-.5 6.8-3.7 6.8-7.6 0-1.4-.4-2.7-1.1-3.9h-4.1z" fill="#00BCF2"/>
              </svg>
            </div>
            <div className="browser-card-info">
              <h3>Microsoft Edge</h3>
              <span>Edge Add-ons • 1-Click Install</span>
            </div>
            <div className="browser-card-action">
              <span>Add to Edge →</span>
            </div>
          </a>
        </div>

        <div className="vr-modal-footer">
          <p>✓ No credit card required for 7-day trial • ✓ 50 free AI generations</p>
        </div>
      </div>
    </div>
  );
}
