import 'server-only';
import { createClient } from '@/lib/supabase/server'; // Server Component Client
import { NextResponse } from 'next/server';

/**
 * Validates that the current request is from an authenticated admin.
 * For V1, this means checking they have a valid Supabase Session
 * AND their email is in the ADMIN_EMAILS allowlist.
 */
export async function requireAdmin() {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        return { authorized: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }

    // Email Allowlist Check
    const adminEmailsRaw = process.env.ADMIN_EMAILS || '';

    // Robust parsing: split by comma, trim, lowercase, remove empty
    const adminEmails = adminEmailsRaw
        .split(',')
        .map(e => e.trim().toLowerCase())
        .filter(Boolean);

    const isProduction = process.env.NODE_ENV === 'production';
    const isVercelPreview = process.env.VERCEL_ENV === 'preview';

    if (adminEmails.length > 0 && user.email) {
        if (!adminEmails.includes(user.email.toLowerCase())) {
            console.warn(`[AUTH] Unauthorized admin access attempt: ${user.email}`);
            return {
                authorized: false,
                response: NextResponse.json(
                    { error: 'Forbidden: You are not authorized to access this area.' },
                    { status: 403 }
                )
            };
        }
    } else if (isProduction) {
        // In production, we REQUIRE an allowlist to be safe.
        // If it's missing, fail closed.
        console.error('❌ CRITICAL: ADMIN_EMAILS is not configured in production!');
        return {
            authorized: false,
            response: NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            )
        };
    } else if (isVercelPreview) {
        // In preview environments, if ADMIN_EMAILS is missing, we might want to warn
        // but perhaps still allow access if they are authenticated? 
        // Safer to keep it strict or allow a specific preview list.
        // For now, let's keep it strict but log more info.
        console.warn('[AUTH] ADMIN_EMAILS missing in Preview environment. Policy: Fail-Closed.');
        return {
            authorized: false,
            response: NextResponse.json(
                { error: 'Admin access not configured for this environment.' },
                { status: 403 }
            )
        };
    }

    return { authorized: true, user };
}
