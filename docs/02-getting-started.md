# 02 — Getting Started (Local Setup)

Ye guide follow karke tum apne local machine par backend + extension dono chala sakte ho.

## Prerequisites

- **Node.js** (Next.js 15 ke liye recent LTS version chahiye)
- **npm** (package-lock.json committed hai, so npm hi use karo)
- **PostgreSQL database** (local ya cloud — jaise Neon/Vercel Postgres). `prisma/schema.prisma` ka
  datasource `postgresql` set hai.
- **OpenAI-compatible API key** — abhi Google Gemini ke OpenAI-compat endpoint ke liye
  configured hai (`OPENAI_BASE_URL`), koi bhi OpenAI-compatible provider chalega.
- **Google Chrome** (ya koi bhi Chromium-based browser) — extension test karne ke liye.

## 1. Dependencies install karo

```bash
npm install
```

`postinstall` script automatically `prisma generate` chala dega (dekho `package.json`).

## 2. Environment variables setup karo

```bash
cp .env.example .env.local
```

Fir `.env.local` khol ke ye zaroor set karo:

- `OPENAI_API_KEY` — apni API key
- `POSTGRES_PRISMA_URL` aur `POSTGRES_URL_NON_POOLING` — apna Postgres connection string
- Baaki sab ke sensible defaults already `.env.example` me hain.

Poori list [07-environment-variables.md](07-environment-variables.md) me hai.

## 3. Database migrate + seed karo

```bash
npm run db:migrate   # Prisma migrations apply karta hai (Device, ToneProfile tables banata hai)
npm run db:seed      # 5 default tone profiles (funny, soft, flirty, mature, casual) seed karta hai
```

## 4. Dev server chalao

```bash
npm run dev
```

Server `http://localhost:3000` par start hoga. **Note:** extension ka `background.js` dev mode me
isi exact port ko expect karta hai (`CONFIG.API_BASE`), agar tum different port use kar rahe ho
to extension ko point karna hoga (step 6 dekho).

## 5. Quick backend test (bina extension ke)

```bash
curl -X POST http://localhost:3000/api/generate-replies \
  -H "Content-Type: application/json" \
  -H "X-Device-Id: test-device" \
  -d '{
    "task": "reply",
    "messages": [
      { "sender": "Aarav", "text": "movie chalein kal?", "type": "incoming" }
    ]
  }'
```

Agar sab sahi hai, JSON response me `success: true` aur `replies` object milega.

## 6. Extension load karo

1. Chrome me jao: `chrome://extensions`
2. Top-right me **"Developer mode"** ON karo
3. **"Load unpacked"** click karo → `extension/` folder select karo
4. Ye `web.whatsapp.com`, `www.linkedin.com`, aur baaki sites par bhi (manifest me
   `http://*/*`, `https://*/*` match hota hai) automatically active ho jayega.

### Local backend se connect karna (production ke bajaye)

By default extension production URL (`https://vibe-reply-seven.vercel.app`) hit karta hai. Local
backend use karne ke liye, extension ke service-worker console me:

```js
chrome.storage.local.set({ apiBase: 'http://localhost:3000' })
```

Ye override `background.js` ke `getApiBase()` function me hi handle hota hai — koi code change
nahi chahiye.

## 7. Type-check, lint, test

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
npm test             # vitest run
```

## Common gotchas

- **LinkedIn adapter** best-effort hai — verified nahi kiya gaya real LinkedIn session par. Agar
  message read/insert kaam na kare, `extension/content.js` ke `createLinkedInAdapter()` ke
  `SELECTORS` check/update karo.
- **Database empty hone par bhi crash nahi hota** — `tone.service.ts` me agar DB unreachable ho
  to hardcoded default tones fallback ho jaate hain (dekho
  [09-ai-engine-tones.md](09-ai-engine-tones.md)).
- **Razorpay checkout** sirf tab kaam karega jab `RAZORPAY_PLAN_ID` set ho — nahi to
  `/api/razorpay/create-subscription` `503 NOT_CONFIGURED` degi (ye intentional hai, crash nahi
  hota).
