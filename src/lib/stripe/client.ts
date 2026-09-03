import Stripe from "stripe";

let cachedClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  cachedClient = new Stripe(apiKey);
  return cachedClient;
}

// `||` so an empty-but-present env var also falls back to "not configured"
// rather than being sent to Stripe as a literal empty price id.
export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || "";

export const APP_URL = process.env.APP_URL || "https://vibe-reply-seven.vercel.app";
