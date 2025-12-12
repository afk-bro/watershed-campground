import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
    console.error("CRITICAL ERROR: Supabase admin environment variables are missing!");
    console.error("NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl);
    console.error("SUPABASE_SECRET_KEY:", supabaseSecretKey ? "Set (Hidden)" : "Missing");
}

// Admin client with secret key - bypasses RLS
export const supabaseAdmin = createClient(
    supabaseUrl || "",
    supabaseSecretKey || "",
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);
