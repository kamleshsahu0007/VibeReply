import { NextResponse } from "next/server";
import { isDeviceSubscribed } from "@/services/subscription/subscription.service";
import { corsHeaders } from "@/lib/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = corsHeaders("GET");

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(request: Request) {
  const deviceId = request.headers.get("x-device-id");
  if (!deviceId) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "X-Device-Id header is required" } },
      { status: 400, headers: CORS }
    );
  }

  const subscribed = await isDeviceSubscribed(deviceId);
  return NextResponse.json({ success: true, subscribed }, { headers: CORS });
}
