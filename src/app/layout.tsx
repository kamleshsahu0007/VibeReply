import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "VibeReply — Contextual AI Reply & Rewrite Browser Companion",
  description: "Boost your communication with VibeReply. A local, privacy-first browser extension that contextually generates replies and rewrites text directly inside WhatsApp Web, LinkedIn, and any online input field in customizable tone profiles.",
  keywords: ["AI reply assistant", "contextual replies", "rewrite text tool", "whatsapp web assistant", "linkedin AI replies", "browser extension", "custom writing tones", "privacy first AI"],
  authors: [{ name: "VibeReply Team" }],
  openGraph: {
    title: "VibeReply — Contextual AI Reply & Rewrite Browser Companion",
    description: "A privacy-first AI companion running contextually inside WhatsApp Web, LinkedIn, and anywhere you type on the web. Generate context-aware replies matching your personal tone profiles.",
    url: "https://vibereply.com",
    siteName: "VibeReply",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VibeReply — Contextual AI Reply & Rewrite Browser Companion",
    description: "Generate replies contextually inside WhatsApp Web and LinkedIn matching your custom writing tone profiles.",
  },
  alternates: {
    canonical: "https://vibereply.com",
  }
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://vibereply.com/#website",
      "url": "https://vibereply.com",
      "name": "VibeReply",
      "description": "Contextual AI Reply & Rewrite Browser Companion"
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://vibereply.com/#software",
      "name": "VibeReply",
      "operatingSystem": "Windows, macOS, Linux, ChromeOS",
      "applicationCategory": "BrowserApplication, CommunicationApplication",
      "browserRequirements": "Google Chrome, Microsoft Edge, Brave, Opera",
      "offers": {
        "@type": "Offer",
        "price": "0.00",
        "priceCurrency": "USD"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "ratingCount": "128"
      },
      "featureList": [
        "Contextual message suggestions",
        "Customizable writing tone profiles",
        "WhatsApp Web and LinkedIn integration",
        "Local SQLite database cache",
        "OpenAI and Gemini API support",
        "Language translations"
      ]
    },
    {
      "@type": "FAQPage",
      "@id": "https://vibereply.com/#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is VibeReply?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "VibeReply is a browser companion that generates contextual AI replies and rewrites draft messages directly in input fields across messaging platforms like WhatsApp Web and LinkedIn."
          }
        },
        {
          "@type": "Question",
          "name": "Does VibeReply respect my privacy?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, VibeReply values your privacy. It processes contexts locally and supports local database integrations. No credentials or chat history are saved on third-party servers."
          }
        },
        {
          "@type": "Question",
          "name": "How do I configure custom tones in VibeReply?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "You can add or update custom tone profiles directly from the extension panel or homepage dashboard by adjusting sliders for Formality, Warmth, Conciseness, and Directness."
          }
        }
      ]
    }
  ]
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
