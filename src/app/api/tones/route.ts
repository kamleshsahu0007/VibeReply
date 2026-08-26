import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { toneProfileInputSchema } from "@/lib/validation/schemas";
import { getToneProfilesForDevice, upsertDeviceTone } from "@/services/tones/tone.service";
import { ValidationError } from "@/lib/errors";
import type { ErrorResponse } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(code: string, message: string, status: number, details?: unknown) {
  const body: ErrorResponse = { success: false, error: { code, message, details } };
  return NextResponse.json(body, { status });
}

export async function GET(request: Request) {
  const deviceId = request.headers.get("x-device-id");
  const tones = await getToneProfilesForDevice(deviceId);
  return NextResponse.json({ success: true, tones });
}

export async function POST(request: Request) {
  try {
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

    return NextResponse.json({ success: true, tone }, { status: 200 });
  } catch (err) {
    if (err instanceof ZodError) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid tone payload",
        400,
        err.issues.map((i) => ({ path: i.path, message: i.message, code: i.code }))
      );
    }
    if (err instanceof ValidationError) {
      return errorResponse(err.code, err.message, err.status, err.details);
    }
    return errorResponse("INTERNAL_ERROR", "Something went wrong. Please try again.", 500);
  }
}
