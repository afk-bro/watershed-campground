/**
 * Client-side environment variable validation
 *
 * Validates NEXT_PUBLIC_* environment variables that are safe to expose to the browser.
 * These are embedded at build time, so missing vars cause build failures.
 *
 * Import this file in client components to ensure required public env vars are available.
 */

import { z } from 'zod';

const publicEnvSchema = z.object({
    // Supabase (required for client-side database access)
    NEXT_PUBLIC_SUPABASE_URL: z.string()
        .url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL')
        .refine(
            (url) => !url.includes('localhost') || process.env.NODE_ENV === 'development',
            'NEXT_PUBLIC_SUPABASE_URL should not use localhost in production'
        ),

    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string()
        .min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),

    // Multi-tenancy (required for organization resolution)
    NEXT_PUBLIC_ORG_SLUG: z.string()
        .min(1, 'NEXT_PUBLIC_ORG_SLUG is required')
        .regex(
            /^[a-z0-9-]+$/,
            'NEXT_PUBLIC_ORG_SLUG must be lowercase alphanumeric with hyphens'
        ),

    // Stripe (optional in dev, required for payment flow)
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

    // Analytics (optional)
    NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),

    // Base URL (optional, used for absolute URLs)
    NEXT_PUBLIC_BASE_URL: z.string().url().optional(),
});

type PublicEnv = z.infer<typeof publicEnvSchema>;

/**
 * Validates public environment variables against schema.
 *
 * @throws {Error} If validation fails, with detailed error message
 * @returns Validated environment variables
 */
export function validatePublicEnv(): PublicEnv {
    // In the browser, process.env is replaced at build time with actual values
    // In Node.js (SSR), we read from process.env
    const env = typeof window === 'undefined' ? process.env : {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        NEXT_PUBLIC_ORG_SLUG: process.env.NEXT_PUBLIC_ORG_SLUG,
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
        NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
        NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    };

    const result = publicEnvSchema.safeParse(env);

    if (!result.success) {
        const errors = result.error.errors.map(err =>
            `  ❌ ${err.path.join('.')}: ${err.message}`
        ).join('\n');

        throw new Error(
            `\n🚨 Public Environment Validation Failed:\n\n${errors}\n\n` +
            `💡 Add missing NEXT_PUBLIC_* variables to .env.local (dev) or .env.test (tests)\n` +
            `📖 See .env.example for reference\n` +
            `⚠️  Remember: NEXT_PUBLIC_* vars require dev server restart to take effect!\n`
        );
    }

    return result.data;
}

/**
 * Pre-validated public environment (call validatePublicEnv() first!)
 * Use this after calling validatePublicEnv() in your entry point.
 */
let _publicEnv: PublicEnv | null = null;

export function getPublicEnv(): PublicEnv {
    if (!_publicEnv) {
        _publicEnv = validatePublicEnv();
    }
    return _publicEnv;
}

// Auto-validate on import (fail fast)
if (typeof window === 'undefined') {
    // Server-side: validate during SSR
    try {
        validatePublicEnv();
    } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        // Don't exit - let routes fail with helpful messages
    }
}
