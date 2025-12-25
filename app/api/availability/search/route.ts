
import { NextResponse } from "next/server";
import { searchCampsites } from "@/lib/availability/engine";
import { resolvePublicOrganizationId } from "@/lib/tenancy/resolve-public-org";
import { z } from "zod";

const searchSchema = z.object({
    checkIn: z.string(),
    checkOut: z.string(),
    guestCount: z.number().int().positive(),
    rvLength: z.number().int().min(0).optional(),
    unitType: z.enum(['Tent', 'RV / Trailer', 'Camper Van', 'Cabin', '']).optional()
});

export async function POST(request: Request) {
    try {
        // CRITICAL: Resolve organization BEFORE any queries
        const organizationId = await resolvePublicOrganizationId(request);
        if (!organizationId) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const rawBody = await request.text();

        if (!rawBody || !rawBody.trim()) {
            return NextResponse.json({ error: "Request body is required" }, { status: 400 });
        }

        let body;
        try {
            body = JSON.parse(rawBody);
        } catch {
            return NextResponse.json({ error: "Malformed JSON body" }, { status: 400 });
        }

        // Validate and sanitize input
        const validated = searchSchema.parse(body);

        // Query with org-scoping (fail-closed)
        const results = await searchCampsites({
            ...validated,
            organizationId
        });
        return NextResponse.json(results);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid search parameters", details: error.issues }, { status: 400 });
        }
        console.error("Campsite Search Error:", error);
        return NextResponse.json({ error: "Failed to search campsites" }, { status: 500 });
    }
}
