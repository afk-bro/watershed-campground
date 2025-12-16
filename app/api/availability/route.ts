import { NextResponse } from "next/server";
import { checkAvailability, AvailabilityError } from "@/lib/availability";
import {
    checkRateLimit,
    getRateLimitHeaders,
    getClientIp,
    createIpIdentifier,
    rateLimiters
} from "@/lib/rate-limit-upstash";

// POST /api/availability - Check campsite availability for given dates
// This is a public endpoint that can be called to check availability before submitting a reservation
export async function POST(request: Request) {
    try {
        // Rate limiting (30 requests per minute per IP - allows calendar browsing)
        const ip = getClientIp(request);
        const identifier = createIpIdentifier(ip, 'availability');
        const rateLimit = await checkRateLimit(identifier, rateLimiters.availability);

        if (!rateLimit.success) {
            return NextResponse.json(
                { error: "Too many availability requests. Please slow down." },
                {
                    status: 429,
                    headers: getRateLimitHeaders(rateLimit)
                }
            );
        }

        const body = await request.json();

        const { checkIn, checkOut, guestCount } = body;

        // Validate required fields
        if (!checkIn || !checkOut || !guestCount) {
            return NextResponse.json(
                {
                    error: "Missing required fields",
                    details: {
                        checkIn: !checkIn ? ["Check-in date is required"] : undefined,
                        checkOut: !checkOut ? ["Check-out date is required"] : undefined,
                        guestCount: !guestCount ? ["Guest count is required"] : undefined,
                    }
                },
                { status: 400 }
            );
        }

        // Call shared availability logic
        const result = await checkAvailability({
            checkIn,
            checkOut,
            guestCount: Number(guestCount),
        });

        // Return availability result with rate limit headers
        return NextResponse.json(
            {
                available: result.available,
                message: result.message,
                availableSites: result.availableSites,
                recommendedSiteId: result.recommendedSiteId,
            },
            {
                headers: getRateLimitHeaders(rateLimit)
            }
        );

    } catch (error) {
        if (error instanceof AvailabilityError) {
            return NextResponse.json(
                {
                    available: false,
                    message: error.message,
                    availableSites: [],
                    recommendedSiteId: null,
                },
                { status: 400 }
            );
        }

        console.error("Error in POST /api/availability:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
