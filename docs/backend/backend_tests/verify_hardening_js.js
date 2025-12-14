require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing env vars");
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

// --- Rate Limit Logic Check ---
async function checkRateLimit(key, limit, windowSeconds) {
    const now = Math.floor(Date.now() / 1000);
    // Logic mirror from lib/rate-limit.ts
    try {
        const { data: current } = await supabaseAdmin
            .from('rate_limits')
            .select('*')
            .eq('key', key)
            .single();

        if (current) {
            if (current.expires_at < now) {
                await supabaseAdmin
                    .from('rate_limits')
                    .update({ count: 1, expires_at: now + windowSeconds })
                    .eq('key', key);
                return true;
            } else {
                if (current.count >= limit) return false;
                await supabaseAdmin
                    .from('rate_limits')
                    .update({ count: current.count + 1 })
                    .eq('key', key);
                return true;
            }
        } else {
            await supabaseAdmin
                .from('rate_limits')
                .insert({ key, count: 1, expires_at: now + windowSeconds });
            return true;
        }
    } catch (err) {
        console.error("Rate Limit Error:", err);
        return true;
    }
}

async function testRateLimit() {
    console.log("--- Testing Rate Limiting (JS Logic) ---");
    const key = `test:js_ip:1.2.3.4`;
    await supabaseAdmin.from('rate_limits').delete().eq('key', key);

    const limit = 3;
    for (let i = 1; i <= 5; i++) {
        const allowed = await checkRateLimit(key, limit, 60);
        console.log(`Request ${i}: ${allowed ? 'Allowed' : 'BLOCKED'}`);
        if (i <= limit && !allowed) throw new Error(`Request ${i} should be allowed`);
        if (i > limit && allowed) throw new Error(`Request ${i} should be blocked`);
    }
    console.log("✅ Rate Limit logic passed.");
}

// --- Idempotency Check ---
async function testIdempotency() {
    console.log("\n--- Testing Idempotency (DB Check) ---");
    const eventId = `evt_js_test_${Date.now()}`;
    const eventType = 'payment_intent.succeeded';

    // 1. First "Process"
    const { data: existing } = await supabaseAdmin
        .from('webhook_events')
        .select('id')
        .eq('id', eventId)
        .single();

    if (existing) throw new Error("Event should not exist yet");

    // Insert (Simulate processing start)
    const { error: insertError } = await supabaseAdmin
        .from('webhook_events')
        .insert({ id: eventId, type: eventType, status: 'processed' });

    if (insertError) throw new Error("Failed to insert event: " + insertError.message);
    console.log("1. Inserted event successfully.");

    // 2. Second "Process" check
    const { data: check2 } = await supabaseAdmin
        .from('webhook_events')
        .select('id')
        .eq('id', eventId)
        .single();

    if (check2) {
        console.log("2. Event found (Idempotency working). Logic would ignore.");
    } else {
        throw new Error("Event should be found!");
    }
    console.log("✅ Idempotency DB check passed.");
}

async function run() {
    try {
        await testRateLimit();
        await testIdempotency();
        console.log("\nAll Hardening tests passed.");
    } catch (e) {
        console.error("\nTEST FAILED:", e);
        process.exit(1);
    }
}

run();
