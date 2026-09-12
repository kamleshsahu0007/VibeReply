"use client";

import React from "react";

interface VibeReplyLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
  glow?: boolean;
}

export default function VibeReplyLogo({
  size = 32,
  showText = true,
  className = "",
  glow = true,
}: VibeReplyLogoProps) {
  const gradientId = `vr-logo-grad-${size}`;
  const glowId = `vr-logo-glow-${size}`;

  return (
    <div
      className={`vr-brand-logo ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: `${Math.round(size * 0.28)}px`,
        textDecoration: "none",
        userSelect: "none",
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id={gradientId} x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00F2FE" />
            <stop offset="0.55" stopColor="#38BDF8" />
            <stop offset="1" stopColor="#8B5CF6" />
          </linearGradient>
          {glow && (
            <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          )}
        </defs>

        {/* Outer Circular Speech Bubble */}
        <path
          d="M 20 4 C 11.16 4 4 11.16 4 20 C 4 23.3 5 26.35 6.72 28.88 L 4.5 35.5 L 11.36 33.45 C 13.9 35.08 16.84 36 20 36 C 28.84 36 36 28.84 36 20 C 36 11.16 28.84 4 20 4 Z"
          fill="rgba(6, 10, 24, 0.85)"
          stroke={`url(#${gradientId})`}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Dynamic Frequency Vibe Wave cutting across dialogue */}
        <path
          d="M 9.5 20.5 H 13.5 L 16 15 L 19.5 26 L 23.5 12 L 26.5 22.5 L 28.5 19 H 30.5"
          stroke={`url(#${gradientId})`}
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={glow ? `url(#${glowId})` : undefined}
        />

        {/* Neural Spark Indicator */}
        <circle cx="30.5" cy="19" r="1.5" fill="#00F2FE" />
      </svg>

      {showText && (
        <span
          className="vr-logo-text"
          style={{
            fontFamily: "var(--font-space-grotesk), sans-serif",
            fontWeight: 700,
            fontSize: `${Math.round(size * 0.72)}px`,
            letterSpacing: "-0.03em",
            display: "inline-flex",
            alignItems: "center",
            lineHeight: 1,
            color: "#FFFFFF",
            WebkitFontSmoothing: "antialiased",
            textRendering: "optimizeLegibility",
          }}
        >
          VibeReply
        </span>
      )}
    </div>
  );
}
