"use client";

import React, { useState } from "react";
import ExtensionModal from "./ExtensionModal";

export default function PricingSection() {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);

  // Helper to obtain a device ID from URL params or local storage
  const getOrCreateDeviceId = (): string => {
    if (typeof window === "undefined") return "web-user-preview";

    const urlParams = new URLSearchParams(window.location.search);
    const fromUrl = urlParams.get("deviceId") || urlParams.get("device_id");
    if (fromUrl) return fromUrl;

    let stored = localStorage.getItem("vr_device_id");
    if (!stored) {
      stored = "dev_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);
      localStorage.setItem("vr_device_id", stored);
    }
    return stored;
  };

  const handleCheckout = async (tier: "standard" | "premium") => {
    setErrorMessage(null);
    setLoadingTier(tier);

    try {
      const deviceId = getOrCreateDeviceId();
      const res = await fetch("/api/lemonsqueezy/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-Id": deviceId,
        },
        body: JSON.stringify({ tier }),
      });

      const data = await res.json();

      if (!res.ok || !data.success || !data.url) {
        throw new Error(data?.error?.message || "Failed to initiate checkout. Please try again.");
      }

      // Redirect to Lemon Squeezy hosted checkout
      window.location.href = data.url;
    } catch (err) {
      setErrorMessage((err as Error).message);
      setLoadingTier(null);
    }
  };

  return (
    <section className="vr-pricing-section" id="pricing">
      {errorMessage && (
        <div className="vr-pricing-error">
          <span>⚠️ {errorMessage}</span>
          <button onClick={() => setErrorMessage(null)}>✕</button>
        </div>
      )}

      <div className="vr-pricing-header">
        <span className="pricing-tag">Simple & Transparent</span>
        <h2>Choose Your Plan</h2>
        <p>Start free with no credit card required. Upgrade anytime for unlimited access.</p>
      </div>

      <div className="vr-pricing-grid">
        {/* 1. Free Trial Card */}
        <div className="vr-pricing-card card-free">
          <div className="card-header">
            <h3 className="card-title">Free Trial</h3>
            <div className="card-price-row">
              <span className="price-amount">Free</span>
              <span className="price-period">/30 days</span>
            </div>
            <p className="card-subtitle">Full access to AI replies & translations. No credit card required.</p>
          </div>

          <ul className="card-features">
            <li>
              <span className="check-icon">✓</span>
              <span><strong>30-day full access trial</strong></span>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <span><strong>5 free AI replies daily</strong> after trial</span>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <span>Works directly in WhatsApp Web & LinkedIn</span>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <span>All built-in tone options (Professional, Casual, etc.)</span>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <span>Translate across 180+ languages</span>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <span>Fast gpt-4o-mini AI engine</span>
            </li>
          </ul>

          <div className="card-action">
            <button
              onClick={() => setIsExtensionModalOpen(true)}
              className="btn-tier btn-free"
              id="btn-start-free-trial"
            >
              Start Free Trial
            </button>
          </div>
        </div>

        {/* 2. Standard Card (Most Popular) */}
        <div className="vr-pricing-card card-standard popular">
          <div className="popular-badge">
            <span className="star-icon">☆</span> Most Popular
          </div>

          <div className="card-header">
            <h3 className="card-title">Standard</h3>
            <div className="card-price-row">
              <span className="price-amount">$4.99</span>
              <span className="price-period">/per month</span>
            </div>
            <p className="card-subtitle">Best for growing your social media presence</p>
          </div>

          <ul className="card-features">
            <li>
              <span className="check-icon">✓</span>
              <span><strong>Unlimited</strong> AI replies and translations</span>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <span>WhatsApp Web, LinkedIn & universal web input support</span>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <span>Support for 180+ languages</span>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <span>All built-in tone options</span>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <span>Advanced <strong>gpt-4o</strong> contextual AI model</span>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <span>Priority response speed</span>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <span>Standard support</span>
            </li>
          </ul>

          <div className="card-action">
            <button
              onClick={() => handleCheckout("standard")}
              disabled={loadingTier === "standard"}
              className="btn-tier btn-standard"
              id="btn-get-started-standard"
            >
              {loadingTier === "standard" ? "Loading checkout..." : "Get Started"}
            </button>
          </div>
        </div>

        {/* 3. Premium Card */}
        <div className="vr-pricing-card card-premium">
          <div className="card-header">
            <h3 className="card-title">Premium</h3>
            <div className="card-price-row">
              <span className="price-amount">$7.99</span>
              <span className="price-period">/per month</span>
            </div>
            <p className="card-subtitle">For power users, creators and professionals</p>
          </div>

          <ul className="card-features">
            <li>
              <span className="check-icon">✓</span>
              <span>Everything in Standard</span>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <span>Custom tone creation & personalized AI personas</span>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <span>AI social post & meme generator (coming soon)</span>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <span>Next-gen <strong>gpt-5</strong> frontier model</span>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <span>Dedicated 1-on-1 priority support</span>
            </li>
          </ul>

          <div className="card-action">
            <button
              onClick={() => handleCheckout("premium")}
              disabled={loadingTier === "premium"}
              className="btn-tier btn-premium"
              id="btn-go-premium"
            >
              {loadingTier === "premium" ? "Loading checkout..." : "Go Premium"}
            </button>
          </div>
        </div>
      </div>

      <ExtensionModal
        isOpen={isExtensionModalOpen}
        onClose={() => setIsExtensionModalOpen(false)}
      />
    </section>
  );
}
