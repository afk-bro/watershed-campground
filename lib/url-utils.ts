
/**
 * Resolves the application's base URL based on environment variables.
 * Prioritizes explicitly set SITE_URL, then Vercel's environment variables,
 * and finally falls back to localhost.
 */
export function getBaseUrl(): string {
    if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
    if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
    if (process.env.SITE_URL) return process.env.SITE_URL;

    // Vercel deployment URL
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

    // Default to localhost for development
    return 'http://localhost:3000';
}
