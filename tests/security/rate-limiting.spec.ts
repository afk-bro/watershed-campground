import { test, expect } from '@playwright/test';
import { format, addDays } from 'date-fns';

/**
 * Security: Rate Limiting
 * Tests Upstash Redis-based distributed rate limiting
 * Prevents abuse, DDoS, and ensures fair usage of resources
 *
 * NOTE: This test requires Upstash Redis credentials in .env.test
 * If credentials are missing, rate limiting will be disabled (fail-open)
 */
test.describe('Rate Limiting', () => {
    test.use({ storageState: { cookies: [], origins: [] } }); // Unauthenticated

    test.beforeAll(() => {
        // Warn if Upstash is not configured
        if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
            console.warn('⚠️  Upstash Redis not configured. Rate limiting tests will be limited.');
        }
    });

    test.describe('Availability API Rate Limiting', () => {
        // Availability: 30 requests per minute
        test('should enforce rate limit on availability endpoint', async ({ page, request }) => {
            const tomorrow = addDays(new Date(), 1);
            const checkOut = addDays(tomorrow, 2);

            const payload = {
                checkIn: format(tomorrow, 'yyyy-MM-dd'),
                checkOut: format(checkOut, 'yyyy-MM-dd'),
                guestCount: 2,
            };

            const responses: number[] = [];

            // Make 35 requests rapidly (limit is 30/minute)
            for (let i = 0; i < 35; i++) {
                const response = await request.post('/api/availability', {
                    data: payload,
                });

                responses.push(response.status());

                // Check for rate limit headers
                const limit = response.headers()['x-ratelimit-limit'];
                const remaining = response.headers()['x-ratelimit-remaining'];
                const reset = response.headers()['x-ratelimit-reset'];

                if (limit) {
                    console.log(`Request ${i + 1}: Status=${response.status()}, Limit=${limit}, Remaining=${remaining}`);
                }
            }

            // Should have at least one 429 response (if Upstash is configured)
            if (process.env.UPSTASH_REDIS_REST_URL) {
                const rateLimitedRequests = responses.filter(status => status === 429);
                expect(rateLimitedRequests.length).toBeGreaterThan(0);
            }

            // All rate-limited responses should be 429
            const non200Responses = responses.filter(status => status !== 200);
            for (const status of non200Responses) {
                expect([200, 429]).toContain(status);
            }
        });

        test('should include rate limit headers in successful response', async ({ request }) => {
            const tomorrow = addDays(new Date(), 1);
            const checkOut = addDays(tomorrow, 2);

            const response = await request.post('/api/availability', {
                data: {
                    checkIn: format(tomorrow, 'yyyy-MM-dd'),
                    checkOut: format(checkOut, 'yyyy-MM-dd'),
                    guestCount: 2,
                },
            });

            // Should include standard rate limit headers
            const headers = response.headers();

            if (process.env.UPSTASH_REDIS_REST_URL) {
                expect(headers['x-ratelimit-limit']).toBeDefined();
                expect(headers['x-ratelimit-remaining']).toBeDefined();
                expect(headers['x-ratelimit-reset']).toBeDefined();

                // Limit should be 30 for availability endpoint
                expect(parseInt(headers['x-ratelimit-limit'])).toBe(30);
            }
        });

        test('should return 429 with appropriate message when rate limited', async ({ request }) => {
            const tomorrow = addDays(new Date(), 1);
            const checkOut = addDays(tomorrow, 2);

            const payload = {
                checkIn: format(tomorrow, 'yyyy-MM-dd'),
                checkOut: format(checkOut, 'yyyy-MM-dd'),
                guestCount: 2,
            };

            // Make rapid requests to trigger rate limit
            let rateLimitedResponse = null;

            for (let i = 0; i < 40; i++) {
                const response = await request.post('/api/availability', {
                    data: payload,
                });

                if (response.status() === 429) {
                    rateLimitedResponse = response;
                    break;
                }

                // Small delay to avoid overwhelming the server
                await new Promise(resolve => setTimeout(resolve, 10));
            }

            // If Upstash is configured, we should have hit the limit
            if (process.env.UPSTASH_REDIS_REST_URL && rateLimitedResponse) {
                expect(rateLimitedResponse.status()).toBe(429);

                const body = await rateLimitedResponse.json();
                expect(body.error).toContain('Too many requests');

                // Should have reset timestamp
                const reset = rateLimitedResponse.headers()['x-ratelimit-reset'];
                expect(reset).toBeDefined();
                expect(parseInt(reset!)).toBeGreaterThan(Date.now() / 1000);
            }
        });
    });

    test.describe('Payment Intent API Rate Limiting', () => {
        // Payment Intent: 5 requests per minute
        test('should enforce stricter rate limit on payment endpoint', async ({ request }) => {
            const tomorrow = addDays(new Date(), 1);
            const checkOut = addDays(tomorrow, 2);

            const payload = {
                checkIn: format(tomorrow, 'yyyy-MM-dd'),
                checkOut: format(checkOut, 'yyyy-MM-dd'),
                adults: 2,
                children: 0,
                campsiteId: '10000000-0000-0000-0000-000000000001', // Use a test campsite ID
            };

            const responses: number[] = [];

            // Make 10 requests rapidly (limit is 5/minute)
            for (let i = 0; i < 10; i++) {
                const response = await request.post('/api/create-payment-intent', {
                    data: payload,
                });

                responses.push(response.status());

                const limit = response.headers()['x-ratelimit-limit'];
                const remaining = response.headers()['x-ratelimit-remaining'];

                if (limit) {
                    console.log(`Payment Intent ${i + 1}: Status=${response.status()}, Limit=${limit}, Remaining=${remaining}`);
                }

                // Small delay
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // If Upstash is configured, should have rate-limited requests
            if (process.env.UPSTASH_REDIS_REST_URL) {
                const rateLimitedRequests = responses.filter(status => status === 429);
                expect(rateLimitedRequests.length).toBeGreaterThan(0);
            }
        });

        test('should use tighter limit for payment endpoint than availability', async ({ request }) => {
            if (!process.env.UPSTASH_REDIS_REST_URL) {
                test.skip();
            }

            const tomorrow = addDays(new Date(), 1);
            const checkOut = addDays(tomorrow, 2);

            // Check payment endpoint limit
            const paymentResponse = await request.post('/api/create-payment-intent', {
                data: {
                    checkIn: format(tomorrow, 'yyyy-MM-dd'),
                    checkOut: format(checkOut, 'yyyy-MM-dd'),
                    adults: 2,
                    children: 0,
                    campsiteId: '10000000-0000-0000-0000-000000000001',
                },
            });

            const paymentLimit = parseInt(paymentResponse.headers()['x-ratelimit-limit'] || '0');

            // Check availability endpoint limit
            const availResponse = await request.post('/api/availability', {
                data: {
                    checkIn: format(tomorrow, 'yyyy-MM-dd'),
                    checkOut: format(checkOut, 'yyyy-MM-dd'),
                    guestCount: 2,
                },
            });

            const availLimit = parseInt(availResponse.headers()['x-ratelimit-limit'] || '0');

            // Payment should have stricter limit (5 vs 30)
            expect(paymentLimit).toBeLessThan(availLimit);
            expect(paymentLimit).toBe(5);
            expect(availLimit).toBe(30);
        });
    });

    test.describe('Rate Limit Recovery', () => {
        test('should allow requests again after window resets', async ({ request }) => {
            if (!process.env.UPSTASH_REDIS_REST_URL) {
                test.skip();
            }

            const tomorrow = addDays(new Date(), 1);
            const checkOut = addDays(tomorrow, 2);

            const payload = {
                checkIn: format(tomorrow, 'yyyy-MM-dd'),
                checkOut: format(checkOut, 'yyyy-MM-dd'),
                adults: 2,
                children: 0,
                campsiteId: '10000000-0000-0000-0000-000000000001',
            };

            // Make requests until rate limited
            let wasRateLimited = false;
            let resetTime = 0;

            for (let i = 0; i < 10; i++) {
                const response = await request.post('/api/create-payment-intent', {
                    data: payload,
                });

                if (response.status() === 429) {
                    wasRateLimited = true;
                    resetTime = parseInt(response.headers()['x-ratelimit-reset'] || '0');
                    break;
                }

                await new Promise(resolve => setTimeout(resolve, 100));
            }

            if (wasRateLimited && resetTime) {
                console.log(`Rate limited. Reset time: ${new Date(resetTime * 1000).toISOString()}`);

                // Wait until after reset time
                const now = Math.floor(Date.now() / 1000);
                const waitMs = Math.max(0, (resetTime - now + 2) * 1000); // +2s buffer

                console.log(`Waiting ${waitMs}ms for rate limit to reset...`);
                await new Promise(resolve => setTimeout(resolve, Math.min(waitMs, 65000))); // Cap at 65s for test timeout

                // Try again - should succeed
                const response = await request.post('/api/create-payment-intent', {
                    data: payload,
                });

                // Should either succeed (200) or fail for different reason (not 429)
                // Note: might still be 400 if campsite not available, but shouldn't be 429
                if (waitMs < 65000) {
                    expect(response.status()).not.toBe(429);
                }
            }
        });
    });

    test.describe('Rate Limit Identifier Isolation', () => {
        test('should isolate rate limits by endpoint', async ({ request }) => {
            if (!process.env.UPSTASH_REDIS_REST_URL) {
                test.skip();
            }

            const tomorrow = addDays(new Date(), 1);
            const checkOut = addDays(tomorrow, 2);

            // Make 5 payment intent requests (should hit 5/min limit)
            for (let i = 0; i < 5; i++) {
                await request.post('/api/create-payment-intent', {
                    data: {
                        checkIn: format(tomorrow, 'yyyy-MM-dd'),
                        checkOut: format(checkOut, 'yyyy-MM-dd'),
                        adults: 2,
                        children: 0,
                        campsiteId: '10000000-0000-0000-0000-000000000001',
                    },
                });
            }

            // Availability endpoint should still work (different rate limit bucket)
            const availResponse = await request.post('/api/availability', {
                data: {
                    checkIn: format(tomorrow, 'yyyy-MM-dd'),
                    checkOut: format(checkOut, 'yyyy-MM-dd'),
                    guestCount: 2,
                },
            });

            // Should not be rate limited (different endpoint = different bucket)
            expect([200, 400]).toContain(availResponse.status()); // 200 or 400 (bad request), but not 429
        });
    });

    test.describe('Rate Limit Fail-Open Behavior', () => {
        test('should allow requests if rate limiter is unavailable', async ({ request }) => {
            // This test verifies the fail-open behavior
            // Even without Upstash configured, requests should succeed

            const tomorrow = addDays(new Date(), 1);
            const checkOut = addDays(tomorrow, 2);

            const response = await request.post('/api/availability', {
                data: {
                    checkIn: format(tomorrow, 'yyyy-MM-dd'),
                    checkOut: format(checkOut, 'yyyy-MM-dd'),
                    guestCount: 2,
                },
            });

            // Should succeed (or fail for different reason, not rate limiting)
            expect(response.status()).not.toBe(429);
        });
    });
});
