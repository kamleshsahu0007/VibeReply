import { NextResponse } from "next/server";
import { createLemonSqueezyCheckout, isLemonSqueezyConfigured, SubscriptionTier } from "@/lib/lemonsqueezy/client";
import { corsHeaders } from "@/lib/cors";
import { logger } from "@/lib/logger";
import { assertRateLimit, checkoutRateLimiter } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = corsHeaders("POST");

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(request: Request) {
  try {
    await assertRateLimit(request, checkoutRateLimiter);
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "RATE_LIMITED", message: "Too many checkout attempts. Please try again in a minute." } },
      { status: 429, headers: CORS }
    );
  }

  const deviceId = request.headers.get("x-device-id");
  if (!deviceId) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "X-Device-Id header is required" } },
      { status: 400, headers: CORS }
    );
  }

  if (!isLemonSqueezyConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "NOT_CONFIGURED",
          message: "Lemon Squeezy checkout is not configured yet. Please set environment variables.",
        },
      },
      { status: 503, headers: CORS }
    );
  }

  let tier: SubscriptionTier = "standard";
  try {
    const body = await request.json().catch(() => ({}));
    if (body?.tier === "premium") {
      tier = "premium";
    }
  } catch {
    // default to standard
  }

  try {
    const url = await createLemonSqueezyCheckout({ deviceId, tier });
    return NextResponse.json({ success: true, url }, { headers: CORS });
  } catch (err) {
    logger.error("lemonsqueezy_checkout.create_failed", { message: (err as Error).message });
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Could not start checkout. Please try again." } },
      { status: 500, headers: CORS }
    );
  }
}
