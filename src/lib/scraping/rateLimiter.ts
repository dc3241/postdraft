import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import type { RateLimitResult } from "./types"

/**
 * Initialize Redis client for rate limiting
 * Falls back gracefully if Redis is not configured
 */
let redis: Redis | null = null
let ratelimit: Ratelimit | null = null

try {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (redisUrl && redisToken && redisUrl !== "your_redis_url" && redisToken !== "your_redis_token") {
    redis = new Redis({
      url: redisUrl,
      token: redisToken,
    })

    // Create rate limiter with sliding window
    // 10 requests per domain per minute
    ratelimit = new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      analytics: true,
    })
  }
} catch (error) {
  console.error("Failed to initialize Redis for rate limiting:", error)
  // Continue without rate limiting if Redis fails
}

/**
 * Extract domain from URL for rate limiting
 * Handles edge cases: localhost, IP addresses, malformed URLs
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname

    // Handle localhost
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "localhost"
    }

    // Handle IP addresses - use as-is
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return hostname
    }

    // Extract domain (remove www. prefix)
    const domain = hostname.replace(/^www\./, "")
    return domain
  } catch (error) {
    // If URL parsing fails, use a default key
    console.warn(`Failed to parse URL for rate limiting: ${url}`, error)
    return "unknown-domain"
  }
}

/**
 * Check rate limit for a URL
 * Uses per-domain rate limiting (not per-URL)
 * 
 * @param url - The URL to check rate limit for
 * @returns RateLimitResult with success status and limit information
 */
export async function checkRateLimit(url: string): Promise<RateLimitResult> {
  // If Redis is not configured, allow the request but log a warning
  if (!ratelimit || !redis) {
    console.warn(
      "Rate limiting not configured (Redis not available). Allowing request.",
      { url, timestamp: new Date().toISOString() }
    )
    return {
      success: true,
      limit: 10,
      remaining: 10,
      reset: Date.now() + 60000, // 1 minute from now
    }
  }

  try {
    const domain = extractDomain(url)
    const key = `ratelimit:domain:${domain}`

    const result = await ratelimit.limit(key)

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    }
  } catch (error) {
    // If rate limiting fails, allow the request but log the error
    console.error(
      "Rate limiting check failed. Allowing request.",
      {
        url,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }
    )
    return {
      success: true,
      limit: 10,
      remaining: 10,
      reset: Date.now() + 60000,
    }
  }
}
