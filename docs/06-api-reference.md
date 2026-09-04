# 06 — API Reference

Base URL:
- Production: `https://vibe-reply-seven.vercel.app`
- Local dev: `http://localhost:3000`

Saare routes `src/app/api/**/route.ts` me define hain, Next.js App Router convention follow karte
hain. Har route apna `OPTIONS` handler khud deta hai (CORS preflight ke liye).

## Common conventions

- **Success response** hamesha `{ "success": true, ... }` shape me.
- **Error response** hamesha:
  ```json
  { "success": false, "error": { "code": "SOME_CODE", "message": "...", "details": "..." } }
  ```
- **Header `X-Device-Id`** — anonymous device identifier. Kuch routes optional (`generate-replies`,
  `tones` GET), kuch me **required** (`tones` POST/DELETE, `subscription-status`,
  `razorpay/create-subscription`) — required hone par missing hone se `400 VALIDATION_ERROR`.
- **CORS**: `ALLOWED_ORIGIN` env var se control hota hai (default `*`). Allowed headers:
  `Content-Type, X-Device-Id`.

---

## `POST /api/generate-replies`

Main AI endpoint — reply generate karta hai, draft rewrite karta hai, ya text translate karta hai
(teeno ek hi route se, `task` field se decide hota hai).

**Server-side rate limit**: haan (default 20 req/min per client — dekho
[08-rate-limiting-security.md](08-rate-limiting-security.md))

### Request body

```jsonc
{
  "task": "reply",              // "reply" (default) | "rewrite" | "translate"
  "messages": [                  // task=reply ke liye required (non-empty), max 50
    { "sender": "Riya", "text": "tu kal aaya hi nahi 🙄", "type": "incoming" },
    { "sender": "me", "text": "yaar so gaya tha sorry", "type": "outgoing" }
  ],
  "draft": "...",                // task=rewrite ke liye required — apna draft jo restyle karna hai
  "partnerTone": "frustrated",   // optional — dusra insaan kaise baat kar raha hai (override)
  "toneKeys": ["soft", "mature"],// optional — sirf in tones ke liye generate karo (omit = sab active tones)
  "userLanguage": "en",          // default "en"
  "partnerLanguage": "hi",       // optional — omit karne par model khud detect karta hai
  "text": "...",                 // task=translate ke liye required — translate karne wala text
  "targetLanguage": "es",        // task=translate ke liye required
  "sourceLanguage": "en"         // task=translate — optional, omit = auto-detect
}
```

**`messages[].type`**: `"incoming"` (dusra insaan) ya `"outgoing"` (khud user).

**`partnerTone` allowed values**: `formal`, `friendly`, `angry`, `frustrated`, `urgent`, `casual`,
`direct`, `confused`, `professional`, `neutral`.

**Headers**: `X-Device-Id` (optional — omit karne par sirf global default tones use hote hain).

### Success response (task=reply/rewrite) — `200`

```json
{
  "success": true,
  "replies": {
    "soft": { "text": "arey sorry yaar, so gaya tha 😴 kal pakka chalte hain?" },
    "mature": { "text": "sorry, neend lag gayi thi. kal free hoon, plan karte hain?" }
  },
  "meta": {
    "model": "models/gemini-3.6-flash",
    "latencyMs": 1200,
    "task": "reply",
    "detectedPartnerTone": "frustrated",
    "usedPartnerTone": "frustrated",
    "userLanguage": "en",
    "partnerLanguage": "hi",
    "detectedLanguage": { "language": "Hindi", "languageCode": "hi", "confidence": 0.92 }
  }
}
```

Note: `translated` field har reply-variant me tab present hota hai jab `partnerLanguage` alag ho
`userLanguage` se (same generation call me, dusri koi API call nahi hoti).

### Success response (task=translate) — `200`

```json
{
  "success": true,
  "translatedText": "...",
  "meta": {
    "model": "models/gemini-3.6-flash",
    "latencyMs": 800,
    "task": "translate",
    "sourceLanguage": "en",
    "targetLanguage": "es",
    "detectedLanguage": { "language": "English", "languageCode": "en", "confidence": 0.98 }
  }
}
```

### Response headers (success)

`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` (unix seconds), `X-Request-Id`.

### Error codes

| Code | HTTP Status | Kab hota hai |
| --- | --- | --- |
| `VALIDATION_ERROR` | 400 | Zod validation fail (galat body shape) |
| `RATE_LIMIT_EXCEEDED` | 429 | Server-side rate limit exceed (header `Retry-After` milta hai) |
| `UPSTREAM_TIMEOUT` | 504 | AI model timeout ho gaya |
| `UPSTREAM_ERROR` | 502 | AI provider ne error diya |
| `INVALID_MODEL_OUTPUT` | 502 | Model ne malformed/incomplete JSON diya |
| `BAD_REQUEST` | 499 | Client ne request abort kar di (browser tab close/navigate) |
| `INTERNAL_ERROR` | 500 | Anexpected server error |

---

## `GET /api/tones`

Device ke liye effective tone list return karta hai (global defaults + device-specific
overrides/custom tones, merged).

**Rate limit**: haan (60 req/min — separate bucket, generate-replies se alag)

**Headers**: `X-Device-Id` (optional — omit karne par sirf global defaults milte hain)

### Response — `200`

