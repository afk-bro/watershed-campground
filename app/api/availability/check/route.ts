
import { NextResponse } from "next/server";
import { checkAvailability } from "@/lib/availability";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        // Check Authorization (Admin only for accurate checking including unreleased sites, or just generally Auth'd)
        // For now, let's ensure an authenticated user at least.
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();

        // Destructure specifically to avoid passing unsafe junk
        const {
            checkIn,
            checkOut,
            guestCount,
            campsiteId,
            ignorePastCheck,
            forceConflict,
            overrideBlackout
        } = body;

        const result = await checkAvailability({
            checkIn,
            checkOut,
            guestCount: Number(guestCount),
            campsiteId,
            ignorePastCheck,
            forceConflict,
            overrideBlackout
        });

        return NextResponse.json(result);

    } catch (error) {
        console.error("Availability Check API Error:", error);
        return NextResponse.json(
            { available: false, message: "Server error checking availability" },
            { status: 500 }
        );
    }
}
