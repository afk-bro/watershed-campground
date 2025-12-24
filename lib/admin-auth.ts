import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserOrganization } from '@/lib/organization';

/**
 * Checks if the current user is an admin based on ADMIN_EMAILS environment variable.
 * 
 * @returns Object with authorization status, user, and response
 */
export async function requireAdmin() {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        return {
            authorized: false,
            user: null,
            response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        };
    }

    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];

    // In preview environments, allow any authenticated user for testing
    const isPreview = process.env.VERCEL_ENV === 'preview';
    const isAdmin = isPreview || adminEmails.includes(user.email?.toLowerCase() || '');

    if (!isAdmin) {
        return {
            authorized: false,
            user,
            response: NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        };
    }

    return {
        authorized: true,
        user,
        response: null
    };
}

/**
 * Combined helper for admin routes that need organization context.
 * 
 * This is the STANDARD helper for all /api/admin/* routes.
 * It ensures:
 * - User is authenticated
 * - User is an admin
 * - User has an organization
 * 
 * @returns Object with authorization status, user, organizationId, and response
 */
export async function requireAdminWithOrg() {
    const { authorized, user, response } = await requireAdmin();

    if (!authorized) {
        return {
            authorized: false,
            user: null,
            organizationId: null,
            response
        };
    }

    try {
        const organizationId = await getUserOrganization(user!.id);

        if (!organizationId) {
            return {
                authorized: false,
                user,
                organizationId: null,
                response: NextResponse.json(
                    { error: 'User has no organization' },
                    { status: 403 }
                )
            };
        }

        return {
            authorized: true,
            user,
            organizationId,
            response: null
        };
    } catch (error) {
        console.error('[requireAdminWithOrg] Error getting organization:', error);
        return {
            authorized: false,
            user,
            organizationId: null,
            response: NextResponse.json(
                { error: 'Failed to get organization' },
                { status: 500 }
            )
        };
    }
}
