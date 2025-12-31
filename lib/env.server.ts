/**
 * Server-side environment variable validation
 *
 * Validates required server environment variables at startup.
 * Fails fast with clear error messages if any required vars are missing.
 *
 * Import this file in server entry points (API routes, middleware) to ensure
 * configuration is valid before processing requests.
 */

import { z } from 'zod';

const serverEnvSchema = z.object({
    // Supabase (required for database access)
    NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

    // Admin Access (required for admin authentication)
    ADMIN_EMAILS: z.string()
        .min(1, 'ADMIN_EMAILS is required (comma-separated list)')
        .refine(
            (val) => val.split(',').every(email => email.trim().includes('@')),
            'ADMIN_EMAILS must contain valid email addresses'
        ),

    // Multi-tenancy (required for org resolution)
    NEXT_PUBLIC_ORG_SLUG: z.string().min(1, 'NEXT_PUBLIC_ORG_SLUG is required'),

    // Stripe (optional in dev, required in production)
    STRIPE_SECRET_KEY: z.string().optional(),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

    // Resend (optional - email service)
    RESEND_API_KEY: z.string().optional(),

    // Upstash Redis (optional - rate limiting)
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

    // Environment
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Validates server environment variables against schema.
 *
 * @throws {Error} If validation fails, with detailed error message
 * @returns Validated environment variables
 */
export function validateServerEnv(): ServerEnv {
    const result = serverEnvSchema.safeParse(process.env);

    if (!result.success) {
        const errors = result.error.issues.map(err =>
            `  ❌ ${err.path.join('.')}: ${err.message}`
        ).join('\n');

        throw new Error(
            `\n🚨 Server Environment Validation Failed:\n\n${errors}\n\n` +
            `💡 Add missing variables to .env.local (dev) or .env.test (tests)\n` +
            `📖 See .env.example for reference\n`
        );
    }

    return result.data;
}

/**
 * Pre-validated server environment (call validateServerEnv() first!)
 * Use this after calling validateServerEnv() in your entry point.
 */
export const serverEnv = process.env as ServerEnv;

// Auto-validate on import in development/test (fail fast)
if (process.env.NODE_ENV !== 'production') {
    try {
        validateServerEnv();
    } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        // Don't exit in Next.js dev mode - just log the error
        // The routes will fail with helpful messages when accessed
    }
}
