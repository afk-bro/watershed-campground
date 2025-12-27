import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/supabase/types';

// Singleton browser client to prevent multiple GoTrueClient instances
let browserClient: SupabaseClient<Database> | null = null;

function getBrowserClient() {
    if (typeof window === 'undefined') {
        throw new Error('createClient() can only be called in browser context. Use createServerClient() for server-side code.');
    }

    if (!browserClient) {
        // Fail fast with clear error if env vars are missing
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error(
                'Supabase configuration error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be defined. ' +
                'These are loaded from environment variables at build time.'
            );
        }

        browserClient = createBrowserClient<Database>(
            supabaseUrl,
            supabaseAnonKey
        );
    }

    return browserClient;
}

// Export factory function that returns singleton instance
export function createClient() {
    return getBrowserClient();
}
