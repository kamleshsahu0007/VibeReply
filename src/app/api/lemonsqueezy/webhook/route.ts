import { NextResponse } from "next/server";
import { verifyLemonSqueezyWebhook } from "@/lib/lemonsqueezy/client";
import {
  upsertLemonSqueezySubscription,
  updateLemonSqueezySubscription,
} from "@/services/subscription/subscription.service";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const signature = request.headers.get("x-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing x-signature header" }, { status: 400 });
  }

  const rawBody = await request.text();
  const isValid = verifyLemonSqueezyWebhook(rawBody, signature);

  if (!isValid) {
    logger.warn("lemonsqueezy_webhook.invalid_signature", {});
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let payload: Record<string, any>;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    logger.error("lemonsqueezy_webhook.json_parse_error", { message: (err as Error).message });
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventName = payload.meta?.event_name;
  const customData = payload.meta?.custom_data || {};
  const deviceId = customData.deviceId;
  const tier = (customData.tier === "premium" ? "premium" : "standard") as "standard" | "premium";

  const data = payload.data || {};
  const subscriptionId = String(data.id || "");
  const customerId = data.attributes?.customer_id ? String(data.attributes.customer_id) : undefined;
  const status = data.attributes?.status || "active";

  try {
    switch (eventName) {
      case "subscription_created": {
        if (deviceId && subscriptionId) {
          await upsertLemonSqueezySubscription(deviceId, {
            lemonSqueezyCustomerId: customerId,
            lemonSqueezySubscriptionId: subscriptionId,
            subscriptionStatus: status,
            subscriptionTier: tier,
          });
          logger.info("lemonsqueezy_webhook.subscription_created", { deviceId, subscriptionId, tier, status });
        } else {
          logger.warn("lemonsqueezy_webhook.subscription_created_missing_device", { subscriptionId });
        }
        break;
      }

      case "subscription_updated":
      case "subscription_resumed":
      case "subscription_paused":
      case "subscription_unpaused":
      case "subscription_cancelled":
      case "subscription_expired": {
        if (subscriptionId) {
          await updateLemonSqueezySubscription(subscriptionId, status, tier);
          logger.info("lemonsqueezy_webhook.subscription_status_updated", {
            subscriptionId,
            status,
            eventName,
          });
        }
        break;
      }

      case "order_created": {
        // In case custom data has deviceId and it's a paid order
        if (deviceId && data.attributes?.status === "paid" && subscriptionId) {
          await upsertLemonSqueezySubscription(deviceId, {
            lemonSqueezyCustomerId: customerId,
            lemonSqueezySubscriptionId: subscriptionId,
            subscriptionStatus: "active",
            subscriptionTier: tier,
          });
          logger.info("lemonsqueezy_webhook.order_created_paid", { deviceId, subscriptionId, tier });
        }
        break;
      }

      default:
        logger.info("lemonsqueezy_webhook.unhandled_event", { eventName });
        break;
    }
  } catch (err) {
    logger.error("lemonsqueezy_webhook.handler_error", { eventName, message: (err as Error).message });
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
