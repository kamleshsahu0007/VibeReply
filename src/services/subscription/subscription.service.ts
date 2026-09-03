import { prisma } from "@/lib/db/client";

// Mirrors Stripe's own subscription status strings directly (see
// https://docs.stripe.com/api/subscriptions/object#subscription_object-status)
// rather than inventing a separate enum — "trialing" here is a trial run
// through Stripe itself (not VibeReply's own local 30-day trial), and both
// count as paid access.
const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export async function isDeviceSubscribed(deviceId: string): Promise<boolean> {
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    select: { subscriptionStatus: true },
  });
  return !!device?.subscriptionStatus && ACTIVE_STATUSES.has(device.subscriptionStatus);
}

export interface SubscriptionData {
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  subscriptionStatus: string;
}

/** Called from the checkout.session.completed webhook — the device may not have a row yet. */
export async function upsertSubscriptionByDeviceId(deviceId: string, data: SubscriptionData): Promise<void> {
  await prisma.device.upsert({
    where: { id: deviceId },
    update: { ...data, subscriptionUpdatedAt: new Date() },
    create: { id: deviceId, ...data, subscriptionUpdatedAt: new Date() },
  });
}

/**
 * Called from customer.subscription.updated/deleted — these events reference
 * the subscription, not the original device, so look up by
 * stripeSubscriptionId (set once at checkout time) instead.
 */
export async function updateSubscriptionByStripeSubscriptionId(
  stripeSubscriptionId: string,
  subscriptionStatus: string
): Promise<void> {
  await prisma.device.updateMany({
    where: { stripeSubscriptionId },
    data: { subscriptionStatus, subscriptionUpdatedAt: new Date() },
  });
}
