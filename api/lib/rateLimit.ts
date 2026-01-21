/**
 * Rate Limiting Utilities
 *
 * Protects API endpoints from abuse and prevents unexpected costs.
 * Uses Upstash Redis for distributed rate limiting across Vercel serverless functions.
 *
 * Configuration:
 * - 20 requests per hour per IP address (adjustable)
 * - Sliding window algorithm for smooth rate limiting
 * - Clear error messages when limits are exceeded
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { VercelRequest } from '@vercel/node';

/**
 * Initialize rate limiter with Upstash Redis
 *
 * Uses environment variables from .env.local:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 */
function createRateLimiter() {
  // Check if Redis credentials are configured
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn('⚠️  Rate limiting disabled: Upstash Redis credentials not found');
    return null;
  }

  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    // Sliding window: 20 requests per hour
    // Adjust these numbers based on your needs:
    // - First number: max requests
    // - Second string: time window ("1 h" = 1 hour, "10 m" = 10 minutes)
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '1 h'),
      analytics: true, // Track usage stats in Upstash dashboard
    });
  } catch (error) {
    console.error('Failed to initialize rate limiter:', error);
    return null;
  }
}

// Create singleton instance
const rateLimiter = createRateLimiter();

/**
 * Get client identifier from request
 * Uses IP address for rate limiting
 */
function getClientIdentifier(request: VercelRequest): string {
  // Try to get real IP from Vercel headers
  const forwardedFor = request.headers['x-forwarded-for'];
  if (forwardedFor) {
    // x-forwarded-for can be a comma-separated list, take the first IP
    const ip = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
    return ip.trim();
  }

  // Fallback to other common headers
  const realIp = request.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  // Last resort: use a default identifier
  // This shouldn't happen on Vercel, but provides a fallback
  return 'unknown-ip';
}

/**
 * Check if request is within rate limits
 *
 * Returns an object with:
 * - allowed: boolean - whether the request should be allowed
 * - limit: number - total requests allowed in window
 * - remaining: number - requests remaining in current window
 * - reset: number - timestamp when the limit resets
 */
export async function checkRateLimit(request: VercelRequest): Promise<{
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
  reason?: string;
}> {
  // If rate limiter isn't configured, allow all requests (development mode)
  if (!rateLimiter) {
    return {
      allowed: true,
      limit: 0,
      remaining: 0,
      reset: 0,
      reason: 'Rate limiting disabled (no Redis config)',
    };
  }

  try {
    const identifier = getClientIdentifier(request);
    const { success, limit, remaining, reset } = await rateLimiter.limit(identifier);

    if (!success) {
      console.log(`⚠️  Rate limit exceeded for ${identifier}`);
    }

    return {
      allowed: success,
      limit,
      remaining,
      reset,
    };
  } catch (error) {
    // On error, allow the request but log the issue
    console.error('Rate limit check failed:', error);
    return {
      allowed: true,
      limit: 0,
      remaining: 0,
      reset: 0,
      reason: 'Rate limit check error - allowing request',
    };
  }
}

/**
 * Format time remaining until rate limit reset
 */
export function formatResetTime(resetTimestamp: number): string {
  const now = Date.now();
  const diff = resetTimestamp - now;

  if (diff <= 0) return 'now';

  const minutes = Math.ceil(diff / 1000 / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;

  const hours = Math.ceil(minutes / 60);
  return `${hours} hour${hours === 1 ? '' : 's'}`;
}
