
import { NextResponse } from "next/server";
import { searchCampsites } from "@/lib/availability/engine";
import { resolvePublicOrganizationId } from "@/lib/tenancy/resolve-public-org";
import { z } from "zod";
import { logger } from "@/lib/logger";
import {
    checkRateLimit,
    getRateLimitHeaders,
    getClientIp,
    createIpIdentifier,
    rateLimiters
} from "@/lib/rate-limit-upstash";

const searchSchema = z.object({
    checkIn: z.string(),
    checkOut: z.string(),
    guestCount: z.number().int().positive(),
    rvLength: z.number().int().min(0).optional(),
    unitType: z.enum(['Tent', 'RV / Trailer', 'Camper Van', 'Cabin', '']).optional()
});

export async function POST(request: Request) {
    let rateLimit;
    try {
        // Rate Limiting (30 requests per minute - DoS prevention)
        const ip = getClientIp(request);
        const identifier = createIpIdentifier(ip, 'availability-search');
        rateLimit = await checkRateLimit(identifier, rateLimiters.availability);

        if (!rateLimit.success) {
            return NextResponse.json(
                { error: "Too many search requests. Please try again later." },
                {
                    status: 429,
                    headers: getRateLimitHeaders(rateLimit)
                }
            );
        }

        // Resolve organization BEFORE any queries
        const organizationId = await resolvePublicOrganizationId(request);
        if (!organizationId) {
            return NextResponse.json(
                { error: "Not found" },
                { status: 404, headers: getRateLimitHeaders(rateLimit) }
            );
        }

        const rawBody = await request.text();

        if (!rawBody || !rawBody.trim()) {
            return NextResponse.json(
                { error: "Request body is required" },
                { status: 400, headers: getRateLimitHeaders(rateLimit) }
            );
        }

        let body;
        try {
            body = JSON.parse(rawBody);
        } catch {
            return NextResponse.json(
                { error: "Malformed JSON body" },
                { status: 400, headers: getRateLimitHeaders(rateLimit) }
            );
        }

        // Validate and sanitize input
        const validated = searchSchema.parse(body);

        // Query with org-scoping (fail-closed)
        const results = await searchCampsites({
            ...validated,
            organizationId
        });
        return NextResponse.json(results, {
            headers: getRateLimitHeaders(rateLimit)
        });
    } catch (error) {
        // We still want rate limit headers in the catch block if possible
        // but rateLimit might not have been initialized if error happened early.
        // However, in this implementation, rateLimit is always initialized before the first await/try block.
        // (Wait, I need to make sure rateLimit is accessible here).

        // Re-calculate headers or pass them down? 
        // Let's grab them if rateLimit exists in the scope.
        // (Actually rateLimit IS in scope but let's be safe).

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Invalid search parameters", details: error.issues },
                { status: 400, headers: typeof rateLimit !== 'undefined' ? getRateLimitHeaders(rateLimit) : {} }
            );
        }
        logger.error("Campsite Search Error:", error);
        return NextResponse.json(
            { error: "Failed to search campsites" },
            { status: 500, headers: typeof rateLimit !== 'undefined' ? getRateLimitHeaders(rateLimit) : {} }
        );
    }
}
