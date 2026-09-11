# 11 — Subscription & Billing (Lemon Squeezy MoR & Multi-Tier Plans)

## Provider: Lemon Squeezy (Merchant of Record)

VibeReply uses **Lemon Squeezy** as its global Merchant of Record (MoR) for digital subscription billing.
Lemon Squeezy acts as the legal reseller, which solves all cross-border regulatory complexities:
- **Zero RBI/FEMA or Indian Export Compliance Friction**: Lemon Squeezy handles global payment collection, currency conversion, and sales taxes.
- **Global Payment Methods**: Visa, Mastercard, American Express, Discover, Apple Pay, Google Pay, and PayPal.
- **Automated Tax Compliance**: Calculates and remits US sales tax, EU VAT, UK VAT, and GST worldwide.
- **Automatic Inward Payouts**: Payouts settle directly to Indian bank accounts or Payoneer in regular cycles.

---

## Multi-Tier Pricing Structure

As designed on the official landing page (`/#pricing`), VibeReply offers three distinct tiers:

| Tier | Price | Model | Features Included |
| :--- | :--- | :--- | :--- |
| **Free Trial** | **Free / 7 days** | `gpt-4o-mini` | • Up to 50 AI posts & replies<br>• Basic posts/replies for X, LinkedIn, Facebook<br>• 3 post tones & 4 reply tones<br>• 15 topic categories |
| **Standard** *(Most Popular)* | **$4.99 / month** | `gpt-4o` | • **Unlimited** AI replies and posts<br>• Advanced X, LinkedIn & Facebook support<br>• Multilingual support (180+ languages)<br>• 4 post tones & 5 reply tones<br>• 25 topic categories<br>• Priority support |
| **Premium** | **$7.99 / month** | `gpt-5` | • **Everything in Standard**<br>• Custom topics & tone creation<br>• AI meme generator<br>• 1-on-1 VIP support |

---

## Flow (Browser Extension / Web → Checkout → Activation)

```text
1. User clicks "Get Started" (Standard) or "Go Premium" (Premium) on the web or in the extension.
2. Client sends POST /api/lemonsqueezy/create-checkout with:
   - Header: X-Device-Id: <anonymous device UUID>
   - Body: { tier: "standard" | "premium" }
3. Backend:
   - Rate limit check (max 10 checkout creations/min per IP)
   - Calls Lemon Squeezy API (/v1/checkouts) with:
     - variant_id (configured per tier)
     - checkout_data.custom = { deviceId, tier }
     - product_options.redirect_url = APP_URL/?checkout=success
4. Backend responds with { success: true, url: "<hosted checkout url>" }
5. User is redirected to Lemon Squeezy secure hosted checkout (Apple Pay / Cards / PayPal).
6. Upon successful payment:
   - Lemon Squeezy fires POST /api/lemonsqueezy/webhook with HMAC-SHA256 signature in `x-signature`.
   - Webhook verifies signature using LEMONSQUEEZY_WEBHOOK_SECRET.
   - Handles `subscription_created` or `order_created`.
   - Upserts Device row in PostgreSQL:
     - `lemonSqueezyCustomerId`
     - `lemonSqueezySubscriptionId`
     - `subscriptionTier` ("standard" | "premium")
     - `subscriptionStatus` ("active")
7. Extension:
   - In background.js, checkQuota() queries /api/subscription-status.
   - User gets instant Pro entitlement based on their active subscription and tier.
```

---

## Webhook Lifecycle Events

| Event Name | Backend Action |
| :--- | :--- |
| `subscription_created` | `upsertLemonSqueezySubscription()` — activates PRO access and sets `subscriptionTier`. |
| `subscription_updated` | `updateLemonSqueezySubscription()` — updates status (e.g. `active`, `past_due`, `paused`). |
| `subscription_cancelled` | Marks status as `cancelled`. |
| `subscription_expired` | Marks status as `expired`. |
| `subscription_resumed` | Restores status to `active`. |

---

## Security & Abuse Protection

- **Rate-Limited Checkout Creation**: `/api/lemonsqueezy/create-checkout` is protected by `checkoutRateLimiter` (10 req/min per IP) to prevent bot scraping and card testing syndicates.
- **HMAC Signature Verification**: Every webhook request must contain a valid `x-signature` matching the HMAC-SHA256 digest of the raw body generated with `LEMONSQUEEZY_WEBHOOK_SECRET`. Requests with invalid or missing signatures are immediately rejected with HTTP `400`.
- **CORS Protection**: Checkout creation allows cross-origin requests from the extension, while webhooks strictly reject unauthorized browser callers.

---

## Browser Extension Integration

The website provides 1-click install buttons for **Google Chrome** (`NEXT_PUBLIC_CHROME_STORE_URL`) and **Microsoft Edge** (`NEXT_PUBLIC_EDGE_STORE_URL`).
Users can install the extension for free with a 7-day trial, and later upgrade to Standard or Premium through the hosted pricing page or extension popup.
