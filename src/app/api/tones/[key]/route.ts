import { NextResponse } from "next/server";
import { deleteDeviceTone } from "@/services/tones/tone.service";
import { RateLimitError, ValidationError } from "@/lib/errors";
import { assertRateLimit, tonesRateLimiter } from "@/lib/ratelimit";
import { corsHeaders } from "@/lib/cors";
import type { ErrorResponse } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = corsHeaders("DELETE");

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

function errorResponse(code: string, message: string, status: number, extraHeaders?: Record<string, string>) {
  const body: ErrorResponse = { success: false, error: { code, message } };
  return NextResponse.json(body, { status, headers: { ...CORS, ...extraHeaders } });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    await assertRateLimit(request, tonesRateLimiter);

    const deviceId = request.headers.get("x-device-id");
    if (!deviceId) {
      throw new ValidationError("X-Device-Id header is required");
    }

    const { key } = await params;
    await deleteDeviceTone(deviceId, key);
    return NextResponse.json({ success: true }, { headers: CORS });
  } catch (err) {
    if (err instanceof RateLimitError) {
      return errorResponse(err.code, err.message, err.status, {
        "Retry-After": String(Math.ceil(err.retryAfterMs / 1000)),
      });
    }
    if (err instanceof ValidationError) {
      return errorResponse(err.code, err.message, err.status);
    }
    return errorResponse("INTERNAL_ERROR", "Something went wrong. Please try again.", 500);
  }
}
