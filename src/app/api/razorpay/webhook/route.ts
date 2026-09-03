import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import {
  upsertSubscriptionByDeviceId,
  updateSubscriptionByRazorpaySubscriptionId,
} from "@/services/subscription/subscription.service";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RazorpaySubscriptionEntity {
  id: string;
  status: string;
  notes?: Record<string, string | number>;
}

// Called by Razorpay's own servers, never by the browser/extension — no
// CORS headers needed here. Signature verification (below) authenticates
// the caller instead.
export async function POST(request: Request) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error("razorpay_webhook.not_configured", {});
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const signature = request.headers.get("x-razorpay-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing x-razorpay-signature header" }, { status: 400 });
  }

  const rawBody = await request.text();

  let valid = false;
  try {
    valid = Razorpay.validateWebhookSignature(rawBody, signature, webhookSecret);
  } catch (err) {
    logger.warn("razorpay_webhook.signature_check_error", { message: (err as Error).message });
  }
  if (!valid) {
    logger.warn("razorpay_webhook.invalid_signature", {});
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: { event?: string; payload?: { subscription?: { entity?: RazorpaySubscriptionEntity } } };
  try {
    event = JSON.parse(rawBody);
  } catch (err) {
    logger.warn("razorpay_webhook.invalid_json", { message: (err as Error).message });
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const subscription = event.payload?.subscription?.entity;
  const eventType = event.event;

  try {
    if (eventType === "subscription.activated" || eventType === "subscription.charged") {
      const deviceId = subscription?.notes?.deviceId;
      if (deviceId && subscription?.id) {
        await upsertSubscriptionByDeviceId(String(deviceId), {
          razorpaySubscriptionId: subscription.id,
          subscriptionStatus: "active",
        });
        logger.info("razorpay_webhook.subscription_activated", { deviceId, eventType });
      } else {
        logger.warn("razorpay_webhook.activation_missing_fields", {
          eventType,
          hasDeviceId: !!deviceId,
          hasSubscriptionId: !!subscription?.id,
        });
      }
    } else if (
      eventType === "subscription.cancelled" ||
      eventType === "subscription.completed" ||
      eventType === "subscription.halted" ||
      eventType === "subscription.paused"
    ) {
      if (subscription?.id) {
        const status = subscription.status || "cancelled";
        await updateSubscriptionByRazorpaySubscriptionId(subscription.id, status);
        logger.info("razorpay_webhook.subscription_status_changed", {
          subscriptionId: subscription.id,
          status,
        });
      }
    }
  } catch (err) {
    logger.error("razorpay_webhook.handler_error", { eventType, message: (err as Error).message });
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
