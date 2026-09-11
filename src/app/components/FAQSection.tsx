"use client";

import React, { useState } from "react";

const FAQS = [
  {
    q: "How does the 7-Day Free Trial work?",
    a: "You can start using VibeReply immediately on Chrome or Edge with up to 50 AI-generated replies and posts. No credit card is required to begin your trial."
  },
  {
    q: "How does VibeReply integrate with my browser?",
    a: "VibeReply runs directly inside your web browser as an extension. When you open WhatsApp Web, LinkedIn, X, Gmail, Slack, or any text editor, smart floating AI reply chips appear right next to the conversation box."
  },
  {
    q: "What is the difference between Standard and Premium?",
    a: "Standard ($4.99/mo) gives you unlimited AI replies and posts, advanced multilingual support, 25 topic categories, and the fast gpt-4o model. Premium ($7.99/mo) unlocks custom tones and topics, AI meme generation, the most advanced gpt-5 model, and dedicated 1-on-1 priority support."
  },
  {
    q: "What payment methods does Lemon Squeezy accept?",
    a: "Lemon Squeezy accepts all major credit and debit cards (Visa, Mastercard, American Express, Discover), Apple Pay, Google Pay, and PayPal worldwide. Transactions are secured and tax-compliant globally."
  },
  {
    q: "Can I cancel my subscription at any time?",
    a: "Yes, you can cancel or change your plan at any time with a single click from the customer billing portal link sent to your email or directly inside the extension settings."
  }
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="vr-faq-section" id="faq">
      <div className="vr-section-header">
        <span className="section-tag">Got Questions?</span>
        <h2>Frequently Asked Questions</h2>
        <p>Everything you need to know about VibeReply, plans, and browser integration.</p>
      </div>

      <div className="vr-faq-list">
        {FAQS.map((item, idx) => (
          <div
            key={idx}
            className={`vr-faq-item ${openIndex === idx ? "expanded" : ""}`}
            onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
          >
            <div className="vr-faq-question">
              <h4>{item.q}</h4>
              <span className="faq-toggle-icon">{openIndex === idx ? "−" : "+"}</span>
            </div>
            {openIndex === idx && (
              <div className="vr-faq-answer">
                <p>{item.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
