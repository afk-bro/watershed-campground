/**
 * Test helper for Supabase admin client
 * This is a test-specific version that doesn't use 'server-only' package
 * Safe to use in Playwright tests
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    // In test listing mode, provide dummy client
    // Actual tests will fail gracefully if env vars are missing
    console.warn("Warning: Test Supabase admin environment variables are missing. Tests may fail.");
}

// Admin client with secret key - bypasses RLS
// For test use only
export const supabaseAdmin = createClient(
    supabaseUrl || 'http://localhost:54321',
    supabaseServiceKey || 'dummy-key-for-listing',
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);
