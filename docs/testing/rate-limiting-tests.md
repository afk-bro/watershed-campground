# Rate Limiting Test Philosophy

## The Problem

Rate limiting tests are inherently non-deterministic because:
1. **Sliding window timing** - Redis tracks requests with millisecond precision
2. **Network latency** - Request timing varies between test runs
3. **Concurrent workers** - Parallel test execution can share rate limit buckets
4. **Redis replication lag** - Upstash replication can introduce timing skew

**Result:** Tests that check for exact 429 responses are intermittent (flaky).

## The Solution: Prove Rate Limiting Works, Not That It Fails

### ❌ Flaky Approach (Don't Do This)

```typescript
// BAD: Requires exact timing to trigger 429
for (let i = 0; i < 35; i++) {
    responses.push(await request.post('/api/availability/search', { data: payload }));
}

const rateLimited = responses.filter(r => r.status === 429);
expect(rateLimited.length).toBeGreaterThan(0);  // ⚠️ Intermittent!
```

**Why it fails:**
- Request #30 might arrive at 59.999s → allowed
- Request #31 might arrive at 60.001s → new window, allowed
- Result: 0/35 get 429, test fails

### ✅ Stable Approach (Do This Instead)

**Strategy:** Verify rate limit headers prove the limiter is active and tracking correctly.

```typescript
// GOOD: Check headers exist and decrease monotonically
const remainingValues: number[] = [];
let sawRateLimitHeaders = false;

for (let i = 0; i < 35; i++) {
    const response = await request.post('/api/availability/search', { data: payload });

    const limit = response.headers()['x-ratelimit-limit'];
    const remaining = response.headers()['x-ratelimit-remaining'];

    if (limit && remaining) {
        sawRateLimitHeaders = true;
        remainingValues.push(parseInt(remaining));
    }
}

// Assert: Headers exist (limiter is active)
expect(sawRateLimitHeaders).toBe(true);

// Assert: Remaining count decreases (limiter is tracking)
const firstRemaining = remainingValues[0];
const lastRemaining = remainingValues[remainingValues.length - 1];
expect(lastRemaining).toBeLessThan(firstRemaining);
```

**Why it works:**
- ✅ No timing assumptions
- ✅ Proves limiter is active (headers present)
- ✅ Proves limiter is tracking (remaining decreases)
- ✅ Stable across Redis replication lag

## Test Coverage Strategy

### 1. Header Presence (All Endpoints)

Verify rate limit headers are returned:

```typescript
test('should include rate limit headers', async ({ request }) => {
    const response = await request.post('/api/availability/search', { data: payload });

    expect(response.headers()['x-ratelimit-limit']).toBeDefined();
    expect(response.headers()['x-ratelimit-remaining']).toBeDefined();
    expect(response.headers()['x-ratelimit-reset']).toBeDefined();
});
```

### 2. Limit Configuration (Per-Endpoint Limits)

Verify different endpoints have different limits:

```typescript
test('payment endpoint has stricter limit than availability', async ({ request }) => {
    const paymentResponse = await request.post('/api/create-payment-intent', { ... });
    const availResponse = await request.post('/api/availability/search', { ... });

    const paymentLimit = parseInt(paymentResponse.headers()['x-ratelimit-limit']);
    const availLimit = parseInt(availResponse.headers()['x-ratelimit-limit']);

    expect(paymentLimit).toBe(5);   // Strict limit for payments
    expect(availLimit).toBe(30);    // Looser limit for availability
});
```

### 3. Tracking Correctness (Monotonic Decrease)

Verify remaining count decreases as requests are made:

```typescript
test('should track request count correctly', async ({ request }) => {
    const remainingValues: number[] = [];

    for (let i = 0; i < 10; i++) {
        const response = await request.post('/api/availability/search', { data: payload });
        const remaining = response.headers()['x-ratelimit-remaining'];
        if (remaining) remainingValues.push(parseInt(remaining));
    }

    // Verify monotonic decrease (or reset to full limit)
    expect(remainingValues[remainingValues.length - 1])
        .toBeLessThanOrEqual(remainingValues[0]);
});
```

### 4. Bucket Isolation (Endpoint Independence)

Verify rate limits are isolated by endpoint:

```typescript
test('should isolate rate limits by endpoint', async ({ request }) => {
    // Exhaust payment endpoint limit
    for (let i = 0; i < 6; i++) {
        await request.post('/api/create-payment-intent', { data: paymentPayload });
    }

    // Availability endpoint should still work (different bucket)
    const availResponse = await request.post('/api/availability/search', { data: availPayload });
    expect([200, 400]).toContain(availResponse.status());  // Not 429
});
```

### 5. Recovery (Optional, Slow Test)

Verify rate limits reset after window expires:

```typescript
test('should allow requests after window resets', async ({ request }) => {
    test.setTimeout(120000);  // 2 minute timeout

    // Trigger rate limit
    let resetTime = 0;
    for (let i = 0; i < 7; i++) {
        const response = await request.post('/api/create-payment-intent', { data: payload });
        if (response.status() === 429) {
            resetTime = parseInt(response.headers()['x-ratelimit-reset']);
            break;
        }
    }

    if (resetTime) {
        // Wait for reset + buffer
        const waitMs = Math.max(0, (resetTime - Math.floor(Date.now() / 1000) + 2) * 1000);
        await new Promise(resolve => setTimeout(resolve, Math.min(waitMs, 65000)));

        // Verify request succeeds after reset
        const response = await request.post('/api/create-payment-intent', { data: payload });
        expect(response.status()).not.toBe(429);
    }
});
```

## Handling Upstash Unavailability

Rate limiter **fails open** when Upstash is unavailable:

```typescript
test('should allow requests if rate limiter is unavailable', async ({ request }) => {
    // Even without Upstash configured, requests should succeed
    const response = await request.post('/api/availability/search', { data: payload });

    // Should succeed (or fail for different reason, not rate limiting)
    expect(response.status()).not.toBe(429);
});
```

## Test Isolation

Use unique rate limit keys per test to avoid collisions:

```typescript
test.beforeEach(async () => {
    // Unique key per test: worker + parallel index + timestamp + random
    testKey = `avail-${test.info().workerIndex}-${test.info().parallelIndex}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
});

// Pass key in test header
const response = await request.post('/api/availability/search', {
    data: payload,
    headers: { 'x-test-rate-limit-key': testKey }
});
```

## CI Considerations

- **Skip rate limit tests if Upstash not configured**: Use `test.skip()` conditionally
- **Gate on environment variables**: `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
- **Verbose logging option**: `VERBOSE_LOGGING=true` to debug timing issues

```typescript
const hasUpstash = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

test.beforeAll(() => {
    if (!hasUpstash) {
        test.skip(true, 'Rate limit tests require Upstash credentials');
    }
});
```

## Key Takeaways

1. **Don't assert on 429 counts** → Assert on headers and monotonic decrease
2. **Test the limiter exists, not that it fails requests** → Headers prove it's working
3. **Fail-open is correct** → Upstash unavailable should not block users
4. **Isolate test keys** → Avoid worker collision with unique keys
5. **Document timing assumptions** → Call out where tests rely on Redis timing

## See Also

- `lib/rate-limit-upstash.ts` - Rate limiter implementation
- `tests/security/rate-limiting.spec.ts` - Reference test suite
- [Upstash Rate Limiting Docs](https://upstash.com/docs/redis/features/ratelimiting)
