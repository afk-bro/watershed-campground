import { supabaseAdmin } from '@/lib/supabase-admin';
import { createHash } from 'crypto';

/**
 * Hash IP address for logging (non-PII debugging breadcrumb).
 *
 * @param ip - IP address from request headers
 * @returns First 8 chars of SHA-256 hash
 */
function hashIP(ip: string | null): string {
    if (!ip) return 'unknown';
    return createHash('sha256').update(ip).digest('hex').substring(0, 8);
}

/**
 * Extract IP address from request headers (respects proxies).
 *
 * @param request - Next.js request object
 * @returns IP address or null
 */
function getClientIP(request: Request): string | null {
    // Check common proxy headers
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }

    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
        return realIP;
    }

    return null;
}

/**
 * Resolves the organization ID for a public request.
 *
 * Strategy: URL parameter `org` (e.g., ?org=watershed-campground)
 *
 * Future: Can migrate to subdomain routing without changing call sites.
 *
 * @param request - Next.js request object
 * @returns organizationId if resolved, null otherwise
 *
 * @example
 * ```typescript
 * const orgId = await resolvePublicOrganizationId(request);
 * if (!orgId) {
 *     return NextResponse.json({ error: 'Not found' }, { status: 404 });
 * }
 * ```
 */
export async function resolvePublicOrganizationId(request: Request): Promise<string | null> {
    try {
        // Parse URL to get query parameters
        const url = new URL(request.url);
        const orgSlug = url.searchParams.get('org');
        const endpoint = url.pathname;

        // Extract IP for debugging breadcrumb (hashed, not PII)
        const clientIP = getClientIP(request);
        const ipHash = hashIP(clientIP);

        if (!orgSlug) {
            // Log breadcrumb: helps catch "frontend forgot ?org=" issues
            console.warn('[Tenancy] Org resolution failed: missing parameter', {
                endpoint,
                ipHash,
                attempted_slug: null,
                reason: 'missing_parameter'
            });
            return null;
        }

        // Lookup organization by slug
        const { data: org, error } = await supabaseAdmin
            .from('organizations')
            .select('id')
            .eq('slug', orgSlug)
            .single();

        if (error || !org) {
            // Log breadcrumb: helps catch typos, deleted orgs, or frontend bugs
            console.warn('[Tenancy] Org resolution failed: not found', {
                endpoint,
                ipHash,
                attempted_slug: orgSlug,
                reason: 'not_found',
                error_code: error?.code
            });
            return null;
        }

        return org.id;
    } catch (error) {
        console.error('[Tenancy] Org resolution error:', error);
        return null;
    }
}
