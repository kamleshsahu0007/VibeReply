# 03 — Project Structure

Poora repo do major halves me divide hai: **backend** (`src/`, `prisma/`) aur **browser extension**
(`extension/`). Neeche har file/folder ka purpose diya hai.

```
VibeReply/
├── src/
│   ├── app/                              # Next.js App Router
│   │   ├── api/                          # Backend REST API routes (detail: 06-api-reference.md)
│   │   │   ├── generate-replies/route.ts # POST — reply/rewrite/translate generation (main AI endpoint)
│   │   │   ├── tones/route.ts            # GET (list) / POST (create ya edit tone)
│   │   │   ├── tones/[key]/route.ts      # DELETE (custom tone hatao / default revert karo)
│   │   │   ├── razorpay/
│   │   │   │   ├── create-subscription/route.ts  # POST — Razorpay checkout link banata hai
│   │   │   │   └── webhook/route.ts               # POST — Razorpay ke server-to-server events
│   │   │   ├── subscription-status/route.ts        # GET — device PRO hai ya nahi
│   │   │   └── health/route.ts                      # GET — uptime/health check
│   │   ├── components/
│   │   │   ├── Playground.tsx            # Homepage par live demo widget
│   │   │   └── Starfield.tsx             # Homepage background animation
│   │   ├── privacy/page.tsx              # Privacy Policy page (/privacy)
│   │   ├── layout.tsx                    # Root layout — fonts, SEO metadata
│   │   ├── page.tsx                      # Homepage (/) — marketing + Playground demo
│   │   ├── robots.ts                     # robots.txt generator
│   │   └── sitemap.ts                    # sitemap.xml generator
│   │
│   ├── lib/                              # Shared low-level utilities (no business logic)
│   │   ├── cors/index.ts                 # CORS headers helper
│   │   ├── db/client.ts                  # Prisma client singleton (hot-reload safe)
│   │   ├── errors/index.ts               # Typed AppError hierarchy (ValidationError, RateLimitError, ...)
│   │   ├── logger/index.ts               # Minimal structured JSON logger
│   │   ├── openai/client.ts              # OpenAI SDK client + model-fallback-chain config
│   │   ├── ratelimit/index.ts            # In-memory sliding-window rate limiter
│   │   ├── razorpay/client.ts            # Razorpay SDK client singleton
│   │   ├── tones/defaults.ts             # 5 hardcoded default tone profiles (funny/soft/flirty/mature/casual)
│   │   └── validation/schemas.ts         # Zod schemas — request body validation
│   │
│   ├── services/                         # Business logic (routes call these, not the other way)
│   │   ├── replies/
│   │   │   ├── prompt.builder.ts         # System/user prompt construction for the LLM
│   │   │   ├── reply.service.ts          # Model call + structured JSON-schema output parsing
│   │   │   └── reply.service.test.ts     # Unit tests
│   │   ├── subscription/
│   │   │   └── subscription.service.ts   # Device subscription status read/write (DB layer)
│   │   └── tones/
│   │       └── tone.service.ts           # Global-default + device-override merge logic
│   │
│   └── types/index.ts                    # Shared TypeScript domain types (ConversationMessage, ToneProfile, ...)
│
├── prisma/
│   ├── schema.prisma                     # DB schema — Device, ToneProfile models
│   ├── migrations/                       # Applied SQL migrations (history)
│   └── seed.ts                           # Seeds 5 default tone profiles into DB
│
├── public/
│   └── llms.txt                          # LLM-crawler-friendly product description (AI search engines ke liye)
│
├── extension/                            # Chrome MV3 Browser Extension (poora vanilla JS, no bundler)
│   ├── manifest.json                     # Extension config — permissions, content-script matches, CSP
│   ├── background.js                     # Service worker — saara network/API calling, identity, message routing
│   ├── content.js                        # Har site ke DOM ko padhne/likhne wale "adapters" + floating panel UI
│   ├── popup.js / popup.html             # Toolbar (extension icon click) UI — settings, tone editor, stats
│   ├── styles.css                        # Floating panel + popup styling
│   ├── lib/
│   │   ├── trial.js                      # Free-tier quota, PRO trial, usage-stats logic (client-side)
│   │   ├── storage.js                    # Per-tab IndexedDB — conversation history caching
│   │   └── languages.js                  # 180+ language code→name table (UI dropdowns ke liye)
│   └── icons/                            # Extension icons (16/32/48/128 px)
│
├── docs/                                 # 👈 Ye documentation folder (tum yaha ho)
│
├── .env.example                          # Saare environment variables ka template (real secrets nahi)
├── next.config.ts                        # Next.js config
├── vitest.config.ts                      # Test runner config
├── package.json                          # Scripts + dependencies
└── README.md                             # Top-level quick-reference (isi repo ka original README)
```

## Layering convention (important — code samajhne ke liye)

Backend teen clean layers me organized hai:

1. **`src/app/api/**/route.ts`** — HTTP layer. Sirf: parse request → validate (Zod) → call service
   → format response. Koi business logic yaha nahi hoti.
2. **`src/services/**`** — Business logic. Database queries, AI model calls, tone-merging logic —
   sab yaha hota hai. Routes in functions ko call karte hain.
3. **`src/lib/**`** — Generic, reusable, framework-agnostic utilities. Inko koi bhi service use kar
   sakta hai, inko kabhi bhi Next.js `Request`/`Response` type ka pata nahi hota (except `cors`
   jo sirf headers banata hai).

Ye separation isliye important hai: agar kal ko REST se GraphQL ya kisi aur transport pe shift
karna pade, sirf `app/api/` layer badalna padega — `services/` aur `lib/` bilkul same rahenge.

## Extension side conventions

- **No build step, no bundler** — `extension/` ki saari `.js` files directly browser me load hoti
  hain (`<script>` tags / ES module imports), koi Webpack/Vite nahi.
- **`background.js`** = single source of truth for network calls. Content script ya popup kabhi
  directly `fetch()` nahi karte — hamesha `chrome.runtime.sendMessage()` se background ko message
  bhejte hain, background hi backend se baat karta hai.
- **Per-site "adapters"** (`content.js` ke andar) — har chat platform (WhatsApp, LinkedIn, Gmail,
  Slack, Teams) ka apna adapter hai jo us site ke specific DOM structure ko samajhta hai (message
  padhna, compose box dhundna, text insert karna). Ek "universal" fallback adapter bhi hai jo kisi
  bhi generic `<textarea>`/`contenteditable` box par kaam kar sake.

Aage ki detail [10-browser-extension.md](10-browser-extension.md) me hai.
