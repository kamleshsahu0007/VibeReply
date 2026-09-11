import { beforeEach, describe, expect, it, vi } from "vitest";

const createLemonSqueezyCheckoutMock = vi.fn();
const verifyLemonSqueezyWebhookMock = vi.fn();

vi.mock("@/lib/lemonsqueezy/client", () => ({
  createLemonSqueezyCheckout: (...args: unknown[]) => createLemonSqueezyCheckoutMock(...args),
  verifyLemonSqueezyWebhook: (...args: unknown[]) => verifyLemonSqueezyWebhookMock(...args),
  isLemonSqueezyConfigured: () => true,
  LEMONSQUEEZY_API_KEY: "test_key",
  LEMONSQUEEZY_STORE_ID: "store_123",
  LEMONSQUEEZY_STANDARD_VARIANT_ID: "var_standard",
  LEMONSQUEEZY_PREMIUM_VARIANT_ID: "var_premium",
  LEMONSQUEEZY_WEBHOOK_SECRET: "wh_secret_123",
  APP_URL: "https://vibe-reply-seven.vercel.app",
}));

const upsertLemonSqueezySubscriptionMock = vi.fn();
const updateLemonSqueezySubscriptionMock = vi.fn();
const getDeviceSubscriptionMock = vi.fn();

vi.mock("@/services/subscription/subscription.service", () => ({
  upsertLemonSqueezySubscription: (...args: unknown[]) => upsertLemonSqueezySubscriptionMock(...args),
  updateLemonSqueezySubscription: (...args: unknown[]) => updateLemonSqueezySubscriptionMock(...args),
  getDeviceSubscription: (...args: unknown[]) => getDeviceSubscriptionMock(...args),
  isDeviceSubscribed: vi.fn(),
}));

const { POST: checkoutPOST, OPTIONS: checkoutOPTIONS } = await import("./create-checkout/route");
const { POST: webhookPOST } = await import("./webhook/route");
const { GET: statusGET } = await import("../subscription-status/route");

describe("Lemon Squeezy API Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create-checkout route", () => {
    it("returns 204 on OPTIONS for CORS preflight", async () => {
      const res = await checkoutOPTIONS();
      expect(res.status).toBe(204);
      expect(res.headers.get("access-control-allow-methods")).toContain("POST");
    });

    it("returns 400 when X-Device-Id header is missing", async () => {
      const req = new Request("http://localhost/api/lemonsqueezy/create-checkout", {
        method: "POST",
      });
      const res = await checkoutPOST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });

    it("creates standard checkout URL by default", async () => {
      createLemonSqueezyCheckoutMock.mockResolvedValueOnce("https://vibereply.lemonsqueezy.com/buy/std-123");

      const req = new Request("http://localhost/api/lemonsqueezy/create-checkout", {
        method: "POST",
        headers: { "x-device-id": "dev-standard-1" },
        body: JSON.stringify({ tier: "standard" }),
      });
      const res = await checkoutPOST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.url).toBe("https://vibereply.lemonsqueezy.com/buy/std-123");
      expect(createLemonSqueezyCheckoutMock).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: "dev-standard-1",
          tier: "standard",
        })
      );
    });

    it("creates premium checkout URL when tier is premium", async () => {
      createLemonSqueezyCheckoutMock.mockResolvedValueOnce("https://vibereply.lemonsqueezy.com/buy/prem-456");

      const req = new Request("http://localhost/api/lemonsqueezy/create-checkout", {
        method: "POST",
        headers: { "x-device-id": "dev-premium-1" },
        body: JSON.stringify({ tier: "premium" }),
      });
      const res = await checkoutPOST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.url).toBe("https://vibereply.lemonsqueezy.com/buy/prem-456");
      expect(createLemonSqueezyCheckoutMock).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: "dev-premium-1",
          tier: "premium",
        })
      );
    });
  });

  describe("webhook route", () => {
    it("returns 400 when x-signature header is missing", async () => {
      const req = new Request("http://localhost/api/lemonsqueezy/webhook", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const res = await webhookPOST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Missing x-signature header");
    });

    it("returns 400 when webhook signature is invalid", async () => {
      verifyLemonSqueezyWebhookMock.mockReturnValueOnce(false);

      const req = new Request("http://localhost/api/lemonsqueezy/webhook", {
        method: "POST",
        headers: { "x-signature": "invalid_sig" },
        body: JSON.stringify({}),
      });
      const res = await webhookPOST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid signature");
    });

    it("handles subscription_created event and activates tier", async () => {
      verifyLemonSqueezyWebhookMock.mockReturnValueOnce(true);

      const eventPayload = {
        meta: {
          event_name: "subscription_created",
          custom_data: {
            deviceId: "dev-sub-999",
            tier: "standard",
          },
        },
        data: {
          id: "sub_ls_123",
          attributes: {
            customer_id: "cus_ls_456",
            status: "active",
          },
        },
      };

      const req = new Request("http://localhost/api/lemonsqueezy/webhook", {
        method: "POST",
        headers: { "x-signature": "valid_sig" },
        body: JSON.stringify(eventPayload),
      });

      const res = await webhookPOST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.received).toBe(true);
      expect(upsertLemonSqueezySubscriptionMock).toHaveBeenCalledWith("dev-sub-999", {
        lemonSqueezyCustomerId: "cus_ls_456",
        lemonSqueezySubscriptionId: "sub_ls_123",
        subscriptionStatus: "active",
        subscriptionTier: "standard",
      });
    });

    it("handles subscription_cancelled event and updates status", async () => {
      verifyLemonSqueezyWebhookMock.mockReturnValueOnce(true);

      const eventPayload = {
        meta: {
          event_name: "subscription_cancelled",
          custom_data: {
            deviceId: "dev-sub-999",
            tier: "premium",
          },
        },
        data: {
          id: "sub_ls_789",
          attributes: {
            status: "cancelled",
          },
        },
      };

      const req = new Request("http://localhost/api/lemonsqueezy/webhook", {
        method: "POST",
        headers: { "x-signature": "valid_sig" },
        body: JSON.stringify(eventPayload),
      });

      const res = await webhookPOST(req);
      expect(res.status).toBe(200);
      expect(updateLemonSqueezySubscriptionMock).toHaveBeenCalledWith(
        "sub_ls_789",
        "cancelled",
        "premium"
      );
    });
  });

  describe("subscription-status route", () => {
    it("returns 400 when X-Device-Id is missing", async () => {
      const req = new Request("http://localhost/api/subscription-status", {
        method: "GET",
      });
      const res = await statusGET(req);
      expect(res.status).toBe(400);
    });

    it("returns subscription status and tier for device", async () => {
      getDeviceSubscriptionMock.mockResolvedValueOnce({
        subscribed: true,
        tier: "premium",
        status: "active",
      });

      const req = new Request("http://localhost/api/subscription-status", {
        method: "GET",
        headers: { "x-device-id": "dev-active-123" },
      });
      const res = await statusGET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.subscribed).toBe(true);
      expect(data.tier).toBe("premium");
      expect(data.status).toBe("active");
    });
  });
});