```json
{
  "success": true,
  "tones": [
    {
      "id": "uuid...",
      "key": "funny",
      "name": "Funny",
      "description": "Playful and witty...",
      "formality": 15, "warmth": 60, "conciseness": 60, "directness": 50,
      "vocabularyStyle": "simple", "emojiPreference": "minimal", "sentenceStyle": "short",
      "customInstructions": "...",
      "isCustom": false, "isActive": true, "sortOrder": 0
    }
  ]
}
```

---

## `POST /api/tones`

Naya custom tone banao (`key` omit karo) ya existing tone edit karo (uska `key` pass karo — default
ya custom dono ho sakta hai).

**Rate limit**: haan (60 req/min)

**Headers**: `X-Device-Id` **(required)** — na diya to `400 VALIDATION_ERROR`.

### Request body

```json
{
  "key": "funny",                 // optional — present = edit, absent = naya custom tone
  "name": "Funny",                // required
  "description": "...",           // required
  "formality": 15, "warmth": 60, "conciseness": 60, "directness": 50,  // sab optional, 0-100
  "vocabularyStyle": "simple",    // optional: simple | neutral | advanced
  "emojiPreference": "minimal",   // optional: none | minimal | frequent
  "sentenceStyle": "short",       // optional: short | balanced | flowing
  "customInstructions": "...",    // optional, max 500 chars, null bhi ho sakta hai
  "isActive": true,               // optional
  "sortOrder": 0                  // optional
}
```

Agar `key` naya diya (jo koi default tone se match nahi karta), naya row `isCustom: true` ke saath
banta hai. Agar `key` omit kiya, naam se auto-slugify hoke naya key banta hai (jaise `"My Tone"` →
`"my-tone"`).

### Response — `200`

```json
{ "success": true, "tone": { "id": "...", "key": "...", ... } }
```

### Error codes

`VALIDATION_ERROR` (400, missing `X-Device-Id` ya bad body), `RATE_LIMIT_EXCEEDED` (429),
`INTERNAL_ERROR` (500).

---

## `DELETE /api/tones/:key`

Custom tone poori tarah delete karta hai, ya default tone ke device-override ko revert kar deta hai
(global default wapas active ho jaata hai).

**Rate limit**: haan (60 req/min)

**Headers**: `X-Device-Id` **(required)**

### Response — `200`

```json
{ "success": true }
```

---

## `POST /api/razorpay/create-subscription`

PRO subscription ke liye Razorpay checkout link banata hai.

**Rate limit**: ⚠️ **abhi nahi hai** — dekho [15-known-issues-roadmap.md](15-known-issues-roadmap.md).

**Headers**: `X-Device-Id` **(required)**

### Response — `200`

```json
{ "success": true, "url": "https://rzp.io/i/xxxxxxx" }
```

### Error codes

- `VALIDATION_ERROR` (400) — `X-Device-Id` missing
- `NOT_CONFIGURED` (503) — `RAZORPAY_PLAN_ID` env var set nahi hai
- `INTERNAL_ERROR` (500) — Razorpay API call fail

Subscription 120 monthly cycles (10 saal) ke liye create hoti hai — Razorpay me Stripe jaisa
"indefinite until cancelled" option nahi hai, isliye ye ek practical approximation hai. User kabhi
bhi cancel kar sakta hai (webhook se handle hota hai).

---

## `POST /api/razorpay/webhook`

Razorpay ke apne servers se call hota hai (browser/extension se kabhi nahi) — subscription
lifecycle events yaha aate hain.

**Auth**: koi CORS nahi (server-to-server hai). `X-Razorpay-Signature` header se HMAC signature
verify hoti hai (`RAZORPAY_WEBHOOK_SECRET` se) — invalid signature = `400`.

**Handled events**:

| Event | Action |
| --- | --- |
| `subscription.activated`, `subscription.charged` | Device ko `subscriptionStatus: "active"` set karta hai (deviceId, `notes.deviceId` se milta hai jo checkout ke waqt attach kiya gaya tha) |
| `subscription.cancelled`, `subscription.completed`, `subscription.halted`, `subscription.paused` | Device ka status Razorpay ke bheje hue status se update hota hai |

### Response

`{ "received": true }` (200) ya error object with matching status code.

---

## `GET /api/subscription-status`

Device PRO subscriber hai ya nahi, check karta hai.

**Rate limit**: ⚠️ **abhi nahi hai**

**Headers**: `X-Device-Id` **(required)**

### Response — `200`

```json
{ "success": true, "subscribed": true }
```

---

## `GET /api/health`

Simple uptime/health check — monitoring ke liye.

### Response — `200`

```json
{ "success": true, "service": "vibereply", "uptime": 12345.6, "timestamp": "2026-09-04T10:00:00.000Z" }
```

---

## Quick reference table

| Route | Method | Auth Header | Rate Limited? | Purpose |
| --- | --- | --- | --- | --- |
| `/api/generate-replies` | POST | `X-Device-Id` optional | ✅ 20/min | Reply/rewrite/translate generation |
| `/api/tones` | GET | `X-Device-Id` optional | ✅ 60/min | Effective tone list |
| `/api/tones` | POST | `X-Device-Id` **required** | ✅ 60/min | Create/edit tone |
| `/api/tones/:key` | DELETE | `X-Device-Id` **required** | ✅ 60/min | Delete/revert tone |
| `/api/razorpay/create-subscription` | POST | `X-Device-Id` **required** | ❌ | PRO checkout link |
| `/api/razorpay/webhook` | POST | Razorpay signature | ❌ (not applicable) | Payment lifecycle events |
| `/api/subscription-status` | GET | `X-Device-Id` **required** | ❌ | PRO status check |
| `/api/health` | GET | — | ❌ | Uptime check |
