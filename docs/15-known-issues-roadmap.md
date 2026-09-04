# 15 — Known Issues & Roadmap (Honest Gaps)

Ye file jaanbujh kar honestly likhi gayi hai — koi bhi naya developer/reviewer ko pata hona chahiye
ki abhi kya adhoora hai, taki galti se "sab kuch production-perfect hai" na maan liya jaaye.

## Security / Abuse-protection gaps

1. **`/api/subscription-status` aur `/api/razorpay/create-subscription` par rate-limiting nahi
   hai.** In dono par abhi bhi `assertRateLimit()` call nahi hoti (sirf `generate-replies` aur
   `tones*` par hai). In dono ki cost kam hai (subscription-status ek DB read hai, create-subscription
   Razorpay API call hai jo Razorpay khud rate-limit karta hai), lekin spam/DoS-style abuse se
   fully immune nahi hain.
2. **IP-based rate limiting distributed/botnet abuse ko fully nahi rok sakta.** Ek attacker jo
   bahut saari IPs se requests bhej sakta hai (VPN rotation, botnet), per-client limiter ko
   individually bypass kar sakta hai. Server-side, koi **global hard-cap/circuit-breaker** nahi hai
   jo total AI-bill ko ek absolute ceiling par cap kare, chahe requests kitni bhi clients se aayein.
3. **Client-side quota (30-day trial + 5/day free limit) sirf `chrome.storage.local` me enforce
   hoti hai** — koi server-side account/entitlement system nahi hai. Technically-savvy user apna
   storage edit karke limit bypass kar sakta hai (`trial.js` ka apna comment). Real
   cost-protection sirf server-side IP rate-limiter se aati hai, jo tier-aware nahi hai (free aur
   paid user same server-side limit share karte hain).
4. **In-memory rate limiter single-instance hai.** Multi-region/multi-instance Vercel deployment
   me har instance ka apna alag counter hoga — matlab effective global limit configured value se
   zyada ho sakta hai (jitne parallel warm instances utne guna). `RateLimiter` interface Redis/
   Upstash-backed implementation ke liye ready hai, lekin abhi wired nahi hai.

## Extension gaps

5. **LinkedIn adapter unverified.** `createLinkedInAdapter()` commonly-documented DOM structure se
   likha gaya hai, kabhi live LinkedIn session par test nahi hua. Gmail/Slack/Teams adapters bhi
   isi tarah "present but not battle-tested" category me lagte hain (sirf WhatsApp adapter ko
   README explicitly "verified" bolta hai).
6. **Production API URL extension me hardcoded hai** (`CONFIG.API_BASE`) — backend domain badalne
   par extension ka naya version publish karna padta hai, koi remote-config mechanism nahi hai.
7. **Extension ke liye koi automated test suite nahi hai** — sirf manual/browser testing.

## Testing / CI gaps

8. **Koi CI workflow nahi mila** (`.github/workflows/` jaisa kuch nahi hai repo me) —
   typecheck/lint/test manually run karne padte hain commit se pehle, automatically enforce nahi
   hote.
9. **Test coverage limited hai** — sirf validation schemas aur reply-service ke liye tests hain.
   Route handlers, `tone.service.ts`, `subscription.service.ts`, aur poora extension untested hain.

## Documentation drift (jo mila)

10. Root-level `README.md` (repo ke root me, is `docs/` folder se alag) **kuch purana ho chuka
    hai** — jaise ye kehta hai *"Prisma + SQLite for local dev"* jabki `prisma/schema.prisma` ka
    datasource actually `postgresql` hai. Ye README `RAZORPAY_*` env vars aur `/api/razorpay/*`,
    `/api/subscription-status` routes bhi mention nahi karta (jab ye docs likhe gaye, product me
    ye already exist karte the). Ye `docs/` folder isi gap ko fix karne ke liye current code se
    directly likha gaya hai.

## Product/Business logic notes (gaps nahi, bas cheezein jo obvious nahi hain)

11. **Razorpay subscriptions "indefinite" nahi hoti** — 120 monthly cycles (~10 saal) fixed hoti
    hain kyunki Razorpay Stripe jaisa "until cancelled" option nahi deta. Practically ye
    indefinite jaisa hi feel hota hai, lekin agar kabhi 10 saal poore ho jaayein to renewal-logic
    abhi nahi hai.
12. **Koi login/account system nahi hai** — identity purely device-scoped UUID hai. Agar user
    browser reinstall kare ya `chrome.storage.sync` clear ho jaaye, purani identity (aur uski
    subscription/tones) khud-ba-khud "lost" ho jaati hai us naye install ke liye (jab tak
    subscription Razorpay side se dobara link na ho — koi account-recovery flow nahi hai).

## Suggested next steps (priority order, agar koi is par kaam kare)

1. `subscription-status` aur `razorpay/create-subscription` par bhi rate-limiting add karo
   (same pattern jo `tones*` routes par already hai).
2. CI workflow add karo (`typecheck` + `lint` + `test` har PR par).
3. Extension-side integration tests (jaise Playwright se real WhatsApp Web/LinkedIn session
   simulate karke adapters verify karna).
4. Global/server-wide request budget (circuit breaker) design karo agar AI-bill par hard ceiling
   chahiye ho — ye ek product decision hai (kitna cap sahi hai), engineering decision nahi.
5. Root `README.md` ko is `docs/` folder ke content se sync karo, ya ise hi single source of truth
   bana do aur root README ko chhota reference bana do.
