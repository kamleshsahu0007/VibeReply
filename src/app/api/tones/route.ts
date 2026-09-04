import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { toneProfileInputSchema } from "@/lib/validation/schemas";
import { getToneProfilesForDevice, upsertDeviceTone } from "@/services/tones/tone.service";
import { RateLimitError, ValidationError } from "@/lib/errors";
import { assertRateLimit, tonesRateLimiter } from "@/lib/ratelimit";
import { corsHeaders } from "@/lib/cors";
import type { ErrorResponse } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = corsHeaders("GET, POST");

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

function errorResponse(
  code: string,
  message: string,
  status: number,
  details?: unknown,
  extraHeaders?: Record<string, string>
) {
  const body: ErrorResponse = { success: false, error: { code, message, details } };
  return NextResponse.json(body, { status, headers: { ...CORS, ...extraHeaders } });
}

function rateLimitResponse(err: RateLimitError) {
  return errorResponse(err.code, err.message, err.status, undefined, {
    "Retry-After": String(Math.ceil(err.retryAfterMs / 1000)),
  });
}

export async function GET(request: Request) {
  try {
    await assertRateLimit(request, tonesRateLimiter);
  } catch (err) {
    if (err instanceof RateLimitError) return rateLimitResponse(err);
    throw err;
  }

  const deviceId = request.headers.get("x-device-id");
  const tones = await getToneProfilesForDevice(deviceId);
  return NextResponse.json({ success: true, tones }, { headers: CORS });
}

export async function POST(request: Request) {
  try {
    await assertRateLimit(request, tonesRateLimiter);

    const deviceId = request.headers.get("x-device-id");
    if (!deviceId) {
      throw new ValidationError("X-Device-Id header is required to save tone preferences");
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      throw new ValidationError("Request body must be valid JSON");
    }

    const parsed = toneProfileInputSchema.parse(payload);
    const tone = await upsertDeviceTone(deviceId, parsed);

    return NextResponse.json({ success: true, tone }, { status: 200, headers: CORS });
  } catch (err) {
    if (err instanceof ZodError) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid tone payload",
        400,
        err.issues.map((i) => ({ path: i.path, message: i.message, code: i.code }))
      );
    }
    if (err instanceof RateLimitError) {
      return rateLimitResponse(err);
    }
    if (err instanceof ValidationError) {
      return errorResponse(err.code, err.message, err.status, err.details);
    }
    return errorResponse("INTERNAL_ERROR", "Something went wrong. Please try again.", 500);
  }
}
