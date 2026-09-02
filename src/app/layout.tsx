import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import "@/app/globals.css";

// Self-hosted via next/font instead of a CSS @import from Google Fonts —
// the @import was render-blocking (extra round-trip before the page could
// paint) and caused a font swap after load (contributing to Cumulative
// Layout Shift). next/font downloads at build time, serves from this
// origin, and sizes the fallback font to match, so there's no layout jump.
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

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
      "description": "Contextual AI reply and translation companion supporting 180+ languages",
      "publisher": { "@id": "https://vibe-reply-seven.vercel.app/#organization" }
    },
    {
      "@type": "Organization",
      "@id": "https://vibe-reply-seven.vercel.app/#organization",
      "name": "VibeReply",
      "url": "https://vibe-reply-seven.vercel.app",
      "sameAs": ["https://github.com/kamleshsahu0007/VibeReply"]
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://vibe-reply-seven.vercel.app/#software",
      "name": "VibeReply",
      "publisher": { "@id": "https://vibe-reply-seven.vercel.app/#organization" },
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
            "text": "Yes. VibeReply only reads the message you're actively replying to, redacts phone numbers/emails/codes/card numbers before sending anything to its API, never auto-sends on your behalf, and never stores your conversation content on its servers. Full details are in the privacy policy at vibe-reply-seven.vercel.app/privacy."
          }
        },
        {
          "@type": "Question",
          "name": "Is VibeReply free to use?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, VibeReply is free to install and use, with no account required to get started."
          }
        },
        {
          "@type": "Question",
          "name": "Which browsers and websites does VibeReply work with?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "VibeReply works in Chrome and Microsoft Edge. It has dedicated support for WhatsApp Web, LinkedIn, Gmail, Slack, and Microsoft Teams, and works generically on any other website with a text input field, similar to how Grammarly works everywhere."
          }
        },
        {
          "@type": "Question",
          "name": "How is VibeReply different from Grammarly?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Grammarly focuses on grammar and clarity. VibeReply focuses on meaning, tone, and cross-language conversation: it reads the conversation you're replying to, matches a tone you choose, and can translate your reply into the other person's language while showing you what their message and your reply both mean in your own language."
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
    <html lang="en" className={`${plusJakartaSans.variable} ${spaceGrotesk.variable}`}>
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
