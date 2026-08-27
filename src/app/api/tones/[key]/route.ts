import { NextResponse } from "next/server";
import { deleteDeviceTone } from "@/services/tones/tone.service";
import { ValidationError } from "@/lib/errors";
import { corsHeaders } from "@/lib/cors";
import type { ErrorResponse } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = corsHeaders("DELETE");

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

function errorResponse(code: string, message: string, status: number) {
  const body: ErrorResponse = { success: false, error: { code, message } };
  return NextResponse.json(body, { status, headers: CORS });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const deviceId = request.headers.get("x-device-id");
  if (!deviceId) {
    const err = new ValidationError("X-Device-Id header is required");
    return errorResponse(err.code, err.message, err.status);
  }

  const { key } = await params;
  await deleteDeviceTone(deviceId, key);
  return NextResponse.json({ success: true }, { headers: CORS });
}
