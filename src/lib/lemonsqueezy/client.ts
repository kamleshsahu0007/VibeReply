import crypto from "crypto";
import { logger } from "@/lib/logger";

export const LEMONSQUEEZY_API_KEY = process.env.LEMONSQUEEZY_API_KEY || "";
export const LEMONSQUEEZY_STORE_ID = process.env.LEMONSQUEEZY_STORE_ID || "";
export const LEMONSQUEEZY_STANDARD_VARIANT_ID = process.env.LEMONSQUEEZY_STANDARD_VARIANT_ID || "";
export const LEMONSQUEEZY_PREMIUM_VARIANT_ID = process.env.LEMONSQUEEZY_PREMIUM_VARIANT_ID || "";
export const LEMONSQUEEZY_WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || "";
export const APP_URL = process.env.APP_URL || "https://vibe-reply-seven.vercel.app";

export type SubscriptionTier = "standard" | "premium";

export interface CreateCheckoutOptions {
  deviceId: string;
  tier: SubscriptionTier;
  redirectUrl?: string;
  userEmail?: string;
}

export function isLemonSqueezyConfigured(): boolean {
  return Boolean(
    LEMONSQUEEZY_API_KEY &&
    LEMONSQUEEZY_STORE_ID &&
    (LEMONSQUEEZY_STANDARD_VARIANT_ID || LEMONSQUEEZY_PREMIUM_VARIANT_ID)
  );
}

export function getVariantIdForTier(tier: SubscriptionTier): string {
  if (tier === "premium") {
    return LEMONSQUEEZY_PREMIUM_VARIANT_ID || LEMONSQUEEZY_STANDARD_VARIANT_ID;
  }
  return LEMONSQUEEZY_STANDARD_VARIANT_ID;
}

/**
 * Creates a Lemon Squeezy hosted checkout URL for the requested tier and device.
 * Attaches deviceId and tier in custom checkout data so webhook events can link them.
 */
export async function createLemonSqueezyCheckout(options: CreateCheckoutOptions): Promise<string> {
  const { deviceId, tier, redirectUrl = `${APP_URL}/?checkout=success`, userEmail } = options;

  const apiKey = LEMONSQUEEZY_API_KEY;
  const storeId = LEMONSQUEEZY_STORE_ID;
  const variantId = getVariantIdForTier(tier);

  if (!apiKey || !storeId || !variantId) {
    throw new Error("Lemon Squeezy is not fully configured. Missing API key, store ID, or variant ID.");
  }

  const payload = {
    data: {
      type: "checkouts",
      attributes: {
        checkout_data: {
          email: userEmail,
          custom: {
            deviceId,
            tier,
          },
        },
        product_options: {
          redirect_url: redirectUrl,
        },
      },
      relationships: {
        store: {
          data: {
            type: "stores",
            id: String(storeId),
          },
        },
        variant: {
          data: {
            type: "variants",
            id: String(variantId),
          },
        },
      },
    },
  };

  const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    logger.error("lemonsqueezy.create_checkout_error", { status: res.status, errorText });
    throw new Error(`Lemon Squeezy checkout creation failed with status ${res.status}: ${errorText}`);
  }

  const json = await res.json();
  const url = json?.data?.attributes?.url;
  if (!url) {
    throw new Error("Lemon Squeezy did not return a valid checkout URL.");
  }

  return url;
}

/**
 * Verifies the Lemon Squeezy webhook signature using HMAC-SHA256.
 */
export function verifyLemonSqueezyWebhook(rawBody: string, signature: string | null): boolean {
  if (!signature || !LEMONSQUEEZY_WEBHOOK_SECRET) {
    return false;
  }

  try {
    const hmac = crypto.createHmac("sha256", LEMONSQUEEZY_WEBHOOK_SECRET);
    const digest = Buffer.from(hmac.update(rawBody).digest("hex"), "utf8");
    const sigBuffer = Buffer.from(signature, "utf8");
    if (digest.length !== sigBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(digest, sigBuffer);
  } catch (err) {
    logger.warn("lemonsqueezy_webhook.verify_signature_failed", { message: (err as Error).message });
    return false;
  }
}
