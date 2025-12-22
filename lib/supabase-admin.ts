import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization to avoid build-time errors
let supabaseAdminClient: SupabaseClient | null = null;

function getSupabaseAdmin() {
    if (!supabaseAdminClient) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            if (process.env.NODE_ENV === 'production') {
                // In production, strictly require these
                throw new Error("CRITICAL: Supabase admin environment variables are missing (URL or SERVICE_ROLE_KEY).");
            } else {
                // In development, throw error with helpful message
                throw new Error(
                    "Supabase admin keys missing. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file. " +
                    "Some API routes require these credentials to function."
                );
            }
        }

        supabaseAdminClient = createClient(
            supabaseUrl,
            supabaseServiceKey,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );
    }
    return supabaseAdminClient;
}

// Admin client with secret key - bypasses RLS
// NEVER import this into client-side components
// Using a Proxy to maintain backward compatibility with existing code
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
    get(target, prop) {
        const client = getSupabaseAdmin();
        const value = client[prop as keyof SupabaseClient];
        // Bind methods to the client instance
        return typeof value === 'function' ? value.bind(client) : value;
    }
});
