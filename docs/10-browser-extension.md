# 10 — Browser Extension (Chrome MV3)

**Folder**: `extension/` · **Manifest version**: 3 · Koi bundler/framework nahi — plain JS.

## `manifest.json`

- **Content scripts**: `lib/languages.js`, `lib/storage.js`, `content.js` — `http://*/*` aur
  `https://*/*` par (matlab **practically har website**), `document_idle` par run hote hain,
  `all_frames: true` (iframes ke andar bhi), isolated JS world me.
- **Background**: `background.js`, ES module type ka service worker.
- **Permissions**: `storage`, `activeTab`, `unlimitedStorage`.
- **Host permissions**: `http://*/*`, `https://*/*` — sab sites tak network access.
- **CSP**: extension pages (popup) sirf `'self'` scripts allow karte hain, network connections
  sirf production backend (`vibe-reply-seven.vercel.app`) aur local dev URLs ko.
- **Web-accessible resources**: `styles.css` — content-script-injected panel ki styling ke liye.

## `background.js` — Service Worker (single source of truth)

Ye poore extension ka **sirf ek** jagah hai jaha network calls hoti hain. Content-script aur popup
kabhi directly `fetch()` nahi karte — hamesha `chrome.runtime.sendMessage()` use karte hain.

### Message routing table

| Message type | Handler | Kya karta hai |
| --- | --- | --- |
| `GENERATE_SUGGESTIONS` | `handleGenerate` | Reply/rewrite generate karta hai |
| `TRANSLATE_TEXT` | `handleTranslate` | Text translate karta hai |
| `SUGGESTION_FEEDBACK` | `handleFeedback` | Feedback backend ko bhejta hai (fire-and-forget) |
| `GET_PREFERENCES` | — | User preferences read karta hai (`chrome.storage.sync`) |
| `SET_PREFERENCES` | — | Preferences update + saare tabs ko broadcast |
| `LIST_TONES` | `handleListTones` | Tone list (cached, 5-min TTL) |
| `SAVE_TONE` | `handleSaveTone` | Tone create/edit, cache invalidate |
| `DELETE_TONE` | `handleDeleteTone` | Tone delete, cache invalidate |
| `CLEAR_ALL_CONVERSATIONS` | `handleClearAllConversations` | Saare tabs ko local-storage clear karne ka signal |
| `OPEN_CHECKOUT` | `handleOpenCheckout` | Razorpay checkout tab khol deta hai |
| `GET_STATS` | `handleGetStats` | Habit stats (streak, words, time-saved) — no network, pure local |
| `PING` | — | Health check (`{ pong: timestamp }`) |

### Identity

`getDeviceId()` — pehli baar `crypto.randomUUID()` se generate hota hai,
`chrome.storage.sync` me persist hota hai (Chrome sync enabled ho to same Google account ke saare
devices me sync hota hai). Har API call me `X-Device-Id` header ke roop me jaata hai.

### HTTP client (`apiFetch`)

- 20-second timeout (`AbortController`), plus caller ka apna signal bhi honor hota hai
  (`anySignal()` helper dono ko merge karta hai).
- Har request me headers: `Content-Type`, `X-Client: vibereply-ext/1.0.0`, `X-Device-Id`, aur agar
  session-scoped access token ho to `Authorization: Bearer ...`.
- `credentials: 'omit'` — koi cookies nahi bheji jaati.
- Non-2xx response par `ApiError` throw hota hai — `401` mila to session token clear ho jaata hai.

### Client-side token-bucket rate limiter

```js
RATE_LIMIT: { capacity: 5, refillPerSec: 0.5 }  // 5 burst, ~1 request/2 seconds
```

Ye **UX ke liye** hai — backend tak jaane se pehle hi user ko "slow down" feedback mil jaaye. Ye
security boundary nahi hai (extension code hi hai, koi bhi ise bypass kar sakta hai) — asli
protection server-side rate-limiter hai (dekho [08-rate-limiting-security.md](08-rate-limiting-security.md)).

### Caching

- **Subscription status**: 5-min TTL, memory + `chrome.storage.local`. Checkout khulne par turant
  invalidate ho jaata hai taki payment ke baad turant PRO access mile.
- **Tones list**: 5-min TTL, memory + `chrome.storage.session` (browser session close hone par
  clear ho jaata hai). Kyu chahiye: content-script har open tab me tone-list maangta hai — bina
  cache ke "N tabs open = N backend calls" ho jaata, cache se "~1 call per window" ho jaata hai.

