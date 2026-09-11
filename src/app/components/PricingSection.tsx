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

      <div className="vr-pricing-grid">
        {/* 1. Free Trial Card */}
        <div className="vr-pricing-card card-free">
          <div className="card-header">
            <h3 className="card-title">Free Trial</h3>
            <div className="card-price-row">
              <span className="price-amount">Free</span>
              <span className="price-period">/7 days</span>
            </div>
            <p className="card-subtitle">Perfect for trying out AI social media replies</p>
          </div>

          <ul className="card-features">
            <li>
              <span className="check-icon">✓</span>
              <span>Generate up to 50 AI posts and replies</span>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <span>Basic AI posts and replies for X, LinkedIn, Facebook</span>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <span>3 post tone options</span>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <span>4 reply tone options</span>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <span>15 topic categories</span>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <span>gpt-4o-mini model</span>
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
              <span>Unlimited AI replies and posts</span>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <span>Advanced X, LinkedIn and Facebook AI posts and replies</span>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <span>Support multiple languages</span>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <span>4 post tone options</span>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <span>5 reply tone options</span>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <span>25 topic categories</span>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <span>gpt-4o model</span>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <span>Priority support</span>
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
            <p className="card-subtitle">For serious social media influencers</p>
          </div>

          <ul className="card-features">
            <li>
              <span className="check-icon">✓</span>
              <span>Everything in Standard</span>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <span>Custom topics and tone creation (to be released)</span>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <span>AI meme generator (to be released)</span>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <span>gpt-5 model</span>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <span>1-on-1 support</span>
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
