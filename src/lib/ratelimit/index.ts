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
      const oldest = fresh[0];
      const retryAfterMs = Math.max(0, oldest + this.windowMs - now);
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

const limit = Number(process.env.RATE_LIMIT_REQUESTS ?? 20);
const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);

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
