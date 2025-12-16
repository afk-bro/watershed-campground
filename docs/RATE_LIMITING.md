# Distributed Rate Limiting with Upstash Redis

## Overview

The application uses **Upstash Redis** for distributed rate limiting across all Vercel instances. This prevents:
- Payment fraud and abuse
- API spam and DoS attacks
- Resource exhaustion
- Booking conflicts from rapid-fire requests

### Why Upstash?

✅ **Serverless-native** - Works seamlessly with Vercel Edge/Serverless
✅ **Global distribution** - Low latency worldwide
✅ **Pay-per-request** - No idle costs
✅ **Sliding window algorithm** - Better UX than fixed windows
✅ **Standard headers** - X-RateLimit-* for client visibility

---

## Setup Instructions

### 1. Create Upstash Account

1. Go to [upstash.com](https://upstash.com)
2. Sign up (free tier available)
3. Verify email

### 2. Create Redis Database

1. Click **Create Database**
2. Configure:
   - **Name:** `watershed-campground-rate-limit`
   - **Region:** Choose closest to your primary user base (e.g., `us-east-1`)
   - **Type:** **Regional** (cheaper) or **Global** (lower latency worldwide)
   - **TLS:** ✅ Enable (recommended)

3. Click **Create**

### 3. Get Credentials

After database creation, you'll see:
- **UPSTASH_REDIS_REST_URL**: `https://xxxxx.upstash.io`
- **UPSTASH_REDIS_REST_TOKEN**: `Axxxxx...`

**Copy these values** - you'll need them for environment variables.

### 4. Add Environment Variables

#### Production (Vercel)
```bash
vercel env add UPSTASH_REDIS_REST_URL
# Paste: https://xxxxx.upstash.io

vercel env add UPSTASH_REDIS_REST_TOKEN
# Paste: Axxxxx...
```

Or via Vercel Dashboard:
1. Go to your project → Settings → Environment Variables
2. Add:
   - `UPSTASH_REDIS_REST_URL` = `https://xxxxx.upstash.io`
   - `UPSTASH_REDIS_REST_TOKEN` = `Axxxxx...`

#### Local Development (`.env.local`)
```env
# Upstash Redis (Rate Limiting)
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=Axxxxx...
```

**Note:** Without these variables, rate limiting falls back to **no-op mode** (all requests allowed). This is fine for local development but **required for production**.

---

## Rate Limit Configuration

### Current Limits

| Endpoint | Limit | Window | Purpose |
|----------|-------|--------|---------|
| `/api/create-payment-intent` | 5 requests | 60 seconds | Prevent payment spam |
| `/api/availability` | 30 requests | 60 seconds | Allow calendar browsing |
| `/api/contact` | 3 requests | 5 minutes | Prevent contact form spam |
| `/api/reservation` | 10 requests | 1 hour | Prevent booking abuse |
| `/api/admin/*` | 100 requests | 60 seconds | Admin dashboard usage |

### Customize Limits

Edit `lib/rate-limit-upstash.ts`:

```typescript
export const rateLimiters = {
    // Increase payment intent limit
    paymentIntent: createRateLimiter(10, '60 s'), // was 5

    // Stricter contact form
    contactForm: createRateLimiter(2, '10 m'), // was 3/5m
};
```

---

## Rate Limit Headers

All rate-limited responses include standard headers:

```http
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 2
X-RateLimit-Reset: 1704123600
```

### Client-Side Handling

```typescript
const response = await fetch('/api/create-payment-intent', {
    method: 'POST',
    body: JSON.stringify(data)
});

if (response.status === 429) {
    const resetTime = parseInt(response.headers.get('X-RateLimit-Reset') || '0');
    const waitSeconds = resetTime - Math.floor(Date.now() / 1000);

    alert(`Too many requests. Please wait ${waitSeconds} seconds.`);
}
```

---

## Algorithm: Sliding Window

Upstash uses a **sliding window** algorithm, which provides smoother rate limiting than fixed windows.

### Example: 5 requests per minute

**Fixed Window** (old):
```
00:00 - 00:59: 5 requests ✅
01:00 - 01:59: 5 requests ✅
Problem: User can make 10 requests in 1 second (5 at 00:59, 5 at 01:00)
```

**Sliding Window** (Upstash):
```
Checks last 60 seconds from current time
10:30:00 → Counts requests from 10:29:00 to 10:30:00
10:30:30 → Counts requests from 10:29:30 to 10:30:30
```
✅ **Result:** Prevents burst abuse, smoother UX

---

## Monitoring

### Upstash Dashboard

1. Go to [console.upstash.com](https://console.upstash.com)
2. Select your database
3. View:
   - **Commands/sec** - Current request rate
   - **Daily requests** - Usage over time
   - **Storage** - Redis memory usage

### Key Metrics to Watch

- **High hit rate** - Rate limiting is working
- **Many 429 responses** - Possible attack or legitimate user frustration (increase limits?)
- **Zero usage** - Rate limiter not configured or bypassed

### Debugging

```bash
# Check if environment variables are set
vercel env ls

# Test rate limiter locally
curl -X POST http://localhost:3000/api/availability \
  -H "Content-Type: application/json" \
  -d '{"checkIn":"2025-01-20","checkOut":"2025-01-22","guestCount":2}'

# Check headers
curl -i -X POST http://localhost:3000/api/availability ...
# Should show: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
```

---

## Cost Estimation

### Upstash Pricing (as of 2025)

**Free Tier:**
- 10,000 commands/day
- 256 MB storage
- ✅ Perfect for development and small sites

**Pay-as-you-go:**
- $0.20 per 100K requests
- $0.25 per GB storage

### Example Costs

**Small site** (1,000 bookings/month):
- ~30,000 rate limit checks/month
- **Cost:** $0 (within free tier)

**Medium site** (10,000 bookings/month):
- ~300,000 rate limit checks/month
- **Cost:** ~$0.60/month

**Large site** (100,000 bookings/month):
- ~3,000,000 rate limit checks/month
- **Cost:** ~$6/month

💡 **Extremely cost-effective** compared to the cost of payment fraud, API abuse, or server overload.

---

## Fallback Behavior

If Upstash is unavailable:
- **Fail open** - Requests are allowed
- **Warning logged** - `console.warn('Rate limiter unavailable')`
- **No user impact** - Site remains functional

This prevents rate limiting failures from taking down the site.

---

## Testing

### Test Rate Limiting Locally

```bash
# Rapid-fire requests to trigger rate limit
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/create-payment-intent \
    -H "Content-Type: application/json" \
    -d '{"checkIn":"2025-01-20","checkOut":"2025-01-22","adults":2,"children":0}'
  echo ""
done
```

**Expected:**
- First 5 requests: 200 OK
- Requests 6-10: 429 Too Many Requests

### Test Headers

```bash
curl -i -X POST http://localhost:3000/api/availability \
  -H "Content-Type: application/json" \
  -d '{"checkIn":"2025-01-20","checkOut":"2025-01-22","guestCount":2}'
```

**Expected headers:**
```
HTTP/1.1 200 OK
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 29
X-RateLimit-Reset: 1704123600
```

---

## Migration from Old System

### Old System (PostgreSQL-based)
- In-memory on single instance
- Fixed window algorithm
- No headers
- Breaks with horizontal scaling

### New System (Upstash-based)
- Distributed across all instances
- Sliding window algorithm
- Standard headers
- Scales infinitely

### Transition

1. ✅ Upstash credentials added to env vars
2. ✅ Code updated to use `lib/rate-limit-upstash.ts`
3. ⚠️ Old `lib/rate-limit.ts` kept as reference
4. 🗑️ Can delete old system once verified working
5. 🗄️ Drop `rate_limits` table from Supabase (optional)

---

## Troubleshooting

### Issue: "Rate limiting not working"
**Check:**
```bash
# 1. Verify env vars exist
echo $UPSTASH_REDIS_REST_URL
echo $UPSTASH_REDIS_REST_TOKEN

# 2. Check logs for warnings
# Should NOT see: "Upstash Redis credentials not found"

# 3. Test with curl
curl -i http://localhost:3000/api/availability ...
# Look for X-RateLimit-* headers
```

### Issue: "Too many 429 errors for real users"
**Solution:** Increase limits in `lib/rate-limit-upstash.ts`

```typescript
// More lenient for availability checks
availability: createRateLimiter(60, '60 s'), // was 30
```

### Issue: "Upstash costs higher than expected"
**Check:**
1. Is rate limiting being called on every request? (should only be on specific endpoints)
2. Are there infinite loops making requests?
3. Review Upstash dashboard → Daily Requests graph

---

## Best Practices

1. **Monitor initially** - Watch Upstash dashboard first week
2. **Adjust based on usage** - Increase limits if seeing legitimate 429s
3. **Different limits per endpoint** - Payment endpoints stricter than availability
4. **Return helpful errors** - Tell users when they can try again
5. **Log rate limit hits** - Track abuse patterns

---

## Next Steps

After deploying rate limiting:
1. Monitor Upstash dashboard for first 48 hours
2. Check for excessive 429 responses in logs
3. Adjust limits based on real usage patterns
4. Consider user-based limiting (not just IP) for authenticated routes

---

## Resources

- [Upstash Documentation](https://docs.upstash.com/redis)
- [Upstash Ratelimit SDK](https://github.com/upstash/ratelimit)
- [RFC 6585 - HTTP 429](https://tools.ietf.org/html/rfc6585)
- [Rate Limiting Best Practices](https://stripe.com/blog/rate-limiters)
