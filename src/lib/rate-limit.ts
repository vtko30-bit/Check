type RateLimitBucket = Map<string, number[]>;

const globalStore = globalThis as typeof globalThis & {
  __checkRateLimitBuckets?: RateLimitBucket;
};

function getBuckets(): RateLimitBucket {
  if (!globalStore.__checkRateLimitBuckets) {
    globalStore.__checkRateLimitBuckets = new Map();
  }
  return globalStore.__checkRateLimitBuckets;
}

/** Ventana deslizante en memoria (best-effort en serverless). */
export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const buckets = getBuckets();
  const timestamps = buckets.get(key) ?? [];
  const valid = timestamps.filter((t) => now - t < windowMs);

  if (valid.length >= maxAttempts) {
    buckets.set(key, valid);
    return false;
  }

  valid.push(now);
  buckets.set(key, valid);
  return true;
}

export function getClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip')?.trim() ||
    'unknown'
  );
}
