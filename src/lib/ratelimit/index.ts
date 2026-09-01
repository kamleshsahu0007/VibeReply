/**
 * Rate limiter abstraction. The default implementation is an in-memory
 * sliding window suitable for a single Node.js instance (e.g. local dev,
 * single-region serverless with sticky regions). Swap `defaultRateLimiter`
 * with a Redis/Upstash-backed implementation for multi-instance deployments
 * without changing call sites.
 */

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

const limit = parsePositiveInt(process.env.RATE_LIMIT_REQUESTS, 20);
const windowMs = parsePositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 60_000);

export const defaultRateLimiter: RateLimiter = new InMemorySlidingWindowLimiter(
  limit,
  windowMs
);

/**
 * Extract a stable client identifier from request headers.
 * Falls back to "anonymous" so the limiter still applies.
 */
export function getClientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "anonymous";
}
