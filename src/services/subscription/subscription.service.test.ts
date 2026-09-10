import { beforeEach, describe, expect, it, vi } from "vitest";

const findUniqueMock = vi.fn();
const upsertMock = vi.fn();
const updateManyMock = vi.fn();

vi.mock("@/lib/db/client", () => ({
  prisma: {
    device: {
      findUnique: findUniqueMock,
      upsert: upsertMock,
      updateMany: updateManyMock,
    },
  },
}));

const {
  isDeviceSubscribed,
  upsertSubscriptionByDeviceId,
  updateSubscriptionByStripeSubscriptionId,
} = await import("./subscription.service");

describe("subscription.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isDeviceSubscribed", () => {
    it("returns true when status is active", async () => {
      findUniqueMock.mockResolvedValueOnce({ subscriptionStatus: "active" });
      const result = await isDeviceSubscribed("dev-1");
      expect(result).toBe(true);
      expect(findUniqueMock).toHaveBeenCalledWith({
        where: { id: "dev-1" },
        select: { subscriptionStatus: true },
      });
    });

    it("returns true when status is trialing", async () => {
      findUniqueMock.mockResolvedValueOnce({ subscriptionStatus: "trialing" });
      const result = await isDeviceSubscribed("dev-1");
      expect(result).toBe(true);
    });

    it("returns false when status is past_due or canceled", async () => {
      findUniqueMock.mockResolvedValueOnce({ subscriptionStatus: "past_due" });
      expect(await isDeviceSubscribed("dev-1")).toBe(false);

      findUniqueMock.mockResolvedValueOnce({ subscriptionStatus: "canceled" });
      expect(await isDeviceSubscribed("dev-1")).toBe(false);
    });

    it("returns false when device is not found or has null status", async () => {
      findUniqueMock.mockResolvedValueOnce(null);
      expect(await isDeviceSubscribed("dev-1")).toBe(false);

      findUniqueMock.mockResolvedValueOnce({ subscriptionStatus: null });
      expect(await isDeviceSubscribed("dev-1")).toBe(false);
    });
  });

  describe("upsertSubscriptionByDeviceId", () => {
    it("calls prisma.device.upsert with deviceId and subscription data", async () => {
      upsertMock.mockResolvedValueOnce({});
      await upsertSubscriptionByDeviceId("dev-1", {
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_123",
        subscriptionStatus: "active",
      });

      expect(upsertMock).toHaveBeenCalledWith({
        where: { id: "dev-1" },
        update: expect.objectContaining({
          stripeCustomerId: "cus_123",
          stripeSubscriptionId: "sub_123",
          subscriptionStatus: "active",
          subscriptionUpdatedAt: expect.any(Date),
        }),
        create: expect.objectContaining({
          id: "dev-1",
          stripeCustomerId: "cus_123",
          stripeSubscriptionId: "sub_123",
          subscriptionStatus: "active",
          subscriptionUpdatedAt: expect.any(Date),
        }),
      });
    });
  });

  describe("updateSubscriptionByStripeSubscriptionId", () => {
    it("calls prisma.device.updateMany with stripeSubscriptionId and status", async () => {
      updateManyMock.mockResolvedValueOnce({ count: 1 });
      await updateSubscriptionByStripeSubscriptionId("sub_123", "canceled");

      expect(updateManyMock).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: "sub_123" },
        data: expect.objectContaining({
          subscriptionStatus: "canceled",
          subscriptionUpdatedAt: expect.any(Date),
        }),
      });
    });
  });
});
