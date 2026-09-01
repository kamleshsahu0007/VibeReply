import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "VibeReply — AI Reply & Translate Assistant for Any Language, Any Chat App",
  description: "VibeReply generates contextual AI replies and translates messages in 180+ languages, directly inside WhatsApp Web, LinkedIn, Gmail, Slack, Teams, and any text box on the web. Works for English, Spanish, German, Chinese, Hindi, Arabic, and every major world language.",
  keywords: ["AI reply assistant", "multilingual chat assistant", "AI translation extension", "whatsapp web assistant", "linkedin AI replies", "browser extension", "custom writing tones", "privacy first AI", "AI reply generator for any language"],
  authors: [{ name: "VibeReply Team" }],
  openGraph: {
    title: "VibeReply — AI Reply & Translate Assistant for Any Language, Any Chat App",
    description: "Generate context-aware replies and translate messages in 180+ languages, right inside WhatsApp Web, LinkedIn, Gmail, Slack, Teams, and any input field on the web.",
    url: "https://vibe-reply-seven.vercel.app",
    siteName: "VibeReply",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VibeReply — AI Reply & Translate Assistant for Any Language, Any Chat App",
    description: "Generate and translate replies in 180+ languages, directly inside WhatsApp Web, LinkedIn, and anywhere you type.",
  },
  alternates: {
    canonical: "https://vibe-reply-seven.vercel.app",
  }
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://vibe-reply-seven.vercel.app/#website",
      "url": "https://vibe-reply-seven.vercel.app",
      "name": "VibeReply",
      "description": "Contextual AI reply and translation companion supporting 180+ languages"
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://vibe-reply-seven.vercel.app/#software",
      "name": "VibeReply",
      "operatingSystem": "Windows, macOS, Linux, ChromeOS",
      "applicationCategory": "BrowserApplication, CommunicationApplication",
      "browserRequirements": "Google Chrome, Microsoft Edge, Brave, Opera",
      "offers": {
        "@type": "Offer",
        "price": "0.00",
        "priceCurrency": "USD"
      },
      "featureList": [
        "Contextual message suggestions",
        "Customizable writing tone profiles",
        "WhatsApp Web, LinkedIn, Gmail, Slack, and Teams integration",
        "Works inside any text input field on the web",
        "Cloud-synced custom tone profiles across devices",
        "Real-time translation and reply generation in 180+ languages"
      ],
      "availableLanguage": [
        "en", "es", "de", "fr", "pt", "it", "zh", "ja", "ko", "ru",
        "ar", "hi", "bn", "ur", "tr", "vi", "th", "id", "nl", "pl"
      ]
    },
    {
      "@type": "FAQPage",
      "@id": "https://vibe-reply-seven.vercel.app/#faq",
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
        },
        {
          "@type": "Question",
          "name": "Does VibeReply work in languages other than English?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. VibeReply supports over 180 languages, including Spanish, German, French, Chinese, Japanese, Arabic, Hindi, Portuguese, Russian, and Korean. It can detect the other person's language automatically, generate your reply in your own language, and translate it for them — or you can pick both languages manually."
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
