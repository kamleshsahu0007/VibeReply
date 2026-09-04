# 14 — Deployment

## Platform: Vercel

Repo `.vercel/project.json` se confirm hota hai ki ye project Vercel se linked hai:

```json
{ "projectId": "prj_...", "orgId": "team_...", "projectName": "vibe-reply" }
```

Production URL: `https://vibe-reply-seven.vercel.app`

## Build process

`package.json` ka `build` script:

```bash
prisma generate && prisma migrate deploy && next build
```

Matlab deploy hote hi:
1. Prisma client (re)generate hota hai (schema se types)
2. **Pending migrations automatically apply hote hain** (`migrate deploy` — production-safe, `dev`
   wale interactive prompts nahi karta)
3. Next.js production build banata hai

## Vercel-specific behavior jo docs me relevant hai

- **`x-vercel-forwarded-for`** header Vercel edge khud set karta hai (client se kabhi spoof nahi
  ho sakta) — rate-limiter isi ko trust karta hai (dekho
  [08-rate-limiting-security.md](08-rate-limiting-security.md)).
- **Runtime**: har API route explicitly `export const runtime = "nodejs"` set karta hai (Edge
  runtime nahi) — kyunki Prisma aur Razorpay SDK Node.js APIs use karte hain.
- **`export const dynamic = "force-dynamic"`** — har route par set hai, taki Vercel kisi bhi route
  ko galti se static/cached na bana de (ye saari routes request-time data — DB, rate-limit state —
  par depend karti hain).

## Environment Variables (Vercel Dashboard me set karne hain)

Poori list [07-environment-variables.md](07-environment-variables.md) me hai. Minimum production
ke liye required:

- `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL` (ya defaults use karo)
- `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING` (Vercel Postgres Storage tab se milta hai)
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_PLAN_ID`, `RAZORPAY_WEBHOOK_SECRET` (agar
  paid subscriptions live chahiye)
- `ALLOWED_ORIGIN` (production me `*` ke bajaye specific origin set karna zyada secure hai)

## Database

Local dev me `prisma/schema.prisma` ka datasource `postgresql` provider set hai — production aur
local dono **same PostgreSQL** use karte hain (koi SQLite/Postgres split nahi hai currently,
purana README isko outdated bata raha tha).

## Razorpay Webhook Setup (production ke liye zaroori)

Razorpay Dashboard → Settings → Webhooks → naya webhook add karo:

- **URL**: `https://<your-deployed-url>/api/razorpay/webhook`
- **Active events**: `subscription.activated`, `subscription.charged`, `subscription.cancelled`,
  `subscription.completed`, `subscription.halted`, `subscription.paused`
- **Secret**: khud choose karo (Razorpay auto-generate nahi karta jaise Stripe karta hai) — wahi
  string `RAZORPAY_WEBHOOK_SECRET` env var me daalo, dono match hone chahiye.

## Extension distribution

Extension **Chrome Web Store** ke through distribute hoti hai (manifest me
`minimum_chrome_version: "116"` set hai) — is repo me publishing workflow/script nahi hai,
`extension/` folder ko manually package/upload karna padta hai Chrome Web Store Developer
Dashboard se.

**Production API URL** extension me hardcoded hai (`background.js` → `CONFIG.API_BASE`) — agar
backend ka domain badalta hai, extension code update aur re-publish karna padega.

## Deployment checklist (practical)

1. `npm run typecheck && npm run lint && npm test` — sab pass hona chahiye
2. Vercel env vars sab set hain (upar wali list)
3. Razorpay webhook URL production domain se point ho raha hai
4. `git push` → Vercel auto-deploy (build script migrations bhi apply kar dega)
5. `GET /api/health` hit karke confirm karo deploy successful hua
6. Agar extension code badla hai, naya version Chrome Web Store par bhi publish karo
