import { describe, expect, it } from 'vitest';
import { checkRateLimit } from '@/lib/rate-limit';

describe('checkRateLimit', () => {
  it('permite intentos dentro del límite', () => {
    const key = `test-ok-${Date.now()}`;
    expect(checkRateLimit(key, 3, 60_000)).toBe(true);
    expect(checkRateLimit(key, 3, 60_000)).toBe(true);
    expect(checkRateLimit(key, 3, 60_000)).toBe(true);
  });

  it('bloquea al superar el límite', () => {
    const key = `test-block-${Date.now()}`;
    expect(checkRateLimit(key, 2, 60_000)).toBe(true);
    expect(checkRateLimit(key, 2, 60_000)).toBe(true);
    expect(checkRateLimit(key, 2, 60_000)).toBe(false);
  });
});
