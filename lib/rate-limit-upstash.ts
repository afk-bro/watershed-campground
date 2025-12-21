/**
 * Distributed Rate Limiting with Upstash Redis
 *
 * Uses sliding window algorithm for better UX than fixed windows.
 * Scales horizontally across multiple Vercel instances/regions.
 * Returns standard rate limit headers for client visibility.
 */

import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// Initialize Upstash Redis client
// Falls back to null if env vars are missing (for local dev without Upstash)
let redis: Redis | null = null;

try {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
    } else {
        console.warn('Upstash Redis credentials not found. Rate limiting will be disabled.');
    }
} catch (err) {
    console.error('Failed to initialize Upstash Redis:', err);
}

/**
 * Rate limit result with headers
 */
export interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number; // Unix timestamp in seconds
}

/**
 * Create a rate limiter for a specific use case
 *
 * @param requests - Number of requests allowed
 * @param window - Time window as Duration string
 * @returns Ratelimit instance
 */
function createRateLimiter(requests: number, window: `${number}${'ms' | 's' | 'm' | 'h' | 'd'}`) {
    if (!redis) {
        // Return a no-op rate limiter for local development
        return {
            limit: async () => ({
                success: true,
                limit: requests,
                remaining: requests,
                reset: Date.now() + 60000,
                pending: Promise.resolve(),
            }),
        };
    }

    return new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(requests, window),
        analytics: true,
        prefix: '@watershed/ratelimit',
    });
}

// Pre-configured rate limiters for different endpoints
export const rateLimiters = {
    // Payment intent creation: 5 requests per minute
    paymentIntent: createRateLimiter(5, '60s'),

    // Availability checks: 30 requests per minute (allows calendar browsing)
    availability: createRateLimiter(30, '60s'),

    // Contact form: 3 requests per 5 minutes (prevent spam)
    contactForm: createRateLimiter(3, '300s'),

    // Reservation creation: 10 requests per hour
    reservationCreate: createRateLimiter(10, '3600s'),

    // Admin API: 100 requests per minute
    adminApi: createRateLimiter(100, '60s'),
};

/**
 * Check rate limit for a given identifier
 *
 * @param identifier - Unique key (e.g., "ip:127.0.0.1" or "user:abc123")
 * @param limiter - Pre-configured rate limiter
 * @returns Rate limit result with headers
 *
 * @example
 * const result = await checkRateLimit(ip, rateLimiters.paymentIntent);
 * if (!result.success) {
 *   return new Response('Too many requests', {
 *     status: 429,
 *     headers: getRateLimitHeaders(result)
 *   });
 * }
 */
export async function checkRateLimit(
    identifier: string,
    limiter: ReturnType<typeof createRateLimiter>
): Promise<RateLimitResult> {
    try {
        const result = await limiter.limit(identifier);

        return {
            success: result.success,
            limit: result.limit,
            remaining: result.remaining,
            reset: result.reset,
        };
    } catch (err) {
        console.error('Rate limit check failed:', err);
        // Fail open - allow request if rate limiter is down
        return {
            success: true,
            limit: 0,
            remaining: 0,
            reset: Date.now() + 60000,
        };
    }
}

/**
 * Get standard rate limit headers for HTTP responses
 *
 * @param result - Rate limit result
 * @returns Headers object
 *
 * @example
 * return NextResponse.json(data, {
 *   headers: getRateLimitHeaders(result)
 * });
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
    return {
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': Math.max(0, result.remaining).toString(),
        'X-RateLimit-Reset': result.reset.toString(),
    };
}

/**
 * Helper to get client IP from Next.js request
 * Handles various proxy headers
 */
export function getClientIp(request: Request): string {
    // Try various headers in order of preference
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        // x-forwarded-for can be comma-separated, get first IP
        return forwardedFor.split(',')[0].trim();
    }

    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
        return realIp;
    }

    // Fallback
    return 'unknown';
}

/**
 * Create rate limit identifier for IP-based limiting
 */
export function createIpIdentifier(ip: string, endpoint: string): string {
    return `ip:${ip}:${endpoint}`;
}

/**
 * Create rate limit identifier for user-based limiting
 */
export function createUserIdentifier(userId: string, endpoint: string): string {
    return `user:${userId}:${endpoint}`;
}
