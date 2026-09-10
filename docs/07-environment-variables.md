# 07 — Environment Variables

Saare env vars `.env.example` me template ke roop me hain (`.env.local` me apni actual values
daalo — ye file `.gitignore` me hai, commit nahi hoti). Real secrets kabhi bhi git me commit mat
karo.

## AI Provider (OpenAI-compatible)

| Var | Default | Required? | Purpose |
| --- | --- | --- | --- |
| `OPENAI_API_KEY` | — | ✅ required | API key. Missing hone par `getOpenAIClient()` turant throw karta hai |
| `OPENAI_BASE_URL` | OpenAI ka default | optional | Non-OpenAI provider point karne ke liye — abhi Google Gemini ke OpenAI-compat endpoint (`https://generativelanguage.googleapis.com/v1beta/openai/`) par set hai |
| `OPENAI_MODEL` | `gpt-4.1-mini` | optional | Primary model name (jaise `models/gemini-3.6-flash`) |
| `OPENAI_TIMEOUT_MS` | `20000` | optional | Per-request timeout (ms) |
| `OPENAI_MAX_RETRIES` | `2` | optional | SDK-level same-model retry count. **Note**: `.env.example` me `0` set hai — comment ke mutabik jaanbujh kar, kyunki `OPENAI_MODEL_FALLBACKS` already ek different-model retry deta hai turant, aur SDK ka apna retry per-minute rate-limit ka `Retry-After` honor karta hai jo 20s+ tak block kar sakta hai |
| `OPENAI_MODEL_FALLBACKS` | `""` (empty) | optional | Comma-separated model names — primary fail hone par (rate-limited/deprecated/down) in order try hote hain. Empty = koi fallback chain nahi |

## Rate Limiting

| Var | Default | Purpose |
| --- | --- | --- |
| `RATE_LIMIT_REQUESTS` | `20` | `/api/generate-replies` ke liye — per window, per client limit |
| `RATE_LIMIT_WINDOW_MS` | `60000` (1 min) | Sliding window ki length |
| `RATE_LIMIT_TONES_REQUESTS` | `60` | `/api/tones*` endpoints ke liye — alag bucket |
| `RATE_LIMIT_TONES_WINDOW_MS` | `60000` (1 min) | Tones ka window length |

> Behavior detail [08-rate-limiting-security.md](08-rate-limiting-security.md) me.

## Database

| Var | Default | Required? | Purpose |
| --- | --- | --- | --- |
| `POSTGRES_PRISMA_URL` | — | ✅ required | Pooled connection string (app runtime ke liye, `?pgbouncer=true` ke saath) |
| `POSTGRES_URL_NON_POOLING` | — | ✅ required | Direct connection (migrations ke liye) |

Dono Vercel Postgres Storage tab se milte hain (agar Vercel Postgres use kar rahe ho).

## Stripe (PRO Subscription — Global Launch)

| Var | Default | Required? | Purpose |
| --- | --- | --- | --- |
| `STRIPE_SECRET_KEY` | — | Checkout & Webhook ke liye required | Stripe Secret key (`sk_test_...` ya `sk_live_...`) |
| `STRIPE_PRICE_ID` | — | Checkout ke liye required | Recurring subscription price id (`price_...`) — bina iske checkout `503` degi |
| `STRIPE_WEBHOOK_SECRET` | — | Webhook ke liye required | Webhook signature verify karne ke liye (`whsec_...`) — bina iske webhook `503` degi |
| `APP_URL` | `https://vibe-reply-seven.vercel.app` | Optional | Stripe checkout success/cancel return URL |

`.env.example` me Stripe setup ke poore instructions bhi hain:
1. Stripe account banao (`dashboard.stripe.com`).
2. Product Catalog me `VibeReply PRO` product banakar monthly recurring Price banayein aur uska `price_...` ID copy karein.
3. Developers → API Keys se Secret key (`sk_...`) lein.
4. Developers → Webhooks me endpoint `https://<domain>/api/stripe/webhook` add karke `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` events select karein aur Signing secret (`whsec_...`) copy karein.

## App-level

| Var | Default | Purpose |
| --- | --- | --- |
| `NODE_ENV` | `development` | Standard Node env — `logger.debug()` sirf non-production me chalta hai |
| `ALLOWED_ORIGIN` | `*` | CORS `Access-Control-Allow-Origin` — production me isse apne specific domain/extension origin par restrict kar sakte ho |

## Important defensive pattern (poore codebase me consistent)

Har jagah env-var parsing me `??` ke bajaye explicit "finite aur positive number hai kya" check
use hota hai (`parsePositiveInt`, `parseNonNegativeInt`). Wajah: `??` sirf `null`/`undefined` par
fallback karta hai, `""` (empty string, jo dashboard me galti se ho sakta hai) par nahi —
`Number("")` `0` deta hai, aur ek `0`-value rate-limit ya `0`ms timeout **har request ko turant
fail** kar dega. Isliye har jagah explicit fallback-to-default hai agar value missing/blank/invalid
ho.

## Kaha se milega konsi value?

```bash
cp .env.example .env.local
```

Fir minimum required set karo:
1. `OPENAI_API_KEY`
2. `POSTGRES_PRISMA_URL` + `POSTGRES_URL_NON_POOLING`

Baaki sab defaults se local dev chal jaayega. Stripe sirf tab chahiye jab subscription flow
test karna ho.
