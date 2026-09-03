import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe/client";
import {
  upsertSubscriptionByDeviceId,
  updateSubscriptionByStripeSubscriptionId,
} from "@/services/subscription/subscription.service";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Called by Stripe's own servers, never by the browser/extension — no CORS
// headers needed here. Signature verification (below) is what authenticates
// the caller instead.
export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error("stripe_webhook.not_configured", {});
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const rawBody = await request.text();
  const stripe = getStripeClient();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    logger.warn("stripe_webhook.invalid_signature", { message: (err as Error).message });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const deviceId = session.client_reference_id || session.metadata?.deviceId;
        if (deviceId && session.customer && session.subscription) {
          await upsertSubscriptionByDeviceId(deviceId, {
            stripeCustomerId: String(session.customer),
            stripeSubscriptionId: String(session.subscription),
            subscriptionStatus: "active",
          });
          logger.info("stripe_webhook.subscription_activated", { deviceId });
        } else {
          logger.warn("stripe_webhook.checkout_completed_missing_fields", {
            hasDeviceId: !!deviceId,
            hasCustomer: !!session.customer,
            hasSubscription: !!session.subscription,
          });
        }
        break;
      }

      // Both reference the subscription object directly, not the original
      // checkout session — look up by stripeSubscriptionId (stored above).
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await updateSubscriptionByStripeSubscriptionId(subscription.id, subscription.status);
        logger.info("stripe_webhook.subscription_status_changed", {
          subscriptionId: subscription.id,
          status: subscription.status,
        });
        break;
      }

      default:
        break;
    }
  } catch (err) {
    logger.error("stripe_webhook.handler_error", { type: event.type, message: (err as Error).message });
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
