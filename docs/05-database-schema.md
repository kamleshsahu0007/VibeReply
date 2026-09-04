# 05 — Database Schema

**ORM**: Prisma 6 · **Database**: PostgreSQL · Schema file: `prisma/schema.prisma`

Sirf **2 models** hain — poora system deliberately simple rakha gaya hai (no login/user table,
identity anonymous device-id se hoti hai).

## Model 1 — `Device`

Ek row = ek browser-extension install (anonymous).

| Field | Type | Detail |
| --- | --- | --- |
| `id` | `String` (UUID, PK) | Client-side generate hota hai (`crypto.randomUUID()`), server bas store karta hai |
| `createdAt` | `DateTime` | Auto (`@default(now())`) |
| `razorpaySubscriptionId` | `String?` (unique) | Razorpay subscription ID — jab tak device ne kabhi subscribe na kiya ho, `null` |
| `subscriptionStatus` | `String?` | Razorpay ke raw status strings: `created`, `authenticated`, `active`, `pending`, `halted`, `cancelled`, `completed`, `expired` |
| `subscriptionUpdatedAt` | `DateTime?` | Last webhook update ka time |
| `toneProfiles` | relation | Is device ke saare custom/edited tones |

**Important**: Sirf `subscriptionStatus === "active"` hone par hi PRO access milta hai.
`"authenticated"` ka matlab hai mandate approve ho gaya hai lekin abhi tak charge nahi hua —
isliye wo access grant nahi karta (dekho `subscription.service.ts` ka comment).

Login/account system nahi hai — is `Device` model ko future me ek real `User` model se replace
kiya ja sakta hai (schema comment me explicitly likha hai: *"this is the seam a real User model
would replace"*).

## Model 2 — `ToneProfile`

Ek row = ek "tone" jisme AI reply generate karta hai (jaise "Funny", "Soft", ya user ka khud ka
banaya custom tone).

| Field | Type | Detail |
| --- | --- | --- |
| `id` | `String` (UUID, PK) | |
| `key` | `String` | Tone ka identifier, jaise `"funny"`. Global default aur device-override same `key` share karte hain |
| `deviceId` | `String?` (FK → Device) | `null` = global default (sabke liye), value ho to device-specific override/custom tone |
| `device` | relation | `onDelete: Cascade` — device delete hone par uske tones bhi delete |
| `name` | `String` | Display name, jaise `"Funny"` |
| `description` | `String` | Short description |
| `formality` | `Int` (0-100, default 50) | Kitna formal/casual |
| `warmth` | `Int` (0-100, default 50) | Kitna warm/reserved |
| `conciseness` | `Int` (0-100, default 50) | Kitna concise/elaborate |
| `directness` | `Int` (0-100, default 50) | Kitna direct/softened |
| `vocabularyStyle` | `String` (default `"neutral"`) | `simple` \| `neutral` \| `advanced` |
| `emojiPreference` | `String` (default `"none"`) | `none` \| `minimal` \| `frequent` |
| `sentenceStyle` | `String` (default `"balanced"`) | `short` \| `balanced` \| `flowing` |
| `customInstructions` | `String?` | Free-text extra guidance jo prompt me inject hoti hai |
| `isCustom` | `Boolean` (default `false`) | `true` = user-created naya tone, `false` = shipped default (chahe edited ho ya na ho) |
| `isActive` | `Boolean` (default `true`) | `false` ho to reply-generation me include nahi hota |
| `sortOrder` | `Int` (default `0`) | Display order |
| `createdAt` / `updatedAt` | `DateTime` | Auto |

**Unique constraint**: `@@unique([deviceId, key])` — ek device ke paas same key do baar nahi ho
sakti (global defaults ka `deviceId = null` isliye ek alag "namespace" hai).

### Merge logic (important business rule)

`tone.service.ts` ka `getToneProfilesForDevice()` function:

1. Saare global-default rows fetch karta hai (`deviceId = null`).
2. Agar `deviceId` diya hai, us device ke saare rows bhi fetch karta hai.
3. Dono ko `key` se merge karta hai — **device row hamesha global default ko override karta hai**
   agar same `key` ho.
4. Result: agar user ne "funny" tone edit kiya, to sirf usi device ko apna edited version dikhega,
   baaki sab default hi dekhenge. Agar user ne bilkul naya tone banaya (naya `key`), wo sirf usi
   device ke list me add ho jaata hai.

Delete karne par (`DELETE /api/tones/:key`):
- Agar wo tone **custom** tha (user ne banaya), poori tarah delete ho jaata hai.
- Agar wo ek **default tone ka override** tha, sirf override row delete hoti hai — global default
  wapas visible ho jaata hai (revert-to-default behavior).

## Seeding

`prisma/seed.ts` aur `tone.service.ts` ka `ensureGlobalDefaultsSeeded()` — dono jagah se 5 default
tones (`src/lib/tones/defaults.ts` se) seed ho sakte hain:

- `npm run db:seed` — manual, ek baar chalane ke liye.
- `ensureGlobalDefaultsSeeded()` — automatic, runtime par pehli request pe agar DB me koi global
  default na mile to khud seed kar deta hai (idempotent — dobara-dobara nahi karta, memory flag
  se skip karta hai warm instance par).

## Migrations

`prisma/migrations/` me teen migrations hain (chronological):

1. `20260826103112_init` — initial schema (`Device`, `ToneProfile`)
2. `20260903104021_add_stripe_subscription_fields` — subscription fields add hue (originally
   Stripe ke liye)
3. `20260903115041_switch_to_razorpay` — Stripe se Razorpay par switch (India-first, kyunki Stripe
   ne India-based businesses ka onboarding band kar diya)

Ye migration history batata hai ki payment-provider decision recently badla — dekho
[11-subscription-billing.md](11-subscription-billing.md) is switch ki poori detail ke liye.

## Fail-safe fallback (koi bhi crash na ho)

Agar DB unreachable ho ya query fail ho jaaye, `getToneProfilesForDevice()` hardcoded
`DEFAULT_TONE_PROFILES` (`src/lib/tones/defaults.ts`) return kar deta hai — reply-generation
kabhi bhi sirf DB down hone ki wajah se completely fail nahi hota, worst case sirf device-level
customization temporarily miss ho jaati hai.
