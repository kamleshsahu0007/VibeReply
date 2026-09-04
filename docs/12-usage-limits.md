# 12 — Usage Limits & Tiers (User ke paas kitni limit hai?)

Ye limits **extension-side** (`extension/lib/trial.js`) enforce hoti hain — client-side, purely
local (`chrome.storage.local`), koi server-side account/entitlement system abhi nahi hai. Server ka
rate-limiter (dekho [08-rate-limiting-security.md](08-rate-limiting-security.md)) ek alag,
**abuse-protection** cheez hai — ye tier/pricing enforcement karta hai.

## Teen tiers

| Tier | Kab | Limit |
| --- | --- | --- |
| **`pro_trial`** | Install ke pehle **30 din** (`TRIAL_DAYS = 30`) | ✅ Unlimited — koi daily cap nahi |
| **`free`** | 30 din ke baad, agar subscribe nahi kiya | ⚠️ **5 generations/day** (`FREE_DAILY_LIMIT = 5`) |
| **`pro`** (paid) | Jab tak Razorpay subscription `active` hai | ✅ Unlimited |

### Kaise decide hota hai konsa tier?

```js
getTierState() {
  elapsedDays = (aaj - installationDate) / 1 din
  trialActive = elapsedDays < 30
  return trialActive ? 'pro_trial' : 'free'
}
```

- `installationDate` sirf ek baar set hoti hai (`chrome.runtime.onInstalled`), extension re-install
  na kiya jaaye to badalti nahi.
- **PRO subscription hamesha jeetta hai** — agar `isSubscribed === true`, tier check hi skip ho
  jaata hai, seedha unlimited access.

### "5 generations/day" ka matlab kya hai exactly?

- **Ek "generation"** = ek reply-generate call **ya** ek translate call (dono kind count hote hain,
  ek hi daily total me).
- **Din UTC-based hai** (`dayKey()` — `YYYY-MM-DD`, `toISOString()` se).
- Counter `dailyUsage[today].total` — jaise hi `5` touch hota hai, agli request block ho jaati hai
  (`allowed: false, reason: 'daily_limit_reached'`).
- **Har din midnight UTC par apne aap reset ho jaata hai** (naya date-key start hota hai) — koi
  manual reset nahi chahiye.

### Jab limit lag jaaye, user ko kya dikhta hai?

```js
{
  allowed: false,
  tier: 'free',
  reason: 'daily_limit_reached',
  usedToday: 5,
  limit: 5,
  minutesSaved: <trailing-7-days ka real usage-based estimate>
}
```

Extension isi data se paywall UI dikhata hai — including ek "tumne itna time bacha liya hai"
message (real usage se calculate hota hai, fixed number nahi — dekho neeche).

## Additional client-side safety: request rate limiter

`background.js` ka token-bucket (`capacity: 5, refillPerSec: 0.5`) — ye daily-limit se **alag**
hai, ye sirf "bahut jaldi-jaldi click karne" se bachata hai (burst protection), daily quota se koi
lena-dena nahi.

## Habit-stats (limit nahi, lekin isi module me hai)

`getStats()` — popup me dikhta hai:

- **Streak**: consecutive days jisme kam-se-kam 1 generation use hui (Duolingo-style — aaj abhi
  use nahi kiya to bhi kal tak streak break nahi hoti, poora din miss hone par hi break hoti hai).
- **Lifetime totals**: total words generated, total generations (kabhi prune nahi hote, forever
  accumulate).
- **Time saved this week**: trailing 7-din ka real usage × 60 seconds/use estimate. Fixed number
  har user ko nahi dikhaya jaata — jisne use hi nahi kiya, uska 0 hi dikhega.

## ⚠️ Important limitation — ye ek REAL server-side entitlement system nahi hai

`trial.js` ke apne comment ke mutabik:

> *"Quota is enforced against chrome.storage.local only — there's no server-side account/
> entitlement system yet... this is a soft, client-side gate rather than real enforcement. It
> stops accidental overuse, not a user who opens devtools and edits their own storage."*

Matlab: koi bhi technically-savvy user apna `chrome.storage.local` edit karke daily-limit/trial
bypass kar sakta hai — kyunki extension code khud client ke paas hi run hota hai. Iska asli
purpose **accidental overuse rokna** hai, dishonest users ko poori tarah rokna nahi. Asli
cost-protection (jaise koi script se bina extension ke seedha API hit kare) **server-side
rate-limiter** (`/api/generate-replies` — 20 req/min per-client) se aati hai, jo bypass karna
zyada mushkil hai.

## Quick summary table

| Question | Answer |
| --- | --- |
| Naya install kitne din free-unlimited chalega? | 30 din (`TRIAL_DAYS`) |
| Trial khatam hone ke baad free tier ki daily limit? | 5 generations/din (`FREE_DAILY_LIMIT`) |
| PRO subscriber ki limit? | Koi nahi (unlimited) |
| Limit kaha enforce hoti hai? | Client-side (`chrome.storage.local`) — soft gate |
| Server-side abuse protection kya hai? | IP-based rate limiter, `/api/generate-replies` par 20 req/min (env-configurable) |
| Din kab reset hota hai? | Midnight UTC |
