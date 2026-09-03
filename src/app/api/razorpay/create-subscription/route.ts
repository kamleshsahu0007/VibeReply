import { NextResponse } from "next/server";
import { getRazorpayClient, RAZORPAY_PLAN_ID } from "@/lib/razorpay/client";
import { corsHeaders } from "@/lib/cors";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = corsHeaders("POST");

// Razorpay subscriptions require a fixed number of billing cycles up front
// (no true "until cancelled" option like Stripe) — 120 monthly cycles (10
// years) is the common way to approximate an indefinite subscription; the
// user can still cancel any time via the webhook-driven cancel flow.
const INDEFINITE_MONTHLY_CYCLES = 120;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(request: Request) {
  const deviceId = request.headers.get("x-device-id");
  if (!deviceId) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "X-Device-Id header is required" } },
      { status: 400, headers: CORS }
    );
  }

  if (!RAZORPAY_PLAN_ID) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_CONFIGURED", message: "Checkout is not configured yet." } },
      { status: 503, headers: CORS }
    );
  }

  try {
    const razorpay = getRazorpayClient();
    const subscription = await razorpay.subscriptions.create({
      plan_id: RAZORPAY_PLAN_ID,
      customer_notify: 1,
      total_count: INDEFINITE_MONTHLY_CYCLES,
      // Carries deviceId through to every later webhook event for this
      // subscription (activated, charged, cancelled, ...), the same way
      // client_reference_id did in the earlier Stripe version.
      notes: { deviceId },
    });

    if (!subscription.short_url) {
      throw new Error("Razorpay did not return a checkout URL");
    }

    return NextResponse.json({ success: true, url: subscription.short_url }, { headers: CORS });
  } catch (err) {
    logger.error("razorpay_checkout.create_subscription_failed", { message: (err as Error).message });
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Could not start checkout. Please try again." } },
      { status: 500, headers: CORS }
    );
  }
}
