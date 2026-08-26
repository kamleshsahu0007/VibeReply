import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { generateRepliesSchema } from "@/lib/validation/schemas";
import { generateReplies, translateText } from "@/services/replies/reply.service";
import { getActiveToneProfilesForDevice } from "@/services/tones/tone.service";
import { defaultRateLimiter, getClientKey } from "@/lib/ratelimit";
import { AppError, RateLimitError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { ErrorResponse, GenerateRepliesResponse, TranslateResponse } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Device-Id",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

function errorResponse(
  code: string,
  message: string,
  status: number,
  details?: unknown,
  extraHeaders?: Record<string, string>
) {
  const body: ErrorResponse = { success: false, error: { code, message, details } };
  return NextResponse.json(body, { status, headers: extraHeaders });
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  try {
    const clientKey = getClientKey(request.headers);
    const rl = await defaultRateLimiter.check(clientKey);
    const rateHeaders = {
      "X-RateLimit-Limit": String(rl.limit),
      "X-RateLimit-Remaining": String(rl.remaining),
      "X-RateLimit-Reset": String(Math.ceil(rl.resetAtMs / 1000)),
      "X-Request-Id": requestId,
    };

    if (!rl.allowed) {
      throw new RateLimitError(rl.retryAfterMs);
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      throw new ValidationError("Request body must be valid JSON");
    }

    const parsed = generateRepliesSchema.parse(payload);
    const deviceId = request.headers.get("x-device-id");

    if (parsed.task === "translate") {
      const result = await translateText(
        {
          text: parsed.text!,
          sourceLanguage: parsed.sourceLanguage,
          targetLanguage: parsed.targetLanguage!,
        },
        { signal: request.signal }
      );

      const responseBody: TranslateResponse = { success: true, ...result };

      logger.info("generate_replies.translate_ok", {
        requestId,
        elapsed: Date.now() - startedAt,
        targetLanguage: parsed.targetLanguage,
      });

      return NextResponse.json(responseBody, {
        status: 200,
        headers: { ...rateHeaders, ...corsHeaders() },
      });
    }

    const activeTones = await getActiveToneProfilesForDevice(deviceId);
    const tones = parsed.toneKeys
      ? activeTones.filter((t) => parsed.toneKeys!.includes(t.key))
      : activeTones;

    if (tones.length === 0) {
      throw new ValidationError("No active tones available to generate for");
    }

    const result = await generateReplies(
      {
        task: parsed.task,
        messages: parsed.messages,
        draft: parsed.draft,
        partnerTone: parsed.partnerTone,
        tones,
        userLanguage: parsed.userLanguage,
        partnerLanguage: parsed.partnerLanguage,
      },
      { signal: request.signal }
    );

    const responseBody: GenerateRepliesResponse = { success: true, ...result };

    logger.info("generate_replies.ok", {
      requestId,
      elapsed: Date.now() - startedAt,
      task: parsed.task,
      messageCount: parsed.messages.length,
      toneCount: tones.length,
    });

    return NextResponse.json(responseBody, {
      status: 200,
      headers: { ...rateHeaders, ...corsHeaders() },
    });
  } catch (err) {
    const elapsed = Date.now() - startedAt;
    const baseHeaders = { "X-Request-Id": requestId };

    if (err instanceof ZodError) {
      logger.warn("generate_replies.validation_failed", {
        requestId,
        elapsed,
        issues: err.issues,
      });
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid request payload",
        400,
        err.issues.map((i) => ({ path: i.path, message: i.message, code: i.code })),
        baseHeaders
      );
    }

    if (err instanceof RateLimitError) {
      logger.warn("generate_replies.rate_limited", { requestId, elapsed });
      return errorResponse(err.code, err.message, err.status, undefined, {
        ...baseHeaders,
        "Retry-After": String(Math.ceil(err.retryAfterMs / 1000)),
      });
    }

    if (err instanceof AppError) {
      logger.error("generate_replies.app_error", {
        requestId,
        elapsed,
        code: err.code,
        message: err.message,
      });
      return errorResponse(err.code, err.message, err.status, err.details, baseHeaders);
    }

    if ((err as Error).name === "AbortError") {
      logger.warn("generate_replies.client_aborted", { requestId, elapsed });
      return errorResponse("BAD_REQUEST", "Client aborted the request", 499, undefined, baseHeaders);
    }

    logger.error("generate_replies.unhandled", {
      requestId,
      elapsed,
      message: (err as Error).message,
      stack: (err as Error).stack,
    });
    return errorResponse(
      "INTERNAL_ERROR",
      "Something went wrong. Please try again.",
      500,
      undefined,
      baseHeaders
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Use POST /api/generate-replies",
      },
    },
    { status: 405, headers: { Allow: "POST" } }
  );
}
