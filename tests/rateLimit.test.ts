import { describe, it, expect } from 'vitest';
import { rateLimit, resetRateLimit, rateLimitKey } from '@/lib/rateLimit';

describe('rate limiter', () => {
  it('allows requests up to the limit then blocks', () => {
    const key = rateLimitKey('test', '1.2.3.4');
    resetRateLimit(key);
    const limit = 3;
    for (let i = 0; i < limit; i++) {
      expect(rateLimit(key, limit, 60_000).allowed).toBe(true);
    }
    const blocked = rateLimit(key, limit, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it('resets after a successful login', () => {
    const key = rateLimitKey('test', '5.6.7.8');
    rateLimit(key, 2, 60_000);
    rateLimit(key, 2, 60_000);
    expect(rateLimit(key, 2, 60_000).allowed).toBe(false);
    resetRateLimit(key);
    expect(rateLimit(key, 2, 60_000).allowed).toBe(true);
  });

  it('keys normalize casing and whitespace', () => {
    expect(rateLimitKey('login', ' 1.2.3.4 ')).toBe(rateLimitKey('login', '1.2.3.4'));
  });
});
