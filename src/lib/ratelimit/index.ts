/**
 * Rate limiter abstraction. The default implementation is an in-memory
 * sliding window suitable for a single Node.js instance (e.g. local dev,
 * single-region serverless with sticky regions). Swap `defaultRateLimiter`
 * with a Redis/Upstash-backed implementation for multi-instance deployments
 * without changing call sites.
 */

import { RateLimitError } from "@/lib/errors";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  retryAfterMs: number;
  resetAtMs: number;
}

export interface RateLimiter {
  check(key: string): Promise<RateLimitResult>;
}

interface BucketEntry {
  timestamps: number[];
}

class InMemorySlidingWindowLimiter implements RateLimiter {
  private readonly windowMs: number;
  private readonly limit: number;
  private readonly buckets = new Map<string, BucketEntry>();
  private lastSweep = 0;

  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  async check(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    this.maybeSweep(now);

    const bucket = this.buckets.get(key) ?? { timestamps: [] };
    const cutoff = now - this.windowMs;
    const fresh = bucket.timestamps.filter((t) => t > cutoff);

    if (fresh.length >= this.limit) {
      // fresh[0] is only undefined if `limit` is non-positive (a misconfigured
      // env var, e.g. an empty string parsed to 0) — fall back to the full
      // window rather than propagating NaN into the Retry-After header.
      const oldest = fresh[0] ?? now;
      const retryAfterMs = Math.max(0, oldest + this.windowMs - now) || this.windowMs;
      this.buckets.set(key, { timestamps: fresh });
      return {
        allowed: false,
        remaining: 0,
        limit: this.limit,
        retryAfterMs,
        resetAtMs: oldest + this.windowMs,
      };
    }

    fresh.push(now);
    this.buckets.set(key, { timestamps: fresh });
    return {
      allowed: true,
      remaining: this.limit - fresh.length,
      limit: this.limit,
      retryAfterMs: 0,
      resetAtMs: now + this.windowMs,
    };
  }

  private maybeSweep(now: number) {
    if (now - this.lastSweep < this.windowMs) return;
    this.lastSweep = now;
    const cutoff = now - this.windowMs;
    for (const [key, bucket] of this.buckets) {
      const fresh = bucket.timestamps.filter((t) => t > cutoff);
      if (fresh.length === 0) {
        this.buckets.delete(key);
      } else {
        bucket.timestamps = fresh;
      }
    }
  }
}

// `??` only falls back on null/undefined, not on an empty string — a env var
// set to "" (present but blank, easy to do by accident in a dashboard) would
// silently become `Number("") === 0`, rate-limiting every single request for
// every visitor. Guard against that (and any other non-positive/garbage
// value) by falling back to the default whenever parsing doesn't yield a
// usable positive number.
function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function createSlidingWindowLimiter(limit: number, windowMs: number): RateLimiter {
  return new InMemorySlidingWindowLimiter(limit, windowMs);
}

const limit = parsePositiveInt(process.env.RATE_LIMIT_REQUESTS, 20);
const windowMs = parsePositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 60_000);

// Guards the OpenAI/Gemini-calling endpoint — the expensive one.
export const defaultRateLimiter: RateLimiter = createSlidingWindowLimiter(limit, windowMs);

const tonesLimit = parsePositiveInt(process.env.RATE_LIMIT_TONES_REQUESTS, 60);
const tonesWindowMs = parsePositiveInt(process.env.RATE_LIMIT_TONES_WINDOW_MS, 60_000);

// Separate bucket for the tone CRUD endpoints. Cheap DB operations get a
// more generous budget than model calls, and — because it's a distinct
// limiter instance with its own key space — routine tone-list polling can
// never eat into an attacker's or a legitimate user's /api/generate-replies
// budget (or vice versa).
export const tonesRateLimiter: RateLimiter = createSlidingWindowLimiter(tonesLimit, tonesWindowMs);

/**
 * Extract a stable client identifier from request headers.
 * Falls back to "anonymous" so the limiter still applies.
 *
 * IMPORTANT: `x-forwarded-for` and `x-real-ip` are ordinary request headers —
 * any client can set them directly. On Vercel (this app's deployment
 * target) they're normally overwritten at the edge with the true connecting
 * IP, but that guarantee only holds for requests that hit Vercel directly;
 * it does NOT hold if there's any proxy in front of Vercel, and it must
 * never be assumed for other hosts (self-hosted behind nginx/ALB/etc.),
 * where trusting the client-supplied value lets anyone bypass the limiter
 * entirely by sending `X-Forwarded-For: <victim-or-random-ip>` on every
 * request. See https://vercel.com/docs/headers/request-headers#x-forwarded-for
 */
export function getClientKey(headers: Headers): string {
  // Vercel's own header for the real client IP — set by the edge from the
  // actual TCP connection and never derived from a client-supplied header,
  // even when an extra proxy sits in front of Vercel. This is the only one
  // of the three that's safe to trust unconditionally on this deployment.
  const vercelForwarded = headers.get("x-vercel-forwarded-for");
  if (vercelForwarded) {
    const first = vercelForwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  // Fallback for non-Vercel hosts. Take the LAST hop, not the first: a
  // client's own `X-Forwarded-For` value is prepended to the front of the
  // chain, while a trusted reverse proxy appends the address it actually
  // saw at the end. Trusting the first entry (the previous behavior here)
  // let any client pin their rate-limit bucket to an address of their
  // choosing instead of their own, defeating the limiter.
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return last;
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "anonymous";
}

/**
 * Checks `limiter` for the requesting client and throws `RateLimitError`
 * when the budget is exhausted. Returns the underlying result on success so
 * callers can still surface `X-RateLimit-*` headers.
 */
export async function assertRateLimit(
  request: Request,
  limiter: RateLimiter = defaultRateLimiter
): Promise<RateLimitResult> {
  const rl = await limiter.check(getClientKey(request.headers));
  if (!rl.allowed) {
    throw new RateLimitError(rl.retryAfterMs);
  }
  return rl;
}
