// ============================================================
// In-memory fixed-window rate limiter.
//
// Used to throttle repeated login attempts (brute-force
// protection). Single-process only — sufficient for the
// default single-instance Odyssey Scheduler deployment.
// ============================================================

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
let lastSweep = 0;

/** Drop expired buckets occasionally to bound memory. */
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  buckets.forEach((bucket, key) => {
    if (bucket.resetAt <= now) buckets.delete(key);
  });
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Consume one slot for `key`. Returns whether the request is
 * allowed under `limit` events per `windowMs`.
 */
export function rateLimit(
  key: string,
  limit = 10,
  windowMs = 15 * 60 * 1000
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterMs: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count, retryAfterMs: 0 };
}

/** Clear the counter for a key (e.g. after a successful login). */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

export function rateLimitKey(scope: string, ...parts: string[]): string {
  return [scope, ...parts.map((p) => String(p ?? '').trim().toLowerCase())].join(':');
}
