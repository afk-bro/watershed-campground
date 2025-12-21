import 'server-only';
import { createClient } from '@supabase/supabase-js';

// Ensure this runs only on the server
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    if (process.env.NODE_ENV !== 'development') {
        // In production, strictly require these
        throw new Error("CRITICAL: Supabase admin environment variables are missing (URL or SERVICE_ROLE_KEY).");
    } else {
        console.warn("WARNING: Supabase admin keys missing. Some API routes may fail.");
    }
}

// Admin client with secret key - bypasses RLS
// NEVER import this into client-side components
export const supabaseAdmin = createClient(
    supabaseUrl || "",
    supabaseServiceKey || "",
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);
