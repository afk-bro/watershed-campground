import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { logger } from "@/lib/logger";

/**
 * Health Check Endpoint
 *
 * Provides application health status, database connectivity, and configuration verification.
 * Used by monitoring tools and E2E tests to validate environment setup.
 *
 * Returns non-sensitive configuration status (no secrets exposed).
 */
export async function GET() {
    try {
        // Simple DB connectivity check
        const { error } = await supabaseAdmin
            .from('campsites')
            .select('id')
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') {
            // PGRST116 is "no rows returned" which is fine for health check
            throw error;
        }

        // Configuration checks (for E2E test validation)
        const configured = !!(
            process.env.NEXT_PUBLIC_SUPABASE_URL &&
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
            process.env.SUPABASE_SERVICE_ROLE_KEY &&
            process.env.NEXT_PUBLIC_ORG_SLUG &&
            process.env.ADMIN_EMAILS
        );

        const orgSlug = process.env.NEXT_PUBLIC_ORG_SLUG || null;
        const hasAdminEmails = !!(process.env.ADMIN_EMAILS && process.env.ADMIN_EMAILS.length > 0);
        const hasStripe = !!(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
        const hasRedis = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

        return NextResponse.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: 'connected',
            configured,
            org_slug: orgSlug,
            has_admin_emails: hasAdminEmails,
            features: {
                stripe: hasStripe,
                redis: hasRedis,
            },
            environment: process.env.NODE_ENV,
        });
    } catch (error) {
        logger.error('[Health Check] Database connectivity failed:', error);
        return NextResponse.json(
            {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                database: 'disconnected',
                error: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 503 }
        );
    }
}
