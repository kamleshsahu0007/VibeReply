# VibeReply — Documentation Index

Ye poore VibeReply project ki complete documentation hai. Har file ek specific topic cover karti
hai, aur sequence me likhi gayi hai — top se bottom padhoge to poora project samajh aa jayega,
naye insaan se leke, koi bhi developer/reviewer/investor sab samajh sakta hai.

## Padhne ka sequence

| # | File | Kya milega |
| --- | --- | --- |
| 01 | [Overview](01-overview.md) | VibeReply kya hai, problem kya solve karta hai, kaun use kar sakta hai |
| 02 | [Getting Started](02-getting-started.md) | Local machine par kaise install/run kare (backend + extension) |
| 03 | [Project Structure](03-project-structure.md) | Poora folder/file tree, har cheez kis liye hai |
| 04 | [Architecture & Data Flow](04-architecture.md) | System kaise kaam karta hai, request kaha se kaha jaati hai |
| 05 | [Database Schema](05-database-schema.md) | Prisma models (`Device`, `ToneProfile`), migrations |
| 06 | [API Reference](06-api-reference.md) | Har backend route — request/response/headers/errors |
| 07 | [Environment Variables](07-environment-variables.md) | Saare env vars, default value, purpose |
| 08 | [Rate Limiting & Security](08-rate-limiting-security.md) | Abuse-protection, CORS, spoofing-fix ki detail |
| 09 | [AI Engine & Tones](09-ai-engine-tones.md) | Reply/rewrite/translate engine, prompt design, tone system |
| 10 | [Browser Extension](10-browser-extension.md) | Chrome MV3 extension — background/content/popup |
| 11 | [Subscription & Billing](11-subscription-billing.md) | Razorpay PRO subscription flow |
| 12 | [Usage Limits & Tiers](12-usage-limits.md) | Free vs Trial vs PRO — user ke paas kitni limit hai |
| 13 | [Testing](13-testing.md) | Test suite kaise chalayein, kya cover hai |
| 14 | [Deployment](14-deployment.md) | Vercel par deploy kaise hota hai |
| 15 | [Known Issues & Roadmap](15-known-issues-roadmap.md) | Honest gaps — abhi kya adhoora/kamzor hai |

## Ek-line summary

**VibeReply** ek contextual AI reply/rewrite/translate assistant hai jo browser extension ke
through kisi bhi chat/compose box (WhatsApp Web, LinkedIn, Gmail, Slack, Teams, ya koi bhi text
box) ke paas ek floating icon dikhata hai. User jo type kar raha hai uska context padhkar, apni
choose ki hui "tone" (funny, soft, flirty, mature, casual, ya khud ka custom tone) me reply
suggest karta hai, apna draft rewrite karta hai, aur 180+ languages me translate karta hai — bina
kabhi khud message send kiye (auto-send kabhi nahi hota, sirf suggest karta hai).

Backend **Next.js 15 (App Router)** par bana hai, database **PostgreSQL (via Prisma)**, AI calls
**OpenAI-compatible SDK** se (abhi Google Gemini ke OpenAI-compatible endpoint par point kiya
hua), aur frontend client ek **Chrome MV3 extension** hai.

> Note: Ye docs code padhkar (2026-09-04 tak ke state ke hisaab se) likhe gaye hain — jo bhi yaha
> likha hai wo actual source files (`src/`, `extension/`, `prisma/`) se verify kiya gaya hai, koi
> guess-work nahi.
