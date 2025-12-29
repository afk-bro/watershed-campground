import { NextResponse } from "next/server";
import { checkDailyAvailability } from "@/lib/availability/engine";
import { resolvePublicOrganizationId } from "@/lib/tenancy/resolve-public-org";
import { logger } from "@/lib/logger";
import {
    checkRateLimit,
    getRateLimitHeaders,
    getClientIp,
    createIpIdentifier,
    rateLimiters
} from "@/lib/rate-limit-upstash";

export async function GET(request: Request) {
    try {
        // Rate Limiting (30 requests per minute - DoS prevention)
        const ip = getClientIp(request);
        const identifier = createIpIdentifier(ip, 'availability-calendar');
        const rateLimit = await checkRateLimit(identifier, rateLimiters.availability);

        if (!rateLimit.success) {
            return NextResponse.json(
                { error: "Too many availability requests. Please try again later." },
                {
                    status: 429,
                    headers: getRateLimitHeaders(rateLimit)
                }
            );
        }

        // CRITICAL: Resolve organization BEFORE any queries
        const organizationId = await resolvePublicOrganizationId(request);
        if (!organizationId) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const { searchParams } = new URL(request.url);
        const monthStr = searchParams.get('month'); // YYYY-MM

        if (!monthStr) {
            return NextResponse.json({ error: "Month is required (YYYY-MM)" }, { status: 400 });
        }

        // Append '-01' to parse as date
        const monthDate = new Date(`${monthStr}-01T00:00:00`);
        if (isNaN(monthDate.getTime())) {
            return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
        }

        const availability = await checkDailyAvailability(monthDate, organizationId);
        return NextResponse.json(availability);
    } catch (error) {
        logger.error("Calendar Availability Error:", error);
        return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 });
    }
}
