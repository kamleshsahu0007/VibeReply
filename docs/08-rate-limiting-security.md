# 08 — Rate Limiting & Security

## Rate Limiter design

**File**: `src/lib/ratelimit/index.ts`

Ek swappable `RateLimiter` interface hai:

```ts
interface RateLimiter {
  check(key: string): Promise<RateLimitResult>;
}
```

Default implementation: **in-memory sliding-window limiter** — ek single Node.js instance ke
liye theek hai (local dev, ya single-region sticky serverless). Multi-instance/multi-region
deployment ke liye, Redis/Upstash-backed implementation isi interface ko satisfy karke drop-in
replace ki ja sakti hai — koi caller code badalna nahi padega.

### Do alag limiter instances (bucket separation)

| Limiter | Applies to | Default | Kyu alag? |
| --- | --- | --- | --- |
| `defaultRateLimiter` | `/api/generate-replies` | 20 req/min | Ye AI-model calling endpoint hai — asli cost driver (OpenAI/Gemini bill) |
| `tonesRateLimiter` | `/api/tones`, `/api/tones/:key` | 60 req/min | Cheap DB operations, model call nahi — isliye zyada generous limit, aur alag bucket taki tone-list polling generate-replies ka budget na khaye |

Env vars: `RATE_LIMIT_REQUESTS`/`RATE_LIMIT_WINDOW_MS` (default) aur
`RATE_LIMIT_TONES_REQUESTS`/`RATE_LIMIT_TONES_WINDOW_MS` (tones).

### Client identification (`getClientKey`)

Rate limiter kis "client" ko count kar raha hai, ye decide karta hai `getClientKey(headers)`.
Priority order:

1. **`x-vercel-forwarded-for`** — Vercel edge apne aap set karta hai, real TCP connection se. Ye
   kabhi client-supplied nahi hota, chahe beech me koi extra proxy ho — production me sabse
   trustworthy source hai (deployment Vercel par hai, `.vercel/project.json` se confirm).
2. **`x-forwarded-for`** (fallback, non-Vercel hosts ke liye) — chain ka **last** hop use hota hai
   (first nahi), kyunki koi bhi client apna khud ka `X-Forwarded-For` header bhej sakta hai jo
   chain ke front me add hota hai; ek trusted reverse-proxy jo actually request forward karta hai
   apna hop **end** me add karta hai.
3. **`x-real-ip`** — last fallback.
4. `"anonymous"` — koi header na mile to (rate limiter phir bhi apply hota hai, sab anonymous
   requests ek hi bucket share karte hain).

> ⚠️ **Fixed vulnerability (is session me)**: pehle `getClientKey` sirf `x-forwarded-for` ka
> **first** entry blindly trust karta tha — koi bhi client `X-Forwarded-For: 1.2.3.4` bhejke apna
> rate-limit bucket kisi bhi random IP par pin kar sakta tha, jisse har request ek "naya" client
> lagta aur limiter poori tarah bypass ho jaata. Fix ke baad Vercel ke tamper-proof header
> (`x-vercel-forwarded-for`) ko priority milti hai, aur fallback chain me sirf trustworthy hop
> (last, first nahi) count hota hai.

### Assertion helper

```ts
assertRateLimit(request, limiter?)
```

Ye check karta hai aur limit exceed hone par `RateLimitError` throw karta hai (jo route handler
`429` me convert karta hai, `Retry-After` header ke saath). Teeno affected routes
(`generate-replies`, `tones` GET/POST, `tones/:key` DELETE) isi single helper ko use karte hain —
duplicate logic nahi.

## CORS

**File**: `src/lib/cors/index.ts`

```ts
Access-Control-Allow-Origin: <ALLOWED_ORIGIN env, default "*">
Access-Control-Allow-Methods: <route ke method(s)>, OPTIONS
Access-Control-Allow-Headers: Content-Type, X-Device-Id
```

Har route apna khud ka `OPTIONS` handler deta hai preflight ke liye.

## Input Validation

**File**: `src/lib/validation/schemas.ts` — Zod schemas.

Highlights:
- `messages` array max 50 items (conversation-too-long protection).
- Har message `text` max 2000 chars.
- `toneKeys` max 20 items.
- `.refine()` rules task-specific requirements enforce karte hain (jaise `task=rewrite` ke liye
  `draft` required, `task=translate` ke liye `text` + `targetLanguage` required).

Validation fail hone par `400 VALIDATION_ERROR` with per-field issue details.

## Razorpay Webhook Security

`/api/razorpay/webhook` **CORS use nahi karta** (server-to-server hai) — authentication
`X-Razorpay-Signature` header ke HMAC verification se hoti hai
(`Razorpay.validateWebhookSignature()`, `RAZORPAY_WEBHOOK_SECRET` se). Invalid ya missing
signature = `400`, secret configured na ho to `503`.

## Structured error handling

`src/lib/errors/index.ts` — ek typed `AppError` hierarchy:

```
AppError
├── ValidationError       (400)
├── RateLimitError         (429)
├── UpstreamError           (502)
├── UpstreamTimeoutError    (504)
└── InvalidModelOutputError (502)
```

Har route in errors ko catch karke consistent JSON shape me convert karta hai — koi bhi raw stack
trace ya internal detail client ko leak nahi hoti (`INTERNAL_ERROR` generic message deta hai,
detail sirf server logs me).

## Logging

`src/lib/logger/index.ts` — structured JSON logs (`{ level, msg, ts, ...meta }`). `warn`/`error`
`console.error` par jaate hain (log-aggregation tools inhe alag treat kar sakein), baaki
`console.log` par. `debug` sirf non-production me chalta hai.

## Extension-side "security" (client-side, not a real boundary)

`extension/lib/trial.js` ka quota-check purely **client-side** hai — koi server-side enforcement
nahi hai is layer par (comment khud kehta hai: *"a soft, client-side gate rather than real
enforcement... stops accidental overuse, not a user who opens devtools and edits their own
storage"*). Asli enforcement layer server-side rate-limiter hi hai. Detail
[12-usage-limits.md](12-usage-limits.md) me.

## Abhi ke known gaps (honestly documented)

Dekho [15-known-issues-roadmap.md](15-known-issues-roadmap.md) — jaise `/api/subscription-status`
aur `/api/razorpay/create-subscription` par abhi rate-limiting nahi hai, aur IP-based limiting
distributed/botnet abuse ko fully nahi rok sakta.
