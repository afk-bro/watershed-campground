import { NextResponse } from "next/server";
import { checkAvailability, AvailabilityError } from "@/lib/availability";

// POST /api/availability - Check campsite availability for given dates
// This is a public endpoint that can be called to check availability before submitting a reservation
export async function POST(request: Request) {
    try {
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

        // Return availability result
        return NextResponse.json({
            available: result.available,
            message: result.message,
            availableSites: result.availableSites,
            recommendedSiteId: result.recommendedSiteId,
        });

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
