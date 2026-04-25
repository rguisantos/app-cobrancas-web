// lib/rate-limit.ts — In-memory sliding window rate limiter
// Designed for serverless (Vercel) environments where state resets on cold starts.
// Provides basic brute-force protection without external dependencies.

import { NextRequest } from 'next/server'

// ─── Types ───────────────────────────────────────────────────────────────────

interface RateLimitOptions {
  /** Time window in milliseconds */
  windowMs: number
  /** Maximum number of requests allowed within the window */
  maxRequests: number
}

interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean
  /** Remaining requests in the current window */
  remaining: number
  /** Timestamp (ms) when the window resets and the limit will be restored */
  resetAt: number
}

interface HitEntry {
  timestamps: number[]
}

// ─── In-memory store ─────────────────────────────────────────────────────────

const store = new Map<string, HitEntry>()

// Cleanup interval — removes expired entries every 60 seconds to prevent memory leaks
const CLEANUP_INTERVAL_MS = 60_000

let cleanupTimer: ReturnType<typeof setInterval> | null = null

/**
 * Starts a periodic cleanup of expired entries.
 * Safe to call multiple times — only one timer will run.
 */
function startCleanup(): void {
  if (cleanupTimer) return
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      // Remove timestamps older than the longest possible window we care about
      entry.timestamps = entry.timestamps.filter((ts) => now - ts < 60 * 60 * 1000) // 1h max
      if (entry.timestamps.length === 0) {
        store.delete(key)
      }
    }
  }, CLEANUP_INTERVAL_MS)

  // Allow the process to exit even if the timer is still running
  if (cleanupTimer && typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref()
  }
}

// Auto-start cleanup on first import
startCleanup()

// ─── rateLimit ───────────────────────────────────────────────────────────────

/**
 * Creates a rate limiter with the given options.
 *
 * Uses a sliding window algorithm: each key tracks individual request timestamps
 * within the window. When a new request comes in, expired timestamps are pruned
 * and the count is checked against the limit.
 *
 * @param options - Configuration for the rate limiter
 * @returns A function that checks rate limits for a given key
 *
 * @example
 * ```ts
 * const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 5 })
 * const result = loginLimiter('192.168.1.1')
 * if (!result.success) {
 *   return new Response('Too many requests', { status: 429 })
 * }
 * ```
 */
export function rateLimit(options: RateLimitOptions): (key: string) => RateLimitResult {
  const { windowMs, maxRequests } = options

  return (key: string): RateLimitResult => {
    const now = Date.now()
    const windowStart = now - windowMs

    // Get or create entry for this key
    let entry = store.get(key)
    if (!entry) {
      entry = { timestamps: [] }
      store.set(key, entry)
    }

    // Prune timestamps outside the current window
    entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart)

    // Calculate remaining and reset time
    const currentCount = entry.timestamps.length
    const remaining = Math.max(0, maxRequests - currentCount)

    // The resetAt is the time when the oldest request in the window will expire,
    // plus windowMs if no requests have been made yet
    const resetAt =
      currentCount > 0
        ? entry.timestamps[0] + windowMs
        : now + windowMs

    // Check if limit is exceeded
    if (currentCount >= maxRequests) {
      return {
        success: false,
        remaining: 0,
        resetAt,
      }
    }

    // Record this request timestamp
    entry.timestamps.push(now)

    return {
      success: true,
      remaining: remaining - 1, // Subtract 1 because we just consumed one
      resetAt,
    }
  }
}

// ─── getClientIp ─────────────────────────────────────────────────────────────

/**
 * Extracts the client IP address from Next.js request headers.
 *
 * Checks headers in order of reliability:
 * 1. `x-forwarded-for` — Standard proxy header, first IP is the original client
 * 2. `x-real-ip` — Set by nginx and some other proxies
 * 3. `cf-connecting-ip` — Cloudflare's true client IP
 * 4. `true-client-ip` — Used by Cloudflare Enterprise and Akamai
 *
 * Falls back to `'unknown'` if no IP header is found.
 *
 * @param req - The Next.js request object
 * @returns The client IP address string
 */
export function getClientIp(req: NextRequest): string {
  // x-forwarded-for may contain multiple IPs: "client, proxy1, proxy2"
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const firstIp = forwarded.split(',')[0]?.trim()
    if (firstIp) return firstIp
  }

  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  const cfIp = req.headers.get('cf-connecting-ip')
  if (cfIp) return cfIp.trim()

  const trueClientIp = req.headers.get('true-client-ip')
  if (trueClientIp) return trueClientIp.trim()

  return 'unknown'
}
