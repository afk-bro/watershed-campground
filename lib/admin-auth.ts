import 'server-only';
import { createClient } from '@/lib/supabase/server'; // Server Component Client
import { NextResponse } from 'next/server';

/**
 * Validates that the current request is from an authenticated admin.
 * For V1, this means checking they have a valid Supabase Session.
 * In future, verify specific user ID or role claims.
 */
export async function requireAdmin() {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        return { authorized: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }

    // Optional: Add specific User ID check here
    // const ADMIN_ID = process.env.ADMIN_USER_ID;
    // if (ADMIN_ID && user.id !== ADMIN_ID) { ... }

    return { authorized: true, user };
}
