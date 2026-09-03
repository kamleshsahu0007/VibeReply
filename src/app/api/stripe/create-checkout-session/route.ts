import { NextResponse } from "next/server";
import { getStripeClient, STRIPE_PRICE_ID, APP_URL } from "@/lib/stripe/client";
import { corsHeaders } from "@/lib/cors";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = corsHeaders("POST");

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

  if (!STRIPE_PRICE_ID) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_CONFIGURED", message: "Checkout is not configured yet." } },
      { status: 503, headers: CORS }
    );
  }

  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      // client_reference_id identifies the checkout session itself; the
      // subscription's own metadata is what later webhook events (which
      // reference the subscription, not the session) can look up by.
      client_reference_id: deviceId,
      subscription_data: { metadata: { deviceId } },
      metadata: { deviceId },
      success_url: `${APP_URL}/?checkout=success`,
      cancel_url: `${APP_URL}/?checkout=cancelled`,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL");
    }

    return NextResponse.json({ success: true, url: session.url }, { headers: CORS });
  } catch (err) {
    logger.error("stripe_checkout.create_session_failed", { message: (err as Error).message });
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Could not start checkout. Please try again." } },
      { status: 500, headers: CORS }
    );
  }
}
