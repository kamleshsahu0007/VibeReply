import { beforeEach, describe, expect, it, vi } from "vitest";

const checkoutSessionCreateMock = vi.fn();
const constructEventMock = vi.fn();

vi.mock("@/lib/stripe/client", () => ({
  getStripeClient: () => ({
    checkout: {
      sessions: {
        create: checkoutSessionCreateMock,
      },
    },
    webhooks: {
      constructEvent: constructEventMock,
    },
  }),
  STRIPE_PRICE_ID: "price_test_123",
  APP_URL: "https://vibe-reply-seven.vercel.app",
}));

const upsertSubscriptionMock = vi.fn();
const updateSubscriptionMock = vi.fn();

vi.mock("@/services/subscription/subscription.service", () => ({
  upsertSubscriptionByDeviceId: (...args: unknown[]) => upsertSubscriptionMock(...args),
  updateSubscriptionByStripeSubscriptionId: (...args: unknown[]) => updateSubscriptionMock(...args),
}));

const { POST: checkoutPOST, OPTIONS: checkoutOPTIONS } = await import("./create-checkout-session/route");
const { POST: webhookPOST } = await import("./webhook/route");

describe("Stripe API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create-checkout-session", () => {
    it("returns 204 on OPTIONS request for CORS preflight", async () => {
      const res = await checkoutOPTIONS();
      expect(res.status).toBe(204);
      expect(res.headers.get("access-control-allow-methods")).toContain("POST");
    });

    it("returns 400 when X-Device-Id header is missing", async () => {
      const req = new Request("http://localhost/api/stripe/create-checkout-session", {
        method: "POST",
      });
      const res = await checkoutPOST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });

    it("creates a checkout session and returns url when valid", async () => {
      checkoutSessionCreateMock.mockResolvedValueOnce({
        url: "https://checkout.stripe.com/c/pay/cs_test_abc",
      });

      const req = new Request("http://localhost/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "x-device-id": "dev-456" },
      });
      const res = await checkoutPOST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.url).toBe("https://checkout.stripe.com/c/pay/cs_test_abc");
      expect(checkoutSessionCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "subscription",
          client_reference_id: "dev-456",
          line_items: [{ price: "price_test_123", quantity: 1 }],
          allow_promotion_codes: true,
        })
      );
    });
  });

  describe("webhook", () => {
    const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;

    beforeEach(() => {
      process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
    });

    it("returns 400 when stripe-signature header is missing", async () => {
      const req = new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const res = await webhookPOST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Missing stripe-signature header");
    });

    it("handles checkout.session.completed and upserts subscription", async () => {
      constructEventMock.mockReturnValueOnce({
        type: "checkout.session.completed",
        data: {
          object: {
            client_reference_id: "dev-789",
            customer: "cus_123",
            subscription: "sub_123",
          },
        },
      });

      const req = new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        headers: { "stripe-signature": "sig_valid" },
        body: "{}",
      });
      const res = await webhookPOST(req);
      expect(res.status).toBe(200);
      expect(upsertSubscriptionMock).toHaveBeenCalledWith("dev-789", {
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_123",
        subscriptionStatus: "active",
      });
    });

    it("handles customer.subscription.updated and updates status", async () => {
      constructEventMock.mockReturnValueOnce({
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_123",
            status: "past_due",
          },
        },
      });

      const req = new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        headers: { "stripe-signature": "sig_valid" },
        body: "{}",
      });
      const res = await webhookPOST(req);
      expect(res.status).toBe(200);
      expect(updateSubscriptionMock).toHaveBeenCalledWith("sub_123", "past_due");
    });
  });
});
