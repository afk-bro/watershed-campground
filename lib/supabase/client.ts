import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
    // Fail fast with clear error if env vars are missing
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
            'Supabase configuration error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be defined. ' +
            'These are loaded from environment variables at build time.'
        );
    }

    return createBrowserClient(
        supabaseUrl,
        supabaseAnonKey
    );
}
