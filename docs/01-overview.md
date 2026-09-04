# 01 — Overview

## VibeReply kya hai?

VibeReply ek **contextual AI writing assistant** hai jo Grammarly jaise kaam karta hai — lekin
grammar fix karne ke bajaye ye **meaning aur tone** par kaam karta hai. Ye kisi bhi website ke
text/compose box ke paas ek chhota floating icon dikhata hai (WhatsApp Web, LinkedIn, Gmail,
Slack, Microsoft Teams, aur practically koi bhi site jaha text box ho).

Jab user us icon par click karta hai:

1. Extension current screen par jo conversation dikh rahi hai wo padhta hai (sirf visible part,
   scroll karke purana history nahi khodta jab tak user khud na kahe).
2. Us conversation ko backend API ko bhejta hai.
3. Backend AI model (Gemini, OpenAI-compatible API se) se call karke, user ke configure kiye hue
   **tones** (jaise "funny", "soft", "flirty", "mature", "casual" ya khud ke banaye custom tones)
   me multiple reply options generate karta hai.
4. User ek reply choose karta hai — wo seedha compose box me insert ho jaata hai (type ho jaata
   hai jaise user ne khud likha ho).
5. **User khud send karta hai** — extension kabhi bhi apne aap message send nahi karta. Ye ek hard
   rule hai (manifest.json me bhi likha hai: *"No auto-send. No automation."*).

Iske alawa VibeReply do aur kaam karta hai:

- **Rewrite**: user ne jo khud draft type kiya hai, uska matlab badle bina sirf tone badal deta
  hai (jaise casual se formal).
- **Translate**: agar dono log alag language me baat kar rahe hain, to VibeReply automatically dono
  taraf translate kar sakta hai (180+ languages support karta hai).

## Kaun use kar sakta hai?

- **End users**: koi bhi jo WhatsApp Web, LinkedIn messaging, Gmail, Slack, Teams, ya kisi bhi
  website par likhte waqt better/faster replies chahta hai, ya kisi aisi language me baat kar
  raha hai jo dusre insaan ki language se match nahi karti.
- **Developers/Contributors**: jo backend API extend karna chahte hain, naya platform adapter
  (extension side) add karna chahte hain, ya naya tone-system feature add karna chahte hain.
- **Product/Business side**: jo pricing, subscription, ya usage-limit logic samajhna chahte hain
  (dekho [12-usage-limits.md](12-usage-limits.md) aur [11-subscription-billing.md](11-subscription-billing.md)).

Koi login/signup nahi chahiye — identity purely **anonymous device-id** based hai (browser me
generate hota hai, server ko sirf ek UUID header ke through pata chalta hai).

## Core Principles (jo code me bhi enforce hote hain)

1. **No auto-send** — extension kabhi apne aap message send nahi karta, sirf compose box me text
   daalta hai.
2. **Privacy-conscious** — sirf visible conversation padhta hai, poora chat history scrape nahi
   karta jab tak user khud enable na kare (`autoLoadOlderMessages` preference).
3. **Multi-platform, multi-language** — 5+ chat platforms (WhatsApp, LinkedIn, Gmail, Slack, Teams,
   + universal fallback adapter) aur 180+ languages.
4. **Believable, non-AI-sounding replies** — prompt engineering explicitly AI-sounding phrases
   ("I understand how you feel", "As an AI"...) block karta hai. Dekho
   [09-ai-engine-tones.md](09-ai-engine-tones.md).
5. **Freemium model** — 30-din ka free PRO trial, uske baad free tier me daily 5 generations/day,
   aur ek paid PRO subscription (Razorpay se, unlimited) available hai.

## High-level Components

```
┌─────────────────────────────┐        ┌───────────────────────────────┐
│   Chrome Extension (MV3)     │  HTTP  │   Next.js Backend (Vercel)     │
│  - content.js (per-site DOM) │ ─────▶ │  - /api/generate-replies       │
│  - background.js (network)   │ ◀───── │  - /api/tones (+[key])         │
│  - popup.js (toolbar UI)     │        │  - /api/razorpay/*             │
└─────────────────────────────┘        │  - /api/subscription-status    │
                                        │  - Prisma → PostgreSQL         │
                                        │  - OpenAI-compatible SDK → LLM │
                                        └───────────────────────────────┘
```

Detail ke liye [04-architecture.md](04-architecture.md) padho.

## Tech Stack (ek-nazar)

| Layer | Technology |
| --- | --- |
| Backend framework | Next.js 15 (App Router, Node.js runtime) |
| Language | TypeScript (strict mode) |
| Database | PostgreSQL, Prisma ORM |
| AI provider | OpenAI-compatible SDK — currently Google Gemini ka OpenAI-compat endpoint |
| Validation | Zod |
| Payments | Razorpay (India-first subscriptions) |
| Rate limiting | Custom in-memory sliding-window limiter |
| Testing | Vitest |
| Client | Chrome Manifest V3 Extension (vanilla JS, no framework) |
| Deployment | Vercel |

Poora list [03-project-structure.md](03-project-structure.md) me hai.
