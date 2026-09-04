# 04 — Architecture & Data Flow

## System diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                          USER'S BROWSER (Chrome)                        │
│                                                                          │
│  ┌───────────────┐   sendMessage   ┌─────────────────────────────────┐ │
│  │  content.js    │ ─────────────▶ │  background.js (Service Worker)  │ │
│  │  (per-tab,     │ ◀───────────── │  - device identity (UUID)        │ │
│  │  injected on   │                │  - token-bucket rate limiter     │ │
│  │  every site)   │                │  - subscription-status cache     │ │
│  │                │                │  - tones cache                   │ │
│  │  - reads DOM   │                │  - all fetch() calls happen here │ │
│  │  - shows panel │                └───────────────┬───────────────────┘ │
│  │  - inserts text│                                │                     │
│  └───────▲────────┘                                │ HTTPS               │
│          │                          ┌───────────────┘                     │
│  ┌───────┴────────┐                 │                                    │
│  │  popup.js       │  sendMessage   │                                    │
│  │  (toolbar icon) │ ───────────────┘                                    │
│  └─────────────────┘                                                     │
└────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    NEXT.JS BACKEND (Vercel, Node.js runtime)            │
│                                                                          │
│  app/api/generate-replies  ──▶  services/tones (active tones fetch)     │
│         │                  ──▶  services/replies (prompt build + call)  │
│         │                                │                              │
│         │                                ▼                              │
│         │                     lib/openai/client (model-fallback chain)  │
│         │                                │                              │
│  app/api/tones[/[key]]      ──▶  services/tones ──▶ Prisma ──▶ Postgres │
│  app/api/subscription-status──▶  services/subscription ──▶ Prisma       │
│  app/api/razorpay/*          ──▶  Razorpay SDK + services/subscription  │
└────────────────────────────────────────────────────────────────────────┘
                                       │
                     ┌─────────────────┼─────────────────┐
                     ▼                 ▼                 ▼
              ┌───────────┐   ┌────────────────┐  ┌──────────────┐
              │ PostgreSQL │   │ OpenAI-compat  │  │  Razorpay    │
              │ (Prisma)   │   │ LLM (Gemini)   │  │  (payments)  │
              └───────────┘   └────────────────┘  └──────────────┘
```

## Request lifecycle — "Reply generate karo" (sabse common case)

1. User content-script panel me "Reply" button dabata hai.
2. `content.js` current adapter (WhatsApp/LinkedIn/Gmail/...) se visible conversation messages
   nikalta hai → `chrome.runtime.sendMessage({ type: 'GENERATE_SUGGESTIONS', payload })`.
3. `background.js` (`handleGenerate`):
   a. Local **token-bucket** rate limiter check karta hai (client-side throttle — 5 burst, ~1
      request/2s).
   b. `/api/subscription-status` se (cached, 5-min TTL) check karta hai PRO hai ya nahi.
   c. `VRTrial.checkQuota()` se local trial/daily-limit quota check karta hai.
   d. Agar allowed hai, `POST /api/generate-replies` call karta hai (`X-Device-Id` header ke saath).
4. Backend route (`app/api/generate-replies/route.ts`):
   a. **Server-side rate limit** check karta hai (`assertRateLimit`, IP-based).
   b. Zod se request body validate karta hai.
   c. `getActiveToneProfilesForDevice(deviceId)` se effective tones fetch karta hai (device
      overrides + global defaults merge).
   d. `generateReplies()` service call karta hai → prompt build hota hai → OpenAI-compatible model
      ko structured JSON-schema output ke saath call kiya jaata hai.
   e. Model se aaya JSON parse/validate hota hai, response client ko wapas jaata hai.
5. `background.js` response ko `VRTrial.recordUsage()` se local usage counter me record karta hai,
   fir content-script ko wapas bhejta hai.
6. `content.js` panel me options dikhata hai — user ek choose karta hai → text compose box me
   insert ho jaata hai. **Send button khud user dabata hai.**

## Identity model (no login system)

- Extension install hote hi ek random `crypto.randomUUID()` generate hota hai aur
  `chrome.storage.sync` me save hota hai — ye `deviceId` hai.
- Har backend request `X-Device-Id` header carry karta hai.
- Backend is deviceId ko sirf identify karne ke liye use karta hai — tone-profile overrides aur
  subscription status isi se link hote hain. Koi password/email/OAuth nahi hai.
- `chrome.storage.sync` hone ki wajah se same Google account ke saare Chrome browsers me same
  deviceId sync ho jaata hai (jab tak Chrome sync enabled ho).

## Caching layers (performance ke liye)

| Cache | Kaha | TTL | Kyu |
| --- | --- | --- | --- |
| Subscription status | `background.js` (memory + `chrome.storage.local`) | 5 min | Har generate call par backend hit na ho |
| Tones list | `background.js` (memory + `chrome.storage.session`) | 5 min | N tabs open hone par bhi ~1 backend call/window |
| Global default tones "seeded" flag | Server memory (per warm serverless instance) | Instance lifetime | Har request par DB count() query avoid karna |

## Kyun ye design choices?

- **Service-worker-centric networking**: MV3 me content scripts har tab me alag-alag chalte hain
  — agar har tab apna khud ka fetch/cache rakhta to N tabs = N backend calls. Sab network logic
  ek jagah (`background.js`) rakhne se caching aur rate-limiting centralize ho jaati hai.
- **Server aur client dono par rate-limit**: client-side token bucket UX ke liye hai (turant "slow
  down" feedback, backend tak jaane se pehle hi), server-side sliding-window abuse-protection ke
  liye hai (asli cost-control). Dono independent hain — client-side bypass ho sakta hai (extension
  code hi hai), isliye server-side hi asli security boundary hai. Dekho
  [08-rate-limiting-security.md](08-rate-limiting-security.md).
- **Structured JSON-schema output**: model se free-text ke bajaye strict JSON schema enforce kiya
  jaata hai (`response_format: json_schema`), taki parsing reliably ho aur missing/malformed tone
  ka output turant pakda ja sake (`InvalidModelOutputError`).
