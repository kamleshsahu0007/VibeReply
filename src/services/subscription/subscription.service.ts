import { prisma } from "@/lib/db/client";

// Razorpay subscription lifecycle: created -> authenticated (mandate
// approved) -> active (first charge succeeded) -> ... -> cancelled /
// completed / expired / halted (payment failures). Only "active" means
// currently paid and entitled — "authenticated" alone hasn't been charged
// yet, so it must NOT grant access.
export async function isDeviceSubscribed(deviceId: string): Promise<boolean> {
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    select: { subscriptionStatus: true },
  });
  return device?.subscriptionStatus === "active";
}

export interface SubscriptionData {
  razorpaySubscriptionId: string;
  subscriptionStatus: string;
}

/** Called from the subscription.activated/charged webhook — the device may not have a row yet. */
export async function upsertSubscriptionByDeviceId(deviceId: string, data: SubscriptionData): Promise<void> {
  await prisma.device.upsert({
    where: { id: deviceId },
    update: { ...data, subscriptionUpdatedAt: new Date() },
    create: { id: deviceId, ...data, subscriptionUpdatedAt: new Date() },
  });
}

/**
 * Called from subscription.cancelled/completed/halted/paused — these
 * events reference the subscription itself, not the deviceId directly, so
 * look up by razorpaySubscriptionId (stored once at activation time).
 */
export async function updateSubscriptionByRazorpaySubscriptionId(
  razorpaySubscriptionId: string,
  subscriptionStatus: string
): Promise<void> {
  await prisma.device.updateMany({
    where: { razorpaySubscriptionId },
    data: { subscriptionStatus, subscriptionUpdatedAt: new Date() },
  });
}