### Config override (dev ke liye)

```js
chrome.storage.local.set({ apiBase: 'http://localhost:3000' })
```

## `content.js` — Per-site DOM Adapters + Floating Panel

**1907 lines** — sabse bada file. Har supported chat-platform ke liye ek "adapter" object hai jo
teen kaam karta hai:

1. `getComposeBox()` — us site ka text-input/compose area dhundhna.
2. `getConversationContext()` — visible messages padhna, `{ sender, text, type }` shape me.
3. `insertIntoCompose()` — generated text ko compose box me daalna.

### Adapters

| Adapter | Status | Notes |
| --- | --- | --- |
| `createWhatsAppAdapter()` | ✅ **Verified** (original shipped integration) | WhatsApp Web ke DOM structure ke liye tuned |
| `createLinkedInAdapter()` | ⚠️ **Best-effort** | Commonly-documented LinkedIn DOM se banaya, live session par verify nahi hua |
| `createGmailAdapter()` | Present | |
| `createSlackAdapter()` | Present | |
| `createTeamsAdapter()` | Present | |
| `createUniversalAdapter()` | Fallback | Kisi bhi generic `<textarea>`/`contenteditable` site ke liye |

Konsa adapter use hoga, ye current page ke hostname se decide hota hai (`getAdapterForHost()`).

### Floating panel

Content script ek chhota floating icon/panel inject karta hai jo compose box ke paas dikhta hai.
User isi se "Reply"/"Rewrite"/"Translate" trigger karta hai — panel `chrome.runtime.sendMessage()`
se `MSG.GENERATE`/`MSG.TRANSLATE` bhejta hai aur response ko options ke roop me dikhata hai.

### Popup se bhi commands aa sakte hain

Popup (toolbar icon click) bhi content-script ko messages bhej sakta hai (jaise "insert this text"),
`chrome.tabs.sendMessage()` se — active tab ka adapter + compose box independently re-derive hota
hai taki popup ka koi stale reference na ho.

## `popup.js` / `popup.html` — Toolbar UI

**770 lines**. Extension icon click karne par khulne wala UI:

- Reply/rewrite quick-actions
- Tone editor (settings)
- Habit-stats card (streak, words generated, time saved — `GET_STATS` se)
- Checkout/upgrade button (`OPEN_CHECKOUT`)
- Language preferences

## `extension/lib/` — Shared client-side modules

| File | Purpose |
| --- | --- |
| `trial.js` | Free-tier quota, 30-day PRO trial, usage stats logic — detail [12-usage-limits.md](12-usage-limits.md) |
| `storage.js` | Per-origin **IndexedDB** — conversation history cache. Composite fingerprint-based dedup (`conversationId::sender::order::first-120-chars`) |
| `languages.js` | ~180 ISO-639-1 language code→name table, UI dropdowns ke liye (actual translation/detection backend AI karta hai, ye sirf UI list hai) |

### `storage.js` design note

Har website (WhatsApp, LinkedIn, ...) apna alag origin hai, isliye IndexedDB automatically
per-platform separate ho jaata hai — koi cross-platform data-leak design karna nahi padta.
Messages **fingerprint** se identify hote hain (hash nahi) taki same message dobara scan hone par
`store.put()` naturally idempotent overwrite ho (dedup), aur short messages (jaise "ok") bhi
sahi se distinguish ho jaayein (`order` position bhi fingerprint me shamil hai).

## Preferences (defaults)

```js
{
  defaultTones: ['casual', 'soft', 'funny'],
  panelEnabled: true,
  zeroRetention: false,
  myLanguage: 'en',
  autoDetectPartnerLanguage: true,
  showTranslationAutomatically: true,
  showOriginalMessage: true,
  storeConversationLocally: true,
  maxStoredHistory: 500,          // 100 | 500 | 1000 | 'all'
  autoLoadOlderMessages: false,
}
```

`chrome.storage.sync` me store hoti hain — badalne par sab open tabs ko `PREFERENCES_UPDATED`
broadcast hota hai.

## Privacy control: "Clear all conversations"

Popup se trigger hota hai → background sab tabs ko `CLEAR_CONVERSATION_DATA` broadcast karta hai
→ har content-script apna khud ka origin ka IndexedDB clear karta hai. Jo platform ka tab open
nahi hai, uska data tab tak clear nahi hota jab tak wo next baar khula na jaaye.
