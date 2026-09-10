# 11 — Subscription & Billing (Stripe)

## Provider: Stripe (Global Launch)

VibeReply global launch ke liye **Stripe** payment gateway use karta hai (`prisma/migrations/20260910124700_switch_to_stripe/`).
Stripe worldwide 195+ countries me operate karta hai aur global scale ke liye gold standard hai:
- **135+ currencies support**: Users apni local currency (USD, EUR, GBP, INR, etc.) me pay kar sakte hain.
- **Global payment methods**: Visa, Mastercard, Amex, Apple Pay, Google Pay, iDEAL, SEPA Direct Debit, etc.
- **Truly open-ended recurring billing**: Automatic monthly renewals bina fixed cycle constraints ke.
- **Built-in promotions & discount codes**: `allow_promotion_codes: true` se global marketing campaigns ke coupons support hote hain.

## Flow (checkout → activation → cancellation)

```
1. Extension: "Upgrade" button → OPEN_CHECKOUT message → background.js
2. background.js → POST /api/stripe/create-checkout-session (X-Device-Id header ke saath)
3. Backend: Stripe Checkout Session create karta hai
   - mode = "subscription"
   - line_items = [{ price: STRIPE_PRICE_ID, quantity: 1 }]
   - client_reference_id = <device ka UUID>
   - subscription_data.metadata.deviceId = <device ka UUID>
   - metadata.deviceId = <device ka UUID>
   - allow_promotion_codes = true
   - success_url = APP_URL/?checkout=success
   - cancel_url = APP_URL/?checkout=cancelled
4. Backend response: { success: true, url: "<stripe checkout url>" }
5. Extension: naya browser tab khol deta hai us URL par → user Stripe ke hosted checkout par payment karta hai
6. Stripe: payment complete hone par apne server se webhook events bhejta hai (POST /api/stripe/webhook)
7. Backend webhook handler: signature verify karta hai → Device row ko update/upsert karta hai
8. Extension: subscription-status cache ko turant invalidate karta hai (checkout khulte hi) taki
   user wapas aane par turant PRO access mile (max SUBSCRIPTION_CACHE_TTL_MS ki der se, na ki purani cache se)
```

## Stripe Subscription Status Lifecycle

Stripe ke status strings backend me as-is store kiye jaate hain:
- `"active"`: Subscription paid aur up to date hai.
- `"trialing"`: Stripe-managed trial active hai.
- `"past_due"`: Payment renew attempt fail hua, Stripe retry kar raha hai.
- `"canceled"`: User ya admin ne cancel kar diya.
- `"unpaid"`: Retries exhaust hone ke baad bhi payment nahi hua.
- `"incomplete"`: Pehla payment fail hua.
- `"paused"`: Subscription temporarily pause hai.

**Dono `"active"` aur `"trialing"` PRO access grant karte hain** (`ACTIVE_STATUSES = new Set(["active", "trialing"])`).

## Webhook events handle kiye jaate hain

| Event | Action |
| --- | --- |
| `checkout.session.completed` | `upsertSubscriptionByDeviceId()` — `client_reference_id`/`metadata.deviceId` se device dhundta/banata hai, status `"active"`, aur `stripeCustomerId` + `stripeSubscriptionId` link karta hai |
| `customer.subscription.updated`, `customer.subscription.deleted` | `updateSubscriptionByStripeSubscriptionId()` — `stripeSubscriptionId` se device dhundta hai, aur Stripe ka naya status set karta hai |

Cancellation aur update events subscription object ko reference karte hain, isliye lookup **`stripeSubscriptionId`** se hoti hai jo checkout ke waqt save ho chuki hoti hai.

## Security

- Webhook route (`/api/stripe/webhook`) **koi CORS nahi rakhta** — Stripe ke apne servers se hi call hota hai, browser se kabhi nahi.
- **Signature verification mandatory hai** — `stripe-signature` header, `stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)` se check hoti hai. Invalid/missing signature = request reject (`400`).
- Webhook secret env-configured na ho to route `503` return karta hai (graceful degradation, crash nahi hota).

## `subscription.service.ts` — DB Layer

```ts
isDeviceSubscribed(deviceId)                                             // status === "active" || "trialing"
upsertSubscriptionByDeviceId(deviceId, { stripeCustomerId, stripeSubscriptionId, subscriptionStatus })
updateSubscriptionByStripeSubscriptionId(stripeSubscriptionId, subscriptionStatus)
```

## Extension side — kaise use hota hai

`background.js` ka `getSubscriptionStatus()` — 5-minute TTL cache ke saath `/api/subscription-status` check karta hai. Ye result `VRTrial.checkQuota(isSubscribed)` ko pass hota hai — **subscribed hona hamesha jeet jaata hai**, local trial/daily-limit logic ko override kar deta hai (dekho [12-usage-limits.md](12-usage-limits.md)).

Network fail ho jaaye to **last known cached value** use hoti hai (chahe stale ho) — na ki "assume subscribed" (fail-safe: galti se free access nahi milta) aur na hi turant "assume unsubscribed" (temporary network blip se paying user ko turant lock-out na ho).

## Configuration Prerequisites

Subscription flow tab tak kaam nahi karega jab tak ye env vars set na hon (dekho [07-environment-variables.md](07-environment-variables.md)):

`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `APP_URL`

Missing hone par checkout `503 NOT_CONFIGURED` deta hai, webhook `503` deta hai — koi crash nahi, graceful degradation.
