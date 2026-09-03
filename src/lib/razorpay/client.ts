import Razorpay from "razorpay";

let cachedClient: Razorpay | null = null;

export function getRazorpayClient(): Razorpay {
  if (cachedClient) return cachedClient;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET are not configured.");
  }

  cachedClient = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return cachedClient;
}

// `||` so an empty-but-present env var also falls back to "not configured"
// rather than being sent to Razorpay as a literal empty plan id.
export const RAZORPAY_PLAN_ID = process.env.RAZORPAY_PLAN_ID || "";
