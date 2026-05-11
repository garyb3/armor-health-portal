/**
 * Rate limiter with optional Redis backing via Upstash.
 *
 * - When UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set, uses
 *   distributed Redis-backed rate limiting that works across multiple server instances.
 * - Otherwise, falls back to an in-memory sliding window (per-process) which is
 *   fine for single-instance deployments and local development.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ---------------------------------------------------------------------------
// Redis-backed rate limiting (multi-instance safe)
// ---------------------------------------------------------------------------

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

let redis: Redis | null = null;
if (redisUrl && redisToken) {
  redis = new Redis({ url: redisUrl, token: redisToken });
}

// Cache Ratelimit instances by config key to avoid creating new ones per request
const limiterCache = new Map<string, Ratelimit>();

function getRedisLimiter(maxRequests: number, windowMs: number): Ratelimit {
  const cacheKey = `${maxRequests}:${windowMs}`;
  let limiter = limiterCache.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(maxRequests, `${windowMs} ms`),
      prefix: "rl",
    });
    limiterCache.set(cacheKey, limiter);
  }
  return limiter;
}

// ---------------------------------------------------------------------------
// In-memory fallback (single-instance / local dev)
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Maximum window the in-memory limiter will retain history for. Sized larger
// than any expected limit window so the GC never prunes timestamps inside
// their own window — the precise per-call filter in rateLimitInMemory does
// the actual pruning. Bump this if you add a longer-window limit.
const MAX_RETAINED_WINDOW_MS = 24 * 60 * 60_000; // 24 hours

// Module-level interval guard so Next.js HMR doesn't spawn duplicates on every
// reload — each reload re-runs this file, and without the guard each one would
// leak another interval reference.
const intervalGlobal = globalThis as typeof globalThis & {
  __rl_gc_interval?: ReturnType<typeof setInterval>;
};
if (intervalGlobal.__rl_gc_interval) {
  clearInterval(intervalGlobal.__rl_gc_interval);
}
intervalGlobal.__rl_gc_interval = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < MAX_RETAINED_WINDOW_MS);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}, 5 * 60_000);

function rateLimitInMemory(
  key: string,
  maxRequests: number,
  windowMs: number
): { limited: boolean; retryAfterMs?: number } {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= maxRequests) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = windowMs - (now - oldestInWindow);
    return { limited: true, retryAfterMs };
  }

  entry.timestamps.push(now);
  return { limited: false };
}

// ---------------------------------------------------------------------------
// Public API — async, uses Redis when available, in-memory otherwise
// ---------------------------------------------------------------------------

export async function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<{ limited: boolean; retryAfterMs?: number }> {
  if (!redis) {
    return rateLimitInMemory(key, maxRequests, windowMs);
  }

  const limiter = getRedisLimiter(maxRequests, windowMs);
  const result = await limiter.limit(key);

  return {
    limited: !result.success,
    retryAfterMs: result.success ? undefined : Math.max(0, result.reset - Date.now()),
  };
}
