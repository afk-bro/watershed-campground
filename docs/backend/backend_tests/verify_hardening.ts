import { checkRateLimit } from './lib/rate-limit';
import { handleStripeWebhook } from './lib/stripe-webhook-handler';
import { supabaseAdmin } from './lib/supabase-admin';
import Stripe from 'stripe';

async function testRateLimit() {
    console.log("--- Testing Rate Limiting ---");
    const key = `test:ip:1.2.3.4`;
    // Reset first
    await supabaseAdmin.from('rate_limits').delete().eq('key', key);

    const limit = 3;
    const window = 60;

    for (let i = 1; i <= 5; i++) {
        const allowed = await checkRateLimit(key, limit, window);
        console.log(`Request ${i}: ${allowed ? 'Allowed' : 'BLOCKED'}`);

        if (i <= limit && !allowed) console.error(`❌ Request ${i} should be allowed`);
        if (i > limit && allowed) console.error(`❌ Request ${i} should be blocked`);
    }
}

async function testIdempotency() {
    console.log("\n--- Testing Webhook Idempotency ---");
    const eventId = `evt_test_${Date.now()}`;
    const mockEvent = {
        id: eventId,
        type: 'payment_intent.succeeded',
        data: {
            object: {
                id: `pi_mock_${Date.now()}`,
                // ... minimal mock data
            }
        }
    } as any as Stripe.Event;

    // First Call
    console.log("1st Call:");
    try {
        const result1 = await handleStripeWebhook(mockEvent);
        console.log("Result 1:", result1);
        if (result1.status === 'idempotent_ignore') console.error("❌ First call should NOT be ignored");
    } catch (e) {
        // Expected to fail finding reservation, but should NOT be idempotent ignore
        // and should have created the event record
        console.log("First call threw error (expected due to missing reservation):", e);
    }

    // Second Call
    console.log("2nd Call:");
    const result2 = await handleStripeWebhook(mockEvent);
    console.log("Result 2:", result2);

    if (result2.status === 'idempotent_ignore') {
        console.log("✅ Idempotency working: Second call ignored.");
    } else {
        console.error("❌ Second call was NOT ignored.");
    }
}

async function run() {
    await testRateLimit();
    await testIdempotency();
}

run();
