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
  metadataBase: new URL("https://vibe-reply-seven.vercel.app"),
  title: "VibeReply — #1 AI Reply Generator & Smart Chat Assistant",
  description: "Generate instant, contextual AI replies and translations in 180+ languages. Works directly inside WhatsApp Web, LinkedIn, Gmail, Slack, Teams, and any web text field. Free Chrome & Edge extension.",
  keywords: [
    "AI reply generator",
    "AI chat assistant",
    "smart reply AI Chrome extension",
    "AI message generator",
    "ChatGPT reply assistant",
    "WhatsApp Web AI auto reply",
    "LinkedIn AI message writer",
    "AI email responder",
    "multilingual AI chat assistant",
    "AI tone changer for messages",
    "best AI browser extension",
    "Grammarly alternative for replies",
    "contextual AI writer",
    "instant message generator",
    "free AI reply tool USA"
  ],
  authors: [{ name: "VibeReply Team" }],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "VibeReply — #1 AI Reply Generator & Smart Chat Assistant",
    description: "Generate instant, context-aware AI replies and translations in 180+ languages inside WhatsApp Web, LinkedIn, Gmail, and any text box on the web.",
    url: "https://vibe-reply-seven.vercel.app",
    siteName: "VibeReply",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "VibeReply — #1 AI Reply Generator & Smart Chat Assistant",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VibeReply — #1 AI Reply Generator & Smart Chat Assistant",
    description: "Instant context-aware replies and real-time translation in 180+ languages inside WhatsApp Web, LinkedIn, Gmail, and anywhere you type.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://vibe-reply-seven.vercel.app",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  verification: {
    google: "google9598c0e36b5cd729.html",
  },
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
      "publisher": { "@id": "https://vibe-reply-seven.vercel.app/#organization" },
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://vibe-reply-seven.vercel.app/?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://vibe-reply-seven.vercel.app/#breadcrumbs",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://vibe-reply-seven.vercel.app"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Pricing",
          "item": "https://vibe-reply-seven.vercel.app/pricing"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "About",
          "item": "https://vibe-reply-seven.vercel.app/about"
        }
      ]
    },
    {
      "@type": "Organization",
      "@id": "https://vibe-reply-seven.vercel.app/#organization",
      "name": "VibeReply",
      "url": "https://vibe-reply-seven.vercel.app",
      "logo": "https://vibe-reply-seven.vercel.app/favicon-96x96.png",
      "sameAs": ["https://github.com/kamleshsahu0007/VibeReply"]
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://vibe-reply-seven.vercel.app/#software",
      "name": "VibeReply",
      "publisher": { "@id": "https://vibe-reply-seven.vercel.app/#organization" },
      "operatingSystem": "Windows, macOS, Linux, ChromeOS",
      "applicationCategory": "BrowserApplication, CommunicationApplication, ProductivityApplication",
      "browserRequirements": "Google Chrome, Microsoft Edge, Brave, Opera",
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "ratingCount": "1280",
        "bestRating": "5",
        "worstRating": "1"
      },
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
