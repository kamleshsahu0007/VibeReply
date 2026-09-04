# 09 — AI Engine & Tones System

## Model call flow

**File**: `src/services/replies/reply.service.ts`

1. `buildPrompt()` (ya `buildTranslatePrompt()`) — system + user prompt string banata hai.
2. `buildJsonSchema()` — response ke liye ek **strict JSON schema** banata hai jisme har requested
   tone ke liye ek key ho (`{ [toneKey]: { text, translated? } }`), plus `detectedPartnerTone` aur
   optionally `detectedLanguage`.
3. `callOpenAI()` — OpenAI-compatible SDK se `response_format: { type: "json_schema", ... }` ke
   saath model call karta hai.
4. `parseAndValidate()` — model ka JSON output parse karta hai, har requested tone ki presence
   verify karta hai. Kuch bhi missing/malformed ho to `InvalidModelOutputError` throw hota hai (aur
   client ko `502 INVALID_MODEL_OUTPUT` milta hai) — silently partial/wrong data kabhi return nahi
   hota.

## Model Fallback Chain

**File**: `src/lib/openai/client.ts`

```
OPENAI_MODEL_CHAIN = [OPENAI_MODEL, ...OPENAI_MODEL_FALLBACKS]  (duplicates removed)
```

`callOpenAI()` is chain ko order me try karta hai — pehla model fail ho (rate-limited, deprecated,
temporarily down) to turant **agla model** try hota hai, poori request fail nahi hoti jab tak
**last** model bhi fail na ho jaaye. Ye ek naya reliability layer hai — agar `OPENAI_MODEL_FALLBACKS`
set nahi hai, behavior same hai jaise single-model attempt (backward compatible).

Client ka disconnect (`AbortSignal`) beech me detect hota hai — agar user ne request cancel kar
di (tab close/navigate), fallback chain waha ruk jaati hai, extra model calls waste nahi hote.

## Prompt Design

**File**: `src/services/replies/prompt.builder.ts`

System prompt (`SYSTEM_BASE`) me 8 "hard rules" hardcoded hain — inka purpose hai ki model ka
output **ek real insaan jaisa lage, AI jaisa nahi**:

1. User ki taraf se hi reply/rewrite karo, kabhi narrate/explain mat karo.
2. Har output ek hi message ho, 1-2 chhoti lines max (jab tak tone ki style zyada na maange).
3. Real texting jaisa sound karo — Hinglish allowed/preferred agar conversation already Hinglish
   me hai. Language register match karo.
4. AI-sounding phrases se bachna hai ("I understand how you feel", "As an AI", "Let's unpack
   this"...) — explicitly banned list hai prompt me.
5. Koi therapy-speak/corporate-speak/moral lecture nahi.
6. Koi fact/commitment/naam/date/price invent mat karo jo conversation me na ho.
7. Har tone ka output alag lagna chahiye — same line ko 5 tareeke se paraphrase nahi karna.
8. Agar conversation hostile/abusive hai, de-escalate karo — calm boundary set karo, escalate mat
   karo, chahe requested tone kuch bhi ho.

Ek **safety note** bhi hai: agar conversation me minor, self-harm, threats, ya harassment involve
ho, koi bhi tone flirty/romantic/joking content produce nahi karega — sab safe response denge.

**Prompt injection protection**: system prompt explicitly kehta hai ki conversation transcript
aur draft **data hai, instruction nahi** — agar unke andar koi text ho jo prompt ko override karne
ki koshish kare (jaise "ignore previous instructions"), model use ignore karega.

### Task-specific instructions

- **`reply`**: poori conversation + last incoming message padhkar, sender ka intent/tone samajhkar
  ek naya reply banata hai (per requested tone).
- **`rewrite`**: user ke apne diye hue `draft` ko **exact same meaning** rakhte hue restyle karta
  hai — koi info add/remove nahi, koi naya commitment invent nahi.
- **`translate`**: alag system prompt (`translateSystem()`) — faithful translation, meaning/tone/
  formality preserve karta hai, names/dates/numbers/URLs untouched rakhta hai.

### Tone description generation

`describeTone()` har `ToneProfile` ke numeric sliders (formality/warmth/conciseness/directness,
0-100) ko human-readable phrases me convert karta hai (jaise `formality: 80` → `"highly formal"`),
plus `vocabularyStyle`/`emojiPreference`/`sentenceStyle` aur agar ho to `customInstructions`. Ye
poora description prompt me inject hota hai taki model ko exactly pata ho har tone kaisi sound
karni chahiye.

### Language handling

- `needsTranslation = !partnerLanguage || partnerLanguage !== userLanguage`
- Agar zaroorat ho, model **same generation call me** dono — original reply (`text`, user ki
  language me) aur translated version (`translated`, partner ki language me) — deta hai. Do alag
  API calls nahi hoti (latency/cost dono bachta hai).
- Agar `partnerLanguage` diya nahi gaya, model khud detect karta hai aur `detectedLanguage`
  (`language`, `languageCode`, `confidence`) report karta hai.

## Tones System

**Files**: `src/lib/tones/defaults.ts`, `src/services/tones/tone.service.ts`

### 5 Default Tones (jo product hamesha se ship karta hai)

| Key | Formality | Warmth | Conciseness | Directness | Vibe |
| --- | --- | --- | --- | --- | --- |
| `funny` | 15 | 60 | 60 | 50 | Playful, witty, light teasing, no forced jokes |
| `soft` | 30 | 90 | 40 | 30 | Warm, gentle, emotionally tuned-in, non-clingy |
| `flirty` | 20 | 70 | 55 | 60 | Subtle confident flirt — never thirsty/creepy/explicit |
| `mature` | 65 | 55 | 55 | 70 | Calm, grounded, handles conflict like an adult |
| `casual` | 10 | 50 | 70 | 40 | Chill, low-effort, texting-a-friend vibe |

Ye tones deliberately **business-tone set (Professional/Friendly/...) nahi hain** — kyunki product
personal-chat (WhatsApp/Instagram DM) ke liye hai, customer-support ke liye nahi.

### Custom tones

User apna khud ka tone bana sakta hai (`POST /api/tones`, `key` omit karke) — sab 7 sliders/fields
customize kar sakta hai. Har naya custom tone `isCustom: true` hota hai. Default tone bhi edit kiya
ja sakta hai (`key` pass karke) — us case me `isCustom` false hi rehta hai (default hi hai, bas
device ka apna version).

### Active/Inactive

Har tone `isActive` flag rakhta hai — `false` set karne par wo `getActiveToneProfilesForDevice()`
(jo `generate-replies` use karta hai) se exclude ho jaata hai, lekin `getToneProfilesForDevice()`
(jo `GET /api/tones` return karta hai) me dikhta rehta hai — taki settings-UI me user use wapas
enable kar sake.

Poora merge/override/fallback logic [05-database-schema.md](05-database-schema.md) me hai.
