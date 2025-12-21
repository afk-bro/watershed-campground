import { supabaseAdmin } from './supabase-admin';

/**
 * Checks if a request has exceeded its rate limit.
 * Uses a PostgreSQL backed table for serverless counters.
 * 
 * @param key Unique identifier (e.g. "ip:127.0.0.1:create_intent")
 * @param limit Max requests allowed in window
 * @param windowSeconds Window duration
 * @returns true if allowed, false if limited
 */
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const now = Math.floor(Date.now() / 1000);

    try {
        // 1. Cleanup old entries for this key (lazy expiration)
        // Optimization: In high scale, do this via cron or async, but here standard low traffic is fine.
        // Actually, upsert logic handles current window reset if expired.

        // 2. Upsert Logic
        // We want to increment count.
        // If row doesn't exist, insert count=1, expires_at = now + window
        // If exists and expired, reset count=1, expires_at = now + window
        // If exists and valid, increment count

        // Using RPC would be atomic, but let's try standard query logic for simplicity first.

        const { data: current } = await supabaseAdmin
            .from('rate_limits')
            .select('*')
            .eq('key', key)
            .single();

        if (current) {
            if (current.expires_at < now) {
                // Expired: Reset
                await supabaseAdmin
                    .from('rate_limits')
                    .update({ count: 1, expires_at: now + windowSeconds })
                    .eq('key', key);
                return true;
            } else {
                // Active: Check limit
                if (current.count >= limit) {
                    return false; // Limited
                }
                // Increment
                await supabaseAdmin
                    .from('rate_limits')
                    .update({ count: current.count + 1 })
                    .eq('key', key);
                return true;
            }
        } else {
            // New
            await supabaseAdmin
                .from('rate_limits')
                .insert({ key, count: 1, expires_at: now + windowSeconds });
            return true;
        }
    } catch (err) {
        console.error("Rate Limit Error:", err);
        // Fail open to prevent blocking users on system error
        return true;
    }
}
