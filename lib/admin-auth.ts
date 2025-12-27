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

/**
 * Migration gate for endpoints that haven't been updated with multi-tenancy yet.
 * 
 * **CRITICAL SAFETY FEATURE:**
 * - In development: Allows legacy behavior (returns null, endpoint continues)
 * - In preview/production: Fails closed with 501 Not Implemented
 * 
 * This prevents accidentally deploying unmigrated endpoints that could leak data.
 * 
 * **Usage (MUST be first line in handler):**
 * ```typescript
 * export async function GET(request: Request) {
 *     const gateResponse = migrationGate('GET /api/admin/some-endpoint');
 *     if (gateResponse) return gateResponse;
 *     
 *     // ... rest of unmigrated endpoint code
 * }
 * ```
 * 
 * @param route - Route identifier (e.g., 'reservations.bulk-archive')
 * @param method - HTTP method (e.g., 'GET', 'POST', 'PATCH', 'DELETE')
 * @returns NextResponse if should fail closed, null if should continue
 */
export function migrationGate(
    route: string,
    reason?: string,
    replacementEndpoint?: string
): NextResponse | null {
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (isDevelopment) {
        // In dev, allow legacy behavior but log warning
        console.warn(`[MIGRATION_GATE] ${route} - NOT MIGRATED (allowed in dev)`, {
            reason: reason || 'not migrated to multi-tenancy',
            replacement: replacementEndpoint
        });
        return null;
    }

    // In preview/production, fail closed with consistent payload
    // Use structured logging with clear tag for monitoring
    console.error(`[MIGRATION_GATE] ${route} - BLOCKED`, {
        route,
        reason: reason || 'not migrated to multi-tenancy',
        replacement: replacementEndpoint,
        timestamp: new Date().toISOString(),
        tag: 'DEPRECATED_ENDPOINT_USAGE' // For monitoring/alerting
    });

    const response: Record<string, unknown> = {
        error: 'ENDPOINT_DEPRECATED',
        route,
        message: reason || 'This endpoint is deprecated and blocked in production for security.',
        documentation: 'See docs/MULTI_TENANCY.md for migration guide'
    };

    // Include replacement hint if provided
    if (replacementEndpoint) {
        response.replacement = replacementEndpoint;
        response.message += ` Use ${replacementEndpoint} instead.`;
    }

    return NextResponse.json(response, {
        status: 501,
        headers: {
            'X-Migration-Status': 'blocked',
            'X-Blocked-Route': route,
            ...(replacementEndpoint ? { 'X-Replacement-Endpoint': replacementEndpoint } : {})
        }
    });
}

/**
 * Helper to assert that a tenant-scoped operation is safe.
 * Use this in migrated endpoints as documentation and runtime check.
 * 
 * @param endpointName - Name of the endpoint for logging
 */
export function assertTenantMigrated(endpointName: string): void {
    // This is primarily for documentation and future runtime checks
    // Could be extended to verify organization_id is present in queries
    if (process.env.NODE_ENV === 'development') {
        console.log(`[Tenant Check] ${endpointName} - MIGRATED ✓`);
    }
}
