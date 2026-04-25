// __tests__/lib/rate-limit.test.ts
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { NextRequest } from 'next/server'

// ─────────────────────────────────────────────────────────────────────────────
// rateLimit()
// ─────────────────────────────────────────────────────────────────────────────
describe('rateLimit()', () => {
  it('allows requests within limit', () => {
    const limiter = rateLimit({ windowMs: 60_000, maxRequests: 3 })

    const r1 = limiter('ip-1')
    expect(r1.success).toBe(true)
    expect(r1.remaining).toBe(2)

    const r2 = limiter('ip-1')
    expect(r2.success).toBe(true)
    expect(r2.remaining).toBe(1)

    const r3 = limiter('ip-1')
    expect(r3.success).toBe(true)
    expect(r3.remaining).toBe(0)
  })

  it('blocks requests exceeding limit', () => {
    const limiter = rateLimit({ windowMs: 60_000, maxRequests: 2 })

    limiter('ip-block') // 1st
    limiter('ip-block') // 2nd

    const r3 = limiter('ip-block') // 3rd — should be blocked
    expect(r3.success).toBe(false)
    expect(r3.remaining).toBe(0)
  })

  it('resets after window expires', () => {
    // Use a very short window so we can test expiration
    jest.useFakeTimers()

    const limiter = rateLimit({ windowMs: 1000, maxRequests: 2 })

    limiter('ip-expire') // 1st
    limiter('ip-expire') // 2nd

    // Blocked
    expect(limiter('ip-expire').success).toBe(false)

    // Advance time past the window
    jest.advanceTimersByTime(1001)

    // Should be allowed again — window expired
    const after = limiter('ip-expire')
    expect(after.success).toBe(true)
    expect(after.remaining).toBe(1)

    jest.useRealTimers()
  })

  it('tracks remaining count correctly', () => {
    const limiter = rateLimit({ windowMs: 60_000, maxRequests: 5 })

    const r1 = limiter('ip-remain')
    expect(r1.remaining).toBe(4)

    const r2 = limiter('ip-remain')
    expect(r2.remaining).toBe(3)

    const r3 = limiter('ip-remain')
    expect(r3.remaining).toBe(2)

    const r4 = limiter('ip-remain')
    expect(r4.remaining).toBe(1)

    const r5 = limiter('ip-remain')
    expect(r5.remaining).toBe(0)

    const r6 = limiter('ip-remain')
    expect(r6.success).toBe(false)
    expect(r6.remaining).toBe(0)
  })

  it('tracks different keys independently', () => {
    const limiter = rateLimit({ windowMs: 60_000, maxRequests: 1 })

    const r1 = limiter('ip-a')
    expect(r1.success).toBe(true)

    const r2 = limiter('ip-b')
    expect(r2.success).toBe(true)

    // Both keys have used their limit
    expect(limiter('ip-a').success).toBe(false)
    expect(limiter('ip-b').success).toBe(false)
  })

  it('returns resetAt timestamp', () => {
    const limiter = rateLimit({ windowMs: 60_000, maxRequests: 5 })
    const before = Date.now()

    const result = limiter('ip-reset')

    // resetAt should be approximately now + windowMs
    expect(result.resetAt).toBeGreaterThanOrEqual(before)
    expect(result.resetAt).toBeLessThanOrEqual(before + 120_000) // generous upper bound
  })

  it('uses sliding window — old requests expire individually', () => {
    jest.useFakeTimers()

    const limiter = rateLimit({ windowMs: 5000, maxRequests: 2 })

    // Request at t=0
    limiter('ip-slide') // count=1
    expect(limiter('ip-slide').success).toBe(true) // count=2

    // Blocked at t=0
    expect(limiter('ip-slide').success).toBe(false)

    // Advance 3 seconds — first request is still within window
    jest.advanceTimersByTime(3000)

    // Still blocked (both requests still in window)
    expect(limiter('ip-slide').success).toBe(false)

    // Advance another 3 seconds (total 6s) — first request expired
    jest.advanceTimersByTime(3000)

    // Both old requests expired — full capacity restored
    const afterSlide = limiter('ip-slide')
    expect(afterSlide.success).toBe(true)
    // 1 of 2 slots now used, so 1 remaining
    expect(afterSlide.remaining).toBe(1)

    jest.useRealTimers()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getClientIp()
// ─────────────────────────────────────────────────────────────────────────────
describe('getClientIp()', () => {
  function makeRequest(headers: Record<string, string>): NextRequest {
    return {
      headers: new Map(Object.entries(headers)),
    } as unknown as NextRequest
  }

  it('extracts IP from x-forwarded-for header', () => {
    const req = makeRequest({ 'x-forwarded-for': '203.0.113.50, 70.41.3.18' })
    expect(getClientIp(req)).toBe('203.0.113.50')
  })

  it('extracts IP from x-real-ip header when x-forwarded-for absent', () => {
    const req = makeRequest({ 'x-real-ip': '203.0.113.51' })
    expect(getClientIp(req)).toBe('203.0.113.51')
  })

  it('extracts IP from cf-connecting-ip header', () => {
    const req = makeRequest({ 'cf-connecting-ip': '203.0.113.52' })
    expect(getClientIp(req)).toBe('203.0.113.52')
  })

  it('extracts IP from true-client-ip header', () => {
    const req = makeRequest({ 'true-client-ip': '203.0.113.53' })
    expect(getClientIp(req)).toBe('203.0.113.53')
  })

  it('returns "unknown" when no IP headers are present', () => {
    const req = makeRequest({})
    expect(getClientIp(req)).toBe('unknown')
  })

  it('prioritizes x-forwarded-for over other headers', () => {
    const req = makeRequest({
      'x-forwarded-for': '10.0.0.1',
      'x-real-ip': '10.0.0.2',
      'cf-connecting-ip': '10.0.0.3',
    })
    expect(getClientIp(req)).toBe('10.0.0.1')
  })

  it('trims whitespace from IP values', () => {
    const req = makeRequest({ 'x-real-ip': '  203.0.113.55  ' })
    expect(getClientIp(req)).toBe('203.0.113.55')
  })
})
