# 11 — Subscription & Billing (Razorpay)

## Provider: Razorpay (India-first)

Migration history batati hai ki payment provider **Stripe se Razorpay** par switch kiya gaya
(`prisma/migrations/20260903115041_switch_to_razorpay/`) — kyunki *Stripe ne India-based
businesses ka naya onboarding band kar diya*, isliye Razorpay India ke liye primary provider ban
gaya. International customers ke liye dusra provider add karna future me ek **separate, additive**
integration hoga (isse touch nahi karega).

## Flow (checkout → activation → cancellation)

```
1. Extension: "Upgrade" button → OPEN_CHECKOUT message → background.js
2. background.js → POST /api/razorpay/create-subscription (X-Device-Id header ke saath)
3. Backend: Razorpay subscription create karta hai
   - plan_id = RAZORPAY_PLAN_ID
   - total_count = 120 (monthly cycles — ~10 saal, "indefinite" ka approximation)
   - notes.deviceId = <device ka UUID>   ← ye baad me webhook events me wapas milta hai
4. Backend response: { success: true, url: "<razorpay checkout short_url>" }
5. Extension: naya browser tab khol deta hai us URL par → user Razorpay ke checkout par payment karta hai
6. Razorpay: payment complete hone par apne server se webhook events bhejta hai (POST /api/razorpay/webhook)
7. Backend webhook handler: signature verify karta hai → Device row ko update/upsert karta hai
8. Extension: subscription-status cache ko turant invalidate karta hai (checkout khulte hi) taki
   user wapas aane par turant PRO access mile (max SUBSCRIPTION_CACHE_TTL_MS ki der se, na ki purani cache se)
```

## Razorpay Subscription Status Lifecycle

Razorpay khud ye status strings bhejta hai, backend inhe **as-is store karta hai** (apna koi enum
nahi banaya — webhook handler seedha passthrough karta hai):

```
created → authenticated (mandate approved, abhi charge nahi hua) → active (pehla charge success)
   → ... → cancelled / completed / expired / halted (payment fail)
```

**Sirf `"active"` PRO access grant karta hai.** `"authenticated"` alone kaafi nahi hai — mandate
approve hona aur pehla charge success hona alag cheezein hain
(dekho `subscription.service.ts` ka comment).

## Webhook events handle kiye jaate hain

| Event | Action |
| --- | --- |
| `subscription.activated`, `subscription.charged` | `upsertSubscriptionByDeviceId()` — `notes.deviceId` se device dhundta/banata hai, status `"active"` set karta hai |
| `subscription.cancelled`, `subscription.completed`, `subscription.halted`, `subscription.paused` | `updateSubscriptionByRazorpaySubscriptionId()` — `razorpaySubscriptionId` se device dhundta hai (ye pehli activation ke time se save hota hai), Razorpay ka diya hua status set karta hai |

Cancellation events me deviceId directly nahi milta (event sirf subscription-related hota hai),
isliye lookup **`razorpaySubscriptionId`** se hoti hai — ye activation ke time `Device` row par
already save ho chuka hota hai.

## Security

- Webhook route (`/api/razorpay/webhook`) **koi CORS nahi rakhta** — Razorpay ke apne servers se
  hi call hota hai, browser se kabhi nahi.
- **Signature verification mandatory hai** — `X-Razorpay-Signature` header, `Razorpay.
  validateWebhookSignature(rawBody, signature, RAZORPAY_WEBHOOK_SECRET)` se check hoti hai.
  Invalid/missing signature = request reject (`400`).
- Webhook secret env-configured na ho to route `503` return karta hai (crash nahi hota).

## `subscription.service.ts` — DB Layer

```ts
isDeviceSubscribed(deviceId)                                    // status === "active"?
upsertSubscriptionByDeviceId(deviceId, { razorpaySubscriptionId, subscriptionStatus })
updateSubscriptionByRazorpaySubscriptionId(razorpaySubscriptionId, subscriptionStatus)
```

## Extension side — kaise use hota hai

`background.js` ka `getSubscriptionStatus()` — 5-minute TTL cache ke saath `/api/subscription-status`
check karta hai. Ye result `VRTrial.checkQuota(isSubscribed)` ko pass hota hai — **subscribed hona
hamesha jeet jaata hai**, local trial/daily-limit logic ko override kar deta hai (dekho
[12-usage-limits.md](12-usage-limits.md)).

Network fail ho jaaye to **last known cached value** use hoti hai (chahe stale ho) — na ki
"assume subscribed" (fail-safe: galti se free access nahi milta) aur na hi turant "assume
unsubscribed" (temporary network blip se paying user ko turant lock-out na ho).

## Configuration Prerequisites

Subscription flow tab tak kaam nahi karega jab tak ye 4 env vars set na hon (dekho
[07-environment-variables.md](07-environment-variables.md)):

`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_PLAN_ID`, `RAZORPAY_WEBHOOK_SECRET`

Missing hone par checkout `503 NOT_CONFIGURED` deta hai, webhook `503` deta hai — koi crash nahi,
graceful degradation.
