type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** In-memory per-user rate limit for AI routes (resets on cold start). */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

export function enforceUserRateLimit(
  uid: string,
  route: string,
  limit = 30,
  windowMs = 60_000,
) {
  return checkRateLimit(`${route}:${uid}`, limit, windowMs);
}
