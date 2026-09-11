import { NextResponse } from "next/server";
import { getDeviceSubscription } from "@/services/subscription/subscription.service";
import { corsHeaders } from "@/lib/cors";
import { assertRateLimit, subscriptionStatusRateLimiter } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = corsHeaders("GET");

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(request: Request) {
  try {
    await assertRateLimit(request, subscriptionStatusRateLimiter);
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "RATE_LIMITED", message: "Too many status checks. Please slow down." } },
      { status: 429, headers: CORS }
    );
  }

  const deviceId = request.headers.get("x-device-id");
  if (!deviceId) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "X-Device-Id header is required" } },
      { status: 400, headers: CORS }
    );
  }

  const { subscribed, tier, status } = await getDeviceSubscription(deviceId);
  return NextResponse.json({ success: true, subscribed, tier, status }, { headers: CORS });
}

