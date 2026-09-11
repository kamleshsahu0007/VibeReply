import { prisma } from "@/lib/db/client";

// Active statuses across Stripe ("active", "trialing") and Lemon Squeezy ("active", "on_trial")
const ACTIVE_STATUSES = new Set(["active", "trialing", "on_trial"]);

export type Tier = "free" | "standard" | "premium";

export interface DeviceSubscriptionInfo {
  subscribed: boolean;
  tier: Tier;
  status: string | null;
}

export async function isDeviceSubscribed(deviceId: string): Promise<boolean> {
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    select: { subscriptionStatus: true },
  });
  return !!device?.subscriptionStatus && ACTIVE_STATUSES.has(device.subscriptionStatus);
}

export async function getDeviceSubscription(deviceId: string): Promise<DeviceSubscriptionInfo> {
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    select: { subscriptionStatus: true, subscriptionTier: true },
  });

  const isSubscribed = !!device?.subscriptionStatus && ACTIVE_STATUSES.has(device.subscriptionStatus);
  let tier: Tier = "free";

  if (isSubscribed) {
    if (device?.subscriptionTier === "premium") {
      tier = "premium";
    } else {
      // Default to "standard" if subscribed but tier not explicitly set to premium
      tier = "standard";
    }
  }

  return {
    subscribed: isSubscribed,
    tier,
    status: device?.subscriptionStatus ?? null,
  };
}

export interface StripeSubscriptionData {
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  subscriptionStatus: string;
}

export interface LemonSqueezySubscriptionData {
  lemonSqueezyCustomerId?: string;
  lemonSqueezySubscriptionId: string;
  subscriptionStatus: string;
  subscriptionTier: "standard" | "premium";
}

/** Called from the Stripe checkout.session.completed webhook */
export async function upsertSubscriptionByDeviceId(deviceId: string, data: StripeSubscriptionData): Promise<void> {
  await prisma.device.upsert({
    where: { id: deviceId },
    update: { ...data, subscriptionTier: "standard", subscriptionUpdatedAt: new Date() },
    create: { id: deviceId, ...data, subscriptionTier: "standard", subscriptionUpdatedAt: new Date() },
  });
}

/** Called from Lemon Squeezy subscription_created / order_created webhooks */
export async function upsertLemonSqueezySubscription(
  deviceId: string,
  data: LemonSqueezySubscriptionData
): Promise<void> {
  await prisma.device.upsert({
    where: { id: deviceId },
    update: { ...data, subscriptionUpdatedAt: new Date() },
    create: { id: deviceId, ...data, subscriptionUpdatedAt: new Date() },
  });
}

/** Called from Lemon Squeezy subscription_updated / subscription_cancelled webhooks */
export async function updateLemonSqueezySubscription(
  lemonSqueezySubscriptionId: string,
  subscriptionStatus: string,
  subscriptionTier?: "standard" | "premium"
): Promise<void> {
  const updateData: Record<string, unknown> = {
    subscriptionStatus,
    subscriptionUpdatedAt: new Date(),
  };
  if (subscriptionTier) {
    updateData.subscriptionTier = subscriptionTier;
  }

  await prisma.device.updateMany({
    where: { lemonSqueezySubscriptionId },
    data: updateData,
  });
}

/**
 * Called from customer.subscription.updated/deleted — these events reference
 * the subscription, not the original device, so look up by
 * stripeSubscriptionId instead.
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

