import { NextResponse } from "next/server";
import { checkDailyAvailability } from "@/lib/availability/engine";
import { resolvePublicOrganizationId } from "@/lib/tenancy/resolve-public-org";

export async function GET(request: Request) {
    try {
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
        console.error("Calendar Availability Error:", error);
        return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 });
    }
}
