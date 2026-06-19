import { NextRequest } from 'next/server'

interface RateLimitConfig {
  windowMs: number
  max: number
}

// In-memory rate limiter (use Redis in production via middleware)
const requestCounts = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(config: RateLimitConfig) {
  return async function checkRateLimit(
    req: NextRequest
  ): Promise<{ success: boolean; remaining: number; resetAt: number }> {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown'

    const key = `${ip}:${req.nextUrl.pathname}`
    const now = Date.now()

    const entry = requestCounts.get(key)

    if (!entry || now > entry.resetAt) {
      const resetAt = now + config.windowMs
      requestCounts.set(key, { count: 1, resetAt })
      return { success: true, remaining: config.max - 1, resetAt }
    }

    if (entry.count >= config.max) {
      return { success: false, remaining: 0, resetAt: entry.resetAt }
    }

    entry.count++
    return {
      success: true,
      remaining: config.max - entry.count,
      resetAt: entry.resetAt,
    }
  }
}

// Preset rate limiters
export const authRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 })
export const webhookRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
})
export const apiRateLimit = rateLimit({ windowMs: 60 * 1000, max: 60 })
