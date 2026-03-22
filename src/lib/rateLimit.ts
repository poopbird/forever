/**
 * Lightweight in-memory rate limiter.
 *
 * Works per-serverless instance — good enough for most abuse scenarios.
 * For strict multi-instance limiting, swap the store for Upstash Redis.
 */

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

// Clean up expired keys periodically to avoid memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 60_000);

/**
 * Returns true if the request is allowed, false if the limit is exceeded.
 *
 * @param key       Unique key per resource + IP (e.g. "rsvp-lookup:1.2.3.4")
 * @param limit     Max requests allowed in the window
 * @param windowMs  Window size in milliseconds
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;

  entry.count++;
  return true;
}

/** Extracts the best available client IP from Next.js request headers. */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}
